/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The tenant_users table has RLS policies that query tenant_users itself, creating
  infinite recursion. This also affects client_profiles and other tables that check
  tenant_users for permissions.

  ## Solution
  Create security definer functions that bypass RLS to check user roles and tenant
  associations, then update policies to use these functions.

  ## Changes
  1. Create helper functions with SECURITY DEFINER
  2. Drop and recreate problematic policies
  3. Ensure no circular dependencies in RLS checks
*/

CREATE OR REPLACE FUNCTION public.user_is_tenant_admin(user_id uuid, tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_users
    WHERE tenant_users.user_id = user_id
      AND tenant_users.tenant_id = tenant_id
      AND tenant_users.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_tenant_member(user_id uuid, tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_users
    WHERE tenant_users.user_id = user_id
      AND tenant_users.tenant_id = tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_tenant_ids(user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id
  FROM tenant_users
  WHERE tenant_users.user_id = user_id;
$$;

DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON tenant_users;

CREATE POLICY "Tenant admins can manage tenant users"
  ON tenant_users
  FOR ALL
  TO authenticated
  USING (
    user_is_tenant_admin(auth.uid(), tenant_id)
  );

DROP POLICY IF EXISTS "Staff can view client profiles in their tenant" ON client_profiles;
DROP POLICY IF EXISTS "Staff can update client profiles in their tenant" ON client_profiles;

CREATE POLICY "Staff can view client profiles in their tenant"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id
      FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update client profiles in their tenant"
  ON client_profiles
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id
      FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id
      FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own profile in their tenant" ON client_profiles;
DROP POLICY IF EXISTS "Users can update own profile in their tenant" ON client_profiles;

CREATE POLICY "Users can view own profile in their tenant"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    AND (tenant_id IS NULL OR user_is_tenant_member(auth.uid(), tenant_id))
  );

CREATE POLICY "Users can update own profile in their tenant"
  ON client_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND (tenant_id IS NULL OR user_is_tenant_member(auth.uid(), tenant_id))
  )
  WITH CHECK (
    auth.uid() = id
    AND (tenant_id IS NULL OR user_is_tenant_member(auth.uid(), tenant_id))
  );
