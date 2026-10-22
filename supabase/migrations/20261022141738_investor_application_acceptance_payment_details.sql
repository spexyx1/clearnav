/*
# Record the payment details sent with each acceptance

## Plain-English summary
When a manager accepts an application, the written confirmation email includes the fund's bank details
for the investor's payment. This stores exactly which details were sent on that application, and lets the
next acceptance pre-fill the same details.

## Modified table: investor_applications
- `acceptance_payment_details` (jsonb): bank name, account name, BSB, account number and reference sent.

## Security
- Added to the list of columns the public save function can never write, so applicants cannot change it.
*/

ALTER TABLE public.investor_applications ADD COLUMN IF NOT EXISTS acceptance_payment_details jsonb;

CREATE OR REPLACE FUNCTION public.investor_application_system_columns()
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT ARRAY['id','tenant_id','status','submitted_at','reviewed_at','reviewer_id','reviewer_notes','reviewed_by_email',
    'review_decision','created_at','updated_at','resume_token_hash','notified_at','declaration_agreed_at','prepared_by',
    'prepared_at','prepared_fields','invite_email','invite_sent_at','invite_expires_at','opened_at','last_reminder_at',
    'cancelled_at','link_origin','locked_at','sign_method','paper_scan_path','paper_received_at','paper_checked_at',
    'paper_checked_by','signed_pdf_path','signed_pdf_sha256','content_sha256','signed_at','accepted_email_sent_at',
    'total_committed_capital','signatures','acceptance_payment_details']::text[];
$$;
REVOKE ALL ON FUNCTION public.investor_application_system_columns() FROM PUBLIC, anon, authenticated;
