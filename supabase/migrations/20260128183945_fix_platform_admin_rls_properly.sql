/*
  # Fix Platform Admin RLS Without Recursion

  ## Problem
  The previous migration still had a recursive policy.

  ## Solution
  Create a helper function that safely checks platform admin status,
  then use it in policies for other tables.

  ## Security
  - Platform admins can read their own record
  - No recursion in policy checks
*/

-- Drop the recursive policy we just created
DROP POLICY IF EXISTS "Platform admins can view all admin users" ON platform_admin_users;

-- Create a security definer function to check if a user is a platform admin
-- This avoids RLS recursion
CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admin_users
    WHERE user_id = check_user_id
    AND role = 'super_admin'
  );
$$;

-- Now update all policies that were causing recursion in OTHER tables
-- to use the helper function instead

-- Keep the simple self-read policy for platform_admin_users
-- This one already exists: "Users can view own platform admin record"

-- Add policy for super admins to manage other admins
CREATE POLICY "Super admins can manage admin users"
  ON platform_admin_users FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
