
/*
  # Create Platform Admin User

  Creates the initial platform administrator account.

  1. Auth User
     - Email: info@clearnav.cv
     - Password: hashed via crypt
     - Email confirmed immediately (no confirmation flow)

  2. Platform Admin Record
     - Links auth user to platform_admin_users with 'super_admin' role
     - Full permissions granted
*/

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'info@clearnav.cv',
    crypt('Genius23', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "platform_admin"}',
    false,
    '',
    '',
    '',
    ''
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    'info@clearnav.cv',
    jsonb_build_object('sub', new_user_id::text, 'email', 'info@clearnav.cv'),
    'email',
    now(),
    now(),
    now()
  );

  -- Insert into platform_admin_users
  INSERT INTO platform_admin_users (user_id, role, permissions)
  VALUES (
    new_user_id,
    'super_admin',
    '{"all": true}'::jsonb
  );
END $$;
