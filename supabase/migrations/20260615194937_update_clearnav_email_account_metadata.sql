
-- Update email accounts with provider_type and professional signatures

UPDATE email_accounts
SET
  provider_type = 'resend',
  signature_html = '<div style="font-family: Arial, sans-serif; font-size: 13px; color: #374151; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
    <strong style="color: #111827;">ClearNav Platform</strong><br>
    General Inquiries<br>
    <a href="mailto:info@clearnav.cv" style="color: #2563eb; text-decoration: none;">info@clearnav.cv</a><br>
    <a href="https://clearnav.cv" style="color: #2563eb; text-decoration: none;">clearnav.cv</a>
  </div>',
  signature_text = 'ClearNav Platform
General Inquiries
info@clearnav.cv
clearnav.cv',
  updated_at = now()
WHERE id = '00000000-0000-0000-0001-000000000001';

UPDATE email_accounts
SET
  provider_type = 'resend',
  signature_html = '<div style="font-family: Arial, sans-serif; font-size: 13px; color: #374151; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
    <strong style="color: #111827;">ClearNav Platform</strong><br>
    Compliance Department<br>
    <a href="mailto:compliance@clearnav.cv" style="color: #2563eb; text-decoration: none;">compliance@clearnav.cv</a><br>
    <a href="https://clearnav.cv" style="color: #2563eb; text-decoration: none;">clearnav.cv</a>
  </div>',
  signature_text = 'ClearNav Platform
Compliance Department
compliance@clearnav.cv
clearnav.cv',
  updated_at = now()
WHERE id = '00000000-0000-0000-0001-000000000002';
