/*
  # Invitation Email Templates System

  ## Overview
  Creates a customizable email template system for staff and client invitations,
  allowing tenants to personalize their invitation emails with custom branding,
  colors, content, and messaging.

  ## New Tables

  ### `invitation_templates`
  Stores customizable email templates for invitations
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key) - Tenant who owns this template
  - `template_name` (text) - Human-readable name
  - `template_type` (text) - Type: 'staff_invitation', 'client_invitation', 'reminder'
  - `is_default` (boolean) - Whether this is the default template for the type
  - `subject_line` (text) - Email subject with variable support
  - `preview_text` (text) - Email preview/preheader text
  - `header_text` (text) - Header/title text
  - `greeting_text` (text) - Opening greeting
  - `body_text` (text) - Main body content with variable support
  - `cta_text` (text) - Call-to-action button text
  - `footer_text` (text) - Footer content
  - `design_config` (jsonb) - Colors, fonts, styling
  - `variables_supported` (text[]) - Supported template variables
  - `status` (text) - 'active', 'draft', 'archived'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on invitation_templates
  - Tenant admins and staff can manage their tenant's templates
  - Templates are isolated by tenant_id
  - Platform admins can manage all templates
*/

-- Create invitation_templates table
CREATE TABLE IF NOT EXISTS invitation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('staff_invitation', 'client_invitation', 'reminder', 'welcome')),
  is_default boolean DEFAULT false,
  subject_line text NOT NULL,
  preview_text text,
  header_text text NOT NULL,
  greeting_text text NOT NULL,
  body_text text NOT NULL,
  cta_text text NOT NULL DEFAULT 'Accept Invitation',
  footer_text text,
  design_config jsonb DEFAULT '{
    "header_bg_color": "#0891b2",
    "header_text_color": "#ffffff",
    "body_bg_color": "#ffffff",
    "body_text_color": "#333333",
    "accent_color": "#0891b2",
    "button_bg_color": "#0891b2",
    "button_text_color": "#ffffff",
    "font_family": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
    "font_size": 14
  }'::jsonb,
  variables_supported text[] DEFAULT ARRAY['tenant_name', 'recipient_name', 'role', 'custom_message', 'sender_name'],
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitation_templates_tenant ON invitation_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitation_templates_type ON invitation_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_invitation_templates_default ON invitation_templates(tenant_id, template_type, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE invitation_templates ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all templates
CREATE POLICY "Platform admins can manage all invitation templates"
  ON invitation_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- Tenant admins and managers can view their templates
CREATE POLICY "Tenant users can view their invitation templates"
  ON invitation_templates
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'general_manager')
    )
  );

-- Tenant admins can manage their templates
CREATE POLICY "Tenant admins can manage invitation templates"
  ON invitation_templates
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invitation_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invitation_templates_updated_at
  BEFORE UPDATE ON invitation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_templates_updated_at();

-- Function to ensure only one default template per type per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE invitation_templates
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id
      AND template_type = NEW.template_type
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_single_default_template
  BEFORE INSERT OR UPDATE ON invitation_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();