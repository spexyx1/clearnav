/*
  # White Label Platform with Custom Domain Management

  1. Schema Extensions
    - Extend `tenant_domains` table with Vercel deployment tracking
    - Create `website_content` table for customizable page sections
    - Create `site_themes` table for design templates and color schemes
    - Create `domain_verification_records` table for DNS verification tracking
    - Create `site_pages` table for custom page management
    - Create `navigation_menus` table for site navigation
    - Create `vercel_deployments` table for deployment tracking
    - Create `client_invitations` table for invitation management
    - Create `website_analytics` table for tracking visitor metrics

  2. Features
    - Custom domain configuration with SSL
    - Visual theme customization with live preview
    - Page content builder with modular sections
    - Client invitation management with bulk import
    - Vercel integration for automated deployments
    - Analytics and monitoring
    - Template system for pre-built designs

  3. Security
    - Enable RLS on all new tables
    - Restrict access to tenant owners and admins
    - Secure Vercel API credentials in encrypted storage
*/

-- Extend tenant_domains for Vercel integration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_domains' AND column_name = 'vercel_project_id'
  ) THEN
    ALTER TABLE tenant_domains 
    ADD COLUMN vercel_project_id text,
    ADD COLUMN vercel_deployment_id text,
    ADD COLUMN ssl_enabled boolean DEFAULT false,
    ADD COLUMN ssl_certificate_status text,
    ADD COLUMN last_deployed_at timestamptz,
    ADD COLUMN deployment_status text DEFAULT 'pending',
    ADD COLUMN build_logs jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create site_themes table for design templates
CREATE TABLE IF NOT EXISTS site_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT false,
  colors jsonb NOT NULL DEFAULT '{
    "primary": "#3B82F6",
    "secondary": "#8B5CF6",
    "accent": "#F59E0B",
    "background": "#FFFFFF",
    "text": "#1F2937",
    "textSecondary": "#6B7280"
  }'::jsonb,
  typography jsonb NOT NULL DEFAULT '{
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "headingWeight": "700",
    "bodyWeight": "400"
  }'::jsonb,
  logo_url text,
  favicon_url text,
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_themes_tenant ON site_themes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_themes_active ON site_themes(tenant_id, is_active) WHERE is_active = true;

-- Create website_content table for page sections
CREATE TABLE IF NOT EXISTS website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  page_slug text NOT NULL,
  section_type text NOT NULL, -- 'hero', 'features', 'about', 'contact', 'custom'
  section_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, page_slug, section_type, section_order)
);

CREATE INDEX IF NOT EXISTS idx_website_content_tenant_page ON website_content(tenant_id, page_slug);
CREATE INDEX IF NOT EXISTS idx_website_content_published ON website_content(tenant_id, is_published) WHERE is_published = true;

-- Create site_pages table for custom pages
CREATE TABLE IF NOT EXISTS site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  meta_description text,
  is_published boolean DEFAULT false,
  show_in_nav boolean DEFAULT true,
  nav_order integer DEFAULT 0,
  template_type text DEFAULT 'custom', -- 'home', 'about', 'services', 'contact', 'custom'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_site_pages_tenant ON site_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_published ON site_pages(tenant_id, is_published) WHERE is_published = true;

-- Create navigation_menus table
CREATE TABLE IF NOT EXISTS navigation_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  menu_type text NOT NULL DEFAULT 'header', -- 'header', 'footer'
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, menu_type)
);

CREATE INDEX IF NOT EXISTS idx_navigation_menus_tenant ON navigation_menus(tenant_id);

-- Create domain_verification_records table
CREATE TABLE IF NOT EXISTS domain_verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES tenant_domains(id) ON DELETE CASCADE,
  record_type text NOT NULL, -- 'A', 'CNAME', 'TXT'
  record_name text NOT NULL,
  record_value text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_verification_domain ON domain_verification_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_status ON domain_verification_records(domain_id, is_verified);

-- Create vercel_deployments table
CREATE TABLE IF NOT EXISTS vercel_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  domain_id uuid REFERENCES tenant_domains(id) ON DELETE CASCADE,
  deployment_id text NOT NULL,
  deployment_url text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'building', 'ready', 'error', 'canceled'
  build_logs jsonb DEFAULT '[]'::jsonb,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vercel_deployments_tenant ON vercel_deployments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_domain ON vercel_deployments(domain_id);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_status ON vercel_deployments(status);

-- Create client_invitations table
CREATE TABLE IF NOT EXISTS client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  invitation_token text UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'accepted', 'expired', 'canceled'
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  reminder_count integer DEFAULT 0,
  last_reminder_sent_at timestamptz,
  custom_message text,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_client_invitations_tenant ON client_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_status ON client_invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(invitation_token);

-- Create website_analytics table
CREATE TABLE IF NOT EXISTS website_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'page_view', 'button_click', 'form_submit'
  page_path text,
  visitor_id text,
  user_agent text,
  referrer text,
  ip_address text,
  country text,
  device_type text, -- 'desktop', 'mobile', 'tablet'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_analytics_tenant ON website_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_analytics_date ON website_analytics(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_analytics_event ON website_analytics(tenant_id, event_type);

-- Add Vercel configuration to tenant_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_settings' AND column_name = 'vercel_config'
  ) THEN
    ALTER TABLE tenant_settings 
    ADD COLUMN vercel_config jsonb DEFAULT '{
      "team_id": null,
      "project_id": null,
      "last_sync_at": null
    }'::jsonb;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE site_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vercel_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_themes
CREATE POLICY "Tenant users can view their themes"
  ON site_themes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = site_themes.tenant_id
    )
  );

CREATE POLICY "Tenant admins can manage themes"
  ON site_themes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = site_themes.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = site_themes.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for website_content
CREATE POLICY "Tenant users can view their content"
  ON website_content FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = website_content.tenant_id
    )
  );

CREATE POLICY "Tenant admins can manage content"
  ON website_content FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = website_content.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = website_content.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for site_pages
CREATE POLICY "Tenant users can view their pages"
  ON site_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = site_pages.tenant_id
    )
  );

CREATE POLICY "Tenant admins can manage pages"
  ON site_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = site_pages.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = site_pages.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for navigation_menus
CREATE POLICY "Tenant users can view their menus"
  ON navigation_menus FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = navigation_menus.tenant_id
    )
  );

CREATE POLICY "Tenant admins can manage menus"
  ON navigation_menus FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = navigation_menus.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = navigation_menus.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for domain_verification_records
CREATE POLICY "Tenant admins can view verification records"
  ON domain_verification_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN tenant_domains td ON td.tenant_id = ur.tenant_id
      WHERE ur.user_id = auth.uid()
      AND td.id = domain_verification_records.domain_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant admins can manage verification records"
  ON domain_verification_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN tenant_domains td ON td.tenant_id = ur.tenant_id
      WHERE ur.user_id = auth.uid()
      AND td.id = domain_verification_records.domain_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN tenant_domains td ON td.tenant_id = ur.tenant_id
      WHERE ur.user_id = auth.uid()
      AND td.id = domain_verification_records.domain_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for vercel_deployments
CREATE POLICY "Tenant users can view deployments"
  ON vercel_deployments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = vercel_deployments.tenant_id
    )
  );

CREATE POLICY "Tenant admins can manage deployments"
  ON vercel_deployments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = vercel_deployments.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = vercel_deployments.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for client_invitations
CREATE POLICY "Tenant users can view invitations"
  ON client_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = client_invitations.tenant_id
    )
  );

CREATE POLICY "Tenant staff can manage invitations"
  ON client_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = client_invitations.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = client_invitations.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- RLS Policies for website_analytics
CREATE POLICY "Tenant admins can view analytics"
  ON website_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = website_analytics.tenant_id
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Analytics can be inserted anonymously"
  ON website_analytics FOR INSERT
  TO anon
  WITH CHECK (true);
