
-- Create tenant_email_settings for the ClearNav platform tenant
-- This enables the send-email edge function to use Resend for outbound mail
-- from info@clearnav.cv and compliance@clearnav.cv

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
  '00000000-0000-0000-0000-000000000001',
  'resend',
  NULL,   -- uses platform RESEND_API_KEY env var as fallback
  'clearnav.cv',
  'ClearNav',
  'info@clearnav.cv',
  true,
  now(),
  now()
)
ON CONFLICT (tenant_id) DO UPDATE
  SET provider_type = 'resend',
      from_domain = 'clearnav.cv',
      from_name = 'ClearNav',
      reply_to = 'info@clearnav.cv',
      is_active = true,
      updated_at = now();
