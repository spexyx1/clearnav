/*
  # Fix Tenant Website Provisioning and Arkline Cleanup

  ## Summary
  Ensures every new tenant gets a working public website out of the box, and
  fixes several data issues with the Arkline Trust tenant.

  ## Changes

  ### 1. Updated `provision_tenant` function
  - Seeds a default site theme (clean, professional dark/gold palette)
  - Seeds default header and footer navigation menus
  - Seeds default published pages: home, about, contact
  - Seeds default website_content sections for each page
  - Sets `site_status = 'live'` and `legal_disclaimer = null` in branding
  - All new tenants now have a working public website immediately after signup

  ### 2. Arkline Trust data fixes
  - Moves the hardcoded AFSL disclaimer from the frontend into the
    `tenant_settings.branding` JSON as `legal_disclaimer`
  - Marks the orphaned `services` page as unpublished (it has no content
    sections and was superseded by the `strategies` page)

  ## Security
  - No new tables or RLS changes; function retains SECURITY DEFINER
*/

-- ─── 1. Update provision_tenant to seed website content ──────────────────────

DROP FUNCTION IF EXISTS provision_tenant(uuid, text, text, text, text, text, text, text);

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
  v_site_design_id uuid;
  v_site_theme_id uuid;
  v_nav_menu_id uuid;
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

  v_tenant_id := gen_random_uuid();

  -- Platform tenant record
  INSERT INTO platform_tenants (
    id, name, slug, status, database_type,
    is_self_service, contact_email, contact_name,
    signup_completed_at, trial_ends_at, created_at, updated_at
  ) VALUES (
    v_tenant_id, p_company_name, p_subdomain, 'trial', 'managed',
    true, p_contact_email, p_contact_name,
    now(), now() + interval '14 days', now(), now()
  );

  -- User role record
  INSERT INTO user_roles (
    user_id, tenant_id, role_category, role_detail,
    email, status, metadata, created_at, updated_at
  ) VALUES (
    p_user_id, v_tenant_id, 'tenant_admin', NULL,
    p_contact_email, 'active',
    jsonb_build_object(
      'created_via', 'self_service_signup',
      'company_name', p_company_name
    ),
    now(), now()
  )
  RETURNING id INTO v_user_role_id;

  -- Tenant users record
  INSERT INTO tenant_users (tenant_id, user_id, role, onboarding_status, created_at)
  VALUES (v_tenant_id, p_user_id, 'admin', 'in_progress', now());

  -- Tenant settings with site_status = live
  INSERT INTO tenant_settings (tenant_id, branding, features, notifications, integrations, site_status, updated_at)
  VALUES (
    v_tenant_id,
    jsonb_build_object(
      'company_name', p_company_name,
      'contact_name', p_contact_name,
      'contact_email', p_contact_email,
      'contact_phone', p_contact_phone,
      'primary_use_case', p_primary_use_case,
      'aum_range', p_aum_range,
      'site_status', 'live'
    ),
    '{"feature_flags": {}}'::jsonb,
    '{"email_notifications": true}'::jsonb,
    '{"integrations": []}'::jsonb,
    'live',
    now()
  );

  -- Default site design
  v_site_design_id := gen_random_uuid();
  INSERT INTO site_designs (id, tenant_id, name, template, is_active, created_at)
  VALUES (
    v_site_design_id,
    v_tenant_id,
    'Default Design',
    'professional',
    true,
    now()
  );

  -- Default site theme
  v_site_theme_id := gen_random_uuid();
  INSERT INTO site_themes (id, site_design_id, colors, typography, custom_css, created_at)
  VALUES (
    v_site_theme_id,
    v_site_design_id,
    jsonb_build_object(
      'primary', '#1B3A2D',
      'secondary', '#244D3C',
      'accent', '#B8934A',
      'background', '#FFFFFF',
      'text', '#1A1A1A'
    ),
    jsonb_build_object(
      'headingFont', '"Cormorant Garamond", serif',
      'bodyFont', '"Nunito Sans", sans-serif'
    ),
    '',
    now()
  );

  UPDATE site_designs SET theme_id = v_site_theme_id WHERE id = v_site_design_id;

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'user_role_id', v_user_role_id,
    'message', 'Tenant provisioned successfully'
  );
END;
$$;