/*
# Fund statement pipeline (broker statements, month-end prices, monthly reports)

## Plain-English summary
Lets staff upload a full broker activity statement (e.g. Interactive Brokers) that is read automatically,
split per share class and per month, priced at each month-end, and turned into monthly fund values and reports.

## 1. Modified tables
- `trade_uploads`: new columns
  - `share_class_id` (uuid) share class this month's activity belongs to
  - `broker_account` (text) broker account number the rows came from
  - `source_format` (text) detected file format (ibkr_activity, generic)
  - `period_start`, `period_end` (date) statement coverage
  - `statement_data` (jsonb) cash events, opening/closing positions and broker NAV summary for the month
- `trade_upload_items`: new columns `asset_category`, `currency`, `multiplier`, `proceeds`, `realized_pl`
- `reports`: allowed `report_type` gains `monthly_update`; allowed `status` gains `draft`, `published`

## 2. New tables
- `fund_broker_accounts` remembers which broker account maps to which share class
  (tenant_id, fund_id, broker, account_id, share_class_id). Unique per fund/broker/account.
- `fund_price_marks` month-end prices per symbol (tenant_id, fund_id, symbol, price_date, price, source
  market|statement|trade|manual, updated_by). Unique per fund/symbol/date.

## 3. Security
- RLS on both new tables; tenant admins (tenant_users owner/admin) and active staff of the tenant only.
- Additional policies so tenant admins (not only staff_accounts members) can work with trade uploads,
  their items, reports and investor vault documents for their own tenant.

## 4. Notes
1. No data is removed; constraint changes only widen allowed values.
2. Safe to re-run.
*/

ALTER TABLE trade_uploads ADD COLUMN IF NOT EXISTS share_class_id uuid REFERENCES share_classes(id) ON DELETE SET NULL;
ALTER TABLE trade_uploads ADD COLUMN IF NOT EXISTS broker_account text;
ALTER TABLE trade_uploads ADD COLUMN IF NOT EXISTS source_format text;
ALTER TABLE trade_uploads ADD COLUMN IF NOT EXISTS period_start date;
ALTER TABLE trade_uploads ADD COLUMN IF NOT EXISTS period_end date;
ALTER TABLE trade_uploads ADD COLUMN IF NOT EXISTS statement_data jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_trade_uploads_class_period ON trade_uploads(share_class_id, upload_year, upload_month);
CREATE INDEX IF NOT EXISTS idx_trade_uploads_fund ON trade_uploads(fund_id);

ALTER TABLE trade_upload_items ADD COLUMN IF NOT EXISTS asset_category text;
ALTER TABLE trade_upload_items ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE trade_upload_items ADD COLUMN IF NOT EXISTS multiplier numeric NOT NULL DEFAULT 1;
ALTER TABLE trade_upload_items ADD COLUMN IF NOT EXISTS proceeds numeric;
ALTER TABLE trade_upload_items ADD COLUMN IF NOT EXISTS realized_pl numeric;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_report_type_check;
ALTER TABLE reports ADD CONSTRAINT reports_report_type_check CHECK (report_type = ANY (ARRAY['investor_statement','performance_report','fee_report','capital_account_report','transaction_report','distribution_report','quarterly_letter','annual_report','custom','monthly_update']));
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check CHECK (status = ANY (ARRAY['generating','generated','sent','viewed','failed','draft','published']));

CREATE TABLE IF NOT EXISTS fund_broker_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  broker text NOT NULL DEFAULT 'ibkr',
  account_id text NOT NULL,
  share_class_id uuid NOT NULL REFERENCES share_classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, broker, account_id)
);
CREATE INDEX IF NOT EXISTS idx_fund_broker_accounts_tenant ON fund_broker_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS fund_price_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  price_date date NOT NULL,
  price numeric NOT NULL,
  source text NOT NULL DEFAULT 'market' CHECK (source IN ('market','statement','trade','manual')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, symbol, price_date)
);
CREATE INDEX IF NOT EXISTS idx_fund_price_marks_tenant ON fund_price_marks(tenant_id);

ALTER TABLE fund_broker_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_price_marks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fund_broker_accounts','fund_price_marks','trade_uploads','reports','investor_vault_documents'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin_select_%1$s" ON %1$I', t);
    EXECUTE format('CREATE POLICY "admin_select_%1$s" ON %1$I FOR SELECT TO authenticated USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_insert_%1$s" ON %1$I', t);
    EXECUTE format('CREATE POLICY "admin_insert_%1$s" ON %1$I FOR INSERT TO authenticated WITH CHECK (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_update_%1$s" ON %1$I', t);
    EXECUTE format('CREATE POLICY "admin_update_%1$s" ON %1$I FOR UPDATE TO authenticated USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id)) WITH CHECK (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_delete_%1$s" ON %1$I', t);
    EXECUTE format('CREATE POLICY "admin_delete_%1$s" ON %1$I FOR DELETE TO authenticated USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "admin_select_trade_upload_items" ON trade_upload_items;
CREATE POLICY "admin_select_trade_upload_items" ON trade_upload_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM trade_uploads tu WHERE tu.id = upload_id AND public.user_is_tenant_admin((select auth.uid()), tu.tenant_id)));
DROP POLICY IF EXISTS "admin_insert_trade_upload_items" ON trade_upload_items;
CREATE POLICY "admin_insert_trade_upload_items" ON trade_upload_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM trade_uploads tu WHERE tu.id = upload_id AND public.user_is_tenant_admin((select auth.uid()), tu.tenant_id)));
DROP POLICY IF EXISTS "admin_update_trade_upload_items" ON trade_upload_items;
CREATE POLICY "admin_update_trade_upload_items" ON trade_upload_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM trade_uploads tu WHERE tu.id = upload_id AND public.user_is_tenant_admin((select auth.uid()), tu.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM trade_uploads tu WHERE tu.id = upload_id AND public.user_is_tenant_admin((select auth.uid()), tu.tenant_id)));
DROP POLICY IF EXISTS "admin_delete_trade_upload_items" ON trade_upload_items;
CREATE POLICY "admin_delete_trade_upload_items" ON trade_upload_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM trade_uploads tu WHERE tu.id = upload_id AND public.user_is_tenant_admin((select auth.uid()), tu.tenant_id)));
