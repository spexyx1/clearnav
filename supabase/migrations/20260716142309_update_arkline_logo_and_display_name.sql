-- Set logo_url to the public image path
UPDATE site_themes
SET logo_url = '/images/image copy.png'
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND is_active = true;

-- Ensure company_name is "Arkline Trust" in tenant_settings branding
UPDATE tenant_settings
SET branding = jsonb_set(branding, '{company_name}', '"Arkline Trust"')
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';