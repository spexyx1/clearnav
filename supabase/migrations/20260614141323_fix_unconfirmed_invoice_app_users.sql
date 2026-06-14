-- Confirm any unconfirmed users that were created via the old signUp flow
-- for the invoice app (identified by having no profile yet but a real email).
-- This is a one-time cleanup for users stuck waiting for email confirmation.
UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now()
WHERE email_confirmed_at IS NULL
  AND is_anonymous = false
  AND id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.invoice_app_profiles iap ON iap.user_id = au.id
    WHERE iap.user_id IS NULL
      AND au.email NOT LIKE '%@guest.clearnav.cv'
  );
