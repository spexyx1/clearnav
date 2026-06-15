-- SECURITY DEFINER bypasses the circular RLS dependency between email_accounts and email_account_access.
CREATE OR REPLACE FUNCTION get_user_email_accounts(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  email_address text,
  display_name text,
  account_type text,
  is_active boolean,
  access_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM platform_admin_users WHERE user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  RETURN QUERY
    SELECT
      ea.id,
      ea.email_address,
      ea.display_name,
      ea.account_type,
      ea.is_active,
      eaa.access_level
    FROM email_account_access eaa
    JOIN email_accounts ea ON ea.id = eaa.account_id
    WHERE eaa.user_id = p_user_id
      AND ea.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_email_accounts(uuid) TO authenticated;