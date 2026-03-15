/*
  # Generate Email Addresses for Existing Tenants

  1. Purpose
    - Auto-generate email addresses for all existing tenants who don't have one yet
    - Format: sanitized-tenant-name@clearnav.cv
    - Set email_verified to false so tenants must verify before use
  
  2. Process
    - Generate email address from tenant name (lowercase, replace spaces with hyphens)
    - Handle potential duplicates by appending tenant ID
    - Update platform_tenants table with generated emails
  
  3. Notes
    - Tenants will need to verify their email address before it can be used
    - Platform admins can manually update addresses if needed
    - This is a one-time migration for existing data
*/

-- Function to generate sanitized email address from tenant name
CREATE OR REPLACE FUNCTION generate_tenant_email(tenant_name text, tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  sanitized text;
  proposed_email text;
  email_exists boolean;
BEGIN
  -- Sanitize tenant name: lowercase, replace non-alphanumeric with hyphens, remove consecutive hyphens
  sanitized := lower(tenant_name);
  sanitized := regexp_replace(sanitized, '[^a-z0-9]+', '-', 'g');
  sanitized := regexp_replace(sanitized, '-+', '-', 'g');
  sanitized := regexp_replace(sanitized, '^-+|-+$', '', 'g');
  
  -- Limit length to 50 characters
  IF length(sanitized) > 50 THEN
    sanitized := substring(sanitized, 1, 50);
  END IF;
  
  -- Ensure minimum length
  IF length(sanitized) < 2 THEN
    sanitized := 'tenant-' || substring(tenant_id::text, 1, 8);
  END IF;
  
  proposed_email := sanitized || '@clearnav.cv';
  
  -- Check if email already exists
  SELECT EXISTS (
    SELECT 1 FROM platform_tenants
    WHERE tenant_email_address = proposed_email
  ) INTO email_exists;
  
  -- If exists, append part of tenant ID to make it unique
  IF email_exists THEN
    proposed_email := sanitized || '-' || substring(tenant_id::text, 1, 8) || '@clearnav.cv';
  END IF;
  
  RETURN proposed_email;
END;
$$;

-- Generate email addresses for existing tenants without one
UPDATE platform_tenants
SET tenant_email_address = generate_tenant_email(name, id),
    email_verified = false
WHERE tenant_email_address IS NULL;

-- Log results
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT count(*) INTO updated_count
  FROM platform_tenants
  WHERE tenant_email_address IS NOT NULL;
  
  RAISE NOTICE 'Generated email addresses for existing tenants. Total tenants with email addresses: %', updated_count;
END $$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION generate_tenant_email(text, uuid) TO authenticated;