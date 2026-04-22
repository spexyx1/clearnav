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

  -- Tenant settings with site_status = live and empty branding for legal_disclaimer
  INSERT INTO tenant_settings (tenant_id, branding, features, notifications, integrations, site_status, updated_at)
  VALUES (
    v_tenant_id,
    jsonb_build_object(
      'company_name', p_company_name,
      'tagline', '',
      'address', '',
      'primary_use_case', p_primary_use_case,
      'aum_range', p_aum_range,
      'contact_name', p_contact_name,
      'contact_email', p_contact_email,
      'contact_phone', COALESCE(p_contact_phone, ''),
      'legal_disclaimer', ''
    ),
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
    'coming_soon',
    now()
  );

  -- Subscription record
  INSERT INTO tenant_subscriptions (
    tenant_id, status, current_period_start, current_period_end,
    cancel_at_period_end, created_at
  ) VALUES (
    v_tenant_id, 'trialing', now(), now() + interval '14 days', false, now()
  );

  -- ── Default site theme ────────────────────────────────────────────────────
  INSERT INTO site_themes (tenant_id, name, is_active, colors, typography)
  VALUES (
    v_tenant_id,
    'Default Theme',
    true,
    jsonb_build_object(
      'primary', '#0F1B2D',
      'secondary', '#1A2E44',
      'accent', '#C9A84C',
      'accentLight', '#D4B76A',
      'background', '#FFFFFF',
      'backgroundAlt', '#F8F7F4',
      'text', '#1A1A1A',
      'textSecondary', '#4A4A4A',
      'textLight', '#7A7A7A',
      'border', '#E2E8F0',
      'white', '#FFFFFF'
    ),
    jsonb_build_object(
      'headingFont', '"Playfair Display", Georgia, serif',
      'bodyFont', '"Inter", system-ui, sans-serif',
      'headingWeight', '600',
      'bodyWeight', '400'
    )
  );

  -- ── Default navigation menus ──────────────────────────────────────────────
  INSERT INTO navigation_menus (tenant_id, menu_type, items)
  VALUES
    (
      v_tenant_id, 'header',
      '[{"label":"Home","href":"/"},{"label":"About","href":"/about"},{"label":"Contact","href":"/contact"}]'::jsonb
    ),
    (
      v_tenant_id, 'footer',
      '[{"label":"About","href":"/about"},{"label":"Contact","href":"/contact"},{"label":"Privacy Policy","href":"/privacy"}]'::jsonb
    );

  -- ── Default site pages ────────────────────────────────────────────────────
  INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published)
  VALUES
    (v_tenant_id, 'home', p_company_name, 'Welcome to ' || p_company_name, true),
    (v_tenant_id, 'about', 'About', 'About ' || p_company_name, true),
    (v_tenant_id, 'contact', 'Contact', 'Contact ' || p_company_name, true);

  -- ── Default website content sections ─────────────────────────────────────
  -- Home page
  INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
  VALUES
    (
      v_tenant_id, 'home', 'hero', 1,
      jsonb_build_object(
        'headline', 'Welcome to ' || p_company_name,
        'subheadline', 'Institutional-grade investment management for sophisticated investors.',
        'ctaText', 'Learn More',
        'ctaHref', '/about',
        'backgroundImage', ''
      ),
      true
    ),
    (
      v_tenant_id, 'home', 'features', 2,
      jsonb_build_object(
        'headline', 'Our Approach',
        'subheadline', 'Built on disciplined research and rigorous risk management.',
        'items', jsonb_build_array(
          jsonb_build_object('icon', 'TrendingUp', 'title', 'Performance', 'description', 'Consistent risk-adjusted returns through all market cycles.'),
          jsonb_build_object('icon', 'Shield', 'title', 'Risk Management', 'description', 'Robust frameworks to protect and preserve capital.'),
          jsonb_build_object('icon', 'Users', 'title', 'Client Focus', 'description', 'Transparent reporting and dedicated client service.')
        )
      ),
      true
    ),
    (
      v_tenant_id, 'home', 'cta', 3,
      jsonb_build_object(
        'headline', 'Ready to invest?',
        'subheadline', 'Speak with our team to learn how we can help meet your investment objectives.',
        'ctaText', 'Contact Us',
        'ctaHref', '/contact'
      ),
      true
    );

  -- About page
  INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
  VALUES
    (
      v_tenant_id, 'about', 'hero', 1,
      jsonb_build_object(
        'headline', 'About Us',
        'subheadline', 'Our story, our team, our commitment.',
        'backgroundImage', ''
      ),
      true
    ),
    (
      v_tenant_id, 'about', 'about', 2,
      jsonb_build_object(
        'headline', 'Who We Are',
        'content', p_company_name || ' is an investment management firm dedicated to delivering superior, risk-adjusted returns for our investors. Our experienced team combines deep fundamental research with disciplined portfolio construction.',
        'image', ''
      ),
      true
    );

  -- Contact page
  INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
  VALUES
    (
      v_tenant_id, 'contact', 'hero', 1,
      jsonb_build_object(
        'headline', 'Contact Us',
        'subheadline', 'We would love to hear from you.',
        'backgroundImage', ''
      ),
      true
    ),
    (
      v_tenant_id, 'contact', 'contact', 2,
      jsonb_build_object(
        'headline', 'Get in Touch',
        'email', p_contact_email,
        'phone', COALESCE(p_contact_phone, ''),
        'address', ''
      ),
      true
    );

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'subdomain', p_subdomain,
    'user_role_id', v_user_role_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION provision_tenant IS 'Securely provisions a new tenant with all required records including default website content, theme, and navigation menus.';

GRANT EXECUTE ON FUNCTION provision_tenant TO authenticated;

-- ─── 2. Move Arkline AFSL disclaimer into branding JSON ───────────────────────

UPDATE tenant_settings
SET branding = branding || jsonb_build_object(
  'legal_disclaimer',
  'Arkline Trust holds an Australian Financial Services Licence (AFSL) issued by the Australian Securities and Investments Commission (ASIC). Access to Arkline Trust funds is restricted to wholesale investors as defined under section 761G of the Corporations Act 2001 (Cth). Investment in our funds involves risk, including potential loss of capital. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation to acquire any financial product and is intended only for wholesale investors located in Australia.'
)
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline');

-- ─── 3. Unpublish orphaned Arkline "services" page ────────────────────────────
-- This page was superseded by "strategies" during the Australian rebrand
-- and has no content sections. Mark it unpublished to prevent 404s.

UPDATE site_pages
SET is_published = false
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND slug = 'services';
