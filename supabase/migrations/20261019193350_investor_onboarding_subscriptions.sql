/*
# Investor onboarding: subscriptions, official IBKR accounts, withdrawal links

Plain English: when an application is approved, each class the investor chose becomes
a "subscription" that waits for money. When the matching IBKR deposit (or the seed
investor's share transfer) is confirmed, the subscription records the date the money
arrived and the dealing day it will be invested on. Units are only issued once that
month is final and approved (enforced by the existing capital_transactions price guard).

1. New table `unit_subscriptions`
   - id, tenant_id, fund_id, share_class_id
   - application_id (investor_applications, optional: seed / manual subscriptions have none)
   - client_id (client_profiles, optional until the investor has a portal account)
   - investor_name, investor_email
   - kind: 'cash' (money deposit) or 'in_kind' (shares transferred in, e.g. seed investor)
   - expected_amount: amount on the application
   - status: awaiting_funds -> money_received -> units_issued (or cancelled)
   - broker_movement_key: the IBKR movement this money was matched to (unique, so one deposit funds one subscription)
   - money_received_date, received_amount, dealing_date
   - capital_transaction_id: the unit issue, required once status is units_issued
   - notes, created_by (defaults to the signed-in user), created_at, updated_at

2. Modified table `fund_broker_accounts`
   - account_role: 'official' (new Arkline Trust account, dealing happens here) or 'track_record' (pre-launch accounts, default)
   - official_from: first month the official account is used
   - At most one official account per class.

3. Modified table `redemption_requests`
   - capital_transaction_id: the unit redemption created on the dealing day.

4. Security
   - RLS enabled on unit_subscriptions; separate select/insert/update/delete policies for tenant admins and investor-app staff only.

5. Notes
   - No existing data is changed; all existing broker accounts become track record by default.
*/

CREATE TABLE IF NOT EXISTS unit_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid NOT NULL REFERENCES share_classes(id) ON DELETE CASCADE,
  application_id uuid REFERENCES investor_applications(id) ON DELETE SET NULL,
  client_id uuid REFERENCES client_profiles(id) ON DELETE SET NULL,
  investor_name text NOT NULL,
  investor_email text,
  kind text NOT NULL DEFAULT 'cash' CHECK (kind IN ('cash', 'in_kind')),
  expected_amount numeric,
  status text NOT NULL DEFAULT 'awaiting_funds' CHECK (status IN ('awaiting_funds', 'money_received', 'units_issued', 'cancelled')),
  broker_movement_key text UNIQUE,
  money_received_date date,
  received_amount numeric,
  dealing_date date,
  capital_transaction_id uuid REFERENCES capital_transactions(id),
  notes text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_subscriptions_received_check CHECK (status NOT IN ('money_received', 'units_issued') OR (broker_movement_key IS NOT NULL AND money_received_date IS NOT NULL AND dealing_date IS NOT NULL)),
  CONSTRAINT unit_subscriptions_issued_check CHECK (status <> 'units_issued' OR capital_transaction_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_fund ON unit_subscriptions(fund_id, status);
CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_application ON unit_subscriptions(application_id);

ALTER TABLE unit_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_unit_subscriptions" ON unit_subscriptions;
CREATE POLICY "staff_select_unit_subscriptions" ON unit_subscriptions FOR SELECT TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_insert_unit_subscriptions" ON unit_subscriptions;
CREATE POLICY "staff_insert_unit_subscriptions" ON unit_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_update_unit_subscriptions" ON unit_subscriptions;
CREATE POLICY "staff_update_unit_subscriptions" ON unit_subscriptions FOR UPDATE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_delete_unit_subscriptions" ON unit_subscriptions;
CREATE POLICY "staff_delete_unit_subscriptions" ON unit_subscriptions FOR DELETE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fund_broker_accounts' AND column_name = 'account_role') THEN
    ALTER TABLE fund_broker_accounts ADD COLUMN account_role text NOT NULL DEFAULT 'track_record' CHECK (account_role IN ('official', 'track_record'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fund_broker_accounts' AND column_name = 'official_from') THEN
    ALTER TABLE fund_broker_accounts ADD COLUMN official_from date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'capital_transaction_id') THEN
    ALTER TABLE redemption_requests ADD COLUMN capital_transaction_id uuid REFERENCES capital_transactions(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fund_broker_accounts_one_official
  ON fund_broker_accounts(share_class_id) WHERE account_role = 'official';
