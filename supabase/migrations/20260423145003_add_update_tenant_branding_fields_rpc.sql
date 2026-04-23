/*
  # Add update_tenant_branding_fields RPC

  Adds a security-definer helper function so the questionnaire can write
  primary_use_case and aum_range back into tenant_settings.branding after
  signup. The provision_tenant RPC seeds those fields with empty strings;
  this call replaces them with the values the user actually chose.

  1. New Functions
    - `update_tenant_branding_fields(p_tenant_id, p_primary_use_case, p_aum_range)`
      Updates the two branding JSONB keys for the given tenant.
      Only succeeds if the calling user is a tenant_admin for that tenant.
*/

CREATE OR REPLACE FUNCTION update_tenant_branding_fields(
  p_tenant_id uuid,
  p_primary_use_case text,
  p_aum_range text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the tenant's own admin to update branding
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role_category = 'tenant_admin'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE tenant_settings
  SET
    branding = branding
      || jsonb_build_object('primary_use_case', p_primary_use_case)
      || jsonb_build_object('aum_range', p_aum_range),
    updated_at = now()
  WHERE tenant_id = p_tenant_id;
END;
$$;
