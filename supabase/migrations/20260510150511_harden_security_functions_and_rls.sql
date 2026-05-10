/*
  # Security Hardening: function search_path, RLS sanity checks, and RPC privileges

  1. Fix mutable search_path on functions
     - user_is_tenant_admin, user_is_tenant_member, user_tenant_ids, ensure_single_default_template
     - Pin search_path to public, pg_temp

  2. Tighten RLS INSERT policies that were WITH CHECK (true)
     - inquiries, signup_requests, website_analytics, auditor_applications,
       form_submissions, blog_comments, newsletter_subscribers
     - Replace unconditional true with minimal validity checks so the policy
       is no longer unrestricted.

  3. Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/authenticated
     These functions are used by RLS policies, triggers, and cron only. They
     should never be callable over PostgREST.

  Notes:
    - Public-facing RPCs (signup, public website helpers) retain EXECUTE.
    - Privileged RPCs (platform admin, tenant admin) retain authenticated
      EXECUTE and enforce authorization inside their bodies.
*/

-- 1. Fix function search_path
ALTER FUNCTION public.user_is_tenant_admin(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.user_is_tenant_member(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.user_tenant_ids(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.ensure_single_default_template() SET search_path = public, pg_temp;

-- 2. Tighten RLS INSERT policies with WITH CHECK (true)

DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Anyone can create inquiries"
  ON public.inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND length(name) BETWEEN 1 AND 200
    AND email IS NOT NULL AND length(email) BETWEEN 3 AND 320
    AND message IS NOT NULL AND length(message) BETWEEN 1 AND 10000
  );

DROP POLICY IF EXISTS "Anyone can create signup requests" ON public.signup_requests;
CREATE POLICY "Anyone can create signup requests"
  ON public.signup_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    company_name IS NOT NULL AND length(company_name) BETWEEN 1 AND 200
    AND contact_email IS NOT NULL AND length(contact_email) BETWEEN 3 AND 320
    AND requested_slug IS NOT NULL AND length(requested_slug) BETWEEN 1 AND 100
    AND (status IS NULL OR status = 'pending')
  );

DROP POLICY IF EXISTS "Analytics can be inserted anonymously" ON public.website_analytics;
CREATE POLICY "Analytics can be inserted anonymously"
  ON public.website_analytics FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id IS NOT NULL
    AND event_type IS NOT NULL AND length(event_type) BETWEEN 1 AND 100
  );

DROP POLICY IF EXISTS "Anyone can submit auditor application" ON public.auditor_applications;
CREATE POLICY "Anyone can submit auditor application"
  ON public.auditor_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    firm_name IS NOT NULL AND length(firm_name) BETWEEN 1 AND 300
    AND contact_email IS NOT NULL AND length(contact_email) BETWEEN 3 AND 320
    AND contact_name IS NOT NULL AND length(contact_name) BETWEEN 1 AND 200
    AND (status IS NULL OR status = 'pending')
  );

DROP POLICY IF EXISTS "Anyone can submit forms" ON public.form_submissions;
CREATE POLICY "Anyone can submit forms"
  ON public.form_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    form_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND submission_data IS NOT NULL
    AND (status IS NULL OR status IN ('new', 'pending', 'unread'))
  );

DROP POLICY IF EXISTS "Anyone can submit comments" ON public.blog_comments;
CREATE POLICY "Anyone can submit comments"
  ON public.blog_comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    post_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND comment_text IS NOT NULL AND length(comment_text) BETWEEN 1 AND 5000
    AND (status IS NULL OR status = 'pending')
    AND (author_email IS NULL OR length(author_email) BETWEEN 3 AND 320)
  );

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND email IS NOT NULL AND length(email) BETWEEN 3 AND 320
    AND (status IS NULL OR status IN ('pending', 'subscribed'))
  );

-- 3. Revoke EXECUTE on internal SECURITY DEFINER helpers
-- These are called only by RLS policies, triggers, or cron jobs.

REVOKE EXECUTE ON FUNCTION public.user_is_tenant_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_is_tenant_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_tenant_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_newsletter_permission(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_default_template() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_invitations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invitation_token() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_approval_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_scheduled_content() FROM PUBLIC, anon, authenticated;

-- Privileged RPCs: remove anon access; authenticated callers authorize inside the body.
REVOKE EXECUTE ON FUNCTION public.get_all_platform_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_statistics() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_users_across_tenants(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_tenant_overview(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_tenant_usage_metrics(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.view_tenant_clients(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_template_to_tenant(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_tenant_branding_fields(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_approvals_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_user_legal_acceptance(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_tutorial_progress(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_discount_to_subscription(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_email_duplicate(uuid, text, text, text, integer) FROM PUBLIC, anon;
