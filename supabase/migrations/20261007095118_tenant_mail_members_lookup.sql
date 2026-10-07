/*
# Tenant mail members lookup

1. New Functions
- `get_tenant_mail_members(p_tenant_id uuid)`: returns every person who can be given access
  to a tenant mailbox (active staff accounts plus tenant users/admins) with their login id,
  name and email.

2. Security
- SECURITY DEFINER so it can read login emails, but it only returns rows when the caller is
  an active tenant admin of that tenant or a platform superadmin; everyone else gets nothing.
- Execute is granted to signed-in users only.
*/

CREATE OR REPLACE FUNCTION public.get_tenant_mail_members(p_tenant_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text, member_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (ur.role_category = 'superadmin' OR (ur.role_category = 'tenant_admin' AND ur.tenant_id = p_tenant_id))
  ) AND NOT EXISTS (SELECT 1 FROM platform_admin_users pau WHERE pau.user_id = auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (m.user_id) m.user_id, m.full_name, m.email, m.member_type
  FROM (
    SELECT sa.auth_user_id AS user_id, sa.full_name::text, sa.email::text, 'staff'::text AS member_type, 1 AS pri
    FROM staff_accounts sa
    WHERE sa.tenant_id = p_tenant_id AND sa.status = 'active' AND sa.auth_user_id IS NOT NULL
    UNION ALL
    SELECT tu.user_id,
           coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1))::text,
           u.email::text,
           'admin'::text,
           2
    FROM tenant_users tu
    JOIN auth.users u ON u.id = tu.user_id
    WHERE tu.tenant_id = p_tenant_id
  ) m
  ORDER BY m.user_id, m.pri;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_tenant_mail_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_mail_members(uuid) TO authenticated;
