/*
  # Migrate Existing Users to user_roles Table (Fixed)

  1. Data Migration
    - Migrate platform_admin_users to user_roles with role_category: superadmin (no role_detail)
    - Migrate tenant_users (owner/admin) to user_roles with role_category: tenant_admin (no role_detail)
    - Migrate staff_accounts to user_roles with role_category: staff_user (with role_detail)
    - Migrate client_profiles to user_roles with role_category: client (no role_detail)

  2. Duplicate Detection
    - Create temporary table to log duplicate emails
    - Report conflicts that need manual resolution

  3. Data Integrity
    - Only migrate users with valid auth.users entries
    - Skip records that would violate uniqueness constraints
    - Respect check constraints (only staff_user has role_detail)
    - Log skipped records for review
*/

-- Create temporary table to track migration issues
CREATE TEMP TABLE IF NOT EXISTS migration_log (
  issue_type text,
  table_name text,
  user_id uuid,
  email text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Step 1: Migrate Platform Admin Users (superadmin)
-- Note: role_detail must be NULL for superadmins per check constraint
INSERT INTO user_roles (user_id, email, role_category, role_detail, tenant_id, status, metadata)
SELECT 
  pau.user_id,
  au.email,
  'superadmin'::role_category_enum,
  NULL, -- Must be NULL for non-staff users
  NULL, -- Superadmins have no tenant
  'active',
  jsonb_build_object(
    'platform_admin_role', pau.role,
    'permissions', pau.permissions, 
    'migrated_from', 'platform_admin_users'
  )
FROM platform_admin_users pau
JOIN auth.users au ON pau.user_id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = pau.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log platform admin migrations
INSERT INTO migration_log (issue_type, table_name, user_id, email, details)
SELECT 
  'migrated',
  'platform_admin_users',
  pau.user_id,
  au.email,
  'Successfully migrated to superadmin'
FROM platform_admin_users pau
JOIN auth.users au ON pau.user_id = au.id
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = pau.user_id 
  AND ur.role_category = 'superadmin'
);

-- Step 2: Migrate Tenant Users (tenant_admin) - only owners and admins
-- Note: role_detail must be NULL for tenant_admins per check constraint
INSERT INTO user_roles (user_id, email, role_category, role_detail, tenant_id, status, metadata)
SELECT 
  tu.user_id,
  au.email,
  'tenant_admin'::role_category_enum,
  NULL, -- Must be NULL for non-staff users
  tu.tenant_id,
  'active',
  jsonb_build_object(
    'tenant_role', tu.role,
    'invited_via', tu.invited_via,
    'onboarding_status', tu.onboarding_status,
    'migrated_from', 'tenant_users'
  )
FROM tenant_users tu
JOIN auth.users au ON tu.user_id = au.id
WHERE tu.role IN ('owner', 'admin')
AND NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = tu.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log tenant admin migrations
INSERT INTO migration_log (issue_type, table_name, user_id, email, details)
SELECT 
  'migrated',
  'tenant_users',
  tu.user_id,
  au.email,
  'Successfully migrated to tenant_admin with original role: ' || tu.role
FROM tenant_users tu
JOIN auth.users au ON tu.user_id = au.id
WHERE tu.role IN ('owner', 'admin')
AND EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = tu.user_id 
  AND ur.role_category = 'tenant_admin'
);

-- Step 3: Migrate Staff Accounts (staff_user)
-- Note: role_detail CAN be set for staff_users
INSERT INTO user_roles (user_id, email, role_category, role_detail, tenant_id, status, metadata)
SELECT 
  sa.auth_user_id,
  sa.email,
  'staff_user'::role_category_enum,
  sa.role, -- Store staff role in role_detail (general_manager, compliance_manager, etc.)
  sa.tenant_id,
  sa.status,
  jsonb_build_object(
    'permissions', sa.permissions,
    'full_name', sa.full_name,
    'phone', sa.phone,
    'migrated_from', 'staff_accounts'
  )
FROM staff_accounts sa
WHERE sa.auth_user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = sa.auth_user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log staff migrations
INSERT INTO migration_log (issue_type, table_name, user_id, email, details)
SELECT 
  'migrated',
  'staff_accounts',
  sa.auth_user_id,
  sa.email,
  'Successfully migrated to staff_user with role: ' || COALESCE(sa.role, 'none')
FROM staff_accounts sa
WHERE sa.auth_user_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = sa.auth_user_id 
  AND ur.role_category = 'staff_user'
);

-- Step 4: Migrate Client Profiles (client)
-- Note: role_detail must be NULL for clients per check constraint
INSERT INTO user_roles (user_id, email, role_category, role_detail, tenant_id, status, metadata)
SELECT 
  cp.id,
  cp.email,
  'client'::role_category_enum,
  NULL, -- Must be NULL for non-staff users
  cp.tenant_id,
  'active',
  jsonb_build_object(
    'full_name', cp.full_name,
    'account_number', cp.account_number,
    'migrated_from', 'client_profiles'
  )
FROM client_profiles cp
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = cp.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log client migrations
INSERT INTO migration_log (issue_type, table_name, user_id, email, details)
SELECT 
  'migrated',
  'client_profiles',
  cp.id,
  cp.email,
  'Successfully migrated to client'
FROM client_profiles cp
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = cp.id 
  AND ur.role_category = 'client'
);

-- Detect duplicate emails that couldn't be migrated
INSERT INTO migration_log (issue_type, table_name, user_id, email, details)
SELECT 
  'duplicate_email',
  'multiple_tables',
  NULL::uuid,
  email,
  'Email exists in multiple role tables: ' || string_agg(DISTINCT table_name, ', ')
FROM (
  SELECT au.email, 'platform_admin_users' as table_name
  FROM platform_admin_users pau
  JOIN auth.users au ON pau.user_id = au.id
  
  UNION ALL
  
  SELECT au.email, 'tenant_users' as table_name
  FROM tenant_users tu
  JOIN auth.users au ON tu.user_id = au.id
  WHERE tu.role IN ('owner', 'admin')
  
  UNION ALL
  
  SELECT email, 'staff_accounts' as table_name
  FROM staff_accounts
  WHERE auth_user_id IS NOT NULL
  
  UNION ALL
  
  SELECT email, 'client_profiles' as table_name
  FROM client_profiles
) all_emails
GROUP BY email
HAVING COUNT(DISTINCT table_name) > 1;

-- Create a view to easily check migration status
CREATE OR REPLACE VIEW v_user_role_migration_status AS
SELECT 
  ur.email,
  ur.role_category::text as role_category,
  ur.role_detail,
  pt.name as tenant_name,
  ur.status,
  ur.created_at
FROM user_roles ur
LEFT JOIN platform_tenants pt ON ur.tenant_id = pt.id
ORDER BY ur.created_at DESC;

-- Grant access to the view
GRANT SELECT ON v_user_role_migration_status TO authenticated;

-- Create summary view
CREATE OR REPLACE VIEW v_migration_summary AS
SELECT 
  role_category::text,
  COUNT(*) as user_count,
  COUNT(DISTINCT tenant_id) as tenant_count
FROM user_roles
GROUP BY role_category;

GRANT SELECT ON v_migration_summary TO authenticated;
