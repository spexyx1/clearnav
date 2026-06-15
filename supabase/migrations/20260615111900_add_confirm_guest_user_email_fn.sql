
CREATE OR REPLACE FUNCTION public.confirm_guest_user_email(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_user_id
    AND email_confirmed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_guest_user_email(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_guest_user_email(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_guest_user_email(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_guest_user_email(uuid) TO service_role;
