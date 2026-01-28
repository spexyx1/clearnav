/*
  # Fix Self-Service Signup RLS Policies

  1. Changes
    - Add INSERT policies for platform_tenants to allow self-service signups
    - Add INSERT policies for tenant_settings for new tenants
    - Add INSERT policies for tenant_users for new tenants
    - Add INSERT policies for tenant_subscriptions for new tenants
    - Add UPDATE policy for signup_requests to allow status updates during provisioning

  2. Security
    - Users can only create tenants during signup (no existing tenant association)
    - Users can only add themselves as tenant users
    - Tenant settings and subscriptions are tied to tenant creation
    - Signup requests can be updated by authenticated users during provisioning
*/

-- Allow newly authenticated users to create tenants during self-service signup
-- Only if they don't already have a tenant association
CREATE POLICY "Users can create tenant during signup"
  ON platform_tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_self_service = true AND
    NOT EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.user_id = auth.uid()
    )
  );

-- Allow users to add themselves as tenant users during signup
CREATE POLICY "Users can add themselves as tenant user"
  ON tenant_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow tenant admins to create settings for their tenant
CREATE POLICY "Tenant admins can create settings"
  ON tenant_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenant_settings.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

-- Allow tenant admins to create subscriptions for their tenant
CREATE POLICY "Tenant admins can create subscriptions"
  ON tenant_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenant_subscriptions.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

-- Allow authenticated users to update signup requests during provisioning
CREATE POLICY "Authenticated users can update signup requests"
  ON signup_requests
  FOR UPDATE
  TO authenticated
  WITH CHECK (true);
