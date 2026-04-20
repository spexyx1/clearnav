/*
  # Fix platform_tenants anon RLS policy to include trial status

  The "Anyone can view active tenants" policy only allowed status = 'active',
  blocking anonymous resolution of tenant domains for tenants in 'trial' status
  (such as arklinetrust.com). This migration drops the conflicting policy since
  the broader "Public can resolve active tenants by domain" policy already covers
  both 'active' and 'trial' statuses correctly.
*/

DROP POLICY IF EXISTS "Anyone can view active tenants" ON platform_tenants;
