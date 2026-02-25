/*
  # Fix user_invitations RLS policies and add tenant_admin access

  1. Bug Fixes
    - Fixed SELECT policy: was comparing tenant_id to sa.id (staff account UUID) instead of sa.tenant_id
    - Fixed INSERT policy: same wrong column reference (sa.id instead of sa.tenant_id)
    - Fixed UPDATE policy for staff: was comparing invited_by to sa.id instead of using tenant-based check
  
  2. New Access Patterns
    - Tenant admins (via user_roles) can now SELECT, INSERT, UPDATE, and DELETE invitations for their tenant
    - This enables the Users tab to work for tenant owners/admins who may not have staff_accounts records

  3. Security
    - All policies still require authenticated users
    - All policies check tenant membership via user_roles or staff_accounts
*/

-- Drop existing broken policies
DROP POLICY IF EXISTS "Staff can view tenant invitations" ON user_invitations;
DROP POLICY IF EXISTS "Staff can create tenant invitations" ON user_invitations;
DROP POLICY IF EXISTS "Staff can update their invitations" ON user_invitations;

-- SELECT: Staff and tenant admins can view invitations for their tenant
CREATE POLICY "Staff and admins can view tenant invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() AND sa.status = 'active'
    )
    OR
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
        AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- INSERT: Staff and tenant admins can create invitations for their tenant
CREATE POLICY "Staff and admins can create tenant invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() AND sa.status = 'active'
    )
    OR
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
        AND ur.role_category = 'tenant_admin'
    )
  );

-- UPDATE: Staff and tenant admins can update invitations for their tenant
CREATE POLICY "Staff and admins can update tenant invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() AND sa.status = 'active'
    )
    OR
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
        AND ur.role_category = 'tenant_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() AND sa.status = 'active'
    )
    OR
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
        AND ur.role_category = 'tenant_admin'
    )
  );

-- DELETE: Tenant admins can cancel/delete invitations
CREATE POLICY "Admins can delete tenant invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() AND sa.status = 'active'
        AND sa.role IN ('general_manager', 'admin')
    )
    OR
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.status = 'active'
        AND ur.role_category = 'tenant_admin'
    )
  );
