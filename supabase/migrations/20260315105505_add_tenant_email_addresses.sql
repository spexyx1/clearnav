/*
  # Add Tenant Email Address Management

  1. Changes to platform_tenants table
    - Add `tenant_email_address` column to store claimed email (e.g., arkline@clearnav.cv)
    - Add `email_verified` boolean to track verification status
    - Add `email_claimed_at` timestamp to track when email was claimed
    - Add `resend_identity_id` to store Resend API identity reference
    - Add unique constraint on tenant_email_address
  
  2. Security
    - Only tenant admins can update their own tenant's email address
    - Platform admins can view and manage all tenant emails
  
  3. Notes
    - Email addresses follow pattern: {tenant_slug}@clearnav.cv
    - Verification is required before email can be used for sending
    - Reserved addresses (admin, support, etc.) should be validated in application layer
*/

-- Add email address columns to platform_tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'tenant_email_address'
  ) THEN
    ALTER TABLE platform_tenants ADD COLUMN tenant_email_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE platform_tenants ADD COLUMN email_verified boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'email_claimed_at'
  ) THEN
    ALTER TABLE platform_tenants ADD COLUMN email_claimed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'resend_identity_id'
  ) THEN
    ALTER TABLE platform_tenants ADD COLUMN resend_identity_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'email_last_used_at'
  ) THEN
    ALTER TABLE platform_tenants ADD COLUMN email_last_used_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'email_sent_count'
  ) THEN
    ALTER TABLE platform_tenants ADD COLUMN email_sent_count integer DEFAULT 0;
  END IF;
END $$;

-- Add unique constraint on tenant_email_address (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_tenants_tenant_email_address_key'
  ) THEN
    ALTER TABLE platform_tenants
    ADD CONSTRAINT platform_tenants_tenant_email_address_key UNIQUE (tenant_email_address);
  END IF;
END $$;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_platform_tenants_email_verified 
  ON platform_tenants(email_verified) 
  WHERE email_verified = true;

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Tenant admins can update own tenant email" ON platform_tenants;

-- Add RLS policy for tenant admins to update their own email settings
CREATE POLICY "Tenant admins can update own tenant email"
  ON platform_tenants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.tenant_id = platform_tenants.id
        AND user_roles.role_category = 'tenant_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.tenant_id = platform_tenants.id
        AND user_roles.role_category = 'tenant_admin'
    )
  );

-- Function to check email address availability
CREATE OR REPLACE FUNCTION check_email_availability(email_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reserved_names text[] := ARRAY['admin', 'support', 'info', 'hello', 'contact', 'welcome', 'noreply', 'postmaster', 'webmaster', 'hostmaster'];
  local_part text;
  is_available boolean;
BEGIN
  -- Extract local part (everything before @)
  local_part := split_part(email_address, '@', 1);
  
  -- Check if it's a reserved name
  IF local_part = ANY(reserved_names) THEN
    RETURN false;
  END IF;
  
  -- Check if already claimed by another tenant
  SELECT NOT EXISTS (
    SELECT 1 FROM platform_tenants
    WHERE tenant_email_address = email_address
  ) INTO is_available;
  
  RETURN is_available;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_email_availability(text) TO authenticated;