/*
# Investor unit register

Makes the per-investor unit register the single, enforced source of truth for
official Arkline Trust accounts, and lets investors see their figures from
final, approved IBKR months only.

1. Access fixes (tenant admins)
   - Tenant owners/admins could not read or record capital_transactions,
     redemption_requests or investor_statements because those policies only
     checked staff_accounts. Added separate SELECT / INSERT / UPDATE policies
     using user_is_tenant_admin(). Existing staff policies are unchanged.

2. Ledger enforcement (official accounts = capital_accounts.metadata.official)
   - AFTER INSERT trigger on capital_transactions applies each settled unit
     transaction (contribution, transfer_in, redemption, transfer_out) to the
     investor account: shares_owned, capital_contributed, capital_returned.
     Holdings can never go below zero.
   - Settled unit transactions on official accounts cannot be edited or deleted;
     corrections must be new transactions (which still need a final price).
   - Official account balances (shares_owned, capital_contributed,
     capital_returned, and the official flag) can only be changed by the ledger
     trigger, never edited directly. New official accounts must start at zero.

3. Investor portal
   - get_my_unit_holdings(): for the signed-in investor only, returns each
     official holding with units from the ledger, the latest final & approved
     IBKR unit price for that class (pre-launch track-record months excluded),
     the previous final price, and units held before that month-end dealing.
   - get_my_unit_confirmations(): the signed-in investor's settled unit
     transactions (all dealt at final prices by the existing price guard).
   - Both are SECURITY DEFINER, scoped to auth.uid(), executable by
     authenticated only.
   - Investors can read their own investor_statements once finalized or sent.

4. Notes
   - No data is changed or removed; there are currently no unit transactions.
*/

-- 1. Tenant admin access
DROP POLICY IF EXISTS "tenant_admin_select_capital_transactions" ON capital_transactions;
CREATE POLICY "tenant_admin_select_capital_transactions" ON capital_transactions FOR SELECT
  TO authenticated USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_insert_capital_transactions" ON capital_transactions;
CREATE POLICY "tenant_admin_insert_capital_transactions" ON capital_transactions FOR INSERT
  TO authenticated WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_update_capital_transactions" ON capital_transactions;
CREATE POLICY "tenant_admin_update_capital_transactions" ON capital_transactions FOR UPDATE
  TO authenticated USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id));

DROP POLICY IF EXISTS "tenant_admin_select_redemption_requests" ON redemption_requests;
CREATE POLICY "tenant_admin_select_redemption_requests" ON redemption_requests FOR SELECT
  TO authenticated USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_insert_redemption_requests" ON redemption_requests;
CREATE POLICY "tenant_admin_insert_redemption_requests" ON redemption_requests FOR INSERT
  TO authenticated WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_update_redemption_requests" ON redemption_requests;
CREATE POLICY "tenant_admin_update_redemption_requests" ON redemption_requests FOR UPDATE
  TO authenticated USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id));

DROP POLICY IF EXISTS "tenant_admin_select_investor_statements" ON investor_statements;
CREATE POLICY "tenant_admin_select_investor_statements" ON investor_statements FOR SELECT
  TO authenticated USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_insert_investor_statements" ON investor_statements;
CREATE POLICY "tenant_admin_insert_investor_statements" ON investor_statements FOR INSERT
  TO authenticated WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_update_investor_statements" ON investor_statements;
CREATE POLICY "tenant_admin_update_investor_statements" ON investor_statements FOR UPDATE
  TO authenticated USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id));

DROP POLICY IF EXISTS "investors_select_own_final_statements" ON investor_statements;
CREATE POLICY "investors_select_own_final_statements" ON investor_statements FOR SELECT
  TO authenticated USING (
    status IN ('finalized', 'sent')
    AND EXISTS (SELECT 1 FROM capital_accounts ca WHERE ca.id = investor_statements.capital_account_id AND ca.investor_id = (SELECT auth.uid()))
  );

-- 2. Ledger enforcement
CREATE OR REPLACE FUNCTION public.capital_tx_is_unit_deal(p_type text, p_shares numeric, p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT p_type IN ('contribution', 'transfer_in', 'redemption', 'transfer_out') AND COALESCE(p_shares, 0) <> 0 AND p_status = 'settled';
$$;

CREATE OR REPLACE FUNCTION public.capital_tx_apply_to_register()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_in boolean;
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
  v_in := NEW.transaction_type IN ('contribution', 'transfer_in');
  IF NOT v_in AND COALESCE(v_units, 0) - NEW.shares < -0.0000005 THEN
    RAISE EXCEPTION 'The investor holds % units, so % units cannot be redeemed.', COALESCE(v_units, 0), NEW.shares;
  END IF;
  PERFORM set_config('arkline.register_write', 'on', true);
  UPDATE capital_accounts SET
    shares_owned = COALESCE(shares_owned, 0) + CASE WHEN v_in THEN NEW.shares ELSE -NEW.shares END,
    capital_contributed = COALESCE(capital_contributed, 0) + CASE WHEN v_in THEN COALESCE(NEW.amount, 0) ELSE 0 END,
    capital_returned = COALESCE(capital_returned, 0) + CASE WHEN v_in THEN 0 ELSE COALESCE(NEW.amount, 0) END,
    updated_at = now()
  WHERE id = NEW.capital_account_id;
  PERFORM set_config('arkline.register_write', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capital_tx_apply_to_register ON capital_transactions;
CREATE TRIGGER capital_tx_apply_to_register AFTER INSERT ON capital_transactions
  FOR EACH ROW EXECUTE FUNCTION capital_tx_apply_to_register();

CREATE OR REPLACE FUNCTION public.capital_tx_lock_settled_units()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF capital_tx_is_unit_deal(OLD.transaction_type, OLD.shares, OLD.status)
     AND EXISTS (SELECT 1 FROM capital_accounts WHERE id = OLD.capital_account_id AND metadata->>'official' = 'true') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Issued or redeemed units cannot be deleted. Record a correcting transaction instead.';
    END IF;
    IF (NEW.transaction_type, NEW.shares, NEW.amount, NEW.price_per_share, NEW.transaction_date, NEW.capital_account_id, NEW.status)
       IS DISTINCT FROM (OLD.transaction_type, OLD.shares, OLD.amount, OLD.price_per_share, OLD.transaction_date, OLD.capital_account_id, OLD.status) THEN
      RAISE EXCEPTION 'Issued or redeemed units cannot be changed. Record a correcting transaction instead.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS capital_tx_lock_settled_units ON capital_transactions;
CREATE TRIGGER capital_tx_lock_settled_units BEFORE UPDATE OR DELETE ON capital_transactions
  FOR EACH ROW EXECUTE FUNCTION capital_tx_lock_settled_units();

CREATE OR REPLACE FUNCTION public.capital_account_register_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.metadata->>'official' = 'true'
       AND (COALESCE(NEW.shares_owned, 0) <> 0 OR COALESCE(NEW.capital_contributed, 0) <> 0 OR COALESCE(NEW.capital_returned, 0) <> 0) THEN
      RAISE EXCEPTION 'A new official investor account must start with no units. Units are added only by issuing them at a final price.';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.metadata->>'official' = 'true' AND COALESCE(current_setting('arkline.register_write', true), '') <> 'on' THEN
    IF (NEW.shares_owned, NEW.capital_contributed, NEW.capital_returned, NEW.share_class_id, NEW.investor_id, NEW.fund_id)
       IS DISTINCT FROM (OLD.shares_owned, OLD.capital_contributed, OLD.capital_returned, OLD.share_class_id, OLD.investor_id, OLD.fund_id)
       OR COALESCE(NEW.metadata->>'official', '') <> 'true' THEN
      RAISE EXCEPTION 'Official investor balances come only from the unit register and cannot be edited directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capital_account_register_guard ON capital_accounts;
CREATE TRIGGER capital_account_register_guard BEFORE INSERT OR UPDATE ON capital_accounts
  FOR EACH ROW EXECUTE FUNCTION capital_account_register_guard();

REVOKE ALL ON FUNCTION public.capital_tx_apply_to_register() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capital_tx_lock_settled_units() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capital_account_register_guard() FROM PUBLIC, anon, authenticated;

-- 3. Investor portal
CREATE OR REPLACE FUNCTION public.get_my_unit_holdings()
RETURNS TABLE (
  account_id uuid, share_class_id uuid, class_name text, units numeric, units_before numeric,
  invested numeric, unit_price numeric, valued_at date, prev_unit_price numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH mine AS (
    SELECT ca.id, ca.share_class_id, sc.class_name
    FROM capital_accounts ca JOIN share_classes sc ON sc.id = ca.share_class_id
    WHERE ca.investor_id = auth.uid() AND ca.metadata->>'official' = 'true'
  ),
  finals AS (
    SELECT DISTINCT ON (n.share_class_id, n.nav_date) n.share_class_id, n.nav_date, n.nav_per_share
    FROM nav_calculations n
    WHERE n.share_class_id IN (SELECT share_class_id FROM mine)
      AND n.calculation_method = 'broker_statement' AND n.status = 'approved'
      AND n.calculation_data->>'final' = 'true'
      AND COALESCE(n.calculation_data->>'track_record', 'false') <> 'true'
    ORDER BY n.share_class_id, n.nav_date, n.version DESC NULLS LAST
  ),
  ranked AS (
    SELECT f.*, row_number() OVER (PARTITION BY f.share_class_id ORDER BY f.nav_date DESC) AS rn FROM finals f
  )
  SELECT m.id, m.share_class_id, m.class_name,
    COALESCE(SUM(CASE WHEN t.transaction_date <= cur.nav_date OR cur.nav_date IS NULL THEN t.signed END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_date < cur.nav_date THEN t.signed END), 0),
    COALESCE(SUM(t.cash), 0),
    cur.nav_per_share, cur.nav_date, prev.nav_per_share
  FROM mine m
  LEFT JOIN ranked cur ON cur.share_class_id = m.share_class_id AND cur.rn = 1
  LEFT JOIN ranked prev ON prev.share_class_id = m.share_class_id AND prev.rn = 2
  LEFT JOIN LATERAL (
    SELECT x.transaction_date,
      CASE WHEN x.transaction_type IN ('contribution', 'transfer_in') THEN x.shares ELSE -x.shares END AS signed,
      CASE WHEN x.transaction_type IN ('contribution', 'transfer_in') THEN x.amount ELSE -x.amount END AS cash
    FROM capital_transactions x
    WHERE x.capital_account_id = m.id AND capital_tx_is_unit_deal(x.transaction_type, x.shares, x.status)
  ) t ON true
  GROUP BY m.id, m.share_class_id, m.class_name, cur.nav_per_share, cur.nav_date, prev.nav_per_share;
$$;

CREATE OR REPLACE FUNCTION public.get_my_unit_confirmations()
RETURNS TABLE (
  id uuid, class_name text, transaction_type text, transaction_date date, units numeric,
  unit_price numeric, amount numeric, reference_number text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT x.id, sc.class_name, x.transaction_type, x.transaction_date, x.shares, x.price_per_share, x.amount, x.reference_number
  FROM capital_transactions x
  JOIN capital_accounts ca ON ca.id = x.capital_account_id
  JOIN share_classes sc ON sc.id = ca.share_class_id
  WHERE ca.investor_id = auth.uid() AND ca.metadata->>'official' = 'true'
    AND capital_tx_is_unit_deal(x.transaction_type, x.shares, x.status)
  ORDER BY x.transaction_date DESC, x.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_unit_holdings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_unit_confirmations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_unit_holdings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_unit_confirmations() TO authenticated;
