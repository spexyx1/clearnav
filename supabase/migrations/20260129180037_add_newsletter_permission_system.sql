/*
  # Add Newsletter Permission System

  1. Changes
    - Update newsletter RLS policies to check staff permissions
    - Add support for `can_manage_newsletters` permission in staff_accounts.permissions JSONB
    
  2. Permission Structure
    - Tenant owners (owner role): Always have newsletter permissions
    - Tenant admins (admin role): Always have newsletter permissions  
    - Other staff: Must have `{"can_manage_newsletters": true}` in their permissions field
    
  3. Security
    - Only tenant owners/admins can modify staff permissions
    - Newsletter operations check both role and explicit permissions
*/

-- Drop existing newsletter policies
DROP POLICY IF EXISTS "Tenant admins and staff can view tenant newsletters" ON newsletters;
DROP POLICY IF EXISTS "Tenant admins can create newsletters" ON newsletters;
DROP POLICY IF EXISTS "Tenant admins can update newsletters" ON newsletters;
DROP POLICY IF EXISTS "Tenant admins can delete newsletters" ON newsletters;

-- Create new permission-aware policies for newsletters
CREATE POLICY "Staff can view tenant newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.tenant_id = newsletters.tenant_id
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Authorized staff can create newsletters"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.tenant_id = newsletters.tenant_id
      AND sa.status = 'active'
      AND (
        -- Owners and admins always have permission
        sa.role IN ('owner', 'admin')
        OR
        -- Other staff must have explicit permission
        (sa.permissions->>'can_manage_newsletters')::boolean = true
      )
    )
  );

CREATE POLICY "Authorized staff can update newsletters"
  ON newsletters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.tenant_id = newsletters.tenant_id
      AND sa.status = 'active'
      AND (
        sa.role IN ('owner', 'admin')
        OR
        (sa.permissions->>'can_manage_newsletters')::boolean = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.tenant_id = newsletters.tenant_id
      AND sa.status = 'active'
      AND (
        sa.role IN ('owner', 'admin')
        OR
        (sa.permissions->>'can_manage_newsletters')::boolean = true
      )
    )
  );

CREATE POLICY "Authorized staff can delete newsletters"
  ON newsletters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.tenant_id = newsletters.tenant_id
      AND sa.status = 'active'
      AND (
        sa.role IN ('owner', 'admin')
        OR
        (sa.permissions->>'can_manage_newsletters')::boolean = true
      )
    )
  );

-- Add helper function to check newsletter permissions
CREATE OR REPLACE FUNCTION has_newsletter_permission(tenant_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_accounts sa
    WHERE sa.auth_user_id = auth.uid()
    AND sa.tenant_id = tenant_uuid
    AND sa.status = 'active'
    AND (
      sa.role IN ('owner', 'admin')
      OR
      (sa.permissions->>'can_manage_newsletters')::boolean = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
