/*
  # Create Secure Tenant Provisioning Function

  1. Purpose
    - Fixes RLS policy violations during tenant creation
    - Provides secure, atomic tenant provisioning workflow
    - Handles all related table inserts in a single transaction

  2. Function: provision_tenant
    - Runs with SECURITY DEFINER to bypass RLS restrictions
    - Creates platform_tenants, user_roles, tenant_users, tenant_settings, tenant_subscriptions
    - Validates user authentication, email/slug uniqueness, no existing tenant
    - Returns structured JSON response with success status

  3. RLS Policy Updates
    - Adds backup INSERT policy for tenant_admin role creation
    - Allows authenticated users to create tenant_admin role for themselves
    - Only if they don't already have any role assigned

  4. Security
    - Validates auth.uid() is not null
    - Checks user doesn't already have a tenant or role
    - Verifies slug and email uniqueness
    - All operations in atomic transaction
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS provision_tenant(uuid, text, text, text, text, text, text, text);

-- Create the secure tenant provisioning function
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

  -- Check subdomain uniqueness
  IF EXISTS (SELECT 1 FROM platform_tenants WHERE subdomain = p_subdomain) THEN
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

  -- Insert platform_tenants record
  INSERT INTO platform_tenants (
    id,
    name,
    subdomain,
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

-- Add backup RLS policy for user_roles table
-- This allows tenant_admin creation during self-service signup as a fallback
DO $$
BEGIN
  -- Drop the policy if it exists
  DROP POLICY IF EXISTS "Users can create tenant_admin role during signup" ON user_roles;
  
  -- Create the policy
  CREATE POLICY "Users can create tenant_admin role during signup"
    ON user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid() 
      AND role_category = 'tenant_admin'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid()
      )
    );
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION provision_tenant TO authenticated;