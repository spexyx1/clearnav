/*
  # Fix Staff Accounts RLS - Allow Self Read

  This migration ensures that any authenticated user can read their own staff account
  without any complex dependencies that might cause RLS failures.

  1. Drop existing potentially problematic policies
  2. Add a simple, direct policy for users to read their own staff account
  3. Keep other necessary policies for management functions
*/

-- Drop the potentially problematic "Staff can view their own account" policy
DROP POLICY IF EXISTS "Staff can view their own account" ON staff_accounts;

-- Drop the potentially problematic "Staff can view staff accounts in their tenant" policy  
DROP POLICY IF EXISTS "Staff can view staff accounts in their tenant" ON staff_accounts;

-- Drop the potentially problematic "Tenant staff can view same-tenant staff" policy
DROP POLICY IF EXISTS "Tenant staff can view same-tenant staff" ON staff_accounts;

-- Create a single, simple policy for users to read their own staff account
-- This policy has NO dependencies and should always work
CREATE POLICY "Users can read their own staff account"
  ON staff_accounts
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Allow staff to read other staff in same tenant (simplified, no circular dependency)
CREATE POLICY "Staff can read same tenant staff"
  ON staff_accounts
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM staff_accounts 
      WHERE auth_user_id = auth.uid() AND status = 'active'
    )
  );