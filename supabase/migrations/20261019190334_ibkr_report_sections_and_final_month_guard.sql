/*
# IBKR report checklist and "final months only" approval guard

1. Modified Tables
- `ibkr_flex_connections`
  - `sections_found` (text[], nullable): which sections of the IBKR automatic report were present in the
    most recent download (for example ChangeInNAV, PriorPeriodPosition). Written by the server only; drives the
    setup checklist shown to managers.

2. New rule (trigger) on `nav_calculations`
- A month valued from IBKR statements (calculation_method = 'broker_statement') can only be set to
  status 'approved' when its saved figures are marked final (calculation_data->>'final' = 'true'),
  meaning they tie to IBKR to the cent, every holding has an IBKR price and every movement is explained.
- Other calculation methods are unaffected.

3. Security
- No policy changes. The trigger function is SECURITY INVOKER and only raises an error; it reads nothing else.
*/

ALTER TABLE public.ibkr_flex_connections ADD COLUMN IF NOT EXISTS sections_found text[];

CREATE OR REPLACE FUNCTION public.nav_require_final_for_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NEW.calculation_method = 'broker_statement'
     AND COALESCE(NEW.calculation_data->>'final', 'false') <> 'true' THEN
    RAISE EXCEPTION 'This month is not final yet: it must tie to IBKR before it can be approved.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.nav_require_final_for_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS nav_require_final_for_approval ON public.nav_calculations;
CREATE TRIGGER nav_require_final_for_approval
  BEFORE INSERT OR UPDATE OF status ON public.nav_calculations
  FOR EACH ROW EXECUTE FUNCTION public.nav_require_final_for_approval();
