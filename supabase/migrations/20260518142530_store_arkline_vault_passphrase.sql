/*
  # Store Arkline Vault Passphrase in Supabase Vault

  Stores the investor vault passphrase as an encrypted secret using the
  Supabase Vault extension (supabase_vault). The Edge Function retrieves
  this secret at runtime using the service role key — it is never stored
  in plaintext in application code.

  The secret is named 'arkline_vault_passphrase' and is readable only
  by the service role via vault.decrypted_secrets.
*/

SELECT vault.create_secret(
  'printingchex',
  'arkline_vault_passphrase',
  'Investor vault access passphrase for Arkline Trust prospect documents'
);
