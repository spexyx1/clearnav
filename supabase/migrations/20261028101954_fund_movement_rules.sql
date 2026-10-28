/*
# Movement sorting rules

Plain English: one setting per type of IBKR cash movement that tells the fund
value calculation how to treat it, so movements are sorted automatically.

1. New table `fund_movement_rules`
   - `id` uuid primary key
   - `tenant_id` uuid, `fund_id` uuid (fund the rule belongs to)
   - `movement_kind` text: dividend, payment_in_lieu, withholding_tax,
     interest_received, interest_paid, commission_adjustment, broker_fee,
     advisor_fee, fee_payout, fee_credit, deposit, withdrawal,
     internal_transfer, other
   - `treatment` text: nav (moves the unit price), subscription (new series),
     redemption (cancels units, oldest series first), excluded (class switch or
     own-account transfer, not a gain), review (ask a person)
   - `updated_by`, `created_at`, `updated_at`
   - Unique (fund_id, movement_kind)
2. Seeds standard fund-admin defaults for every existing fund.
3. Security
   - RLS on; tenant admins and app staff can read/insert/update/delete,
     matching fund_movement_labels.
*/

CREATE TABLE IF NOT EXISTS public.fund_movement_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  fund_id uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  movement_kind text NOT NULL CHECK (movement_kind IN ('dividend','payment_in_lieu','withholding_tax','interest_received','interest_paid','commission_adjustment','broker_fee','advisor_fee','fee_payout','fee_credit','deposit','withdrawal','internal_transfer','other')),
  treatment text NOT NULL CHECK (treatment IN ('nav','subscription','redemption','excluded','review')),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, movement_kind)
);

ALTER TABLE public.fund_movement_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_movement_rules TO authenticated;

DROP POLICY IF EXISTS "admin_select_movement_rules" ON public.fund_movement_rules;
CREATE POLICY "admin_select_movement_rules" ON public.fund_movement_rules FOR SELECT TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "admin_insert_movement_rules" ON public.fund_movement_rules;
CREATE POLICY "admin_insert_movement_rules" ON public.fund_movement_rules FOR INSERT TO authenticated
  WITH CHECK ((user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
    AND EXISTS (SELECT 1 FROM public.funds f WHERE f.id = fund_movement_rules.fund_id AND f.tenant_id = fund_movement_rules.tenant_id));

DROP POLICY IF EXISTS "admin_update_movement_rules" ON public.fund_movement_rules;
CREATE POLICY "admin_update_movement_rules" ON public.fund_movement_rules FOR UPDATE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
  WITH CHECK ((user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
    AND EXISTS (SELECT 1 FROM public.funds f WHERE f.id = fund_movement_rules.fund_id AND f.tenant_id = fund_movement_rules.tenant_id));

DROP POLICY IF EXISTS "admin_delete_movement_rules" ON public.fund_movement_rules;
CREATE POLICY "admin_delete_movement_rules" ON public.fund_movement_rules FOR DELETE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

INSERT INTO public.fund_movement_rules (tenant_id, fund_id, movement_kind, treatment)
SELECT f.tenant_id, f.id, d.kind, d.treatment
FROM public.funds f
CROSS JOIN (VALUES
  ('dividend','nav'), ('payment_in_lieu','nav'), ('withholding_tax','nav'),
  ('interest_received','nav'), ('interest_paid','nav'), ('commission_adjustment','nav'),
  ('broker_fee','nav'), ('advisor_fee','nav'), ('fee_payout','nav'), ('fee_credit','nav'),
  ('deposit','subscription'), ('withdrawal','redemption'),
  ('internal_transfer','excluded'), ('other','review')
) AS d(kind, treatment)
WHERE f.tenant_id IS NOT NULL
ON CONFLICT (fund_id, movement_kind) DO NOTHING;
