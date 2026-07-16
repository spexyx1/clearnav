/*
  # Add investor self-registration INSERT policy on user_roles

  Allows a newly authenticated user (via supabase.auth.signUp) to insert
  their own user_roles row with role_category = 'client'. This enables
  investor self-registration from the white-labelled login portal.

  Security:
  - The user can only insert a row where user_id matches their own auth.uid()
  - Only role_category = 'client' is permitted (no privilege escalation)
  - tenant_id is supplied by the frontend from the resolved public tenant
*/

DROP POLICY IF EXISTS "Users can insert own client role" ON user_roles;
CREATE POLICY "Users can insert own client role"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role_category = 'client');
