/*
  # Fix provision_tenant function - final schema corrections

  1. Changes
    - Fix tenant_users insert: remove status column, use onboarding_status instead
    - All other tables remain with correct schemas

  2. Schema Summary
    - platform_tenants: id, name, slug, status, database_type, is_self_service, contact_email, contact_name, signup_completed_at, trial_ends_at
    - user_roles: id, user_id, email, role_category, role_detail, tenant_id, status, metadata
    - tenant_users: id, user_id, tenant_id, role, created_at, invited_via, onboarding_status
    - tenant_settings: tenant_id, branding, features, notifications, integrations, updated_at
    - tenant_subscriptions: id, tenant_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
*/

-- Drop existing function
DROP FUNCTION IF EXISTS provision_tenant(uuid, text, text, text, text, text, text, text);

-- Recreate the secure tenant provisioning function with FINAL correct schemas
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

  -- Insert platform_tenants record
  INSERT INTO platform_tenants (
    id,
    name,
    slug,
    status,
    database_type,
    is_self_service,
    contact_email,
    contact_name,
    signup_completed_at,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_company_name,
    p_subdomain,
    'trial',
    'managed',
    true,
    p_contact_email,
    p_contact_name,
    now(),
    now() + interval '14 days',
    now(),
    now()
  );

  -- Insert user_roles record (tenant_admin)
  INSERT INTO user_roles (
    user_id,
    tenant_id,
    role_category,
    role_detail,
    email,
    status,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_tenant_id,
    'tenant_admin',
    NULL,
    p_contact_email,
    'active',
    jsonb_build_object(
      'created_via', 'self_service_signup',
      'full_name', p_contact_name,
      'company_name', p_company_name
    ),
    now(),
    now()
  )
  RETURNING id INTO v_user_role_id;

  -- Insert tenant_users record (with correct columns)
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    onboarding_status,
    created_at
  ) VALUES (
    v_tenant_id,
    p_user_id,
    'admin',
    'in_progress',
    now()
  );

  -- Insert tenant_settings record
  INSERT INTO tenant_settings (
    tenant_id,
    branding,
    features,
    notifications,
    integrations,
    updated_at
  ) VALUES (
    v_tenant_id,
    jsonb_build_object(
      'company_name', p_company_name,
      'primary_use_case', p_primary_use_case,
      'aum_range', p_aum_range,
      'contact_name', p_contact_name,
      'contact_email', p_contact_email,
      'contact_phone', p_contact_phone
    ),
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    now()
  );

  -- Insert tenant_subscriptions record
  INSERT INTO tenant_subscriptions (
    tenant_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    created_at
  ) VALUES (
    v_tenant_id,
    'trialing',
    now(),
    now() + interval '14 days',
    false,
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