/*
# Investor application drafts with private resume links

## Plain-English summary
Applicants (who are not signed in) could previously create AND change ANY
application in the table. Now each draft gets a private random resume code that
only the applicant holds. With that code they can keep editing their own draft
and come back later. Once submitted, only staff can change it.

## Modified table: investor_applications
- `resume_token_hash` (text, unique) - SHA-256 of the applicant's resume code. The
  raw code is never stored.
- `notified_at` (timestamptz) - when staff were emailed about the submission, so
  the notification can only be sent once.

## New functions (callable by visitors and signed-in users)
- `save_investor_application(p_token, p_tenant_slug, p_payload, p_submit)`:
  creates a draft (returns a new code) or updates the draft matching the code.
  Refuses changes once the application is no longer a draft. Applicant cannot set
  status, reviewer, tenant or timestamp fields. New drafts are capped at 300/hour.
- `load_investor_application(p_token)`: returns the draft for that code (drafts only).

## Security changes
- Removed `anon_insert_investor_applications` and `anon_update_investor_applications`.
- Insert/update by signed-in users is now staff-only; applicants use the functions above.
- Applicants can still read applications that list their own email.
*/

ALTER TABLE public.investor_applications ADD COLUMN IF NOT EXISTS resume_token_hash text;
ALTER TABLE public.investor_applications ADD COLUMN IF NOT EXISTS notified_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS investor_applications_resume_token_hash_key
  ON public.investor_applications (resume_token_hash) WHERE resume_token_hash IS NOT NULL;

DROP POLICY IF EXISTS "anon_insert_investor_applications" ON public.investor_applications;
DROP POLICY IF EXISTS "anon_update_investor_applications" ON public.investor_applications;

DROP POLICY IF EXISTS "insert_own_investor_applications" ON public.investor_applications;
CREATE POLICY "insert_own_investor_applications" ON public.investor_applications FOR INSERT
  TO authenticated WITH CHECK (public.is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "update_own_investor_applications" ON public.investor_applications;
CREATE POLICY "update_own_investor_applications" ON public.investor_applications FOR UPDATE
  TO authenticated USING (public.is_investor_app_staff(tenant_id)) WITH CHECK (public.is_investor_app_staff(tenant_id));

CREATE OR REPLACE FUNCTION public.save_investor_application(
  p_token text, p_tenant_slug text, p_payload jsonb, p_submit boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_token text := p_token;
  v_hash text;
  v_id uuid;
  v_status text;
  v_tenant uuid;
  v_cols text;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR pg_column_size(p_payload) > 500000 THEN
    RAISE EXCEPTION 'Invalid application data' USING ERRCODE = '22023';
  END IF;

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
    VALUES (v_tenant, 'draft', v_hash) RETURNING id INTO v_id;
  ELSE
    v_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');
    SELECT id, status INTO v_id, v_status FROM public.investor_applications
     WHERE resume_token_hash = v_hash FOR UPDATE;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
    END IF;
    IF v_status <> 'draft' THEN
      RAISE EXCEPTION 'This application has already been submitted' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT string_agg(quote_ident(column_name), ',') INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'investor_applications'
     AND column_name NOT IN ('id','tenant_id','status','submitted_at','reviewed_at','reviewer_id',
       'reviewer_notes','reviewed_by_email','review_decision','created_at','updated_at',
       'resume_token_hash','notified_at','declaration_agreed_at');

  EXECUTE format(
    'UPDATE public.investor_applications t SET (%1$s) = (SELECT %1$s FROM jsonb_populate_record(NULL::public.investor_applications, to_jsonb(t) || $1)) WHERE t.id = $2',
    v_cols) USING p_payload, v_id;

  UPDATE public.investor_applications
     SET updated_at = now(),
         declaration_agreed_at = CASE WHEN declaration_agreed THEN COALESCE(declaration_agreed_at, now()) ELSE NULL END,
         status = CASE WHEN p_submit THEN 'submitted' ELSE status END,
         submitted_at = CASE WHEN p_submit THEN now() ELSE submitted_at END
   WHERE id = v_id;

  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'status', CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END);
END;
$$;
REVOKE ALL ON FUNCTION public.save_investor_application(text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_investor_application(text, text, jsonb, boolean) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.load_investor_application(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_row jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN NULL; END IF;
  SELECT to_jsonb(a) - 'resume_token_hash' - 'reviewer_notes' - 'reviewer_id' - 'reviewed_by_email' - 'review_decision'
    INTO v_row
    FROM public.investor_applications a
   WHERE a.resume_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.load_investor_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_investor_application(text) TO anon, authenticated;
