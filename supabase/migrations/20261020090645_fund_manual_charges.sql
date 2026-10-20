/*
# Manual charges, investor fees and manager rebates

## Plain-English summary
IBKR remains the main source for fees. This table holds the extra charges IBKR does not work out, which a manager enters by hand:
1. Class charges (admin, audit, legal, custom). These are taken out of the whole class's value, so the unit price drops.
2. Investor fees. These are charged to one investor only, by cancelling units worth the fee at the final IBKR price.
3. Manager rebates. Arkline pays these to one investor. They stay "owed by Arkline" until Arkline's payment appears in IBKR. New units are then issued to the investor at the final price.

## New table: fund_manual_charges
- kind: class_charge | investor_fee | manager_rebate
- category: admin | audit | legal | custom
- amount: in USD. Must be positive. Only corrections (corrects_id set) to class charges or investor fees may be negative.
- charge_month: first day of the month the charge belongs to
- share_class_id: required. capital_account_id: required for investor fees and rebates.
- note: required, shown to investors on statements
- document_path: optional supporting document
- ibkr_movement_key: optional. For a class charge, this is the IBKR payment that settles it, so the cost is never counted twice. For a rebate, it is Arkline's IBKR deposit that funds it.
- paid_month: the month of the linked IBKR movement
- corrects_id: the entry this one corrects
- status: active | cancelled
- created_by and created_at, cancelled_by and cancelled_at

## Register changes
- The 'fee' transaction type now cancels units. It does not count as capital returned.
- The 'adjustment' transaction type now adds units, for rebates and fee refunds. It does not count as capital contributed.
- Both must use the final approved IBKR price, exactly like issues and redemptions. Once settled, they are locked.

## Security
- RLS is on. Only tenant admins can read or write.
- A trigger accepts entries only for months that are still open, meaning no approved month-end exists for that class. Approved months cannot be changed. Mistakes are fixed with a correction in an open month.
- Rows are never deleted. They are cancelled instead.
*/

CREATE TABLE IF NOT EXISTS fund_manual_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid NOT NULL REFERENCES share_classes(id),
  capital_account_id uuid REFERENCES capital_accounts(id),
  kind text NOT NULL CHECK (kind IN ('class_charge', 'investor_fee', 'manager_rebate')),
  category text NOT NULL DEFAULT 'custom' CHECK (category IN ('admin', 'audit', 'legal', 'custom')),
  amount numeric(18,2) NOT NULL,
  charge_month date NOT NULL CHECK (extract(day FROM charge_month) = 1),
  note text NOT NULL CHECK (length(trim(note)) > 0),
  document_path text,
  ibkr_movement_key text,
  paid_month date CHECK (paid_month IS NULL OR extract(day FROM paid_month) = 1),
  corrects_id uuid REFERENCES fund_manual_charges(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  CONSTRAINT fmc_account_needed CHECK ((kind = 'class_charge') = (capital_account_id IS NULL)),
  CONSTRAINT fmc_amount_sign CHECK (amount > 0 OR (amount < 0 AND corrects_id IS NOT NULL AND kind <> 'manager_rebate')),
  CONSTRAINT fmc_link_month CHECK ((ibkr_movement_key IS NULL) = (paid_month IS NULL))
);

CREATE INDEX IF NOT EXISTS fmc_fund_idx ON fund_manual_charges(fund_id, charge_month);
CREATE INDEX IF NOT EXISTS fmc_tenant_idx ON fund_manual_charges(tenant_id);
CREATE INDEX IF NOT EXISTS fmc_class_idx ON fund_manual_charges(share_class_id);
CREATE INDEX IF NOT EXISTS fmc_account_idx ON fund_manual_charges(capital_account_id);
CREATE INDEX IF NOT EXISTS fmc_corrects_idx ON fund_manual_charges(corrects_id);
CREATE INDEX IF NOT EXISTS fmc_created_by_idx ON fund_manual_charges(created_by);
CREATE INDEX IF NOT EXISTS fmc_cancelled_by_idx ON fund_manual_charges(cancelled_by);
CREATE UNIQUE INDEX IF NOT EXISTS fmc_movement_once ON fund_manual_charges(fund_id, ibkr_movement_key) WHERE ibkr_movement_key IS NOT NULL AND status = 'active';

CREATE OR REPLACE FUNCTION fund_month_is_open(p_class uuid, p_month date)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM nav_calculations
    WHERE share_class_id = p_class AND status = 'approved' AND calculation_method = 'broker_statement'
      AND nav_date >= p_month AND nav_date < (p_month + interval '1 month')
  );
$$;

CREATE OR REPLACE FUNCTION fund_manual_charges_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Charges are never deleted. Cancel it instead.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT fund_month_is_open(NEW.share_class_id, NEW.charge_month) THEN
      RAISE EXCEPTION 'The % month-end is already approved for this class. Enter a correction in the next open month instead.', to_char(NEW.charge_month, 'YYYY-MM');
    END IF;
    IF NEW.capital_account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM capital_accounts WHERE id = NEW.capital_account_id AND share_class_id = NEW.share_class_id AND fund_id = NEW.fund_id AND metadata->>'official' = 'true'
    ) THEN
      RAISE EXCEPTION 'The investor account must be an official account in this class.';
    END IF;
    IF NEW.paid_month IS NOT NULL AND NOT fund_month_is_open(NEW.share_class_id, NEW.paid_month) THEN
      RAISE EXCEPTION 'The month of the linked IBKR payment is already approved.';
    END IF;
    NEW.created_by := auth.uid();
    NEW.status := 'active';
    RETURN NEW;
  END IF;
  IF (NEW.tenant_id, NEW.fund_id, NEW.share_class_id, NEW.capital_account_id, NEW.kind, NEW.category, NEW.amount, NEW.charge_month, NEW.corrects_id, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM (OLD.tenant_id, OLD.fund_id, OLD.share_class_id, OLD.capital_account_id, OLD.kind, OLD.category, OLD.amount, OLD.charge_month, OLD.corrects_id, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'A saved charge cannot be edited. Cancel it, or enter a correction.';
  END IF;
  IF OLD.status = 'cancelled' AND (NEW.status, NEW.ibkr_movement_key, NEW.paid_month) IS DISTINCT FROM (OLD.status, OLD.ibkr_movement_key, OLD.paid_month) THEN
    RAISE EXCEPTION 'A cancelled charge cannot be changed.';
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status = 'active' THEN
    IF NOT fund_month_is_open(OLD.share_class_id, OLD.charge_month) OR (OLD.paid_month IS NOT NULL AND NOT fund_month_is_open(OLD.share_class_id, OLD.paid_month)) THEN
      RAISE EXCEPTION 'This charge is in an approved month and cannot be cancelled. Enter a correction in the next open month instead.';
    END IF;
    NEW.cancelled_by := auth.uid();
    NEW.cancelled_at := now();
  END IF;
  IF (NEW.ibkr_movement_key, NEW.paid_month) IS DISTINCT FROM (OLD.ibkr_movement_key, OLD.paid_month) THEN
    IF OLD.paid_month IS NOT NULL AND NOT fund_month_is_open(OLD.share_class_id, OLD.paid_month) THEN
      RAISE EXCEPTION 'The linked IBKR payment is in an approved month and cannot be changed.';
    END IF;
    IF NEW.paid_month IS NOT NULL AND NOT fund_month_is_open(NEW.share_class_id, NEW.paid_month) THEN
      RAISE EXCEPTION 'The month of the linked IBKR payment is already approved.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fund_manual_charges_guard ON fund_manual_charges;
CREATE TRIGGER fund_manual_charges_guard BEFORE INSERT OR UPDATE OR DELETE ON fund_manual_charges
FOR EACH ROW EXECUTE FUNCTION fund_manual_charges_guard();

REVOKE EXECUTE ON FUNCTION fund_manual_charges_guard() FROM PUBLIC, anon, authenticated;

ALTER TABLE fund_manual_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_manual_charges" ON fund_manual_charges;
CREATE POLICY "admins_select_manual_charges" ON fund_manual_charges FOR SELECT TO authenticated
  USING (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "admins_insert_manual_charges" ON fund_manual_charges;
CREATE POLICY "admins_insert_manual_charges" ON fund_manual_charges FOR INSERT TO authenticated
  WITH CHECK (user_is_tenant_admin((select auth.uid()), tenant_id) AND EXISTS (SELECT 1 FROM funds f WHERE f.id = fund_id AND f.tenant_id = fund_manual_charges.tenant_id));
DROP POLICY IF EXISTS "admins_update_manual_charges" ON fund_manual_charges;
CREATE POLICY "admins_update_manual_charges" ON fund_manual_charges FOR UPDATE TO authenticated
  USING (user_is_tenant_admin((select auth.uid()), tenant_id))
  WITH CHECK (user_is_tenant_admin((select auth.uid()), tenant_id));

CREATE OR REPLACE FUNCTION public.capital_tx_is_unit_deal(p_type text, p_shares numeric, p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT p_type IN ('contribution', 'transfer_in', 'redemption', 'transfer_out', 'fee', 'adjustment') AND COALESCE(p_shares, 0) <> 0 AND p_status = 'settled';
$$;

CREATE OR REPLACE FUNCTION public.capital_tx_apply_to_register()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_in boolean;
  v_cash boolean;
  v_official boolean;
  v_units numeric;
BEGIN
  IF NOT capital_tx_is_unit_deal(NEW.transaction_type, NEW.shares, NEW.status) THEN RETURN NEW; END IF;
  SELECT COALESCE(metadata->>'official', '') = 'true', shares_owned INTO v_official, v_units
  FROM capital_accounts WHERE id = NEW.capital_account_id FOR UPDATE;
  IF NOT COALESCE(v_official, false) THEN RETURN NEW; END IF;
  IF NEW.shares < 0 OR NEW.amount < 0 THEN
    RAISE EXCEPTION 'Units and amounts on a unit transaction must be positive; the type says whether units are issued or redeemed.';
  END IF;
  v_in := NEW.transaction_type IN ('contribution', 'transfer_in', 'adjustment');
  v_cash := NEW.transaction_type NOT IN ('fee', 'adjustment');
  IF NOT v_in AND COALESCE(v_units, 0) - NEW.shares < -0.0000005 THEN
    RAISE EXCEPTION 'The investor holds % units, so % units cannot be redeemed.', COALESCE(v_units, 0), NEW.shares;
  END IF;
  PERFORM set_config('arkline.register_write', 'on', true);
  UPDATE capital_accounts SET
    shares_owned = COALESCE(shares_owned, 0) + CASE WHEN v_in THEN NEW.shares ELSE -NEW.shares END,
    capital_contributed = COALESCE(capital_contributed, 0) + CASE WHEN v_in AND v_cash THEN COALESCE(NEW.amount, 0) ELSE 0 END,
    capital_returned = COALESCE(capital_returned, 0) + CASE WHEN NOT v_in AND v_cash THEN COALESCE(NEW.amount, 0) ELSE 0 END,
    updated_at = now()
  WHERE id = NEW.capital_account_id;
  PERFORM set_config('arkline.register_write', 'off', true);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.capital_tx_require_final_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_class uuid;
  v_price numeric;
BEGIN
  IF NEW.transaction_type NOT IN ('contribution', 'redemption', 'transfer_in', 'transfer_out', 'fee', 'adjustment')
     OR COALESCE(NEW.shares, 0) = 0
     OR NEW.status IN ('cancelled', 'failed') THEN
    RETURN NEW;
  END IF;
  SELECT share_class_id INTO v_class FROM capital_accounts WHERE id = NEW.capital_account_id;
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'Units can only be dealt for an investor account that belongs to a share class.';
  END IF;
  SELECT nav_per_share INTO v_price FROM nav_calculations
  WHERE share_class_id = v_class AND nav_date = NEW.transaction_date AND status = 'approved'
    AND calculation_method = 'broker_statement' AND calculation_data->>'final' = 'true'
  ORDER BY version DESC NULLS LAST LIMIT 1;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'No final, approved IBKR unit price exists for this class on %. Units can only be issued or redeemed at a final month-end price.', NEW.transaction_date;
  END IF;
  IF NEW.price_per_share IS NULL OR abs(NEW.price_per_share - v_price) > 0.0000005 THEN
    RAISE EXCEPTION 'The price per unit must be the final approved price of % for %.', v_price, NEW.transaction_date;
  END IF;
  RETURN NEW;
END;
$function$;
