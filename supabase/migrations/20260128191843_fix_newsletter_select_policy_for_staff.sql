/*
  # Fix Newsletter SELECT Policy for Staff

  ## Problem
  The current SELECT policy for newsletters only checks tenant_users table,
  which means staff accounts can only read newsletters if they also have a tenant_users entry.

  ## Solution
  Update the SELECT policy to also allow staff_accounts to read newsletters from their tenant.

  ## Changes
  - Drop existing SELECT policy
  - Create new SELECT policy that checks both tenant_users AND staff_accounts
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Tenant staff can view their newsletters" ON newsletters;

-- Create improved SELECT policy that works for both tenant_users AND staff_accounts
CREATE POLICY "Tenant staff can view their newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
    OR
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts 
      WHERE auth_user_id = auth.uid() AND status = 'active'
    )
  );
