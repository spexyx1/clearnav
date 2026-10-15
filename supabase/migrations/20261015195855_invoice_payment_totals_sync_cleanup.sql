/*
# Tidy invoice payment sync function

1. Changes
   - Replaces `sync_invoice_payment_totals()` with a version that recalculates both the
     old and new invoice when a payment row is moved between invoices (previously a no-op line).
   - Behaviour otherwise identical: amount_paid = capped sum of payments, status/paid_at derived.

2. Security
   - Still SECURITY DEFINER with fixed search_path; EXECUTE revoked from public roles.
*/

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids uuid[];
  v_id uuid;
  v_total numeric;
  v_status text;
  v_paid numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_ids := ARRAY[NEW.invoice_id];
  ELSIF TG_OP = 'DELETE' THEN
    v_ids := ARRAY[OLD.invoice_id];
  ELSE
    v_ids := ARRAY[NEW.invoice_id, OLD.invoice_id];
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    CONTINUE WHEN v_id IS NULL;
    SELECT total, status INTO v_total, v_status FROM invoices WHERE id = v_id FOR UPDATE;
    CONTINUE WHEN NOT FOUND;

    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM invoice_payments WHERE invoice_id = v_id;
    v_paid := LEAST(GREATEST(v_paid, 0), GREATEST(COALESCE(v_total, 0), 0));

    UPDATE invoices SET
      amount_paid = v_paid,
      status = CASE
        WHEN v_status = 'void' THEN v_status
        WHEN v_total > 0 AND v_paid >= v_total THEN 'paid'
        WHEN v_paid > 0 THEN CASE WHEN v_status = 'overdue' THEN 'overdue' ELSE 'partial' END
        WHEN v_status IN ('paid', 'partial') THEN 'sent'
        ELSE v_status
      END,
      paid_at = CASE
        WHEN v_status <> 'void' AND v_total > 0 AND v_paid >= v_total THEN COALESCE(paid_at, now())
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = v_id;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_invoice_payment_totals() FROM PUBLIC, anon, authenticated;
