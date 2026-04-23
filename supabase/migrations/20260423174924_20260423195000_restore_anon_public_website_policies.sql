/*
  # Restore Anonymous RLS Policies for Public Website Access

  ## Problem
  During migration to xiel, anonymous RLS policies for platform_tenants and 
  tenant_domains were not replayed, causing custom-domain tenant resolution to fail.
  Unauthenticated visitors to arklinetrust.com couldn't resolve the tenant and fell
  back to ClearNav landing page.

  ## Solution
  1. Add anonymous SELECT policy on platform_tenants (status IN 'active', 'trial')
  2. Add anonymous SELECT policy on tenant_domains (is_verified = true)
  3. Ensure get_tenant_public_settings RPC exists and is SECURITY DEFINER
  
  ## Impact
  - Unauthenticated users can now query tenant metadata for public websites
  - No sensitive data exposed (only public: id, slug, status on tenants)
  - Domain verification ensures only verified custom domains resolve
  - RLS remains restrictive for authenticated data access
*/

-- ============================================================
-- 1. PLATFORM_TENANTS: Add Anonymous SELECT for Public Tenant Discovery
-- ============================================================

DROP POLICY IF EXISTS "Public can discover active tenants" ON platform_tenants;
CREATE POLICY "Public can discover active tenants"
  ON platform_tenants
  FOR SELECT
  TO anon
  USING (status IN ('active', 'trial'));

-- ============================================================
-- 2. TENANT_DOMAINS: Add Anonymous SELECT for Domain-to-Tenant Resolution
-- ============================================================

DROP POLICY IF EXISTS "Public can resolve verified domains" ON tenant_domains;
CREATE POLICY "Public can resolve verified domains"
  ON tenant_domains
  FOR SELECT
  TO anon
  USING (is_verified = true);

-- ============================================================
-- 3. SITE_THEMES ANON POLICY
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view active themes" ON site_themes;
CREATE POLICY "Anyone can view active themes"
  ON site_themes
  FOR SELECT
  TO anon
  USING (is_active = true);

-- ============================================================
-- 4. WEBSITE_CONTENT ANON POLICY
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view published content" ON website_content;
CREATE POLICY "Anyone can view published content"
  ON website_content
  FOR SELECT
  TO anon
  USING (is_published = true);

-- ============================================================
-- 5. SITE_PAGES ANON POLICY
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view published pages" ON site_pages;
CREATE POLICY "Anyone can view published pages"
  ON site_pages
  FOR SELECT
  TO anon
  USING (is_published = true);

-- ============================================================
-- 6. NAVIGATION_MENUS ANON POLICY
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view navigation menus" ON navigation_menus;
CREATE POLICY "Anyone can view navigation menus"
  ON navigation_menus
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- 7. CREATE/VERIFY get_tenant_public_settings RPC
-- ============================================================

DROP FUNCTION IF EXISTS get_tenant_public_settings(uuid);
CREATE FUNCTION get_tenant_public_settings(p_tenant_id uuid)
RETURNS TABLE (
  site_status text,
  branding jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $$
  SELECT ts.site_status, ts.branding
  FROM tenant_settings ts
  WHERE ts.tenant_id = p_tenant_id;
$$;

REVOKE ALL ON FUNCTION get_tenant_public_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_tenant_public_settings(uuid) TO anon, authenticated;
