/*
# Tighten database functions callable by signed-out visitors

## Plain-English summary
Several helper functions could be called by anyone on the internet without
signing in. Two had an ownership check that was skipped entirely for visitors,
letting them list anyone's mailboxes or overwrite anyone's tutorial progress.

## Changes
1. `get_user_email_accounts`, `upsert_tutorial_progress`: ownership check now also
   rejects signed-out callers (uses IS DISTINCT FROM). Visitor access revoked.
2. `allocate_invoice_number(p_tenant_id)`: caller must belong to that tenant (or be
   a platform admin). Visitor access revoked.
3. `allocate_invoice_number_for_user(p_user_id)`: caller must be that user.
   Visitor access revoked.
4. `get_unread_voicemail_count(p_tenant_id)`: caller must belong to that tenant.
   Visitor access revoked.
5. `get_email_messages`, `get_email_folder_counts`, `check_email_available`:
   visitor access revoked (signed-in behaviour unchanged).

## New helper
- `is_tenant_member(p_tenant_id)`: true when the signed-in user belongs to the tenant
  through user_roles, tenant_users or staff_accounts, or is a platform admin.
*/

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_platform_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id AND COALESCE(ur.status, 'active') = 'active')
    OR EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = p_tenant_id)
    OR EXISTS (SELECT 1 FROM public.staff_accounts sa WHERE sa.auth_user_id = auth.uid() AND sa.tenant_id = p_tenant_id AND COALESCE(sa.status, 'active') = 'active')
  );
$$;
REVOKE ALL ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated, service_role;

DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.get_user_email_accounts(uuid)'::regprocedure);
  IF position('auth.uid() != p_user_id' in v_def) > 0 THEN
    EXECUTE replace(v_def, 'auth.uid() != p_user_id', 'auth.uid() IS DISTINCT FROM p_user_id');
  END IF;

  v_def := pg_get_functiondef('public.upsert_tutorial_progress(uuid, text, text, integer, jsonb, timestamptz, timestamptz, timestamptz)'::regprocedure);
  IF position('auth.uid() != p_user_id' in v_def) > 0 THEN
    EXECUTE replace(v_def, 'auth.uid() != p_user_id', 'auth.uid() IS DISTINCT FROM p_user_id');
  END IF;

  v_def := pg_get_functiondef('public.allocate_invoice_number(uuid)'::regprocedure);
  IF position('is_tenant_member' in v_def) = 0 THEN
    EXECUTE regexp_replace(v_def, 'BEGIN', 'BEGIN IF NOT public.is_tenant_member(p_tenant_id) THEN RAISE EXCEPTION ''Not authorized'' USING ERRCODE = ''42501''; END IF;');
  END IF;

  v_def := pg_get_functiondef('public.allocate_invoice_number_for_user(uuid)'::regprocedure);
  IF position('IS DISTINCT FROM p_user_id' in v_def) = 0 THEN
    EXECUTE regexp_replace(v_def, 'BEGIN', 'BEGIN IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION ''Not authorized'' USING ERRCODE = ''42501''; END IF;');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_unread_voicemail_count(p_tenant_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN public.is_tenant_member(p_tenant_id)
    THEN (SELECT COUNT(*)::integer FROM public.phone_number_voicemails WHERE tenant_id = p_tenant_id AND is_read = false)
    ELSE 0 END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_email_accounts(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_tutorial_progress(uuid, text, text, integer, jsonb, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.allocate_invoice_number(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.allocate_invoice_number_for_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_voicemail_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_email_messages(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_email_folder_counts(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_email_available(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_email_accounts(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_tutorial_progress(uuid, text, text, integer, jsonb, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unread_voicemail_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_email_messages(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_email_folder_counts(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO authenticated, service_role;
