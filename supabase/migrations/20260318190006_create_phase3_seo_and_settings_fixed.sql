/*
  # Create Phase 3: SEO and Advanced Settings

  ## Overview
  Adds comprehensive SEO management, analytics, custom CSS, and performance settings
  for white-label websites.

  ## What This Creates
  1. `website_seo_settings` - Per-page SEO configuration
  2. `website_analytics` - Analytics tracking codes
  3. `website_custom_css` - Custom CSS overrides
  4. `website_performance_settings` - Performance and caching config
  5. Helper functions for SEO and sitemap generation

  ## Security
  - All tables scoped to tenant_id
  - Only tenant admins can modify settings
  - Public read for published content
*/

-- ============================================================================
-- SEO SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  page_slug text NOT NULL,
  
  -- Basic SEO
  meta_title text,
  meta_description text,
  meta_keywords text[],
  canonical_url text,
  robots_directives text[] DEFAULT ARRAY['index', 'follow'],
  
  -- Open Graph (Facebook, LinkedIn)
  og_title text,
  og_description text,
  og_image_url text,
  og_type text DEFAULT 'website',
  
  -- Twitter Cards
  twitter_card_type text DEFAULT 'summary_large_image',
  twitter_title text,
  twitter_description text,
  twitter_image_url text,
  twitter_site text,
  twitter_creator text,
  
  -- Schema.org JSON-LD
  schema_markup jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, page_slug)
);

CREATE INDEX IF NOT EXISTS idx_seo_settings_tenant ON website_seo_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seo_settings_page ON website_seo_settings(tenant_id, page_slug);

-- ============================================================================
-- ANALYTICS CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Google Analytics
  google_analytics_id text,
  google_tag_manager_id text,
  
  -- Facebook Pixel
  facebook_pixel_id text,
  
  -- Other Analytics
  plausible_domain text,
  hotjar_site_id text,
  
  -- Custom Scripts
  custom_header_scripts text,
  custom_footer_scripts text,
  
  -- Privacy Settings
  enable_cookie_consent boolean DEFAULT true,
  anonymize_ip boolean DEFAULT true,
  
  -- Status
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON website_analytics(tenant_id);

-- ============================================================================
-- CUSTOM CSS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_custom_css (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- CSS Content
  custom_css text,
  compiled_css text,
  
  -- Metadata
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  last_published_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_css_tenant ON website_custom_css(tenant_id);

-- ============================================================================
-- PERFORMANCE SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_performance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Caching
  enable_browser_caching boolean DEFAULT true,
  cache_duration_days integer DEFAULT 7,
  
  -- Images
  enable_lazy_loading boolean DEFAULT true,
  enable_image_optimization boolean DEFAULT true,
  image_quality integer DEFAULT 85,
  
  -- Scripts
  defer_javascript boolean DEFAULT true,
  minify_css boolean DEFAULT true,
  minify_js boolean DEFAULT true,
  
  -- Loading
  enable_preload_fonts boolean DEFAULT true,
  enable_critical_css boolean DEFAULT false,
  
  -- CDN
  cdn_url text,
  enable_cdn boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_performance_tenant ON website_performance_settings(tenant_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- SEO Settings RLS
ALTER TABLE website_seo_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published SEO settings" ON website_seo_settings;
CREATE POLICY "Public can view published SEO settings"
  ON website_seo_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Tenant admins can manage SEO settings" ON website_seo_settings;
CREATE POLICY "Tenant admins can manage SEO settings"
  ON website_seo_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = website_seo_settings.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Analytics RLS
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can manage analytics" ON website_analytics;
CREATE POLICY "Tenant admins can manage analytics"
  ON website_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = website_analytics.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Custom CSS RLS
ALTER TABLE website_custom_css ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active CSS" ON website_custom_css;
CREATE POLICY "Public can view active CSS"
  ON website_custom_css
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admins can manage CSS" ON website_custom_css;
CREATE POLICY "Tenant admins can manage CSS"
  ON website_custom_css
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = website_custom_css.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Performance Settings RLS
ALTER TABLE website_performance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view performance settings" ON website_performance_settings;
CREATE POLICY "Public can view performance settings"
  ON website_performance_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Tenant admins can manage performance" ON website_performance_settings;
CREATE POLICY "Tenant admins can manage performance"
  ON website_performance_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = website_performance_settings.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate sitemap XML for tenant
CREATE OR REPLACE FUNCTION generate_sitemap_xml(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_domain text;
  v_sitemap text;
  v_page record;
BEGIN
  -- Get tenant's primary domain
  SELECT domain INTO v_domain
  FROM tenant_domains
  WHERE tenant_id = p_tenant_id
  AND is_primary = true
  AND status = 'active'
  LIMIT 1;

  IF v_domain IS NULL THEN
    SELECT subdomain || '.example.com' INTO v_domain
    FROM platform_tenants
    WHERE id = p_tenant_id;
  END IF;

  -- Start sitemap
  v_sitemap := '<?xml version="1.0" encoding="UTF-8"?>' || E'\n';
  v_sitemap := v_sitemap || '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' || E'\n';

  -- Add pages from website_pages
  FOR v_page IN
    SELECT slug, updated_at
    FROM website_pages
    WHERE tenant_id = p_tenant_id
    AND is_published = true
    ORDER BY slug
  LOOP
    v_sitemap := v_sitemap || '  <url>' || E'\n';
    v_sitemap := v_sitemap || '    <loc>https://' || v_domain || '/' || v_page.slug || '</loc>' || E'\n';
    v_sitemap := v_sitemap || '    <lastmod>' || to_char(v_page.updated_at, 'YYYY-MM-DD') || '</lastmod>' || E'\n';
    v_sitemap := v_sitemap || '    <changefreq>weekly</changefreq>' || E'\n';
    v_sitemap := v_sitemap || '    <priority>0.8</priority>' || E'\n';
    v_sitemap := v_sitemap || '  </url>' || E'\n';
  END LOOP;

  -- Close sitemap
  v_sitemap := v_sitemap || '</urlset>';

  RETURN v_sitemap;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_sitemap_xml(uuid) TO authenticated, anon;

COMMENT ON FUNCTION generate_sitemap_xml IS 'Generates XML sitemap for a tenant website';

-- Function to get complete SEO data for a page
CREATE OR REPLACE FUNCTION get_page_seo_data(
  p_tenant_id uuid,
  p_page_slug text DEFAULT 'home'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_tenant record;
  v_seo record;
BEGIN
  -- Get tenant info
  SELECT
    company_name,
    subdomain
  INTO v_tenant
  FROM platform_tenants
  WHERE id = p_tenant_id;

  -- Get SEO settings
  SELECT * INTO v_seo
  FROM website_seo_settings
  WHERE tenant_id = p_tenant_id
  AND page_slug = p_page_slug;

  -- Build result
  v_result := jsonb_build_object(
    'tenant', jsonb_build_object(
      'company_name', v_tenant.company_name,
      'subdomain', v_tenant.subdomain
    ),
    'seo', row_to_json(v_seo)::jsonb
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_page_seo_data(uuid, text) TO authenticated, anon;

COMMENT ON FUNCTION get_page_seo_data IS 'Retrieves complete SEO data for a page';
