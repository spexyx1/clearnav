
-- Fix: platform admin can read all email_accounts (needed for nested PostgREST selects)
-- The existing SELECT policy on email_accounts already includes a platform_admin_users check,
-- but add a dedicated simple policy that short-circuits the check for platform admins
-- so the nested select in EmailClient resolves without circular dependency issues.

DROP POLICY IF EXISTS "Platform admins can view all email accounts" ON email_accounts;

CREATE POLICY "Platform admins can view all email accounts"
  ON email_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );
