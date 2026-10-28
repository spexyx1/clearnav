/*
# Back up and clear old IBKR data for a fresh rebuild

Plain English: the fund's past IBKR uploads, trades, cash movements, monthly
valuations, reconciliations, review items, price marks and per-movement labels
are copied into a private archive and then removed, so the fund can be rebuilt
from scratch from the latest IBKR Flex pull.

1. New schema / tables (archive, not reachable from the app's data API)
   - `archive.reset_<table>_20261101` for each table below: an exact copy of
     the fund's rows taken before deletion.
2. Cleared rows (fund 97eeb3d5-7410-4959-837c-bc41270a811d only)
   - trade_uploads (trade_upload_items cascade), nav_calculations of method
     broker_statement (nav_calculation_details cascade), fund_reconciliations,
     fund_review_items, fund_price_marks, fund_movement_labels.
   - The High Conviction class's opening setup row, so that class starts empty.
3. Kept
   - Fund, share classes, investors, capital accounts, dealing terms, IBKR
     connection, and the opening rows of the other classes.
4. Security
   - Archive schema has no grants to anon/authenticated.
5. Notes
   - Idempotent: copies use NOT EXISTS on id, deletes are scoped to the fund.
*/

CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM anon, authenticated;

DO $$
DECLARE
  t text;
  f uuid := '97eeb3d5-7410-4959-837c-bc41270a811d';
BEGIN
  FOREACH t IN ARRAY ARRAY['trade_uploads','nav_calculations','fund_reconciliations','fund_review_items','fund_price_marks','fund_movement_labels'] LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS archive.%I (LIKE public.%I)', 'reset_' || t || '_20261101', t);
    EXECUTE format('INSERT INTO archive.%I SELECT s.* FROM public.%I s WHERE s.fund_id = $1 AND NOT EXISTS (SELECT 1 FROM archive.%I a WHERE a.id = s.id)',
      'reset_' || t || '_20261101', t, 'reset_' || t || '_20261101') USING f;
  END LOOP;

  CREATE TABLE IF NOT EXISTS archive.reset_trade_upload_items_20261101 (LIKE public.trade_upload_items);
  INSERT INTO archive.reset_trade_upload_items_20261101
    SELECT i.* FROM public.trade_upload_items i JOIN public.trade_uploads u ON u.id = i.upload_id
    WHERE u.fund_id = f AND NOT EXISTS (SELECT 1 FROM archive.reset_trade_upload_items_20261101 a WHERE a.id = i.id);

  CREATE TABLE IF NOT EXISTS archive.reset_nav_calculation_details_20261101 (LIKE public.nav_calculation_details);
  INSERT INTO archive.reset_nav_calculation_details_20261101
    SELECT d.* FROM public.nav_calculation_details d JOIN public.nav_calculations n ON n.id = d.nav_calculation_id
    WHERE n.fund_id = f AND NOT EXISTS (SELECT 1 FROM archive.reset_nav_calculation_details_20261101 a WHERE a.id = d.id);

  DELETE FROM public.trade_uploads WHERE fund_id = f;
  DELETE FROM public.nav_calculations WHERE fund_id = f
    AND (calculation_method <> 'opening' OR share_class_id = '31734dcd-68ce-4469-88f1-08790d8d7089');
  DELETE FROM public.fund_reconciliations WHERE fund_id = f;
  DELETE FROM public.fund_review_items WHERE fund_id = f;
  DELETE FROM public.fund_price_marks WHERE fund_id = f;
  DELETE FROM public.fund_movement_labels WHERE fund_id = f;
END $$;
