/*
  # Fund Document Intelligence System

  ## Overview
  Creates the schema for AI-powered fund document upload, extraction, and review workflow.

  ## New Tables

  ### `fund_documents`
  - Stores uploaded fund documents (Trust Deeds, IMs, PPMs)
  - Tracks extraction lifecycle: pending → processing → extracted → approved/failed
  - Links to platform_tenants, optional fund, and uploader

  ### `document_extraction_results`
  - Stores structured AI-extracted data from fund documents
  - Contains fund info, share classes JSON, and investor details
  - Has approval workflow: pending → approved/rejected
  - Stores created object IDs for navigation after approval

  ## Modified Tables

  ### `client_invitations`
  - Added pre-populated fund/share/investment columns for document-driven onboarding
  - Added source_document_id to track which document triggered the invite

  ## Security
  - RLS enabled on all new tables
  - Tenant staff (role_category = 'staff_user' or 'tenant_admin') can access their tenant's data
  - Clients cannot access document or extraction data
*/

-- ============================================================
-- FUND DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fund_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('trust_deed', 'im', 'ppm', 'subscription_agreement', 'other')),
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_size_bytes bigint DEFAULT 0,
  extraction_status text NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'extracted', 'approved', 'failed')),
  extraction_error text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fund_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view fund documents"
  ON fund_documents FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant staff can insert fund documents"
  ON fund_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant staff can update fund documents"
  ON fund_documents FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Platform admins can view all fund documents"
  ON fund_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- DOCUMENT EXTRACTION RESULTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS document_extraction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_document_id uuid NOT NULL REFERENCES fund_documents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,

  -- Raw AI output
  raw_json jsonb,

  -- Extracted fund-level data (AI output)
  extracted_fund_name text,
  extracted_fund_type text,
  extracted_base_currency text DEFAULT 'USD',
  extracted_inception_date date,
  extracted_total_commitments numeric(20, 2) DEFAULT 0,

  -- Share classes: [{name, total_shares, price_per_share, currency}]
  extracted_share_classes jsonb DEFAULT '[]'::jsonb,

  -- Investor/subscriber details
  extracted_investor_name text,
  extracted_investor_email text,
  extracted_investment_amount numeric(20, 2),
  extracted_allocated_shares numeric(20, 6),
  extracted_share_class text,

  -- Manager-editable approved values
  approved_fund_name text,
  approved_fund_type text,
  approved_base_currency text,
  approved_inception_date date,
  approved_total_commitments numeric(20, 2),
  approved_share_classes jsonb DEFAULT '[]'::jsonb,
  approved_investor_name text,
  approved_investor_email text,
  approved_investment_amount numeric(20, 2),
  approved_allocated_shares numeric(20, 6),
  approved_share_class text,

  -- Approval workflow
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_notes text,

  -- References to objects created on approval (for navigation)
  created_fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  created_invitation_id uuid,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_extraction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view extraction results"
  ON document_extraction_results FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant staff can insert extraction results"
  ON document_extraction_results FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant staff can update extraction results"
  ON document_extraction_results FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- ============================================================
-- EXTEND CLIENT_INVITATIONS WITH PRE-POPULATED FIELDS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_invitations' AND column_name = 'pre_populated_fund_id'
  ) THEN
    ALTER TABLE client_invitations ADD COLUMN pre_populated_fund_id uuid REFERENCES funds(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_invitations' AND column_name = 'pre_populated_share_class'
  ) THEN
    ALTER TABLE client_invitations ADD COLUMN pre_populated_share_class text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_invitations' AND column_name = 'pre_populated_shares'
  ) THEN
    ALTER TABLE client_invitations ADD COLUMN pre_populated_shares numeric(20, 6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_invitations' AND column_name = 'pre_populated_investment_amount'
  ) THEN
    ALTER TABLE client_invitations ADD COLUMN pre_populated_investment_amount numeric(20, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_invitations' AND column_name = 'source_document_id'
  ) THEN
    ALTER TABLE client_invitations ADD COLUMN source_document_id uuid REFERENCES fund_documents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- STORAGE BUCKET POLICY HELPERS (RLS for fund-documents bucket)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fund-documents',
  'fund-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload fund documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fund-documents');

CREATE POLICY "Authenticated users can view their fund documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'fund-documents');

CREATE POLICY "Authenticated users can update their fund documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fund-documents');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fund_documents_tenant_id ON fund_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fund_documents_fund_id ON fund_documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_documents_extraction_status ON fund_documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_doc_extraction_fund_document_id ON document_extraction_results(fund_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_extraction_tenant_id ON document_extraction_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_extraction_approval_status ON document_extraction_results(approval_status);
