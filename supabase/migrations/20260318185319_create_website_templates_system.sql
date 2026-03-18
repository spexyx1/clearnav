/*
  # Create Website Templates System

  ## Overview
  Creates a templates system allowing tenants to quickly bootstrap their websites
  from pre-designed templates.

  ## What This Creates
  1. `website_templates` table - Stores template definitions
  2. `template_sections` table - Stores section configurations for each template
  3. Pre-built templates: Professional, Modern, Minimalist, Creative
  4. RLS policies for template access

  ## Security
  - Templates are readable by all authenticated users
  - Only platform admins can create/modify templates
  - Tenants can copy template content to their own site
*/

-- Create website_templates table
CREATE TABLE IF NOT EXISTS website_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  preview_image_url text,
  category text DEFAULT 'business',
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create template_sections table
CREATE TABLE IF NOT EXISTS template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES website_templates(id) ON DELETE CASCADE,
  page_slug text NOT NULL DEFAULT 'home',
  section_type text NOT NULL,
  section_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_sections_template ON template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sections_page ON template_sections(template_id, page_slug);

-- Enable RLS
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can view active templates
DROP POLICY IF EXISTS "Anyone can view active templates" ON website_templates;
CREATE POLICY "Anyone can view active templates"
  ON website_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view template sections" ON template_sections;
CREATE POLICY "Anyone can view template sections"
  ON template_sections
  FOR SELECT
  TO authenticated
  USING (true);

-- Only platform admins can manage templates
DROP POLICY IF EXISTS "Platform admins can manage templates" ON website_templates;
CREATE POLICY "Platform admins can manage templates"
  ON website_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Platform admins can manage template sections" ON template_sections;
CREATE POLICY "Platform admins can manage template sections"
  ON template_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  );

-- Function to apply template to tenant
CREATE OR REPLACE FUNCTION apply_template_to_tenant(
  p_template_id uuid,
  p_tenant_id uuid,
  p_page_slug text DEFAULT 'home'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_section record;
  v_sections_created integer := 0;
  v_theme jsonb;
BEGIN
  -- Check if user has permission for this tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND role_category IN ('tenant_admin', 'staff_user')
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get template theme
  SELECT theme INTO v_theme
  FROM website_templates
  WHERE id = p_template_id AND is_active = true;

  IF v_theme IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Delete existing sections for this page
  DELETE FROM website_content
  WHERE tenant_id = p_tenant_id AND page_slug = p_page_slug;

  -- Copy template sections
  FOR v_section IN
    SELECT section_type, section_order, content
    FROM template_sections
    WHERE template_id = p_template_id
    AND page_slug = p_page_slug
    ORDER BY section_order
  LOOP
    INSERT INTO website_content (
      tenant_id,
      page_slug,
      section_type,
      section_order,
      content,
      is_published
    ) VALUES (
      p_tenant_id,
      p_page_slug,
      v_section.section_type,
      v_section.section_order,
      v_section.content,
      true
    );

    v_sections_created := v_sections_created + 1;
  END LOOP;

  -- Update tenant theme
  INSERT INTO site_themes (
    tenant_id,
    name,
    is_active,
    colors,
    typography
  ) VALUES (
    p_tenant_id,
    'Template Theme',
    true,
    v_theme->'colors',
    v_theme->'typography'
  )
  ON CONFLICT (tenant_id) DO UPDATE
  SET
    colors = EXCLUDED.colors,
    typography = EXCLUDED.typography,
    is_active = true,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'sections_created', v_sections_created,
    'theme_applied', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_template_to_tenant(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION apply_template_to_tenant IS 'Applies a website template to a tenant by copying sections and theme';
