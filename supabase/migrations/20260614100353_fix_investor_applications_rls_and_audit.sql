-- ─── 1. Drop the overly-permissive existing policies ────────────────────────
DROP POLICY IF EXISTS "select_own_investor_applications" ON investor_applications;
DROP POLICY IF EXISTS "insert_own_investor_applications" ON investor_applications;
DROP POLICY IF EXISTS "update_own_investor_applications" ON investor_applications;

-- ─── 2. SECURITY DEFINER helper – avoids RLS recursion when checking staff ──
CREATE OR REPLACE FUNCTION is_investor_app_staff(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_accounts
    WHERE auth_user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
  );
$$;

-- ─── 3. Anon: UPDATE their own draft by row ID (IDs not discoverable via SELECT) ──
CREATE POLICY "anon_update_investor_applications" ON investor_applications
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- ─── 4. Authenticated: SELECT own (by email) OR as active tenant staff ───────
CREATE POLICY "select_own_investor_applications" ON investor_applications
  FOR SELECT TO authenticated
  USING (
    contact_email = (auth.jwt() ->> 'email')
    OR is_investor_app_staff(tenant_id)
  );

-- ─── 5. Authenticated: INSERT own or as staff ────────────────────────────────
CREATE POLICY "insert_own_investor_applications" ON investor_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    contact_email = (auth.jwt() ->> 'email')
    OR is_investor_app_staff(tenant_id)
  );

-- ─── 6. Authenticated: UPDATE own or as staff ────────────────────────────────
CREATE POLICY "update_own_investor_applications" ON investor_applications
  FOR UPDATE TO authenticated
  USING (
    contact_email = (auth.jwt() ->> 'email')
    OR is_investor_app_staff(tenant_id)
  )
  WITH CHECK (
    contact_email = (auth.jwt() ->> 'email')
    OR is_investor_app_staff(tenant_id)
  );

-- ─── 7. Audit log table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investor_application_audit_log (
  id              bigserial   PRIMARY KEY,
  application_id  uuid        NOT NULL,
  operation       text        NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id        uuid,
  actor_email     text,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  old_status      text,
  new_status      text,
  changed_fields  text[]
);

CREATE INDEX IF NOT EXISTS idx_investor_app_audit_app
  ON investor_application_audit_log (application_id);
CREATE INDEX IF NOT EXISTS idx_investor_app_audit_time
  ON investor_application_audit_log (changed_at DESC);

ALTER TABLE investor_application_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_audit_log" ON investor_application_audit_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "staff_read_audit_log" ON investor_application_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM investor_applications ia
      WHERE ia.id = investor_application_audit_log.application_id
        AND is_investor_app_staff(ia.tenant_id)
    )
  );

-- ─── 8. Audit trigger function ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_investor_application()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO investor_application_audit_log
      (application_id, operation, actor_id, actor_email, new_status)
    VALUES (NEW.id, 'INSERT', auth.uid(), auth.jwt() ->> 'email', NEW.status);

  ELSIF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k) INTO v_changed
    FROM jsonb_object_keys(to_jsonb(NEW)) k
    WHERE (to_jsonb(NEW) ->> k) IS DISTINCT FROM (to_jsonb(OLD) ->> k);

    INSERT INTO investor_application_audit_log
      (application_id, operation, actor_id, actor_email, old_status, new_status, changed_fields)
    VALUES (
      NEW.id, 'UPDATE', auth.uid(), auth.jwt() ->> 'email',
      OLD.status, NEW.status, v_changed
    );

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO investor_application_audit_log
      (application_id, operation, actor_id, actor_email, old_status)
    VALUES (OLD.id, 'DELETE', auth.uid(), auth.jwt() ->> 'email', OLD.status);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_investor_applications ON investor_applications;
CREATE TRIGGER trg_audit_investor_applications
  AFTER INSERT OR UPDATE OR DELETE ON investor_applications
  FOR EACH ROW EXECUTE FUNCTION audit_investor_application();

-- ─── 9. Add review tracking columns ─────────────────────────────────────────
ALTER TABLE investor_applications
  ADD COLUMN IF NOT EXISTS reviewed_by_email  text,
  ADD COLUMN IF NOT EXISTS review_decision    text
    CHECK (review_decision IN ('approved', 'rejected', 'pending_info'));
