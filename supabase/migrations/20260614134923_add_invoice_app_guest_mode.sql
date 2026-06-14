-- Add username and is_guest to invoice_app_profiles
ALTER TABLE public.invoice_app_profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false;

-- Case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS invoice_app_profiles_username_unique
  ON public.invoice_app_profiles (lower(username))
  WHERE username IS NOT NULL;

-- Allow anonymous users to write their own profile row
-- (anonymous auth creates a real session with auth.uid(), so existing RLS works,
--  but we need to allow the anon role as well as authenticated for INSERT)
CREATE POLICY "Anon users can insert own profile"
  ON public.invoice_app_profiles FOR INSERT
  TO anon
  WITH CHECK (user_id = auth.uid());

-- SECURITY DEFINER RPC: look up username availability and type
-- Returns { exists, is_guest, has_password } without requiring auth
CREATE OR REPLACE FUNCTION public.invoice_app_username_lookup(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_is_guest   boolean;
  v_has_email  boolean;
BEGIN
  SELECT
    iap.user_id,
    iap.is_guest,
    (au.email IS NOT NULL) AS has_email
  INTO v_user_id, v_is_guest, v_has_email
  FROM public.invoice_app_profiles iap
  JOIN auth.users au ON au.id = iap.user_id
  WHERE lower(iap.username) = lower(trim(p_username))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object(
    'exists',       true,
    'is_guest',     COALESCE(v_is_guest, true),
    'has_password', COALESCE(v_has_email, false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invoice_app_username_lookup(text) TO anon;
GRANT EXECUTE ON FUNCTION public.invoice_app_username_lookup(text) TO authenticated;
