
DROP POLICY IF EXISTS "invoice_logos_update" ON storage.objects;

CREATE POLICY "invoice_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'invoice-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
