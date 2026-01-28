/*
  # Remove Recursive Policies from staff_accounts

  ## Problem
  Multiple policies on staff_accounts query the staff_accounts table within their
  USING clauses, causing infinite recursion.

  ## Solution
  Drop only the recursive policies.

  ## Security
  - Keep safe policies that don't cause recursion
*/

-- Drop all recursive policies
DROP POLICY IF EXISTS "Managers can manage staff accounts in their tenant" ON staff_accounts;
DROP POLICY IF EXISTS "Staff can read same tenant staff" ON staff_accounts;
DROP POLICY IF EXISTS "Platform admins can view all tenant data - staff_accounts" ON staff_accounts;

-- Add back platform admin policy using helper function
CREATE POLICY "Platform admins can view all staff accounts"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (is_platform_admin());
