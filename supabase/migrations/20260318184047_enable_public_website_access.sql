/*
  # Enable Public Website Access for White-Label Sites

  ## Overview
  This migration enables anonymous users to view published tenant websites by adding
  public-access RLS policies and a site status control mechanism.

  ## Changes

  1. New Columns
    - Add `site_status` to tenant_settings (values: 'live', 'coming_soon', 'maintenance')
    - Add `is_primary` to tenant_domains (mark canonical domain)
    - Add `domain_type` to tenant_domains (values: 'apex', 'subdomain')

  2. New RLS Policies (Anonymous Access)
    - website_content: SELECT published content
    - site_themes: SELECT active themes
    - site_pages: SELECT published pages
    - navigation_menus: SELECT all menus

  3. Security
    - All policies carefully scoped to published/active content only
    - Anonymous users can only SELECT, never INSERT/UPDATE/DELETE
    - Existing authenticated policies remain unchanged
*/

-- Add site_status column to tenant_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_settings' AND column_name = 'site_status'
  ) THEN
    ALTER TABLE tenant_settings ADD COLUMN site_status text DEFAULT 'coming_soon' CHECK (site_status IN ('live', 'coming_soon', 'maintenance'));
  END IF;
END $$;

-- Add domain management columns to tenant_domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_domains' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE tenant_domains ADD COLUMN is_primary boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_domains' AND column_name = 'domain_type'
  ) THEN
    ALTER TABLE tenant_domains ADD COLUMN domain_type text CHECK (domain_type IN ('apex', 'subdomain'));
  END IF;
END $$;

-- Create indexes for domain lookups
CREATE INDEX IF NOT EXISTS idx_tenant_domains_verified ON tenant_domains(domain, is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_tenant_domains_primary ON tenant_domains(tenant_id, is_primary) WHERE is_primary = true;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view published content" ON website_content;
  DROP POLICY IF EXISTS "Anyone can view active themes" ON site_themes;
  DROP POLICY IF EXISTS "Anyone can view published pages" ON site_pages;
  DROP POLICY IF EXISTS "Anyone can view navigation menus" ON navigation_menus;
END $$;

-- Anonymous access policy: website_content (published sections)
CREATE POLICY "Anyone can view published content"
  ON website_content
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Anonymous access policy: site_themes (active themes)
CREATE POLICY "Anyone can view active themes"
  ON site_themes
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Anonymous access policy: site_pages (published pages)
CREATE POLICY "Anyone can view published pages"
  ON site_pages
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Anonymous access policy: navigation_menus (all menus)
CREATE POLICY "Anyone can view navigation menus"
  ON navigation_menus
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Function to get tenant settings including site status (read-only for anonymous)
CREATE OR REPLACE FUNCTION get_tenant_public_settings(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'site_status', COALESCE(site_status, 'coming_soon'),
    'branding', COALESCE(branding, '{}'::jsonb)
  )
  FROM tenant_settings
  WHERE tenant_id = p_tenant_id;
$$;

-- Grant execute to anonymous users
GRANT EXECUTE ON FUNCTION get_tenant_public_settings(uuid) TO anon, authenticated;

COMMENT ON FUNCTION get_tenant_public_settings IS 'Returns public-safe tenant settings for rendering white-label websites';
