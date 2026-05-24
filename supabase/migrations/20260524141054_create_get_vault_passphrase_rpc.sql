/*
  # Create get_vault_passphrase RPC function

  ## Purpose
  The edge function get-vault-documents needs to compare a user-supplied passphrase against
  the stored vault passphrase. The vault schema is not exposed to PostgREST, so
  .schema("vault").from("decrypted_secrets") silently returns null in the edge function.

  This migration creates a SECURITY DEFINER function in the public schema that reads the
  decrypted secret from vault.decrypted_secrets and returns it. Because it's SECURITY DEFINER,
  it runs as the owner (postgres) which has access to vault._crypto_aead_det_decrypt.

  The function is restricted so only the service_role can call it.

  ## Security
  - SECURITY DEFINER: runs as postgres, which has vault decrypt access
  - Revoke from public, grant only to service_role
  - No RLS bypass needed; this is a controlled internal function
*/

CREATE OR REPLACE FUNCTION public.get_vault_passphrase(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  SELECT decrypted_secret
  INTO result
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN result;
END;
$$;

-- Revoke from public, grant only to service_role
REVOKE ALL ON FUNCTION public.get_vault_passphrase(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vault_passphrase(text) TO service_role;
