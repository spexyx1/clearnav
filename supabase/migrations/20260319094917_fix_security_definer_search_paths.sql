/*
  # Fix Security Definer Functions - Set Immutable Search Path

  1. Security Enhancement
    - Sets search_path to empty string for all SECURITY DEFINER functions
    - Prevents search_path manipulation attacks
    - Forces functions to use fully qualified names (schema.table)

  2. Functions Updated
    - 35 SECURITY DEFINER functions without search_path configuration
    - All functions will now have search_path = '' to prevent schema injection

  3. Security
    - Critical security fix to prevent privilege escalation
    - Functions must now use fully qualified names (e.g., public.table_name)
    - Protects against malicious schema creation attacks

  4. Important Notes
    - This is a critical security fix
    - Functions with search_path = '' are immune to search_path manipulation
    - All table/function references within these functions must be fully qualified
*/

-- Set immutable search_path for all SECURITY DEFINER functions
ALTER FUNCTION apply_discount_to_subscription(uuid, uuid, text) SET search_path = '';
ALTER FUNCTION apply_template_to_tenant(uuid, uuid, text) SET search_path = '';
ALTER FUNCTION calculate_next_invoice_amount(uuid) SET search_path = '';
ALTER FUNCTION check_email_availability(text) SET search_path = '';
ALTER FUNCTION check_email_duplicate(uuid, text, text, text, integer) SET search_path = '';
ALTER FUNCTION check_slug_available(text) SET search_path = '';
ALTER FUNCTION expire_old_invitations() SET search_path = '';
ALTER FUNCTION generate_invitation_token() SET search_path = '';
ALTER FUNCTION generate_rss_feed(uuid, integer) SET search_path = '';
ALTER FUNCTION generate_sitemap_xml(uuid) SET search_path = '';
ALTER FUNCTION get_all_platform_users() SET search_path = '';
ALTER FUNCTION get_blog_post_analytics(uuid) SET search_path = '';
ALTER FUNCTION get_blog_posts_with_metadata(uuid, integer, integer) SET search_path = '';
ALTER FUNCTION get_page_seo_data(uuid, text) SET search_path = '';
ALTER FUNCTION get_pending_approvals_count(uuid) SET search_path = '';
ALTER FUNCTION get_platform_statistics() SET search_path = '';
ALTER FUNCTION get_tenant_overview(uuid) SET search_path = '';
ALTER FUNCTION get_tenant_public_settings(uuid) SET search_path = '';
ALTER FUNCTION get_tenant_usage_metrics(uuid) SET search_path = '';
ALTER FUNCTION get_user_tenant_id() SET search_path = '';
ALTER FUNCTION has_ai_agents_feature(uuid) SET search_path = '';
ALTER FUNCTION has_newsletter_permission(uuid) SET search_path = '';
ALTER FUNCTION increment_faq_helpful(uuid) SET search_path = '';
ALTER FUNCTION increment_post_views(uuid) SET search_path = '';
ALTER FUNCTION initialize_approval_settings() SET search_path = '';
ALTER FUNCTION is_platform_admin(uuid) SET search_path = '';
ALTER FUNCTION is_super_admin(uuid) SET search_path = '';
ALTER FUNCTION is_tenant_admin_for(uuid) SET search_path = '';
ALTER FUNCTION process_scheduled_content() SET search_path = '';
ALTER FUNCTION search_users_across_tenants(text) SET search_path = '';
ALTER FUNCTION user_is_tenant_admin(uuid, uuid) SET search_path = '';
ALTER FUNCTION user_is_tenant_member(uuid, uuid) SET search_path = '';
ALTER FUNCTION user_tenant_ids(uuid) SET search_path = '';
ALTER FUNCTION validate_discount_code(text, uuid) SET search_path = '';
ALTER FUNCTION view_tenant_clients(uuid) SET search_path = '';