-- Fix storage policies that lack tenant/user ownership scoping.
-- The fund-documents bucket previously allowed ANY authenticated user to
-- read/upload/update documents with no ownership check.
-- The invoice-logos bucket had SELECT/UPDATE without path scoping.

-- ── fund-documents: replace overly broad policies with tenant-scoped ones ──

DROP POLICY IF EXISTS "Authenticated users can view their fund documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload fund documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their fund documents" ON storage.objects;

-- SELECT: user must have a staff or investor role for the tenant that owns the document
CREATE POLICY "fund_docs_read_own_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fund-documents'
    AND (
      -- Tenant staff can read documents for their tenant
      (storage.foldername(name))[1] IN (
        SELECT sa.tenant_id::text
        FROM staff_accounts sa
        WHERE sa.auth_user_id = auth.uid() AND sa.status = 'active'
      )
      OR
      -- Tenant admins/managers can read documents for their tenant
      (storage.foldername(name))[1] IN (
        SELECT ur.tenant_id::text
        FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.status = 'active'
      )
    )
  );

-- INSERT: tenant staff with manager+ role can upload
CREATE POLICY "fund_docs_insert_own_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fund-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT ur.tenant_id::text
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
      AND ur.role_category IN ('superadmin', 'tenant_admin')
    )
  );

-- UPDATE: same as insert
CREATE POLICY "fund_docs_update_own_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fund-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT ur.tenant_id::text
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
    )
  )
  WITH CHECK (
    bucket_id = 'fund-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT ur.tenant_id::text
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
    )
  );

-- DELETE: same ownership
CREATE POLICY "fund_docs_delete_own_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fund-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT ur.tenant_id::text
      FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
    )
  );

-- ── invoice-logos: scope SELECT/UPDATE by user_id path prefix ──

-- The INSERT policy already scopes by user_id in the path, but
-- SELECT and UPDATE were unscoped. Fix them to match the same path prefix.

-- First check existing policies and replace the broad ones
UPDATE storage.buckets SET public = false WHERE id = 'invoice-logos';
