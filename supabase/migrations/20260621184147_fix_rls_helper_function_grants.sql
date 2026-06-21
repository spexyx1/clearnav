-- Restore EXECUTE grants on RLS helper functions that were incorrectly revoked.
-- These functions are called by RLS policies (USING / WITH CHECK clauses), which
-- run in the context of the authenticated (or anon) role. Without EXECUTE, Postgres
-- raises "permission denied for function" before the policy can be evaluated.
-- Functions that are SECURITY DEFINER still restrict what they can see/do internally,
-- so granting EXECUTE does not expose privileged data directly.

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_tenant_admin(uuid, uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_tenant_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_tenant_ids(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_newsletter_permission(uuid)   TO authenticated;
