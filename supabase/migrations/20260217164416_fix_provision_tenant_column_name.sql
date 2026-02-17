/*
  # Fix provision_tenant function column name

  1. Changes
    - Update function to use 'slug' instead of 'subdomain' for platform_tenants table
    - The platform_tenants table uses 'slug' not 'subdomain' as the column name

  2. Notes
    - Drops and recreates the function with correct column name
*/

-- Drop existing function
DROP FUNCTION IF EXISTS provision_tenant(uuid, text, text, text, text, text, text, text);

-- Recreate the secure tenant provisioning function with correct column name
CREATE OR REPLACE FUNCTION provision_tenant(
  p_user_id uuid,
  p_company_name text,
  p_subdomain text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text DEFAULT NULL,
  p_primary_use_case text DEFAULT 'hedge_fund',
  p_aum_range text DEFAULT 'under_10m'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_role_id uuid;
  v_result json;
BEGIN
  -- Validate authentication
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: User must be authenticated and match provided user_id'
    );
  END IF;

  -- Check if user already has a tenant or role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User already has an account or role assigned'
    );
  END IF;

  -- Check subdomain uniqueness using 'slug' column
  IF EXISTS (SELECT 1 FROM platform_tenants WHERE slug = p_subdomain) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Subdomain already taken'
    );
  END IF;

  -- Check email uniqueness in user_roles
  IF EXISTS (SELECT 1 FROM user_roles WHERE email = p_contact_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email already registered'
    );
  END IF;

  -- Generate tenant ID
  v_tenant_id := gen_random_uuid();

  -- Insert platform_tenants record using 'slug' column
  INSERT INTO platform_tenants (
    id,
    name,
    slug,
    status,
    is_self_service,
    onboarding_completed,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_company_name,
    p_subdomain,
    'trial',
    true,
    false,
    now(),
    now()
  );

  -- Insert user_roles record (tenant_admin)
  INSERT INTO user_roles (
    user_id,
    tenant_id,
    role_category,
    role_name,
    email,
    full_name,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_tenant_id,
    'tenant_admin',
    'Fund Manager',
    p_contact_email,
    p_contact_name,
    'active',
    now(),
    now()
  )
  RETURNING id INTO v_user_role_id;

  -- Insert tenant_users record
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    status,
    created_at
  ) VALUES (
    v_tenant_id,
    p_user_id,
    'manager',
    'active',
    now()
  );

  -- Insert tenant_settings record
  INSERT INTO tenant_settings (
    tenant_id,
    primary_use_case,
    aum_range,
    contact_name,
    contact_email,
    contact_phone,
    onboarding_step,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_primary_use_case,
    p_aum_range,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    'basic_info',
    now(),
    now()
  );

  -- Insert tenant_subscriptions record
  INSERT INTO tenant_subscriptions (
    tenant_id,
    plan_name,
    plan_type,
    status,
    billing_cycle,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    'Trial',
    'trial',
    'trialing',
    'monthly',
    now() + interval '14 days',
    now(),
    now()
  );

  -- Return success with tenant details
  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'subdomain', p_subdomain,
    'user_role_id', v_user_role_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION provision_tenant IS 'Securely provisions a new tenant with all required records. Runs with elevated privileges to bypass RLS. Validates user authentication and data uniqueness.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION provision_tenant TO authenticated;