/*
  # Create Tenant Assets Storage Bucket

  ## Overview
  Creates a public storage bucket for tenant website assets (images, logos, favicons, blog images).

  ## What This Creates
  1. Storage bucket: `tenant-assets` (public, 10MB file limit)
  2. RLS policies for tenant-scoped upload/delete
  3. Public read access for anonymous users

  ## File Structure
  - `{tenant_id}/images/{filename}` - General website images
  - `{tenant_id}/logos/{filename}` - Logo files
  - `{tenant_id}/favicons/{filename}` - Favicon files
  - `{tenant_id}/blog/{filename}` - Blog post images

  ## Security
  - Authenticated users can upload/update/delete within their tenant path only
  - Anonymous users can read (public bucket)
  - File size limit: 10MB per file
  - Allowed MIME types: image files only
*/

-- Create the tenant-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ];

-- RLS Policy: Authenticated users can upload files within their tenant path
DROP POLICY IF EXISTS "Tenant users can upload assets" ON storage.objects;
CREATE POLICY "Tenant users can upload assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text
      FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- RLS Policy: Authenticated users can update files within their tenant path
DROP POLICY IF EXISTS "Tenant users can update assets" ON storage.objects;
CREATE POLICY "Tenant users can update assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text
      FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- RLS Policy: Authenticated users can delete files within their tenant path
DROP POLICY IF EXISTS "Tenant users can delete assets" ON storage.objects;
CREATE POLICY "Tenant users can delete assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text
      FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- RLS Policy: Anyone can read files (public bucket)
DROP POLICY IF EXISTS "Anyone can view tenant assets" ON storage.objects;
CREATE POLICY "Anyone can view tenant assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'tenant-assets');
