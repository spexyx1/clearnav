-- Creates an invoice app guest user directly in auth.users/auth.identities,
-- bypassing the admin HTTP API (which has an unresolved 500 error).
-- Only callable by service_role (edge functions).

CREATE OR REPLACE FUNCTION public.create_invoice_guest_user(
  p_email    text,
  p_password text,
  p_username text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  -- Fail if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'email_exists' USING HINT = 'Email already registered';
  END IF;

  -- Insert the auth user with a confirmed email and bcrypt password
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  -- Insert the email identity (required for signInWithPassword to work)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    email,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    p_email,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    p_email,
    now(),
    now(),
    now()
  );

  -- Create the invoice app profile
  INSERT INTO public.invoice_app_profiles (
    user_id,
    username,
    display_name,
    is_guest,
    onboarding_complete
  ) VALUES (
    v_user_id,
    p_username,
    p_username,
    true,
    true
  );

  RETURN v_user_id;
END;
$$;

-- Restrict to service_role only (edge functions use this role)
REVOKE EXECUTE ON FUNCTION public.create_invoice_guest_user(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_invoice_guest_user(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_invoice_guest_user(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_guest_user(text, text, text) TO service_role;
