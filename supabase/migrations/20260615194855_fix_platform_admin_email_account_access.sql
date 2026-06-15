
-- Fix: Grant platform admin user full access to info@clearnav.cv and compliance@clearnav.cv
-- The original migration referenced a non-existent user ID. This corrects it by looking up
-- the actual platform admin user dynamically.

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the actual platform admin user ID
  SELECT user_id INTO admin_user_id
  FROM platform_admin_users
  WHERE role = 'super_admin'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No super_admin found in platform_admin_users';
  END IF;

  -- Grant full access to info@clearnav.cv
  INSERT INTO email_account_access (account_id, user_id, access_level, granted_by, granted_at)
  VALUES (
    '00000000-0000-0000-0001-000000000001',
    admin_user_id,
    'full',
    admin_user_id,
    now()
  )
  ON CONFLICT (account_id, user_id) DO UPDATE
    SET access_level = 'full', granted_at = now();

  -- Grant full access to compliance@clearnav.cv
  INSERT INTO email_account_access (account_id, user_id, access_level, granted_by, granted_at)
  VALUES (
    '00000000-0000-0000-0001-000000000002',
    admin_user_id,
    'full',
    admin_user_id,
    now()
  )
  ON CONFLICT (account_id, user_id) DO UPDATE
    SET access_level = 'full', granted_at = now();

END $$;
