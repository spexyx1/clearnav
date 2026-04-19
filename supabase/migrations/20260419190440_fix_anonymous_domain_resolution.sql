/*
  # Fix anonymous domain resolution for custom domains

  ## Problem
  When an unauthenticated visitor lands on arklinetrust.com (or any tenant custom domain),
  the app queries `tenant_domains` and `platform_tenants` to resolve which tenant to display.
  Currently, all policies on these tables require authentication, so the query returns null
  and the app falls back to showing the ClearNav homepage instead of the tenant's site.

  ## Changes
  1. Add SELECT policy on `tenant_domains` for anonymous users (anon role) — read-only,
     only verified domains visible
  2. Add SELECT policy on `platform_tenants` for anonymous users (anon role) — read-only,
     only active/trial tenants visible (no sensitive fields exposed, all are display metadata)

  ## Security Notes
  - Anonymous users can only READ, never write
  - Only verified domains are readable
  - Only active/trial tenants are readable
  - No financial, PII, or operational data is exposed by these tables
*/

CREATE POLICY "Public can resolve verified custom domains"
  ON tenant_domains
  FOR SELECT
  TO anon
  USING (is_verified = true);

CREATE POLICY "Public can resolve active tenants by domain"
  ON platform_tenants
  FOR SELECT
  TO anon
  USING (status IN ('active', 'trial'));
