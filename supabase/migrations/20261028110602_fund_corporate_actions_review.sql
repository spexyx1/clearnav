/*
# Corporate action review, import progress and escrow price cleanup

## Plain-English summary
IBKR corporate actions (splits, restructurings, spinoffs, mergers, escrow lines) and unlabelled
holding changes now wait for an administrator's approval before they count in the fund value.
The month-by-month IBKR import also records its progress so it can be shown while it runs.
Public-market prices that were wrongly copied onto escrow (".ESC") and cancelled (".OLD") lines
are removed; they made those lines look valuable when IBKR values them at zero or its own price.

## 1. New table `fund_corporate_actions`
- `id` uuid primary key
- `tenant_id`, `fund_id`, `share_class_id` - ownership
- `event_key` text - stable identity of the event (account, date, security, type)
- `fingerprint` text - hash of IBKR's details; if IBKR changes the details, a decided event goes back to pending
- `action_date` date, `symbol` text, `category` text (split, reverse_split, restructure, spinoff,
  cash_merger, escrow, other), `description` text, `detected` boolean (true when the system spotted it without an IBKR label)
- `details` jsonb - the share and cash legs used to value the event
- `status` text - pending / approved / rejected
- `reason` text - required when rejected
- `decided_by` uuid, `decided_at` timestamptz, `created_at`, `updated_at`

## 2. Modified table `ibkr_flex_connections`
- New column `sync_progress` jsonb - month-by-month import progress (written by the server, readable by staff)

## 3. Data cleanup
- Market-sourced price marks for ".ESC" / ".OLD" symbols are copied into
  `fund_price_marks_escrow_backup` and then deleted from `fund_price_marks`.

## 4. Security
- RLS enabled on `fund_corporate_actions`; separate select/insert/update/delete policies for tenant admins and staff.
- Backup table has RLS enabled with no policies (not reachable from the app).
- `authenticated` may read the new `sync_progress` column.
*/

CREATE TABLE IF NOT EXISTS fund_corporate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid NOT NULL,
  event_key text NOT NULL,
  fingerprint text NOT NULL,
  action_date date NOT NULL,
  symbol text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('split','reverse_split','restructure','spinoff','cash_merger','escrow','other')),
  description text NOT NULL DEFAULT '',
  detected boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fund_corporate_actions_reject_reason CHECK (status <> 'rejected' OR coalesce(btrim(reason), '') <> ''),
  CONSTRAINT fund_corporate_actions_unique UNIQUE (fund_id, share_class_id, event_key)
);

CREATE INDEX IF NOT EXISTS fund_corporate_actions_fund_idx ON fund_corporate_actions (fund_id, status);
CREATE INDEX IF NOT EXISTS fund_corporate_actions_tenant_idx ON fund_corporate_actions (tenant_id);

ALTER TABLE fund_corporate_actions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON fund_corporate_actions TO authenticated;

DROP POLICY IF EXISTS "staff_select_corporate_actions" ON fund_corporate_actions;
CREATE POLICY "staff_select_corporate_actions" ON fund_corporate_actions FOR SELECT TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_insert_corporate_actions" ON fund_corporate_actions;
CREATE POLICY "staff_insert_corporate_actions" ON fund_corporate_actions FOR INSERT TO authenticated
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_update_corporate_actions" ON fund_corporate_actions;
CREATE POLICY "staff_update_corporate_actions" ON fund_corporate_actions FOR UPDATE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_delete_corporate_actions" ON fund_corporate_actions;
CREATE POLICY "staff_delete_corporate_actions" ON fund_corporate_actions FOR DELETE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

ALTER TABLE ibkr_flex_connections ADD COLUMN IF NOT EXISTS sync_progress jsonb;
GRANT SELECT (sync_progress) ON ibkr_flex_connections TO authenticated;

CREATE TABLE IF NOT EXISTS fund_price_marks_escrow_backup AS SELECT * FROM fund_price_marks WHERE false;
ALTER TABLE fund_price_marks_escrow_backup ENABLE ROW LEVEL SECURITY;
INSERT INTO fund_price_marks_escrow_backup
  SELECT m.* FROM fund_price_marks m
  WHERE m.source = 'market' AND m.symbol ~ '\.(ESC|OLD)$'
    AND NOT EXISTS (SELECT 1 FROM fund_price_marks_escrow_backup b WHERE b.id = m.id);
DELETE FROM fund_price_marks WHERE source = 'market' AND symbol ~ '\.(ESC|OLD)$';
