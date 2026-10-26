/*
# Reconciliation results and approval with a recorded reason

1. New Tables
- `fund_reconciliations`: one row per share class per month holding the latest check against Interactive Brokers.
  - `tenant_id`, `fund_id`, `share_class_id`, `month_end` (date)
  - `status` (matched | within_tolerance | not_matched)
  - `provisional` (true when the month had not ended when the check ran)
  - `difference` (largest money difference found, in USD)
  - `checks` (jsonb list of each comparison), `suggestions` (jsonb list of likely causes and fixes)
  - `run_by` (defaults to the signed-in user), `run_at`
2. Modified behaviour
- The approval guard on `nav_calculations` is replaced. Approval is allowed when the month ties to IBKR,
  when the difference is $1.00 or less, or when a written reason (10+ characters) is stored in
  `calculation_data.approval_reason`. Approvals that are not an exact tie are stamped
  `calculation_data.approved_with_exceptions = true` by the database.
3. Security
- RLS enabled; tenant admins and app staff can read and write their own tenant's rows (4 policies).
*/

CREATE TABLE IF NOT EXISTS public.fund_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  fund_id uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  share_class_id uuid NOT NULL,
  month_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('matched', 'within_tolerance', 'not_matched')),
  provisional boolean NOT NULL DEFAULT false,
  difference numeric NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  run_by uuid DEFAULT auth.uid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (share_class_id, month_end)
);

CREATE INDEX IF NOT EXISTS fund_reconciliations_fund_idx ON public.fund_reconciliations (fund_id, month_end);

ALTER TABLE public.fund_reconciliations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_reconciliations TO authenticated;

DROP POLICY IF EXISTS "admin_select_fund_reconciliations" ON public.fund_reconciliations;
CREATE POLICY "admin_select_fund_reconciliations" ON public.fund_reconciliations FOR SELECT TO authenticated
  USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_insert_fund_reconciliations" ON public.fund_reconciliations;
CREATE POLICY "admin_insert_fund_reconciliations" ON public.fund_reconciliations FOR INSERT TO authenticated
  WITH CHECK (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_update_fund_reconciliations" ON public.fund_reconciliations;
CREATE POLICY "admin_update_fund_reconciliations" ON public.fund_reconciliations FOR UPDATE TO authenticated
  USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id))
  WITH CHECK (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));
DROP POLICY IF EXISTS "admin_delete_fund_reconciliations" ON public.fund_reconciliations;
CREATE POLICY "admin_delete_fund_reconciliations" ON public.fund_reconciliations FOR DELETE TO authenticated
  USING (public.user_is_tenant_admin((select auth.uid()), tenant_id) OR public.is_investor_app_staff(tenant_id));

CREATE OR REPLACE FUNCTION public.nav_require_final_for_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  diff numeric;
  reason text;
BEGIN
  IF NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND NEW.calculation_method = 'broker_statement'
     AND COALESCE(NEW.calculation_data->>'final', 'false') <> 'true' THEN
    diff := abs(COALESCE(NULLIF(NEW.calculation_data->>'reconciliation_difference', '')::numeric, 1e12));
    reason := btrim(COALESCE(NEW.calculation_data->>'approval_reason', ''));
    IF diff > 1 AND length(reason) < 10 THEN
      RAISE EXCEPTION 'This month does not tie to IBKR: a written reason is required to approve it.';
    END IF;
    NEW.calculation_data := jsonb_set(COALESCE(NEW.calculation_data, '{}'::jsonb), '{approved_with_exceptions}', 'true'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.nav_require_final_for_approval() FROM PUBLIC, anon, authenticated;
