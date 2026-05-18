/*
  # Investor Vault — Document Storage Infrastructure

  Creates the database and storage infrastructure for the password-protected
  Investor Vault feature, which allows Arkline Trust to share pitch decks,
  term sheets, and other prospect documents via a discreet, password-gated URL.

  1. New Tables
     - `investor_vault_documents`
       - id (uuid, primary key)
       - tenant_id (uuid, FK to platform_tenants)
       - document_name (text) — display name shown in the vault
       - document_type (text) — pitch_deck | term_sheet | one_pager | trade_history | strategy_report | other
       - storage_path (text) — path within the investor-documents storage bucket
       - description (text) — optional short description shown on the document card
       - sort_order (int) — controls card display order
       - is_active (bool) — toggle visibility without deleting
       - created_at (timestamptz)

  2. Security
     - RLS enabled on investor_vault_documents
     - Authenticated tenant admins can SELECT, INSERT, UPDATE, DELETE their own documents
     - No public/anon read access — documents are only surfaced via the
       get-vault-documents Edge Function after passphrase validation
     - The passphrase itself is stored as a Supabase secret (ARKLINE_VAULT_PASSPHRASE),
       never in this table or anywhere in the codebase

  3. Storage
     - Creates the investor-documents bucket as private (no public access)
     - RLS on storage.objects ensures only service role and admins can access

  4. Indexes
     - tenant_id + is_active for efficient vault queries
     - sort_order for ordered listing

  Notes:
     - staff_accounts uses auth_user_id (not user_id) as the FK to auth.users
*/

-- ============================================================
-- 1. CREATE investor_vault_documents TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS investor_vault_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  document_name text NOT NULL DEFAULT '',
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('pitch_deck', 'term_sheet', 'one_pager', 'trade_history', 'strategy_report', 'other')),
  storage_path  text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  sort_order    int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investor_vault_documents ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their own vault documents
CREATE POLICY "Tenant admins can view own vault documents"
  ON investor_vault_documents FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    )
  );

-- Tenant admins can insert vault documents
CREATE POLICY "Tenant admins can insert vault documents"
  ON investor_vault_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    )
  );

-- Tenant admins can update vault documents
CREATE POLICY "Tenant admins can update vault documents"
  ON investor_vault_documents FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    )
  );

-- Tenant admins can delete vault documents
CREATE POLICY "Tenant admins can delete vault documents"
  ON investor_vault_documents FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    )
  );

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_investor_vault_documents_tenant_active
  ON investor_vault_documents(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_investor_vault_documents_sort
  ON investor_vault_documents(tenant_id, sort_order);

-- ============================================================
-- 3. STORAGE BUCKET — private investor documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'investor-documents',
  'investor-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated tenant admins can upload
CREATE POLICY "Tenant admins can upload investor documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'investor-documents'
    AND (
      SELECT COUNT(*) FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    ) > 0
  );

-- Authenticated tenant admins can list/read uploaded objects
CREATE POLICY "Tenant admins can read investor documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'investor-documents'
    AND (
      SELECT COUNT(*) FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    ) > 0
  );

-- Tenant admins can delete investor documents
CREATE POLICY "Tenant admins can delete investor documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'investor-documents'
    AND (
      SELECT COUNT(*) FROM staff_accounts
      WHERE auth_user_id = auth.uid()
        AND role IN ('owner', 'admin', 'general_manager')
    ) > 0
  );
