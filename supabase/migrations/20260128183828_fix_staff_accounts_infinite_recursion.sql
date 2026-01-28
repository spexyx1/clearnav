/*
  # Fix Infinite Recursion in staff_accounts RLS Policies

  ## Problem
  The RLS policy "General managers can manage their tenant staff" creates infinite recursion
  by querying the staff_accounts table within its own USING clause.

  ## Solution
  1. Keep the simple self-read policy that doesn't cause recursion
  2. Remove the circular policy that queries staff_accounts within its USING clause
  3. Add a simpler tenant-aware policy using tenant_users instead
  4. General managers can manage staff through proper application-level checks

  ## Security
  - Staff can still read their own account (primary access method after login)
  - No infinite recursion in policy evaluation
  - Tenant isolation maintained through tenant_users table
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Tenant staff can view same-tenant staff" ON staff_accounts;
DROP POLICY IF EXISTS "General managers can manage their tenant staff" ON staff_accounts;

-- The self-read policy is safe and works correctly
-- This policy already exists: "Staff can view their own account"

-- Add a non-recursive policy for viewing staff in the same tenant
CREATE POLICY "Tenant owners can view their tenant staff"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- General managers can manage staff through their tenant_users relationship
CREATE POLICY "Tenant owners can manage their tenant staff"
  ON staff_accounts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );
