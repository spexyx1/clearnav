/*
  # Seed Default Invitation Templates

  ## Overview
  Seeds default invitation email templates for staff and client invitations.
  These templates serve as starting points that tenants can customize.

  ## Default Templates
  1. Professional Staff Invitation
  2. Professional Client Invitation
  3. Reminder Email Template
  4. Welcome Email Template
*/

-- Insert default staff invitation template (no tenant_id = system-wide default)
INSERT INTO invitation_templates (
  template_name,
  template_type,
  is_default,
  subject_line,
  preview_text,
  header_text,
  greeting_text,
  body_text,
  cta_text,
  footer_text,
  design_config,
  status
) VALUES (
  'Default Staff Invitation',
  'staff_invitation',
  true,
  'You''re invited to join {{tenant_name}}',
  'Join our team and help manage investor relationships',
  'Welcome to the Team',
  'Hello,',
  '<p>You''ve been invited to join <strong>{{tenant_name}}</strong> as a <strong>{{role}}</strong>.</p>

<p>As a team member, you''ll have access to our management portal where you can:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
  <li>Access the management portal and client dashboard</li>
  <li>Manage client accounts and investor relationships</li>
  <li>Track onboarding workflows and compliance</li>
  <li>View analytics, reports, and fund performance</li>
  <li>Communicate with clients and team members</li>
</ul>

{{#if custom_message}}
<div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
  <p style="margin: 0; font-style: italic; color: #475569;">{{custom_message}}</p>
</div>
{{/if}}

<p>Click the button below to accept your invitation and set up your account. This invitation will expire in 7 days.</p>',
  'Accept Invitation & Set Up Account',
  '<p>If you didn''t expect this invitation, you can safely ignore this email.</p>
<p style="margin-top: 20px;">Best regards,<br><strong>The {{tenant_name}} Team</strong></p>',
  '{
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
  'active'
) ON CONFLICT DO NOTHING;

-- Insert default client invitation template
INSERT INTO invitation_templates (
  template_name,
  template_type,
  is_default,
  subject_line,
  preview_text,
  header_text,
  greeting_text,
  body_text,
  cta_text,
  footer_text,
  design_config,
  status
) VALUES (
  'Default Client Invitation',
  'client_invitation',
  true,
  'Welcome to {{tenant_name}} - Your Investor Portal Access',
  'Access your portfolio, documents, and performance reports',
  'Welcome to Your Investor Portal',
  'Hello {{recipient_name}},',
  '<p>We''re excited to welcome you as an investor with <strong>{{tenant_name}}</strong>.</p>

<p>Your personalized investor portal is now ready. Through your secure portal, you can:</p>
<ul style="margin: 10px 0; padding-left: 20px;">
  <li>View your portfolio and investment performance in real-time</li>
  <li>Access important documents, statements, and reports</li>
  <li>Track your returns and comprehensive risk metrics</li>
  <li>Submit redemption requests when needed</li>
  <li>Review capital call schedules and distribution history</li>
  <li>Communicate securely with our team</li>
</ul>

{{#if custom_message}}
<div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
  <p style="margin: 0; font-style: italic; color: #475569;">{{custom_message}}</p>
</div>
{{/if}}

<p>Click the button below to accept your invitation and create your secure account. This invitation link will expire in 7 days for security purposes.</p>',
  'Access My Investor Portal',
  '<p style="font-size: 12px; color: #64748b;">If you have any questions or need assistance, please don''t hesitate to contact us.</p>
<p style="margin-top: 20px;">Best regards,<br><strong>The {{tenant_name}} Team</strong></p>',
  '{
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
  'active'
) ON CONFLICT DO NOTHING;

-- Insert default reminder template
INSERT INTO invitation_templates (
  template_name,
  template_type,
  is_default,
  subject_line,
  preview_text,
  header_text,
  greeting_text,
  body_text,
  cta_text,
  footer_text,
  design_config,
  status
) VALUES (
  'Default Reminder',
  'reminder',
  true,
  'Reminder: Your invitation to {{tenant_name}} expires soon',
  'Don''t miss out - accept your invitation before it expires',
  'Reminder: Invitation Expiring Soon',
  'Hello,',
  '<p>This is a friendly reminder that you have a pending invitation to join <strong>{{tenant_name}}</strong> as a <strong>{{role}}</strong>.</p>

<p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 0 4px 4px 0;">
  <strong>⏰ Time-Sensitive:</strong> Your invitation will expire soon. Please accept it at your earliest convenience to maintain access.
</p>

<p>As a reminder, you''ll be able to access your portal and all associated features once you complete your account setup.</p>',
  'Accept Invitation Now',
  '<p>If you have any questions or issues accessing your invitation, please contact us.</p>
<p style="margin-top: 20px;">Best regards,<br><strong>The {{tenant_name}} Team</strong></p>',
  '{
    "header_bg_color": "#f59e0b",
    "header_text_color": "#ffffff",
    "body_bg_color": "#ffffff",
    "body_text_color": "#333333",
    "accent_color": "#f59e0b",
    "button_bg_color": "#f59e0b",
    "button_text_color": "#ffffff",
    "font_family": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
    "font_size": 14
  }'::jsonb,
  'active'
) ON CONFLICT DO NOTHING;

-- Insert default welcome template
INSERT INTO invitation_templates (
  template_name,
  template_type,
  is_default,
  subject_line,
  preview_text,
  header_text,
  greeting_text,
  body_text,
  cta_text,
  footer_text,
  design_config,
  status
) VALUES (
  'Default Welcome Email',
  'welcome',
  true,
  'Welcome to {{tenant_name}} - Let''s Get Started',
  'Your account is active - here''s what to do next',
  'Welcome Aboard!',
  'Hello {{recipient_name}},',
  '<p>Congratulations! Your account with <strong>{{tenant_name}}</strong> is now active.</p>

<p>We''re thrilled to have you on board. Here are some recommended next steps to get the most out of your portal:</p>

<ol style="margin: 10px 0; padding-left: 20px;">
  <li><strong>Complete your profile</strong> - Add your contact information and preferences</li>
  <li><strong>Explore the dashboard</strong> - Familiarize yourself with the portal features</li>
  <li><strong>Review documents</strong> - Check out any available reports or statements</li>
  <li><strong>Set up notifications</strong> - Configure your email and alert preferences</li>
</ol>

<p>If you need any assistance or have questions, our support team is here to help.</p>',
  'Go to My Portal',
  '<p>Thank you for choosing {{tenant_name}}. We look forward to serving you.</p>
<p style="margin-top: 20px;">Best regards,<br><strong>The {{tenant_name}} Team</strong></p>',
  '{
    "header_bg_color": "#10b981",
    "header_text_color": "#ffffff",
    "body_bg_color": "#ffffff",
    "body_text_color": "#333333",
    "accent_color": "#10b981",
    "button_bg_color": "#10b981",
    "button_text_color": "#ffffff",
    "font_family": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
    "font_size": 14
  }'::jsonb,
  'active'
) ON CONFLICT DO NOTHING;