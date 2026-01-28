/*
  # Enable Tenant Owner Client Management

  ## Changes
  This migration enables tenant owners and authorized staff to fully manage clients in their tenant.

  1. **Client Management Policies**
     - Add INSERT policy for tenant admins/owners to create clients
     - Add DELETE policy for tenant admins/owners to remove clients
     - Add INSERT policy for staff with can_invite_clients permission
     - Add DELETE policy for staff with user management permission

  2. **Staff Permissions**
     - Add can_manage_users column to staff_permissions table
     - This permission controls who can add/remove clients and staff

  ## Security
  - Only tenant owners/admins can create and delete clients
  - Staff members need explicit permission (can_invite_clients or can_manage_users)
  - All policies check tenant_id to ensure isolation
*/

-- Add can_manage_users permission column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_permissions' AND column_name = 'can_manage_users'
  ) THEN
    ALTER TABLE staff_permissions ADD COLUMN can_manage_users boolean DEFAULT false;
  END IF;
END $$;

-- Add INSERT policy for tenant admins/owners to create clients
CREATE POLICY "Tenant admins can create clients in their tenant"
  ON client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Add INSERT policy for staff with permission
CREATE POLICY "Authorized staff can create clients"
  ON client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id
      FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (
        sa.role IN ('general_manager', 'admin')
        OR sp.can_invite_clients = true
        OR sp.can_manage_users = true
      )
    )
  );

-- Add DELETE policy for tenant admins/owners
CREATE POLICY "Tenant admins can delete clients in their tenant"
  ON client_profiles FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Add DELETE policy for authorized staff
CREATE POLICY "Authorized staff can delete clients"
  ON client_profiles FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id
      FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (
        sa.role IN ('general_manager', 'admin')
        OR sp.can_manage_users = true
      )
    )
  );

-- Similarly, add INSERT and DELETE policies for staff_accounts
-- This allows tenant owners to manage staff members

-- Staff can be created by tenant admins
CREATE POLICY "Tenant admins can create staff in their tenant"
  ON staff_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Staff can be deleted by tenant admins or authorized staff
CREATE POLICY "Tenant admins can delete staff in their tenant"
  ON staff_accounts FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Authorized staff can delete other staff (but not themselves)
CREATE POLICY "Authorized staff can delete other staff"
  ON staff_accounts FOR DELETE
  TO authenticated
  USING (
    auth_user_id != auth.uid()
    AND tenant_id IN (
      SELECT sa.tenant_id
      FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (
        sa.role = 'general_manager'
        OR sp.can_manage_users = true
      )
    )
  );
