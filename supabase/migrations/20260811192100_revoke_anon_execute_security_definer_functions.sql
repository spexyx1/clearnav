-- Revoke EXECUTE from anon on SECURITY DEFINER functions that should not be
-- callable by unauthenticated users. These functions run with elevated
-- privileges and exposing them to anon is a security hole.
--
-- Functions that genuinely need anon access (public website rendering, blog
-- posts, SEO, sitemap, legal documents, tutorial progress, FAQ) are kept.
-- Functions that handle private data (email, voicemail, vault, invoices,
-- tenant provisioning, user lookup) are restricted to authenticated only.

REVOKE EXECUTE ON FUNCTION public.get_vault_passphrase FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_messages FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_folder_counts FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_email_accounts FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_voicemail_count FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_tenant FROM anon;
REVOKE EXECUTE ON FUNCTION public.allocate_invoice_number FROM anon;
REVOKE EXECUTE ON FUNCTION public.allocate_invoice_number_for_user FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_guest_invoices FROM anon;
REVOKE EXECUTE ON FUNCTION public.invoice_app_username_lookup FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_investor_application FROM anon;
REVOKE EXECUTE ON FUNCTION public.route_inbound_email FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_account_tenant_id FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_investor_app_staff FROM anon;
REVOKE EXECUTE ON FUNCTION public.sign_invoice_by_token FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_invoice_viewed FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invoice_by_token FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_guest_user_email FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_guest_username FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_email_availability FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_email_available FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_email_duplicate FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_slug_available FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_discount_code FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_discount_to_subscription FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_template_to_tenant FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_legal_acceptance FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_tutorial_progress FROM anon;

-- Fix the two trigger functions with mutable search_path
ALTER FUNCTION public.set_invoice_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tenant_phone_numbers_updated_at() SET search_path = public, pg_temp;
