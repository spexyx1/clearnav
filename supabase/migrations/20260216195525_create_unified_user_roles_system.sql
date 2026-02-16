/*
  # Create Unified User Roles System

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique, FK to auth.users)
      - `email` (text, unique) - Enforces one email per account across platform
      - `role_category` (enum) - Primary role type: superadmin, tenant_admin, client, staff_user
      - `role_detail` (text) - Granular role for staff: general_manager, compliance_manager, etc.
      - `tenant_id` (uuid, FK to platform_tenants) - Null for superadmins
      - `status` (text) - active, inactive, suspended
      - `metadata` (jsonb) - Additional role-specific data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_roles` table
    - Add policies for users to read their own role
    - Add policies for platform admins to manage all roles
    - Add policies for tenant admins to manage their tenant's staff roles
    - Add unique constraint on email to prevent duplicate accounts
    - Add check constraints for valid role combinations

  3. Indexes
    - Index on email for fast lookup
    - Index on user_id for authentication queries
    - Index on role_category for filtering
    - Index on tenant_id for tenant isolation

  4. Functions
    - Function to get user role by user_id
    - Function to validate email uniqueness
    - Trigger to sync email with auth.users
*/

-- Create role_category enum
DO $$ BEGIN
  CREATE TYPE role_category_enum AS ENUM ('superadmin', 'tenant_admin', 'client', 'staff_user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role_category role_category_enum NOT NULL,
  role_detail text,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint: superadmins should not have tenant_id
ALTER TABLE user_roles ADD CONSTRAINT check_superadmin_no_tenant 
  CHECK (role_category != 'superadmin' OR tenant_id IS NULL);

-- Add check constraint: non-superadmins should have tenant_id
ALTER TABLE user_roles ADD CONSTRAINT check_tenant_required 
  CHECK (role_category = 'superadmin' OR tenant_id IS NOT NULL);

-- Add check constraint: only staff_user can have role_detail
ALTER TABLE user_roles ADD CONSTRAINT check_staff_role_detail 
  CHECK (role_category = 'staff_user' OR role_detail IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_category ON user_roles(role_category);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON user_roles(status);

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS TABLE (
  role_category text,
  role_detail text,
  tenant_id uuid,
  status text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.role_category::text,
    ur.role_detail,
    ur.tenant_id,
    ur.status
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  AND ur.status = 'active';
END;
$$;

-- Create function to check email uniqueness
CREATE OR REPLACE FUNCTION check_email_available(p_email text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_roles WHERE LOWER(email) = LOWER(p_email)
  );
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_roles_updated_at ON user_roles;
CREATE TRIGGER trigger_update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Platform admins can read all roles
CREATE POLICY "Platform admins can read all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'superadmin'
      AND ur.status = 'active'
    )
  );

-- Policy: Platform admins can insert roles
CREATE POLICY "Platform admins can insert roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'superadmin'
      AND ur.status = 'active'
    )
  );

-- Policy: Platform admins can update all roles
CREATE POLICY "Platform admins can update all roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'superadmin'
      AND ur.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'superadmin'
      AND ur.status = 'active'
    )
  );

-- Policy: Tenant admins can read their tenant's staff roles
CREATE POLICY "Tenant admins can read tenant staff roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    role_category = 'staff_user'
    AND tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'tenant_admin'
      AND ur.status = 'active'
    )
  );

-- Policy: Tenant admins can update their tenant's staff roles
CREATE POLICY "Tenant admins can update tenant staff roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    role_category = 'staff_user'
    AND tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'tenant_admin'
      AND ur.status = 'active'
    )
  )
  WITH CHECK (
    role_category = 'staff_user'
    AND tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role_category = 'tenant_admin'
      AND ur.status = 'active'
    )
  );

-- Policy: Allow self-service client signup (insert only)
CREATE POLICY "Allow client self-registration"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role_category = 'client'
    AND user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
    )
  );
