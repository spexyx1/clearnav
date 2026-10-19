/*
# Units can only be issued or redeemed at a final, IBKR-confirmed price

1. Plain-English summary
   Any investor transaction that creates or cancels units (contribution, redemption,
   transfer in, transfer out) must use the class's approved month-end unit price that
   ties to IBKR ("final"). The deal date must be that valuation date and the price
   per unit must equal the approved price exactly.

2. New functions
   - `capital_tx_require_final_price()` trigger function (runs with owner rights,
     fixed search_path; EXECUTE revoked from public, anon and authenticated).

3. New triggers
   - `capital_tx_final_price_guard` BEFORE INSERT OR UPDATE on `capital_transactions`.

4. Important notes
   1. Cash-only rows (no units) and cancelled / failed rows are not checked.
   2. Fees, distributions and adjustments are not unit deals and are not checked.
   3. No existing data is changed.
*/

CREATE OR REPLACE FUNCTION public.capital_tx_require_final_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class uuid;
  v_price numeric;
BEGIN
  IF NEW.transaction_type NOT IN ('contribution', 'redemption', 'transfer_in', 'transfer_out')
     OR COALESCE(NEW.shares, 0) = 0
     OR NEW.status IN ('cancelled', 'failed') THEN
    RETURN NEW;
  END IF;

  SELECT share_class_id INTO v_class FROM capital_accounts WHERE id = NEW.capital_account_id;
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'Units can only be dealt for an investor account that belongs to a share class.';
  END IF;

  SELECT nav_per_share INTO v_price
  FROM nav_calculations
  WHERE share_class_id = v_class
    AND nav_date = NEW.transaction_date
    AND status = 'approved'
    AND calculation_method = 'broker_statement'
    AND calculation_data->>'final' = 'true'
  ORDER BY version DESC NULLS LAST
  LIMIT 1;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'No final, approved IBKR unit price exists for this class on %. Units can only be issued or redeemed at a final month-end price.', NEW.transaction_date;
  END IF;

  IF NEW.price_per_share IS NULL OR abs(NEW.price_per_share - v_price) > 0.0000005 THEN
    RAISE EXCEPTION 'The price per unit must be the final approved price of % for %.', v_price, NEW.transaction_date;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.capital_tx_require_final_price() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS capital_tx_final_price_guard ON public.capital_transactions;
CREATE TRIGGER capital_tx_final_price_guard
  BEFORE INSERT OR UPDATE ON public.capital_transactions
  FOR EACH ROW EXECUTE FUNCTION public.capital_tx_require_final_price();
