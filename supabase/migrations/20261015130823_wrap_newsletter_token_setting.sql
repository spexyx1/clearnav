/*
# Speed up newsletter subscriber update rule

Wraps the per-request setting lookup in the "Subscribers can update own subscription via token"
rule in a sub-select so it is evaluated once per query instead of once per row.
Access behaviour is unchanged.
*/

DROP POLICY IF EXISTS "Subscribers can update own subscription via token" ON public.newsletter_subscribers;
CREATE POLICY "Subscribers can update own subscription via token"
ON public.newsletter_subscribers FOR UPDATE
TO anon, authenticated
USING (
  ((unsubscribe_token IS NOT NULL) AND (unsubscribe_token = ((SELECT current_setting('request.jwt.claims', true))::jsonb ->> 'unsubscribe_token')))
  OR (((SELECT auth.uid()) IS NOT NULL) AND tenant_id IN (
    SELECT staff_accounts.tenant_id FROM public.staff_accounts
     WHERE staff_accounts.auth_user_id = (SELECT auth.uid()) AND staff_accounts.status = 'active'))
)
WITH CHECK (
  (unsubscribe_token IS NOT NULL)
  OR (((SELECT auth.uid()) IS NOT NULL) AND tenant_id IN (
    SELECT staff_accounts.tenant_id FROM public.staff_accounts
     WHERE staff_accounts.auth_user_id = (SELECT auth.uid()) AND staff_accounts.status = 'active'))
);
