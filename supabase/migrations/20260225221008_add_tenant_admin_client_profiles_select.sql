/*
  # Add tenant admin SELECT access to client_profiles

  1. Changes
    - Add SELECT policy for tenant admins (via tenant_users with owner/admin role)
      to view client profiles in their tenant
    - This enables the Users tab to load client data for tenant owners/admins
      who may not have a staff_accounts record

  2. Security
    - Policy requires authenticated user
    - Policy checks tenant_users membership with owner or admin role
*/

CREATE POLICY "Tenant admins can view clients in their tenant"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'admin')
    )
  );
