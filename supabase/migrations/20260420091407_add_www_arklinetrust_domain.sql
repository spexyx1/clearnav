
/*
  # Add www.arklinetrust.com domain variant

  Adds the www subdomain variant for Arkline Trust so that visitors
  hitting www.arklinetrust.com are correctly resolved to the Arkline tenant.

  1. Changes
    - Insert www.arklinetrust.com as a verified apex domain for Arkline Trust tenant
*/

INSERT INTO tenant_domains (tenant_id, domain, is_verified, is_primary, domain_type, deployment_status, ssl_status)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'www.arklinetrust.com',
  true,
  false,
  'apex',
  'ready',
  'active'
)
ON CONFLICT (domain) DO NOTHING;
