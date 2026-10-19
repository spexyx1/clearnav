/*
# Movement labels, IBKR Flex connection and original statement files

1. New Tables
- `fund_movement_labels`: the manager's decision about what a money or share movement was.
  - `id` uuid pk, `tenant_id`, `fund_id`, `share_class_id`
  - `movement_key` (text) stable identifier of the movement (class, date, symbol/currency, amount)
  - `label` (text) one of investor, fee, internal, other_fund
  - `note`, `set_by`, `created_at`, `updated_at`
  - unique (fund_id, movement_key)
- `ibkr_flex_connections`: one IBKR Flex Web Service connection per fund.
  - `id`, `tenant_id`, `fund_id` (unique), `query_id`, `token` (secret), `token_expires_on`,
    `last_sync_at`, `last_status`, `last_error`, `created_by`, `created_at`, `updated_at`

2. Modified Tables
- `trade_uploads`: new nullable `source_file_path` (text) pointing to the original statement file in storage.

3. Storage
- Private bucket `broker-statements`; files live under `<tenant_id>/...`.

4. Security
- RLS on both new tables.
- Movement labels: tenant admins / staff can select, insert, update, delete within their tenant.
- Flex connections: tenant admins / staff may only SELECT, and only the non-secret columns
  (column privileges hide `token`). All writes go through the server-side sync function.
- Storage: tenant admins / staff may read and upload files inside their own tenant folder only.
*/

CREATE TABLE IF NOT EXISTS fund_movement_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid REFERENCES share_classes(id) ON DELETE CASCADE,
  movement_key text NOT NULL,
  label text NOT NULL CHECK (label IN ('investor','fee','internal','other_fund')),
  note text,
  set_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, movement_key)
);
CREATE INDEX IF NOT EXISTS idx_fund_movement_labels_tenant ON fund_movement_labels(tenant_id);
ALTER TABLE fund_movement_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_movement_labels" ON fund_movement_labels;
CREATE POLICY "admin_select_movement_labels" ON fund_movement_labels FOR SELECT TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_insert_movement_labels" ON fund_movement_labels;
CREATE POLICY "admin_insert_movement_labels" ON fund_movement_labels FOR INSERT TO authenticated
  WITH CHECK ((user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
    AND EXISTS (SELECT 1 FROM funds f WHERE f.id = fund_id AND f.tenant_id = fund_movement_labels.tenant_id));
DROP POLICY IF EXISTS "admin_update_movement_labels" ON fund_movement_labels;
CREATE POLICY "admin_update_movement_labels" ON fund_movement_labels FOR UPDATE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
  WITH CHECK ((user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
    AND EXISTS (SELECT 1 FROM funds f WHERE f.id = fund_id AND f.tenant_id = fund_movement_labels.tenant_id));
DROP POLICY IF EXISTS "admin_delete_movement_labels" ON fund_movement_labels;
CREATE POLICY "admin_delete_movement_labels" ON fund_movement_labels FOR DELETE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

CREATE TABLE IF NOT EXISTS ibkr_flex_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL UNIQUE REFERENCES funds(id) ON DELETE CASCADE,
  query_id text NOT NULL,
  token text NOT NULL,
  token_expires_on date,
  last_sync_at timestamptz,
  last_status text,
  last_error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ibkr_flex_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ibkr_flex_connections FROM anon, authenticated;
GRANT SELECT (id, tenant_id, fund_id, query_id, token_expires_on, last_sync_at, last_status, last_error, created_at, updated_at)
  ON ibkr_flex_connections TO authenticated;

DROP POLICY IF EXISTS "admin_select_flex_connections" ON ibkr_flex_connections;
CREATE POLICY "admin_select_flex_connections" ON ibkr_flex_connections FOR SELECT TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trade_uploads' AND column_name = 'source_file_path') THEN
    ALTER TABLE trade_uploads ADD COLUMN source_file_path text;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('broker-statements', 'broker-statements', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tenant_admin_read_broker_statements" ON storage.objects;
CREATE POLICY "tenant_admin_read_broker_statements" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'broker-statements' AND EXISTS (
    SELECT 1 FROM tenants t WHERE t.id::text = (storage.foldername(name))[1]
      AND (user_is_tenant_admin((SELECT auth.uid()), t.id) OR is_investor_app_staff(t.id))));
DROP POLICY IF EXISTS "tenant_admin_upload_broker_statements" ON storage.objects;
CREATE POLICY "tenant_admin_upload_broker_statements" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'broker-statements' AND EXISTS (
    SELECT 1 FROM tenants t WHERE t.id::text = (storage.foldername(name))[1]
      AND (user_is_tenant_admin((SELECT auth.uid()), t.id) OR is_investor_app_staff(t.id))));
