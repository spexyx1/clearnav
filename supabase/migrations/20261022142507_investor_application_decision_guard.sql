/*
# Guard application approval and rejection

1. Plain English
   An application can only be approved once it has been properly signed: either the
   electronic signing finished and produced the locked signed PDF, or a paper copy was
   uploaded and a manager marked it as checked. Older applications that were submitted
   before signing existed (status "submitted" or "under_review") can still be approved.
   Rejecting an application now always needs a written reason.

2. Changes
   - New trigger function `guard_investor_application_decision()`.
   - New BEFORE UPDATE trigger `investor_application_decision_guard` on `investor_applications`.

3. Security
   - Enforced in the database, so it applies no matter which screen makes the change.
   - Server code running as service_role is not restricted.
*/

CREATE OR REPLACE FUNCTION public.guard_investor_application_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT (
      (OLD.status = 'signed' AND OLD.signed_pdf_path IS NOT NULL)
      OR (OLD.status = 'paper_received' AND OLD.paper_checked_at IS NOT NULL)
      OR OLD.status IN ('submitted', 'under_review')
    ) THEN
      RAISE EXCEPTION 'This application has not been signed and checked yet';
    END IF;
  END IF;
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected'
     AND coalesce(btrim(NEW.reviewer_notes), '') = '' THEN
    RAISE EXCEPTION 'Please give a reason for rejecting the application';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_investor_application_decision() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS investor_application_decision_guard ON public.investor_applications;
CREATE TRIGGER investor_application_decision_guard
  BEFORE UPDATE OF status ON public.investor_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_investor_application_decision();
