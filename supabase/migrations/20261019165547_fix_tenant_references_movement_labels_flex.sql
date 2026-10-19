/*
# Point new tables and storage rules at the correct tenant table

1. Modified Tables
- `fund_movement_labels.tenant_id` and `ibkr_flex_connections.tenant_id` now reference `platform_tenants`
  (the app's real tenant table) instead of `tenants`. Both tables are new and empty, so no data is affected.

2. Security
- Storage read/upload rules for the `broker-statements` bucket now check the tenant folder against
  `platform_tenants`; the access rules themselves are unchanged (tenant admins / staff, own folder only).
*/

ALTER TABLE fund_movement_labels DROP CONSTRAINT IF EXISTS fund_movement_labels_tenant_id_fkey;
ALTER TABLE fund_movement_labels ADD CONSTRAINT fund_movement_labels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform_tenants(id) ON DELETE CASCADE;
ALTER TABLE ibkr_flex_connections DROP CONSTRAINT IF EXISTS ibkr_flex_connections_tenant_id_fkey;
ALTER TABLE ibkr_flex_connections ADD CONSTRAINT ibkr_flex_connections_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform_tenants(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "tenant_admin_read_broker_statements" ON storage.objects;
CREATE POLICY "tenant_admin_read_broker_statements" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'broker-statements' AND EXISTS (
    SELECT 1 FROM platform_tenants t WHERE t.id::text = (storage.foldername(name))[1]
      AND (user_is_tenant_admin((SELECT auth.uid()), t.id) OR is_investor_app_staff(t.id))));
DROP POLICY IF EXISTS "tenant_admin_upload_broker_statements" ON storage.objects;
CREATE POLICY "tenant_admin_upload_broker_statements" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'broker-statements' AND EXISTS (
    SELECT 1 FROM platform_tenants t WHERE t.id::text = (storage.foldername(name))[1]
      AND (user_is_tenant_admin((SELECT auth.uid()), t.id) OR is_investor_app_staff(t.id))));
