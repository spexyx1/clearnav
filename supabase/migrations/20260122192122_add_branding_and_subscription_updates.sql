/*
  # Add Branding and Subscription Updates

  ## Overview
  Extends tenant_settings to support dynamic branding and landing page customization.
  Updates subscription plans to support flat monthly fee model.

  ## Changes Made

  ### 1. Tenant Branding Configuration
  - Extended tenant_settings.branding to include comprehensive brand options
  - Added landing_page JSON field for customizable marketing content
  - Added feature_flags field for module enablement per tenant

  ### 2. Subscription Model Updates
  - Set overage_price_per_user to 0 for flat monthly pricing
  - Added new subscription tiers (Starter, Professional, Enterprise)

  ### 3. Helper Functions
  - Function to get tenant by subdomain
  - Function to get tenant by custom domain
  - Function to get user's tenant ID
  - Function to check if tenant has feature enabled
*/

-- Create helper function to get tenant by subdomain
CREATE OR REPLACE FUNCTION get_tenant_by_subdomain(subdomain_slug text)
RETURNS uuid AS $$
  SELECT id FROM platform_tenants WHERE slug = subdomain_slug AND status = 'active' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Create helper function to get tenant by custom domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_name text)
RETURNS uuid AS $$
  SELECT tenant_id FROM tenant_domains 
  WHERE domain = domain_name 
  AND is_verified = true 
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Update tenant_settings to include default branding structure if not set
UPDATE tenant_settings
SET branding = jsonb_build_object(
  'logo_url', '',
  'favicon_url', '',
  'company_name', (SELECT name FROM platform_tenants WHERE platform_tenants.id = tenant_settings.tenant_id),
  'colors', jsonb_build_object(
    'primary', '#06b6d4',
    'secondary', '#0ea5e9',
    'accent', '#22d3ee',
    'background', '#020617',
    'text', '#ffffff'
  ),
  'fonts', jsonb_build_object(
    'heading', 'Inter',
    'body', 'Inter'
  ),
  'custom_css', ''
)
WHERE branding IS NULL OR branding = '{}';

-- Add landing_page field to tenant_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_settings' AND column_name = 'landing_page'
  ) THEN
    ALTER TABLE tenant_settings ADD COLUMN landing_page jsonb DEFAULT jsonb_build_object(
      'hero', jsonb_build_object(
        'title', 'Welcome to Our Platform',
        'subtitle', 'Institutional-Grade Investment Management',
        'description', 'Access your portfolio, track performance, and manage your investments with confidence.',
        'cta_text', 'Get Started',
        'background_image', ''
      ),
      'features', jsonb_build_array(
        jsonb_build_object(
          'title', 'Portfolio Management',
          'description', 'Real-time portfolio tracking and performance analytics',
          'icon', 'TrendingUp'
        ),
        jsonb_build_object(
          'title', 'Compliance & Security',
          'description', 'Bank-level security with comprehensive compliance tools',
          'icon', 'Shield'
        ),
        jsonb_build_object(
          'title', 'Document Management',
          'description', 'Secure document storage and easy access to tax forms',
          'icon', 'FileText'
        )
      ),
      'stats', jsonb_build_array(
        jsonb_build_object('label', 'AUM', 'value', '$0M'),
        jsonb_build_object('label', 'Clients', 'value', '0'),
        jsonb_build_object('label', 'Years', 'value', '0')
      ),
      'contact', jsonb_build_object(
        'email', 'contact@example.com',
        'phone', '',
        'address', ''
      )
    );
  END IF;
END $$;

-- Add feature_flags field to tenant_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_settings' AND column_name = 'feature_flags'
  ) THEN
    ALTER TABLE tenant_settings ADD COLUMN feature_flags jsonb DEFAULT jsonb_build_object(
      'enable_ibkr', true,
      'enable_compliance', true,
      'enable_crm', true,
      'enable_tax_docs', true,
      'enable_redemptions', true,
      'enable_risk_analytics', true,
      'enable_custom_domain', false,
      'enable_api_access', false
    );
  END IF;
END $$;

-- Update existing subscription plans to remove per-user overage charges (flat monthly fee model)
UPDATE subscription_plans
SET 
  overage_price_per_user = 0,
  user_limit = NULL
WHERE name IN ('Managed Database Plan', 'BYOD Plan');

-- Add new subscription tiers
INSERT INTO subscription_plans (name, price_monthly, database_type, user_limit, overage_price_per_user, features, is_active)
VALUES 
  (
    'Starter',
    299,
    'managed',
    NULL,
    0,
    jsonb_build_object(
      'max_clients', 25,
      'enable_ibkr', false,
      'enable_compliance', true,
      'enable_crm', true,
      'enable_tax_docs', true,
      'enable_custom_domain', false,
      'storage_gb', 10
    ),
    true
  ),
  (
    'Professional',
    599,
    'managed',
    NULL,
    0,
    jsonb_build_object(
      'max_clients', 100,
      'enable_ibkr', true,
      'enable_compliance', true,
      'enable_crm', true,
      'enable_tax_docs', true,
      'enable_custom_domain', true,
      'storage_gb', 50
    ),
    true
  ),
  (
    'Enterprise',
    1299,
    'managed',
    NULL,
    0,
    jsonb_build_object(
      'max_clients', -1,
      'enable_ibkr', true,
      'enable_compliance', true,
      'enable_crm', true,
      'enable_tax_docs', true,
      'enable_custom_domain', true,
      'enable_api_access', true,
      'storage_gb', -1,
      'dedicated_support', true
    ),
    true
  )
ON CONFLICT DO NOTHING;

-- Create function to get active tenant context from user
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create function to check if tenant has feature enabled
CREATE OR REPLACE FUNCTION tenant_has_feature(tenant_uuid uuid, feature_name text)
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT (feature_flags->>feature_name)::boolean 
     FROM tenant_settings 
     WHERE tenant_id = tenant_uuid),
    false
  );
$$ LANGUAGE sql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tenant_by_subdomain(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_tenant_by_domain(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION tenant_has_feature(uuid, text) TO authenticated;
