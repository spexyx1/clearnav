/*
# Investor document storage access for tenant admins

1. Security
   - Tenant admins (tenant_users owner/admin) can read, upload, replace and delete files in the
     `investor-documents` bucket, but only inside the folder named after their own tenant id.
2. Notes
   - Needed so monthly report PDFs can be published to the investor vault by fund admins.
   - Safe to re-run.
*/
DROP POLICY IF EXISTS "tenant_admin_select_investor_docs" ON storage.objects;
CREATE POLICY "tenant_admin_select_investor_docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'investor-documents' AND public.user_is_tenant_admin((select auth.uid()), ((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "tenant_admin_insert_investor_docs" ON storage.objects;
CREATE POLICY "tenant_admin_insert_investor_docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'investor-documents' AND public.user_is_tenant_admin((select auth.uid()), ((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "tenant_admin_update_investor_docs" ON storage.objects;
CREATE POLICY "tenant_admin_update_investor_docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'investor-documents' AND public.user_is_tenant_admin((select auth.uid()), ((storage.foldername(name))[1])::uuid))
  WITH CHECK (bucket_id = 'investor-documents' AND public.user_is_tenant_admin((select auth.uid()), ((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "tenant_admin_delete_investor_docs" ON storage.objects;
CREATE POLICY "tenant_admin_delete_investor_docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'investor-documents' AND public.user_is_tenant_admin((select auth.uid()), ((storage.foldername(name))[1])::uuid));
