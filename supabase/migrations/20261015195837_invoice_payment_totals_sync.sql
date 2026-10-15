/*
# Keep invoice paid amount and status in sync with recorded payments

1. Problem
   - `invoices.balance_due` is a generated column (total - amount_paid). The apps tried
     to write it directly, so every "record payment" / "mark paid" update failed silently
     and invoices never changed.

2. Changes
   - New trigger function `sync_invoice_payment_totals()` on `invoice_payments`
     (after insert / update / delete). It recalculates the parent invoice:
       - `amount_paid` = sum of its payments, capped at the invoice total
       - `status` = 'paid' when fully paid, 'partial' when partly paid,
         back to 'sent' when all payments are removed (void/draft untouched)
       - `paid_at` set when it becomes paid, cleared otherwise
   - One-off backfill recalculates every existing invoice that has payments.
   - Repairs invoice-app guest accounts that are missing their profile row.

3. Security
   - Function is SECURITY DEFINER with a fixed search_path so the recalculation always
     succeeds; it only touches the invoice that owns the payment row, and inserting that
     payment row is itself governed by existing RLS. EXECUTE revoked from public roles.
*/

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_total numeric;
  v_status text;
  v_paid numeric;
BEGIN
  SELECT total, status INTO v_total, v_status FROM invoices WHERE id = v_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM invoice_payments WHERE invoice_id = v_invoice_id;
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
  WHERE id = v_invoice_id;

  IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
    UPDATE invoice_payments SET amount = amount WHERE false;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_invoice_payment_totals() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_invoice_payment_totals ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_payment_totals
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_totals();

-- Backfill existing invoices from their recorded payments
UPDATE invoices i SET
  amount_paid = LEAST(p.paid, GREATEST(i.total, 0)),
  status = CASE
    WHEN i.status = 'void' THEN i.status
    WHEN i.total > 0 AND p.paid >= i.total THEN 'paid'
    WHEN p.paid > 0 AND i.status <> 'overdue' THEN 'partial'
    ELSE i.status
  END,
  paid_at = CASE WHEN i.status <> 'void' AND i.total > 0 AND p.paid >= i.total THEN COALESCE(i.paid_at, now()) ELSE i.paid_at END,
  updated_at = now()
FROM (SELECT invoice_id, SUM(amount) AS paid FROM invoice_payments GROUP BY invoice_id) p
WHERE p.invoice_id = i.id
  AND i.amount_paid IS DISTINCT FROM LEAST(p.paid, GREATEST(i.total, 0));

-- Repair guest accounts that never got a profile row
INSERT INTO invoice_app_profiles (user_id, username, display_name, is_guest, onboarding_complete)
SELECT u.id, split_part(u.email, '@', 1), split_part(u.email, '@', 1), true, true
FROM auth.users u
WHERE u.email LIKE '%@guest.clearnav.cv'
  AND NOT EXISTS (SELECT 1 FROM invoice_app_profiles p WHERE p.user_id = u.id)
ON CONFLICT DO NOTHING;
