
-- Public bucket for invoice logos (read by anyone for public invoice views)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-logos',
  'invoice-logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own logos
CREATE POLICY "invoice_logos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/replace their own logos
CREATE POLICY "invoice_logos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'invoice-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own logos
CREATE POLICY "invoice_logos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoice-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read (needed for public invoice view)
CREATE POLICY "invoice_logos_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'invoice-logos');
