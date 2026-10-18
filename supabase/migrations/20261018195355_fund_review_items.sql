/*
# Fund review items ("Needs your decision")

## Plain-English summary
After a broker statement is uploaded the system values each month and approves clean months automatically.
Anything unclear (duplicate uploads, duplicate trades, missing prices, unusual moves, figures that don't match the broker)
is stored here as a question for the manager, with a list of choices. When the manager picks a choice the system applies it.

## 1. New table `fund_review_items`
- `id` uuid primary key
- `tenant_id` company the item belongs to
- `fund_id` fund the item concerns
- `share_class_id` optional share class
- `month` optional month key, e.g. 2026-03
- `kind` type of question (duplicate_upload, duplicate_trades, missing_prices, unusual_return, reconcile)
- `dedupe_key` stable key so the same question is not raised twice (unique per fund)
- `title`, `detail` human-readable question
- `options` jsonb list of {key, label, description}
- `context` jsonb extra data needed to apply the decision
- `status` open | resolved
- `resolution` chosen option key
- `resolved_by`, `resolved_at`, `created_at`

## 2. Security
- RLS enabled. Only tenant admins / active staff of the same company can read, add, change or remove items.

## 3. Notes
1. Safe to re-run.
*/

CREATE TABLE IF NOT EXISTS fund_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid REFERENCES share_classes(id) ON DELETE CASCADE,
  month text,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolution text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_fund_review_items_tenant ON fund_review_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fund_review_items_class ON fund_review_items(share_class_id);
CREATE INDEX IF NOT EXISTS idx_fund_review_items_resolved_by ON fund_review_items(resolved_by);

ALTER TABLE fund_review_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_fund_review_items" ON fund_review_items;
CREATE POLICY "admin_select_fund_review_items" ON fund_review_items FOR SELECT TO authenticated
  USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_insert_fund_review_items" ON fund_review_items;
CREATE POLICY "admin_insert_fund_review_items" ON fund_review_items FOR INSERT TO authenticated
  WITH CHECK (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_update_fund_review_items" ON fund_review_items;
CREATE POLICY "admin_update_fund_review_items" ON fund_review_items FOR UPDATE TO authenticated
  USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id))
  WITH CHECK (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_delete_fund_review_items" ON fund_review_items;
CREATE POLICY "admin_delete_fund_review_items" ON fund_review_items FOR DELETE TO authenticated
  USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
