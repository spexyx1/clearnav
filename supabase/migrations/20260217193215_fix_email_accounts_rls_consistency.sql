/*
  # Fix Email Accounts RLS Consistency

  ## Summary
  Updates RLS policies on `email_accounts` and `email_account_access` tables
  to use `user_roles` table instead of the legacy `tenant_users` table.
  This is consistent with the rest of the platform's authorization model.

  ## Changes
  1. `email_accounts` table:
     - Drop old SELECT policy that partially relied on `tenant_users`
     - Drop old ALL (manage) policy that used `tenant_users`
     - Create new separate SELECT, INSERT, UPDATE, DELETE policies using `user_roles`

  2. `email_account_access` table:
     - Drop old SELECT policy that used `tenant_users` for admin check
     - Drop old ALL (manage) policy that used `tenant_users`
     - Create new separate SELECT, INSERT, UPDATE, DELETE policies using `user_roles`

  ## Security
  - Tenant admins (role_category = 'tenant_admin') can manage all email accounts in their tenant
  - Staff users (role_category = 'staff_user') can view accounts they have been granted access to
  - Platform admins retain full access via `platform_admin_users` table
*/

-- Drop old email_accounts policies
DROP POLICY IF EXISTS "Staff can view accounts they have access to" ON email_accounts;
DROP POLICY IF EXISTS "Tenant admins can manage their email accounts" ON email_accounts;

-- New email_accounts policies using user_roles
CREATE POLICY "Users can view email accounts they have access to"
  ON email_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_accounts.id
      AND eaa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = email_accounts.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can insert email accounts"
  ON email_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = email_accounts.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update email accounts"
  ON email_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = email_accounts.tenant_id
      AND ur.role_category = 'tenant_admin'
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
      AND ur.tenant_id = email_accounts.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can delete email accounts"
  ON email_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = email_accounts.tenant_id
      AND ur.role_category = 'tenant_admin'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- Drop old email_account_access policies
DROP POLICY IF EXISTS "Users can view their own access grants" ON email_account_access;
DROP POLICY IF EXISTS "Tenant admins can manage access grants" ON email_account_access;

-- New email_account_access policies using user_roles
CREATE POLICY "Users can view own email access grants"
  ON email_account_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM email_accounts ea
      JOIN user_roles ur ON ur.user_id = auth.uid()
        AND ur.tenant_id = ea.tenant_id
        AND ur.role_category = 'tenant_admin'
      WHERE ea.id = email_account_access.account_id
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can insert email access grants"
  ON email_account_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      JOIN user_roles ur ON ur.user_id = auth.uid()
        AND ur.tenant_id = ea.tenant_id
        AND ur.role_category = 'tenant_admin'
      WHERE ea.id = email_account_access.account_id
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update email access grants"
  ON email_account_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      JOIN user_roles ur ON ur.user_id = auth.uid()
        AND ur.tenant_id = ea.tenant_id
        AND ur.role_category = 'tenant_admin'
      WHERE ea.id = email_account_access.account_id
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      JOIN user_roles ur ON ur.user_id = auth.uid()
        AND ur.tenant_id = ea.tenant_id
        AND ur.role_category = 'tenant_admin'
      WHERE ea.id = email_account_access.account_id
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can delete email access grants"
  ON email_account_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      JOIN user_roles ur ON ur.user_id = auth.uid()
        AND ur.tenant_id = ea.tenant_id
        AND ur.role_category = 'tenant_admin'
      WHERE ea.id = email_account_access.account_id
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );
