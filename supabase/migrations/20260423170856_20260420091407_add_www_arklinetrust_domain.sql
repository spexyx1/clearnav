/*
  # Add www.arklinetrust.com domain variant

  Adds the www subdomain variant for Arkline Trust so that visitors
  hitting www.arklinetrust.com are correctly resolved to the Arkline tenant.

  1. Changes
    - Insert www.arklinetrust.com as a verified apex domain for Arkline Trust tenant
*/

INSERT INTO tenant_domains (tenant_id, domain, is_verified, is_primary, domain_type, deployment_status, ssl_status)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'www.arklinetrust.com',
  true,
  false,
  'apex',
  'ready',
  'active'
)
ON CONFLICT (domain) DO NOTHING;