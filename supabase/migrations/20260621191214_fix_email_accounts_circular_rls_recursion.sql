-- Fix infinite recursion between email_accounts and email_account_access RLS policies.
--
-- Root cause: email_accounts SELECT policy checks email_account_access, and
-- email_account_access policies check email_accounts — a circular dependency.
--
-- Fix: rewrite both sides without cross-referencing each other.
-- A SECURITY DEFINER helper is used for write-side tenant verification on
-- email_account_access so we can look up the owning account's tenant_id
-- without going through RLS on email_accounts.

-- ── Helper: bypass RLS to get tenant_id for an email account ─────────────────
CREATE OR REPLACE FUNCTION public.get_email_account_tenant_id(p_account_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM email_accounts WHERE id = p_account_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_account_tenant_id(uuid) TO authenticated;

-- ── Fix email_accounts SELECT policy ─────────────────────────────────────────
-- Replace the policy that queries email_account_access with one that only
-- uses user_roles and platform_admin_users (neither causes recursion).

DROP POLICY IF EXISTS "Users can view email accounts they have access to" ON email_accounts;

CREATE POLICY "Users can view email accounts they have access to"
  ON email_accounts FOR SELECT
  TO authenticated
  USING (
    -- Tenant members (any active role in the same tenant)
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = email_accounts.tenant_id
        AND ur.status = 'active'
    )
    OR
    -- Platform admins
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- ── Fix email_account_access policies ────────────────────────────────────────
-- Drop every existing policy on this table and recreate without querying
-- email_accounts (which would loop back).

DROP POLICY IF EXISTS "Users can view their own access grants"          ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can manage access grants"          ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can view tenant access grants"     ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can insert email access grants"    ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can update email access grants"    ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can delete email access grants"    ON email_account_access;
DROP POLICY IF EXISTS "Users can view own email access grants"          ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can manage access grants"          ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can update access grants"          ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can delete access grants"          ON email_account_access;

-- SELECT: own rows + any active tenant_admin/superadmin + platform admins
CREATE POLICY "eaa_select"
  ON email_account_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_category IN ('superadmin', 'tenant_admin')
        AND ur.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- INSERT: tenant admins for the owning tenant, or platform admins
CREATE POLICY "eaa_insert"
  ON email_account_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_category IN ('superadmin', 'tenant_admin')
        AND ur.status = 'active'
        AND (
          ur.role_category = 'superadmin'
          OR ur.tenant_id = public.get_email_account_tenant_id(email_account_access.account_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "eaa_update"
  ON email_account_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_category IN ('superadmin', 'tenant_admin')
        AND ur.status = 'active'
        AND (
          ur.role_category = 'superadmin'
          OR ur.tenant_id = public.get_email_account_tenant_id(email_account_access.account_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_category IN ('superadmin', 'tenant_admin')
        AND ur.status = 'active'
        AND (
          ur.role_category = 'superadmin'
          OR ur.tenant_id = public.get_email_account_tenant_id(email_account_access.account_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- DELETE
CREATE POLICY "eaa_delete"
  ON email_account_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_category IN ('superadmin', 'tenant_admin')
        AND ur.status = 'active'
        AND (
          ur.role_category = 'superadmin'
          OR ur.tenant_id = public.get_email_account_tenant_id(email_account_access.account_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );
