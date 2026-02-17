/*
  # Add Email Storage Quota and Provider Configuration

  ## Summary
  Adds storage quota tracking to email accounts and email provider configuration
  to tenant settings. This enables per-account storage limits (1 GB default)
  and tenant-level email provider setup (Resend or SendGrid).

  ## Changes

  ### `email_accounts` table additions:
  - `storage_used_bytes` (bigint) — tracks current storage consumed, defaults 0
  - `storage_quota_bytes` (bigint) — maximum allowed storage, defaults 1 GB (1073741824 bytes)
  - `provider_type` (text) — email provider: 'resend', 'sendgrid', or 'internal'
  - `email_handle` (text) — the local part of the email address (e.g., 'john' in 'john@example.com')

  ### New `tenant_email_settings` table:
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key to platform_tenants)
  - `provider_type` (text) — 'resend' or 'sendgrid'
  - `api_key_encrypted` (text) — encrypted API key for the provider
  - `from_domain` (text) — sending domain (custom or clearnav.cv subdomain)
  - `from_name` (text) — default sender name
  - `reply_to` (text) — default reply-to address
  - `is_active` (boolean) — whether provider config is active
  - `created_at` / `updated_at` timestamps

  ## Security
  - RLS enabled on `tenant_email_settings`
  - Only tenant admins and platform admins can manage settings
*/

-- Add storage quota columns to email_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_accounts' AND column_name = 'storage_used_bytes'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN storage_used_bytes bigint DEFAULT 0 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_accounts' AND column_name = 'storage_quota_bytes'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN storage_quota_bytes bigint DEFAULT 1073741824 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_accounts' AND column_name = 'provider_type'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN provider_type text DEFAULT 'internal';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_accounts' AND column_name = 'email_handle'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN email_handle text;
  END IF;
END $$;

-- Create tenant_email_settings table
CREATE TABLE IF NOT EXISTS tenant_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'resend',
  api_key_encrypted text,
  from_domain text,
  from_name text DEFAULT '',
  reply_to text DEFAULT '',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE tenant_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can view own email settings"
  ON tenant_email_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_email_settings.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can insert email settings"
  ON tenant_email_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_email_settings.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update email settings"
  ON tenant_email_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_email_settings.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_email_settings.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_tenant_email_settings_tenant_id ON tenant_email_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_email_handle ON email_accounts(email_handle);
