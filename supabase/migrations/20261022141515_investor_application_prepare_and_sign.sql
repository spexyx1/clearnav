/*
# Manager-prepared applications, change requests and built-in signing

## Plain-English summary
Managers can now prepare an application for a prospect (name, contact details, investor type,
amount per class, reinvest choice), then email the prospect a private link that expires.
Anything the manager prepared is shown to the prospect as "Prepared by Arkline". If the prospect
changes one of those values, the change does not take effect: it is recorded as a change request
that a manager approves or declines. Once complete, the application is locked and signed online
(email code check, drawn or typed signature, online witness) or printed, signed in ink and uploaded.

## Modified table: investor_applications
1. Status list widened: draft, sent, opened, in_progress, awaiting_witness, awaiting_second_signer,
   signed, paper_received, submitted, under_review, approved (shown as "Accepted"), rejected, cancelled.
2. New columns
   - prepared_by / prepared_at / prepared_fields: which manager prepared it and the exact prepared values
   - invite_email / invite_sent_at / invite_expires_at / opened_at / last_reminder_at / cancelled_at / link_origin
   - locked_at / sign_method ('electronic' or 'paper'): data is frozen once signing starts
   - paper_scan_path / paper_received_at / paper_checked_at / paper_checked_by: print-and-sign upload and manager check
   - signed_pdf_path / signed_pdf_sha256 / content_sha256 / signed_at: the final locked PDF and its fingerprints
   - accepted_email_sent_at: when the written acceptance and payment details were emailed
   - declaration_ticks: the 14 individual declaration ticks
   - c_arbn, c_afsl, a/b/c/d_wealth_other: fields on the 2026.1 form that had nowhere to be stored

## New tables
1. application_signers: one row per signer or witness (signer_1, signer_2, witness_1, witness_2) with their
   private link fingerprint, email-code check, signature, place of signing, witness occupation/address,
   time, IP address and device. Only the server (edge function) writes to it; managers can read the
   non-secret columns.
2. application_change_requests: prospect edits to manager-prepared values, with the manager's decision.

## Security
1. RLS enabled on both new tables; managers (tenant admins or active investor-application staff) can read
   rows for their own fund only. No direct writes from the browser.
2. Secret columns (link fingerprint, email-code fingerprint) are not granted to managers at all.
3. New manager functions check the caller manages that fund; they are not callable anonymously.
4. The public save function now refuses to touch any system, preparation, signing or review column,
   refuses locked/expired/cancelled applications, and turns edits of prepared values into change requests.
5. A private storage bucket holds signed PDFs and paper scans; only the server reads/writes it.

## Notes
1. No data is removed. The old status constraint is replaced with a wider one.
2. Units are never issued here; acceptance only opens subscriptions that wait for money and monthly dealing.
*/

ALTER TABLE public.investor_applications DROP CONSTRAINT IF EXISTS investor_applications_status_check;
ALTER TABLE public.investor_applications ADD CONSTRAINT investor_applications_status_check CHECK (status = ANY (ARRAY[
  'draft','sent','opened','in_progress','awaiting_witness','awaiting_second_signer','signed','paper_received',
  'submitted','under_review','approved','rejected','cancelled']));

ALTER TABLE public.investor_applications
  ADD COLUMN IF NOT EXISTS prepared_by uuid,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS prepared_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invite_email text,
  ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_origin text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS sign_method text,
  ADD COLUMN IF NOT EXISTS paper_scan_path text,
  ADD COLUMN IF NOT EXISTS paper_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS paper_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS paper_checked_by uuid,
  ADD COLUMN IF NOT EXISTS signed_pdf_path text,
  ADD COLUMN IF NOT EXISTS signed_pdf_sha256 text,
  ADD COLUMN IF NOT EXISTS content_sha256 text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS declaration_ticks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS c_arbn text,
  ADD COLUMN IF NOT EXISTS c_afsl text,
  ADD COLUMN IF NOT EXISTS a_wealth_other text,
  ADD COLUMN IF NOT EXISTS b_wealth_other text,
  ADD COLUMN IF NOT EXISTS c_wealth_other text,
  ADD COLUMN IF NOT EXISTS d_wealth_other text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investor_applications_sign_method_check') THEN
    ALTER TABLE public.investor_applications ADD CONSTRAINT investor_applications_sign_method_check
      CHECK (sign_method IS NULL OR sign_method IN ('electronic','paper'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS investor_applications_tenant_status_idx ON public.investor_applications (tenant_id, status);

CREATE TABLE IF NOT EXISTS public.application_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.investor_applications(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('signer_1','signer_2','witness_1','witness_2')),
  name text NOT NULL,
  email text NOT NULL,
  title_capacity text,
  token_hash text UNIQUE,
  token_expires_at timestamptz,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0,
  otp_sent_count integer NOT NULL DEFAULT 0,
  otp_window_start timestamptz,
  email_verified_at timestamptz,
  verified_ip text,
  verified_user_agent text,
  signature_type text CHECK (signature_type IS NULL OR signature_type IN ('draw','type')),
  signature_data text,
  place_of_signing text,
  occupation text,
  address text,
  signed_at timestamptz,
  signed_ip text,
  signed_user_agent text,
  invited_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS application_signers_active_role_idx
  ON public.application_signers (application_id, role) WHERE cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS application_signers_tenant_idx ON public.application_signers (tenant_id);

CREATE TABLE IF NOT EXISTS public.application_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.investor_applications(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  field text NOT NULL,
  prepared_value jsonb,
  requested_value jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','withdrawn')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS application_change_requests_pending_idx
  ON public.application_change_requests (application_id, field) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS application_change_requests_tenant_idx ON public.application_change_requests (tenant_id);

ALTER TABLE public.application_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_change_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_investor_apps(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (public.user_is_tenant_admin(auth.uid(), p_tenant_id) OR public.is_investor_app_staff(p_tenant_id));
$$;
REVOKE ALL ON FUNCTION public.can_manage_investor_apps(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_investor_apps(uuid) TO authenticated, service_role;

REVOKE ALL ON public.application_signers FROM anon, authenticated;
GRANT SELECT (id, application_id, tenant_id, role, name, email, title_capacity, token_expires_at, email_verified_at,
  verified_ip, verified_user_agent, signature_type, place_of_signing, occupation, address, signed_at, signed_ip,
  signed_user_agent, invited_at, cancelled_at, created_at) ON public.application_signers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.application_signers TO service_role;

REVOKE ALL ON public.application_change_requests FROM anon, authenticated;
GRANT SELECT ON public.application_change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.application_change_requests TO service_role;

DROP POLICY IF EXISTS "managers_select_application_signers" ON public.application_signers;
CREATE POLICY "managers_select_application_signers" ON public.application_signers FOR SELECT
  TO authenticated USING (public.can_manage_investor_apps(tenant_id));

DROP POLICY IF EXISTS "managers_select_application_change_requests" ON public.application_change_requests;
CREATE POLICY "managers_select_application_change_requests" ON public.application_change_requests FOR SELECT
  TO authenticated USING (public.can_manage_investor_apps(tenant_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('investor-application-files', 'investor-application-files', false, 15728640)
ON CONFLICT (id) DO NOTHING;

-- Columns the public save function must never write.
CREATE OR REPLACE FUNCTION public.investor_application_system_columns()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT ARRAY['id','tenant_id','status','submitted_at','reviewed_at','reviewer_id','reviewer_notes','reviewed_by_email',
    'review_decision','created_at','updated_at','resume_token_hash','notified_at','declaration_agreed_at','prepared_by',
    'prepared_at','prepared_fields','invite_email','invite_sent_at','invite_expires_at','opened_at','last_reminder_at',
    'cancelled_at','link_origin','locked_at','sign_method','paper_scan_path','paper_received_at','paper_checked_at',
    'paper_checked_by','signed_pdf_path','signed_pdf_sha256','content_sha256','signed_at','accepted_email_sent_at',
    'total_committed_capital','signatures']::text[];
$$;
REVOKE ALL ON FUNCTION public.investor_application_system_columns() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_investor_application(
  p_token text, p_tenant_slug text, p_payload jsonb, p_submit boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_token text := p_token;
  v_hash text;
  v_id uuid;
  v_app public.investor_applications;
  v_tenant uuid;
  v_cols text;
  v_payload jsonb;
  v_key text;
  v_prep jsonb;
  v_new jsonb;
  v_old jsonb;
  v_pending jsonb;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR pg_column_size(p_payload) > 500000 THEN
    RAISE EXCEPTION 'Invalid application data' USING ERRCODE = '22023';
  END IF;
  IF p_submit THEN
    RAISE EXCEPTION 'Please sign the application to submit it' USING ERRCODE = '22023';
  END IF;
  v_payload := p_payload - public.investor_application_system_columns();

  IF v_token IS NULL THEN
    SELECT id INTO v_tenant FROM public.platform_tenants WHERE slug = p_tenant_slug;
    IF v_tenant IS NULL THEN
      RAISE EXCEPTION 'Unknown fund' USING ERRCODE = '22023';
    END IF;
    IF NOT public.consume_rate_limit('investor_app_create', 300, 3600) THEN
      RAISE EXCEPTION 'Too many new applications, please try again shortly' USING ERRCODE = '54000';
    END IF;
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    v_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');
    INSERT INTO public.investor_applications (tenant_id, status, resume_token_hash)
    VALUES (v_tenant, 'draft', v_hash) RETURNING * INTO v_app;
  ELSE
    v_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');
    SELECT * INTO v_app FROM public.investor_applications WHERE resume_token_hash = v_hash FOR UPDATE;
    IF v_app.id IS NULL THEN
      RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_app.status NOT IN ('draft','sent','opened','in_progress') OR v_app.locked_at IS NOT NULL THEN
      RAISE EXCEPTION 'This application is locked for signing and can no longer be edited' USING ERRCODE = '42501';
    END IF;
    IF v_app.invite_expires_at IS NOT NULL AND v_app.invite_expires_at < now() THEN
      RAISE EXCEPTION 'This link has expired. Please ask Arkline for a new one' USING ERRCODE = '42501';
    END IF;
  END IF;
  v_id := v_app.id;

  FOR v_key, v_prep IN SELECT key, value FROM jsonb_each(v_app.prepared_fields) LOOP
    IF v_payload ? v_key THEN
      v_new := to_jsonb(jsonb_populate_record(NULL::public.investor_applications, jsonb_build_object(v_key, v_payload -> v_key))) -> v_key;
      v_old := to_jsonb(jsonb_populate_record(NULL::public.investor_applications, jsonb_build_object(v_key, v_prep))) -> v_key;
      IF v_new IS DISTINCT FROM v_old THEN
        IF NOT EXISTS (SELECT 1 FROM public.application_change_requests c
                        WHERE c.application_id = v_id AND c.field = v_key AND c.status = 'declined'
                          AND c.requested_value IS NOT DISTINCT FROM v_new
                          AND c.decided_at > COALESCE((SELECT max(c2.created_at) FROM public.application_change_requests c2
                                                        WHERE c2.application_id = v_id AND c2.field = v_key AND c2.status = 'pending'), '-infinity'::timestamptz)) THEN
          INSERT INTO public.application_change_requests (application_id, tenant_id, field, prepared_value, requested_value)
          VALUES (v_id, v_app.tenant_id, v_key, v_old, v_new)
          ON CONFLICT (application_id, field) WHERE status = 'pending'
          DO UPDATE SET requested_value = EXCLUDED.requested_value, updated_at = now();
        END IF;
      ELSE
        UPDATE public.application_change_requests SET status = 'withdrawn', updated_at = now()
         WHERE application_id = v_id AND field = v_key AND status = 'pending';
      END IF;
      v_payload := v_payload - v_key;
    END IF;
  END LOOP;

  SELECT string_agg(quote_ident(column_name), ',') INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'investor_applications'
     AND column_name <> ALL (public.investor_application_system_columns());

  EXECUTE format(
    'UPDATE public.investor_applications t SET (%1$s) = (SELECT %1$s FROM jsonb_populate_record(NULL::public.investor_applications, to_jsonb(t) || $1)) WHERE t.id = $2',
    v_cols) USING v_payload, v_id;

  UPDATE public.investor_applications
     SET updated_at = now(),
         total_committed_capital = NULLIF(
           CASE WHEN invest_class_a THEN COALESCE(amount_class_a, 0) ELSE 0 END
         + CASE WHEN invest_class_b THEN COALESCE(amount_class_b, 0) ELSE 0 END
         + CASE WHEN invest_class_c THEN COALESCE(amount_class_c, 0) ELSE 0 END, 0),
         declaration_agreed_at = CASE WHEN declaration_agreed THEN COALESCE(declaration_agreed_at, now()) ELSE NULL END,
         status = CASE WHEN status IN ('sent','opened') THEN 'in_progress' ELSE status END
   WHERE id = v_id
   RETURNING * INTO v_app;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('field', field, 'requested_value', requested_value, 'status', status)), '[]'::jsonb)
    INTO v_pending FROM public.application_change_requests WHERE application_id = v_id AND status = 'pending';

  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'status', v_app.status, 'change_requests', v_pending);
END;
$$;
REVOKE ALL ON FUNCTION public.save_investor_application(text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_investor_application(text, text, jsonb, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.load_investor_application(p_token text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_app public.investor_applications;
  v_row jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN NULL; END IF;
  SELECT * INTO v_app FROM public.investor_applications a
   WHERE a.resume_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  IF v_app.id IS NULL THEN RETURN NULL; END IF;
  IF v_app.status = 'cancelled' THEN RETURN jsonb_build_object('cancelled', true); END IF;
  IF v_app.invite_expires_at IS NOT NULL AND v_app.invite_expires_at < now()
     AND v_app.status IN ('sent','opened','in_progress') AND v_app.locked_at IS NULL THEN
    RETURN jsonb_build_object('expired', true);
  END IF;

  IF v_app.status = 'sent' THEN
    UPDATE public.investor_applications SET status = 'opened', opened_at = COALESCE(opened_at, now())
     WHERE id = v_app.id RETURNING * INTO v_app;
  END IF;

  v_row := to_jsonb(v_app) - 'resume_token_hash' - 'reviewer_id' - 'reviewed_by_email' - 'review_decision'
    - 'prepared_by' - 'link_origin' - 'paper_scan_path' - 'signed_pdf_path' - 'paper_checked_by' - 'signatures'
    - CASE WHEN v_app.status = 'rejected' THEN 'x_none' ELSE 'reviewer_notes' END;

  RETURN v_row || jsonb_build_object(
    'has_signed_pdf', v_app.signed_pdf_path IS NOT NULL,
    'has_paper_scan', v_app.paper_scan_path IS NOT NULL,
    'change_requests', COALESCE((SELECT jsonb_agg(jsonb_build_object('field', c.field, 'requested_value', c.requested_value,
        'status', c.status, 'decision_note', c.decision_note) ORDER BY c.created_at)
      FROM public.application_change_requests c WHERE c.application_id = v_app.id AND c.status IN ('pending','declined','approved')), '[]'::jsonb),
    'signers', COALESCE((SELECT jsonb_agg(jsonb_build_object('role', s.role, 'name', s.name, 'email', s.email,
        'email_verified_at', s.email_verified_at, 'signed_at', s.signed_at, 'invited_at', s.invited_at) ORDER BY s.role)
      FROM public.application_signers s WHERE s.application_id = v_app.id AND s.cancelled_at IS NULL), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.load_investor_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_investor_application(text) TO anon, authenticated;

-- Applicant can reopen a locked application for editing only while nobody has signed and nothing was uploaded.
CREATE OR REPLACE FUNCTION public.unlock_investor_application(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_app public.investor_applications;
BEGIN
  SELECT * INTO v_app FROM public.investor_applications
   WHERE resume_token_hash = encode(sha256(convert_to(COALESCE(p_token, ''), 'UTF8')), 'hex') FOR UPDATE;
  IF v_app.id IS NULL THEN RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002'; END IF;
  IF v_app.locked_at IS NULL THEN RETURN jsonb_build_object('status', v_app.status); END IF;
  IF v_app.status NOT IN ('in_progress','draft')
     OR v_app.paper_scan_path IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.application_signers s WHERE s.application_id = v_app.id AND s.cancelled_at IS NULL AND s.signed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Signing has already started, so the application can no longer be edited' USING ERRCODE = '42501';
  END IF;
  UPDATE public.application_signers SET cancelled_at = now(), token_hash = NULL
   WHERE application_id = v_app.id AND cancelled_at IS NULL;
  UPDATE public.investor_applications SET locked_at = NULL, sign_method = NULL, updated_at = now()
   WHERE id = v_app.id;
  RETURN jsonb_build_object('status', v_app.status);
END;
$$;
REVOKE ALL ON FUNCTION public.unlock_investor_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_investor_application(text) TO anon, authenticated;

-- Manager: create or update a prepared draft.
CREATE OR REPLACE FUNCTION public.prepare_investor_application(p_tenant_id uuid, p_application_id uuid, p_fields jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_allowed text[] := ARRAY['contact_title','contact_given_names','contact_surname','contact_email','contact_phone',
    'investor_type','invest_class_a','invest_class_b','invest_class_c','amount_class_a','amount_class_b','amount_class_c','bank_reinvest'];
  v_fields jsonb;
  v_id uuid := p_application_id;
  v_status text;
  v_prepared_by uuid;
  v_cols text;
BEGIN
  IF NOT public.can_manage_investor_apps(p_tenant_id) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields) <> 'object' THEN
    RAISE EXCEPTION 'Invalid application data' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_fields
    FROM jsonb_each(p_fields) WHERE key = ANY (v_allowed) AND value <> 'null'::jsonb AND value <> '""'::jsonb;
  IF COALESCE(v_fields ->> 'contact_email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.investor_applications (tenant_id, status, prepared_by, prepared_at)
    VALUES (p_tenant_id, 'draft', auth.uid(), now()) RETURNING id INTO v_id;
  ELSE
    SELECT status, prepared_by INTO v_status, v_prepared_by FROM public.investor_applications
     WHERE id = v_id AND tenant_id = p_tenant_id FOR UPDATE;
    IF v_status IS NULL OR v_status <> 'draft' OR v_prepared_by IS NULL THEN
      RAISE EXCEPTION 'Only unsent prepared drafts can be edited' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT string_agg(quote_ident(k), ',') INTO v_cols FROM unnest(v_allowed) k;
  EXECUTE format(
    'UPDATE public.investor_applications t SET (%1$s) = (SELECT %1$s FROM jsonb_populate_record(NULL::public.investor_applications, $1)) WHERE t.id = $2',
    v_cols) USING v_fields, v_id;

  UPDATE public.investor_applications
     SET prepared_fields = v_fields,
         invite_email = lower(v_fields ->> 'contact_email'),
         prepared_at = now(),
         updated_at = now(),
         total_committed_capital = NULLIF(
           CASE WHEN invest_class_a THEN COALESCE(amount_class_a, 0) ELSE 0 END
         + CASE WHEN invest_class_b THEN COALESCE(amount_class_b, 0) ELSE 0 END
         + CASE WHEN invest_class_c THEN COALESCE(amount_class_c, 0) ELSE 0 END, 0)
   WHERE id = v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_investor_application(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_investor_application(uuid, uuid, jsonb) TO authenticated;

-- Manager: cancel an application and every link attached to it.
CREATE OR REPLACE FUNCTION public.cancel_investor_application(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_tenant uuid; v_status text;
BEGIN
  SELECT tenant_id, status INTO v_tenant, v_status FROM public.investor_applications WHERE id = p_application_id FOR UPDATE;
  IF v_tenant IS NULL OR NOT public.can_manage_investor_apps(v_tenant) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF v_status IN ('approved','rejected','cancelled') THEN
    RAISE EXCEPTION 'This application is already closed' USING ERRCODE = '42501';
  END IF;
  UPDATE public.application_signers SET cancelled_at = now(), token_hash = NULL
   WHERE application_id = p_application_id AND cancelled_at IS NULL AND signed_at IS NULL;
  UPDATE public.application_signers SET token_hash = NULL WHERE application_id = p_application_id;
  UPDATE public.investor_applications SET status = 'cancelled', cancelled_at = now(), resume_token_hash = NULL, updated_at = now()
   WHERE id = p_application_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_investor_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_investor_application(uuid) TO authenticated;

-- Manager: approve or decline a prospect's change to a prepared value.
CREATE OR REPLACE FUNCTION public.decide_application_change(p_request_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_req public.application_change_requests;
BEGIN
  SELECT * INTO v_req FROM public.application_change_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL OR NOT public.can_manage_investor_apps(v_req.tenant_id) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'This change has already been decided' USING ERRCODE = '42501';
  END IF;
  IF p_approve THEN
    EXECUTE format(
      'UPDATE public.investor_applications t SET %1$I = (SELECT %1$I FROM jsonb_populate_record(NULL::public.investor_applications, $1)), prepared_fields = t.prepared_fields || $1, updated_at = now() WHERE t.id = $2',
      v_req.field) USING jsonb_build_object(v_req.field, v_req.requested_value), v_req.application_id;
    UPDATE public.investor_applications
       SET total_committed_capital = NULLIF(
           CASE WHEN invest_class_a THEN COALESCE(amount_class_a, 0) ELSE 0 END
         + CASE WHEN invest_class_b THEN COALESCE(amount_class_b, 0) ELSE 0 END
         + CASE WHEN invest_class_c THEN COALESCE(amount_class_c, 0) ELSE 0 END, 0)
     WHERE id = v_req.application_id;
  END IF;
  UPDATE public.application_change_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
         decided_by = auth.uid(), decided_at = now(), decision_note = NULLIF(trim(COALESCE(p_note, '')), ''), updated_at = now()
   WHERE id = p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_application_change(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_application_change(uuid, boolean, text) TO authenticated;

-- Manager: confirm the uploaded paper copy has been checked.
CREATE OR REPLACE FUNCTION public.mark_paper_application_checked(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_tenant uuid; v_status text; v_scan text;
BEGIN
  SELECT tenant_id, status, paper_scan_path INTO v_tenant, v_status, v_scan
    FROM public.investor_applications WHERE id = p_application_id FOR UPDATE;
  IF v_tenant IS NULL OR NOT public.can_manage_investor_apps(v_tenant) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'paper_received' OR v_scan IS NULL THEN
    RAISE EXCEPTION 'No paper copy is waiting to be checked' USING ERRCODE = '42501';
  END IF;
  UPDATE public.investor_applications SET paper_checked_at = now(), paper_checked_by = auth.uid(), updated_at = now()
   WHERE id = p_application_id;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_paper_application_checked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_paper_application_checked(uuid) TO authenticated;
