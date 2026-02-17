/*
  # Fix tenant_domains RLS Policies to Use user_roles Table

  1. Changes
    - Drop existing "Tenant admins can manage own domains" policy that uses tenant_users
    - Create new policy that uses user_roles table for consistency with other white label tables
    - Ensures tenant admins and staff users can manage domains based on their user_roles entry
    
  2. Security
    - Maintains platform admin access via platform_admin_users table
    - Aligns with the unified user_roles system used across all white label tables
    - Checks for role_category 'tenant_admin' or 'staff_user' instead of tenant_users.role
*/

-- Drop the old policy that relies on tenant_users
DROP POLICY IF EXISTS "Tenant admins can manage own domains" ON tenant_domains;

-- Create new policy using user_roles table for consistency
CREATE POLICY "Tenant admins can manage own domains"
  ON tenant_domains
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_domains.tenant_id
        AND ur.role_category IN ('tenant_admin', 'staff_user')
        AND ur.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_domains.tenant_id
        AND ur.role_category IN ('tenant_admin', 'staff_user')
        AND ur.status = 'active'
    )
  );