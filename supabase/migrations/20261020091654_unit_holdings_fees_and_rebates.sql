/*
# Investor holdings: count hand-entered fees and rebates correctly

1. Modified functions
- `get_my_unit_holdings`
  - Rebate units (`adjustment`) now ADD to the investor's units (previously any non-contribution type subtracted).
  - Fee units (`fee`) still reduce units.
  - Neither fees nor rebates change the "invested" cash figure; only real money in/out does.

2. Security
- Unchanged: SECURITY DEFINER, scoped to the signed-in investor's official accounts.
*/

CREATE OR REPLACE FUNCTION public.get_my_unit_holdings()
 RETURNS TABLE(account_id uuid, share_class_id uuid, class_name text, units numeric, units_before numeric, invested numeric, unit_price numeric, valued_at date, prev_unit_price numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
CASE WHEN x.transaction_type IN ('contribution', 'transfer_in', 'adjustment') THEN x.shares ELSE -x.shares END AS signed,
CASE WHEN x.transaction_type IN ('contribution', 'transfer_in') THEN x.amount
     WHEN x.transaction_type IN ('fee', 'adjustment') THEN 0
     ELSE -x.amount END AS cash
FROM capital_transactions x
WHERE x.capital_account_id = m.id AND capital_tx_is_unit_deal(x.transaction_type, x.shares, x.status)
) t ON true
GROUP BY m.id, m.share_class_id, m.class_name, cur.nav_per_share, cur.nav_date, prev.nav_per_share;
$function$;
