/*
# Let fund administrators manage investor applications

1. Problem
- investor_applications only allowed rows in staff_accounts, which is empty, so
  tenant admins (tenant_users owner/admin) could not create, view or update applications.
2. Modified policies
- investor_applications SELECT / INSERT / UPDATE: now allow
  user_is_tenant_admin(auth.uid(), tenant_id) OR is_investor_app_staff(tenant_id).
  The investor's own-email SELECT path is unchanged.
- investor_application_audit_log SELECT: same admin-or-staff rule via the parent application.
3. Notes
- Matches the existing rule on fund_dealing_terms and fund_price_marks.
- No DELETE access added; no data changed.
*/

DROP POLICY IF EXISTS "select_own_investor_applications" ON investor_applications;
CREATE POLICY "select_own_investor_applications" ON investor_applications FOR SELECT
  TO authenticated
  USING (
    contact_email = ((SELECT auth.jwt()) ->> 'email')
    OR user_is_tenant_admin((SELECT auth.uid()), tenant_id)
    OR is_investor_app_staff(tenant_id)
  );

DROP POLICY IF EXISTS "insert_own_investor_applications" ON investor_applications;
CREATE POLICY "insert_own_investor_applications" ON investor_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "update_own_investor_applications" ON investor_applications;
CREATE POLICY "update_own_investor_applications" ON investor_applications FOR UPDATE
  TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "staff_read_audit_log" ON investor_application_audit_log;
CREATE POLICY "staff_read_audit_log" ON investor_application_audit_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM investor_applications ia
    WHERE ia.id = investor_application_audit_log.application_id
      AND (user_is_tenant_admin((SELECT auth.uid()), ia.tenant_id) OR is_investor_app_staff(ia.tenant_id))
  ));
