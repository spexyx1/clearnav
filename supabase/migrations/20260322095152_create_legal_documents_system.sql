/*
  # Create Legal Documents System

  1. New Tables
    - `legal_documents`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, nullable) - null means platform default
      - `document_type` (text) - 'terms' or 'privacy'
      - `title` (text)
      - `content` (jsonb) - structured legal content
      - `version` (text)
      - `effective_date` (timestamptz)
      - `last_updated` (timestamptz)
      - `is_active` (boolean)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `legal_document_acceptances`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `tenant_id` (uuid, references platform_tenants)
      - `document_id` (uuid, references legal_documents)
      - `document_type` (text)
      - `document_version` (text)
      - `accepted_at` (timestamptz)
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)

  2. Security
    - Enable RLS on both tables
    - Public can read active legal documents
    - Platform admins can manage platform defaults
    - Tenant admins can manage their tenant documents
    - Users can view their own acceptance records
*/

-- Create legal_documents table
CREATE TABLE IF NOT EXISTS legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy')),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  version text NOT NULL,
  effective_date timestamptz NOT NULL DEFAULT now(),
  last_updated timestamptz NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_legal_documents_tenant_type ON legal_documents(tenant_id, document_type, is_active);
CREATE INDEX IF NOT EXISTS idx_legal_documents_type_active ON legal_documents(document_type, is_active) WHERE tenant_id IS NULL;

-- Create legal_document_acceptances table
CREATE TABLE IF NOT EXISTS legal_document_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy')),
  document_version text NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create indexes for acceptance tracking
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_document_acceptances(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_tenant ON legal_document_acceptances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_document ON legal_document_acceptances(document_id);

-- Enable RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_documents

-- Anyone can read active legal documents (public or their tenant's)
CREATE POLICY "Anyone can read active legal documents"
  ON legal_documents
  FOR SELECT
  USING (
    is_active = true AND (
      tenant_id IS NULL OR
      tenant_id IN (
        SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Platform admins can manage platform default documents
CREATE POLICY "Platform admins can manage default legal documents"
  ON legal_documents
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NULL AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
    )
  )
  WITH CHECK (
    tenant_id IS NULL AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
    )
  );

-- Tenant admins can manage their tenant's legal documents
CREATE POLICY "Tenant admins can manage their legal documents"
  ON legal_documents
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = legal_documents.tenant_id
      AND role_category = 'tenant_admin'
    )
  )
  WITH CHECK (
    tenant_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = legal_documents.tenant_id
      AND role_category = 'tenant_admin'
    )
  );

-- RLS Policies for legal_document_acceptances

-- Users can view their own acceptance records
CREATE POLICY "Users can view own acceptance records"
  ON legal_document_acceptances
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own acceptance records
CREATE POLICY "Users can record own acceptances"
  ON legal_document_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Tenant admins can view acceptance records for their tenant
CREATE POLICY "Tenant admins can view tenant acceptance records"
  ON legal_document_acceptances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = legal_document_acceptances.tenant_id
      AND role_category IN ('tenant_admin', 'superadmin')
    )
  );

-- Platform admins can view all acceptance records
CREATE POLICY "Platform admins can view all acceptance records"
  ON legal_document_acceptances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
    )
  );

-- Create function to get applicable legal document
CREATE OR REPLACE FUNCTION get_applicable_legal_document(
  p_tenant_id uuid,
  p_document_type text
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  document_type text,
  title text,
  content jsonb,
  version text,
  effective_date timestamptz,
  last_updated timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- First try to get tenant-specific document
  RETURN QUERY
  SELECT 
    ld.id,
    ld.tenant_id,
    ld.document_type,
    ld.title,
    ld.content,
    ld.version,
    ld.effective_date,
    ld.last_updated
  FROM legal_documents ld
  WHERE ld.tenant_id = p_tenant_id
    AND ld.document_type = p_document_type
    AND ld.is_active = true
  ORDER BY ld.effective_date DESC
  LIMIT 1;

  -- If no tenant-specific document, return platform default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      ld.id,
      ld.tenant_id,
      ld.document_type,
      ld.title,
      ld.content,
      ld.version,
      ld.effective_date,
      ld.last_updated
    FROM legal_documents ld
    WHERE ld.tenant_id IS NULL
      AND ld.document_type = p_document_type
      AND ld.is_active = true
    ORDER BY ld.effective_date DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Create function to check if user needs to accept legal documents
CREATE OR REPLACE FUNCTION check_user_legal_acceptance(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS TABLE (
  needs_terms_acceptance boolean,
  needs_privacy_acceptance boolean,
  terms_document_id uuid,
  privacy_document_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_terms_id uuid;
  v_current_terms_version text;
  v_current_privacy_id uuid;
  v_current_privacy_version text;
  v_has_accepted_terms boolean;
  v_has_accepted_privacy boolean;
BEGIN
  -- Get current terms document
  SELECT ld.id, ld.version INTO v_current_terms_id, v_current_terms_version
  FROM get_applicable_legal_document(p_tenant_id, 'terms') ld;

  -- Get current privacy document
  SELECT ld.id, ld.version INTO v_current_privacy_id, v_current_privacy_version
  FROM get_applicable_legal_document(p_tenant_id, 'privacy') ld;

  -- Check if user has accepted current terms version
  SELECT EXISTS (
    SELECT 1 FROM legal_document_acceptances
    WHERE user_id = p_user_id
      AND document_type = 'terms'
      AND document_version = v_current_terms_version
  ) INTO v_has_accepted_terms;

  -- Check if user has accepted current privacy version
  SELECT EXISTS (
    SELECT 1 FROM legal_document_acceptances
    WHERE user_id = p_user_id
      AND document_type = 'privacy'
      AND document_version = v_current_privacy_version
  ) INTO v_has_accepted_privacy;

  RETURN QUERY SELECT
    NOT COALESCE(v_has_accepted_terms, false),
    NOT COALESCE(v_has_accepted_privacy, false),
    v_current_terms_id,
    v_current_privacy_id;
END;
$$;
