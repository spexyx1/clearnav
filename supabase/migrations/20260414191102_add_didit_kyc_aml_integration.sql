/*
  # Add Didit KYC/AML Integration Fields

  ## Summary
  Extends the existing kyc_aml_records table with Didit.me verification session
  tracking fields, and adds a didit_kyc_configs table for per-tenant Didit workflow
  configuration.

  ## Changes

  ### Modified Tables
  - `kyc_aml_records`
    - `didit_session_id` (text) - Didit verification session UUID for webhook lookups
    - `didit_session_url` (text) - Hosted verification URL to send to clients
    - `didit_session_status` (text) - Didit lifecycle status (Not Started, In Progress, Approved, Declined, In Review, Abandoned)
    - `didit_decision_data` (jsonb) - Full decision payload from Didit webhook for audit trail
    - `didit_aml_hits` (jsonb) - AML screening hits (PEP, sanctions, adverse media matches)
    - `didit_id_data` (jsonb) - Extracted identity document data (name, DOB, nationality, doc number)
    - `verification_initiated_at` (timestamptz) - When the Didit session was created
    - `verification_completed_at` (timestamptz) - When the final webhook was received
    - `client_user_id` (uuid) - Links to auth.users for client portal access

  ### New Tables
  - `didit_kyc_configs`
    - Per-tenant Didit configuration (workflow_id override, enabled features)

  ## Security
  - RLS enabled on didit_kyc_configs
  - Tenant admins can manage their own config
  - Clients can read their own kyc_aml_records (new policy)
*/

-- Add Didit fields to kyc_aml_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'didit_session_id'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN didit_session_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'didit_session_url'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN didit_session_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'didit_session_status'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN didit_session_status text DEFAULT 'Not Started';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'didit_decision_data'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN didit_decision_data jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'didit_aml_hits'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN didit_aml_hits jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'didit_id_data'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN didit_id_data jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'verification_initiated_at'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN verification_initiated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'verification_completed_at'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN verification_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_aml_records' AND column_name = 'client_user_id'
  ) THEN
    ALTER TABLE kyc_aml_records ADD COLUMN client_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Index for fast webhook lookups by Didit session ID
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_didit_session_id ON kyc_aml_records(didit_session_id) WHERE didit_session_id IS NOT NULL;

-- Index for client portal lookups
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_client_user_id ON kyc_aml_records(client_user_id) WHERE client_user_id IS NOT NULL;

-- Per-tenant Didit configuration table
CREATE TABLE IF NOT EXISTS didit_kyc_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  workflow_id text,
  enabled boolean DEFAULT true,
  require_proof_of_address boolean DEFAULT false,
  white_label boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE didit_kyc_configs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_didit_kyc_configs_tenant_id ON didit_kyc_configs(tenant_id);

CREATE POLICY "Tenant staff can read didit kyc config"
  ON didit_kyc_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = didit_kyc_configs.tenant_id
      AND user_roles.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant admins can insert didit kyc config"
  ON didit_kyc_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = didit_kyc_configs.tenant_id
      AND user_roles.role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant admins can update didit kyc config"
  ON didit_kyc_configs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = didit_kyc_configs.tenant_id
      AND user_roles.role_category = 'tenant_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = didit_kyc_configs.tenant_id
      AND user_roles.role_category = 'tenant_admin'
    )
  );

-- Clients can read their own KYC record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'kyc_aml_records'
    AND policyname = 'Clients can read own kyc record'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Clients can read own kyc record"
        ON kyc_aml_records
        FOR SELECT
        TO authenticated
        USING (client_user_id = auth.uid())
    $policy$;
  END IF;
END $$;
