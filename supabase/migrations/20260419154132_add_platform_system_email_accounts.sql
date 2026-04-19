/*
  # Platform System Email Accounts

  ## Summary
  Sets up the two ClearNav platform-level email addresses (info@clearnav.cv and 
  compliance@clearnav.cv) and assigns them exclusively to the platform admin account.

  ## Changes

  ### 1. Updated `check_email_availability` function
  - Adds 'compliance' to the reserved handles list so no tenant can claim it
  - 'info' was already reserved; additional platform handles also blocked

  ### 2. New platform_tenants row: ClearNav Platform
  - A special internal tenant row (slug 'clearnav') to own the system-level email accounts
  - Separate from all customer tenants

  ### 3. New email_accounts rows
  - info@clearnav.cv  — account_type 'department', display_name 'ClearNav Info'
  - compliance@clearnav.cv — account_type 'department', display_name 'ClearNav Compliance'
  - Both owned by the ClearNav Platform tenant row

  ### 4. email_account_access grants
  - Grants the platform admin user (info@ghetto.finance) full access to both accounts
  - Access is via email_account_access; superadmin RLS bypass also applies

  ## Security
  - RLS on email_accounts already allows platform_admin_users unconditional access
  - The platform admin's existing superadmin role record is NOT modified
    (constraint check_superadmin_no_tenant prevents superadmin rows from having tenant_id)
  - email_account_access grants give explicit per-account access as a secondary path
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reserve 'compliance' (and other platform handles) in email availability check
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_email_availability(email_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reserved_names text[] := ARRAY[
    'admin', 'support', 'info', 'compliance', 'hello', 'contact',
    'welcome', 'noreply', 'postmaster', 'webmaster', 'hostmaster',
    'abuse', 'security', 'legal', 'billing', 'clearnav', 'platform'
  ];
  local_part text;
  is_available boolean;
BEGIN
  local_part := split_part(email_address, '@', 1);

  IF local_part = ANY(reserved_names) THEN
    RETURN false;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM platform_tenants
    WHERE tenant_email_address = email_address
  ) INTO is_available;

  RETURN is_available;
END;
$$;

GRANT EXECUTE ON FUNCTION check_email_availability(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Insert the ClearNav platform tenant row (if not already present)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO platform_tenants (
  id,
  slug,
  name,
  status,
  contact_email,
  tenant_email_address,
  email_verified,
  email_claimed_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'clearnav',
  'ClearNav Platform',
  'active',
  'info@ghetto.finance',
  'platform@clearnav.cv',
  true,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM platform_tenants WHERE slug = 'clearnav'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Insert info@clearnav.cv and compliance@clearnav.cv email accounts
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO email_accounts (
  id,
  tenant_id,
  email_address,
  email_handle,
  display_name,
  account_type,
  is_active
)
SELECT
  '00000000-0000-0000-0001-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'info@clearnav.cv',
  'info',
  'ClearNav Info',
  'department',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_accounts WHERE email_address = 'info@clearnav.cv'
);

INSERT INTO email_accounts (
  id,
  tenant_id,
  email_address,
  email_handle,
  display_name,
  account_type,
  is_active
)
SELECT
  '00000000-0000-0000-0001-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'compliance@clearnav.cv',
  'compliance',
  'ClearNav Compliance',
  'department',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_accounts WHERE email_address = 'compliance@clearnav.cv'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Grant platform admin user full access to both accounts
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO email_account_access (
  account_id,
  user_id,
  access_level,
  granted_by,
  granted_at
)
SELECT
  '00000000-0000-0000-0001-000000000001'::uuid,
  '155f4682-e1f8-4d5e-acb3-7614d2d107f6'::uuid,
  'full',
  '155f4682-e1f8-4d5e-acb3-7614d2d107f6'::uuid,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM email_account_access
  WHERE account_id = '00000000-0000-0000-0001-000000000001'::uuid
    AND user_id = '155f4682-e1f8-4d5e-acb3-7614d2d107f6'::uuid
);

INSERT INTO email_account_access (
  account_id,
  user_id,
  access_level,
  granted_by,
  granted_at
)
SELECT
  '00000000-0000-0000-0001-000000000002'::uuid,
  '155f4682-e1f8-4d5e-acb3-7614d2d107f6'::uuid,
  'full',
  '155f4682-e1f8-4d5e-acb3-7614d2d107f6'::uuid,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM email_account_access
  WHERE account_id = '00000000-0000-0000-0001-000000000002'::uuid
    AND user_id = '155f4682-e1f8-4d5e-acb3-7614d2d107f6'::uuid
);
