/*
# Fix broker statement file storage access

1. Problem
- The read and upload rules for the `broker-statements` bucket compared the tenant id against the
  tenant's *name* instead of the uploaded file's folder, so no file could ever be saved or read.
2. Changes
- Recreate SELECT and INSERT policies so the first folder of the object path (objects.name) must equal
  a tenant id the user administers (or is staff for).
3. Security
- Access remains limited to tenant admins / investor-app staff of that tenant. No public access.
*/

DROP POLICY IF EXISTS "tenant_admin_read_broker_statements" ON storage.objects;
CREATE POLICY "tenant_admin_read_broker_statements" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'broker-statements'
  AND EXISTS (
    SELECT 1 FROM platform_tenants t
    WHERE t.id::text = (storage.foldername(objects.name))[1]
      AND (user_is_tenant_admin((SELECT auth.uid()), t.id) OR is_investor_app_staff(t.id))
  )
);

DROP POLICY IF EXISTS "tenant_admin_upload_broker_statements" ON storage.objects;
CREATE POLICY "tenant_admin_upload_broker_statements" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'broker-statements'
  AND EXISTS (
    SELECT 1 FROM platform_tenants t
    WHERE t.id::text = (storage.foldername(objects.name))[1]
      AND (user_is_tenant_admin((SELECT auth.uid()), t.id) OR is_investor_app_staff(t.id))
  )
);