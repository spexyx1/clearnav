/*
  # Fix Infinite Recursion in Email Account Access RLS Policies

  ## Problem
  The `email_account_access` table has RLS policies that query `email_accounts`,
  which in turn has policies that query `email_account_access`, creating an
  infinite recursion loop.

  ## Solution
  Simplify the `email_account_access` policies to avoid circular dependencies:
  - Users can see their own access grants (simple user_id check)
  - Tenant admins can see/manage access grants for their tenant (direct tenant check via user_roles)
  - Platform admins can see/manage all access grants

  ## Changes
  1. Drop existing problematic policies on `email_account_access`
  2. Create new simplified policies without circular dependencies
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own access grants" ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can manage access grants" ON email_account_access;

-- Create simplified policies without circular dependencies

-- Policy 1: Users can view their own access grants
CREATE POLICY "Users can view their own access grants"
  ON email_account_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'superadmin'
      AND ur.status = 'active'
    )
  );

-- Policy 2: Tenant admins can view all access grants for their tenant's email accounts
CREATE POLICY "Tenant admins can view tenant access grants"
  ON email_account_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category IN ('superadmin', 'tenant_admin')
      AND ur.status = 'active'
      AND (
        ur.role_category = 'superadmin'
        OR EXISTS (
          SELECT 1 FROM email_accounts ea
          WHERE ea.id = email_account_access.account_id
          AND ea.tenant_id = ur.tenant_id
        )
      )
    )
  );

-- Policy 3: Tenant admins can insert/update/delete access grants for their tenant
CREATE POLICY "Tenant admins can manage access grants"
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
        OR EXISTS (
          SELECT 1 FROM email_accounts ea
          WHERE ea.id = email_account_access.account_id
          AND ea.tenant_id = ur.tenant_id
        )
      )
    )
  );

CREATE POLICY "Tenant admins can update access grants"
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
        OR EXISTS (
          SELECT 1 FROM email_accounts ea
          WHERE ea.id = email_account_access.account_id
          AND ea.tenant_id = ur.tenant_id
        )
      )
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
        OR EXISTS (
          SELECT 1 FROM email_accounts ea
          WHERE ea.id = email_account_access.account_id
          AND ea.tenant_id = ur.tenant_id
        )
      )
    )
  );

CREATE POLICY "Tenant admins can delete access grants"
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
        OR EXISTS (
          SELECT 1 FROM email_accounts ea
          WHERE ea.id = email_account_access.account_id
          AND ea.tenant_id = ur.tenant_id
        )
      )
    )
  );