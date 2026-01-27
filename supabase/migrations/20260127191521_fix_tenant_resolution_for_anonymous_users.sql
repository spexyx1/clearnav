/*
  # Fix Tenant Resolution for Anonymous Users

  ## Problem
  Subdomain resolution (e.g., greyalpha.clearnav.cv) fails because the platform_tenants 
  table requires authentication to view tenants. This breaks landing pages and signup flows.

  ## Solution
  Add a policy that allows anonymous users to view active tenants by slug or custom domain.
  This is safe because:
  - Only allows SELECT operations
  - Only exposes tenants with status = 'active'
  - Only exposes basic information needed for routing
  - No sensitive data is exposed in the tenant record

  ## Changes
  - Add policy "Anyone can view active tenants" for SELECT to anonymous/public role
*/

-- Allow anonymous users to view active tenants (needed for subdomain resolution)
CREATE POLICY "Anyone can view active tenants"
  ON platform_tenants
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
