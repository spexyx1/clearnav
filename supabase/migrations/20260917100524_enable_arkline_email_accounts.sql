/*
# Enable Arkline Trust Email Accounts

1. Modified Tables
   - `platform_tenants` — Sets Arkline's primary email address to hello@arklinetrust.com,
     marks it as verified and claimed.

2. New Rows
   - `tenant_email_settings` — Resend provider config for Arkline with from_domain
     arklinetrust.com, allowing outbound email delivery.
   - `email_accounts` — Two accounts for Arkline Trust tenant:
     - hello@arklinetrust.com (department, shared inbox)
     - noah@arklinetrust.com (personal)

3. Notes
   - No email_account_access rows yet because no staff_accounts/user_roles exist for
     Arkline. The send-email edge function already falls back to tenant_admin role check,
     so once the owner signs in and is assigned tenant_admin, they get automatic access.
   - The arklinetrust.com domain must be verified in Resend and have DNS records (SPF,
     DKIM, MX) configured in Namecheap before sending/receiving works.
*/

-- 1. Configure Arkline tenant email address
UPDATE platform_tenants
SET tenant_email_address = 'hello@arklinetrust.com',
    email_verified = true,
    email_claimed_at = now()
WHERE id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND tenant_email_address IS NULL;

-- 2. Insert tenant_email_settings for Resend via arklinetrust.com
INSERT INTO tenant_email_settings (
  tenant_id,
  provider_type,
  api_key_encrypted,
  from_domain,
  from_name,
  reply_to,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'resend',
  NULL,
  'arklinetrust.com',
  'Arkline Trust',
  'hello@arklinetrust.com',
  true,
  now(),
  now()
)
ON CONFLICT (tenant_id) DO UPDATE
  SET provider_type = 'resend',
      from_domain = 'arklinetrust.com',
      from_name = 'Arkline Trust',
      reply_to = 'hello@arklinetrust.com',
      is_active = true,
      updated_at = now();

-- 3. Create hello@arklinetrust.com email account
INSERT INTO email_accounts (
  tenant_id,
  email_address,
  email_handle,
  display_name,
  account_type,
  is_active,
  storage_quota_bytes,
  storage_used_bytes,
  provider_type
)
SELECT
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'hello@arklinetrust.com',
  'hello',
  'Arkline Trust',
  'department',
  true,
  1073741824,
  0,
  'resend'
WHERE NOT EXISTS (
  SELECT 1 FROM email_accounts WHERE email_address = 'hello@arklinetrust.com'
);

-- 4. Create noah@arklinetrust.com email account
INSERT INTO email_accounts (
  tenant_id,
  email_address,
  email_handle,
  display_name,
  account_type,
  is_active,
  storage_quota_bytes,
  storage_used_bytes,
  provider_type
)
SELECT
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'noah@arklinetrust.com',
  'noah',
  'Noah',
  'personal',
  true,
  1073741824,
  0,
  'resend'
WHERE NOT EXISTS (
  SELECT 1 FROM email_accounts WHERE email_address = 'noah@arklinetrust.com'
);
