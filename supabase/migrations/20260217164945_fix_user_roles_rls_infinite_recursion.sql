/*
  # Fix infinite recursion in user_roles RLS policies

  1. Problem
    - Policies that check user_roles to determine permissions create infinite recursion
    - Example: "Platform admins can read all roles" checks if user is in user_roles as superadmin
    - This creates a loop when trying to read user_roles

  2. Solution
    - Keep simple "Users can read own role" policy (no recursion)
    - Drop all policies that query user_roles within their conditions
    - Platform admins and tenant admins will use service role or separate policies
    - For self-service signup, use SECURITY DEFINER functions instead

  3. Security
    - Users can only read their own role (auth.uid() = user_id)
    - All other operations require SECURITY DEFINER functions or service role
*/

-- Drop all recursive policies
DROP POLICY IF EXISTS "Platform admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Platform admins can update all roles" ON user_roles;
DROP POLICY IF EXISTS "Platform admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can read tenant staff roles" ON user_roles;
DROP POLICY IF EXISTS "Tenant admins can update tenant staff roles" ON user_roles;
DROP POLICY IF EXISTS "Allow client self-registration" ON user_roles;
DROP POLICY IF EXISTS "Users can create tenant_admin role during signup" ON user_roles;

-- Keep only the simple, non-recursive policy
-- This policy is already in place: "Users can read own role"
-- It uses: auth.uid() = user_id (no recursion)

-- Note: All insert/update/delete operations on user_roles should now go through
-- SECURITY DEFINER functions (like provision_tenant) or use service role key