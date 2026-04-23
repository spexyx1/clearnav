/*
  # Add update_tenant_branding_fields RPC

  Creates a new RPC function to allow tenant admins to update specific branding
  fields without overwriting the entire branding JSON object.

  1. New Function
    - `update_tenant_branding_fields(p_tenant_id uuid, p_fields jsonb)`
    - Allows selective branding updates
    - Validates tenant ownership
    - Only accessible to authenticated tenant admins

  2. Security
    - Function with SECURITY DEFINER
    - Only callable by authenticated users
    - Validates user is tenant admin before update
*/

CREATE OR REPLACE FUNCTION update_tenant_branding_fields(
  p_tenant_id uuid,
  p_fields jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_branding jsonb;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify user is admin of this tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND role_category = 'tenant_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to update this tenant');
  END IF;

  -- Get current branding
  SELECT branding INTO v_current_branding FROM tenant_settings WHERE tenant_id = p_tenant_id;

  -- Merge new fields with existing branding
  UPDATE tenant_settings
  SET branding = v_current_branding || p_fields,
      updated_at = now()
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Branding fields updated'
  );
END;
$$;