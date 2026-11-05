/*
# Save inbound email attachments and lock down attachment writes

1. Modified Table: `email_attachments`
- Existing table, already used for attachments on outgoing mail. Existing rows are kept unchanged.
- New `status` column for incoming attachments:
  - `safe`: allowed file type, stored and downloadable.
  - `blocked`: file type or contents not allowed; never stored.
  - `failed`: allowed but could not be fetched or saved; not downloadable.
  - Empty for outgoing mail attachments (unchanged behavior).
- New `status_reason` column: plain-language reason for a blocked or failed file.
- New `provider_attachment_id` column: the mail provider's id for the attachment.
- `storage_path` may now be empty, because blocked and failed files have no stored copy.

2. Storage
- Private bucket `email-attachments`, 10 MB per file.
- Users can read a stored file only when they can read its attachment row.

3. Security
- Row level security stays on for `email_attachments`.
- Signed-in users can read attachment rows through the existing message access rules (unchanged).
- Removed the policy that let signed-in users insert, change, or delete attachment rows directly. Only the server writes these rows now.
- Removed all write privileges for signed-in and anonymous users on this table. The server role keeps full access.
- A safe row must point to a stored file. Without this, a user could point a row at another mailbox's file.

4. Important Notes
- Existing outgoing attachment rows are not changed.
- Allowed documents are not scanned for malware. Only file type and size are checked.
*/

ALTER TABLE email_attachments ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE email_attachments ADD COLUMN IF NOT EXISTS status_reason text;
ALTER TABLE email_attachments ADD COLUMN IF NOT EXISTS provider_attachment_id text;
ALTER TABLE email_attachments ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS email_attachments_status_check;
ALTER TABLE email_attachments ADD CONSTRAINT email_attachments_status_check
  CHECK (status IS NULL OR status IN ('safe', 'blocked', 'failed'));

ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS email_attachments_safe_has_file;
ALTER TABLE email_attachments ADD CONSTRAINT email_attachments_safe_has_file
  CHECK (status IS DISTINCT FROM 'safe' OR storage_path IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage attachments for their messages" ON email_attachments;

REVOKE ALL ON email_attachments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON email_attachments FROM authenticated;
GRANT SELECT ON email_attachments TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-attachments', 'email-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_accessible_email_attachment_files" ON storage.objects;
CREATE POLICY "read_accessible_email_attachment_files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'email-attachments'
    AND EXISTS (
      SELECT 1 FROM email_attachments ea WHERE ea.storage_path = storage.objects.name
    )
  );
