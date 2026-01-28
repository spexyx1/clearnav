/*
  # Fix Newsletter RLS Policies for Tenant Admins

  ## Summary
  This migration fixes the newsletter RLS policies to allow tenant admins (users in tenant_users 
  with admin/owner role) to manage newsletters, not just staff members.

  ## Problem
  The current newsletter RLS policies only check staff_accounts, but tenant owners are created 
  in tenant_users without staff_accounts records, preventing them from managing newsletters.

  ## Changes
  - Update INSERT policy to allow both staff members AND tenant admins
  - Update UPDATE policy to allow both staff members AND tenant admins
  - Update DELETE policy to allow both staff members AND tenant admins
  - Keep SELECT policy unchanged as it already works correctly

  ## Security
  - Policies still enforce tenant isolation
  - Only admin/owner roles in tenant_users can manage newsletters
  - Staff members with appropriate permissions can still manage newsletters
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authorized staff can create newsletters" ON newsletters;
DROP POLICY IF EXISTS "Authorized staff can update newsletters" ON newsletters;
DROP POLICY IF EXISTS "Authorized staff can delete newsletters" ON newsletters;

-- Create new policies that allow both tenant admins and authorized staff

CREATE POLICY "Tenant admins and authorized staff can create newsletters"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow tenant admins (users in tenant_users with admin/owner role)
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
    OR
    -- Allow authorized staff members
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (sa.role IN ('general_manager', 'admin') OR sp.can_create_newsletters = true)
    )
  );

CREATE POLICY "Tenant admins and authorized staff can update newsletters"
  ON newsletters FOR UPDATE
  TO authenticated
  USING (
    -- Allow tenant admins
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
    OR
    -- Allow authorized staff members
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (sa.role IN ('general_manager', 'admin') OR sp.can_create_newsletters = true)
    )
  )
  WITH CHECK (
    -- Same checks for the updated data
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
    OR
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (sa.role IN ('general_manager', 'admin') OR sp.can_create_newsletters = true)
    )
  );

CREATE POLICY "Tenant admins and authorized staff can delete newsletters"
  ON newsletters FOR DELETE
  TO authenticated
  USING (
    -- Allow tenant admins
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
    OR
    -- Allow general managers and admin staff
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'admin')
    )
  );
