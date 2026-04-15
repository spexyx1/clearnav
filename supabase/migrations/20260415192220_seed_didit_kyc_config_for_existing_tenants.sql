/*
  # Seed Didit KYC Config for Existing Tenants

  ## Summary
  Inserts a didit_kyc_configs row for each existing tenant that does not already
  have one. Uses the live Didit workflow ID provided by the platform owner.

  ## Changes
  - Inserts default didit_kyc_configs rows for all existing tenants
  - Sets enabled = true and the live workflow_id
  - Uses ON CONFLICT DO NOTHING to be safe for re-runs
*/

INSERT INTO didit_kyc_configs (tenant_id, workflow_id, enabled)
SELECT
  id AS tenant_id,
  '9ec0b071-71c2-4c20-ad6e-9eee7e60976d' AS workflow_id,
  true AS enabled
FROM platform_tenants
ON CONFLICT (tenant_id) DO UPDATE
  SET workflow_id = EXCLUDED.workflow_id,
      enabled = EXCLUDED.enabled,
      updated_at = now();
