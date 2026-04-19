/*
  # Compliance Officer Signatures and KYC Verification Letter Logs

  ## Summary
  This migration adds two new tables to support the KYC/AML Verification Letter system:

  1. **compliance_officer_signatures** - Stores digital signatures for designated platform-level
     compliance officers. Only one signature can be active at a time across the entire platform.
     - `id`: UUID primary key
     - `officer_user_id`: References auth.users - the designated compliance officer
     - `officer_name`: Display name of the officer
     - `officer_title`: Job title (defaults to "Chief Compliance Officer")
     - `signature_image_url`: URL to the signature image in Supabase Storage
     - `signature_image_path`: Storage path for direct access
     - `is_active`: Whether this signature is currently active (only one active at a time)
     - `designated_by`: UUID of the platform admin who designated this officer
     - `designated_at`: Timestamp of designation
     - `created_at`, `updated_at`: Standard timestamps

  2. **kyc_verification_letter_logs** - Audit log of all issued KYC/AML verification letters
     - `id`: UUID primary key
     - `reference_number`: Auto-generated unique reference (e.g., KYC-2026-001234)
     - `tenant_id`: Which tenant's client was verified
     - `kyc_record_id`: Reference to the kyc_aml_records entry
     - `client_name`: Name of the verified client at time of issuance
     - `recipient_name`: Custom recipient typed by the admin (e.g., "To: XYZ Bank")
     - `issued_by_user_id`: Staff/admin who generated the letter
     - `compliance_officer_signature_id`: Which signature was used (null = unsigned)
     - `issued_at`: Timestamp of letter generation

  ## Security
  - RLS enabled on both tables
  - compliance_officer_signatures: only platform superadmins can insert/update; authenticated users can read active signatures
  - kyc_verification_letter_logs: tenant users can insert and read their own tenant's logs

  ## Notes
  - A trigger ensures only one compliance_officer_signature can be active at a time by deactivating
    previous records when a new one is inserted/activated
  - The reference_number is auto-generated using a sequence for guaranteed uniqueness
*/

CREATE SEQUENCE IF NOT EXISTS kyc_letter_ref_seq START 1000;

CREATE TABLE IF NOT EXISTS compliance_officer_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  officer_name text NOT NULL,
  officer_title text NOT NULL DEFAULT 'Chief Compliance Officer',
  signature_image_url text,
  signature_image_path text,
  is_active boolean NOT NULL DEFAULT true,
  designated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  designated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_officer_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage compliance officer signatures"
  ON compliance_officer_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  );

CREATE POLICY "Superadmins can update compliance officer signatures"
  ON compliance_officer_signatures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  );

CREATE POLICY "Authenticated users can read active compliance officer signatures"
  ON compliance_officer_signatures FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION deactivate_previous_compliance_signatures()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE compliance_officer_signatures
    SET is_active = false, updated_at = now()
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_active_compliance_signature
  AFTER INSERT OR UPDATE ON compliance_officer_signatures
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_previous_compliance_signatures();

CREATE TABLE IF NOT EXISTS kyc_verification_letter_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL DEFAULT 'KYC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('kyc_letter_ref_seq')::text, 6, '0'),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  kyc_record_id uuid REFERENCES kyc_aml_records(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  recipient_name text NOT NULL,
  issued_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  compliance_officer_signature_id uuid REFERENCES compliance_officer_signatures(id) ON DELETE SET NULL,
  issued_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_letter_reference ON kyc_verification_letter_logs(reference_number);
CREATE INDEX IF NOT EXISTS idx_kyc_letter_tenant ON kyc_verification_letter_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_letter_kyc_record ON kyc_verification_letter_logs(kyc_record_id);

ALTER TABLE kyc_verification_letter_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can insert their own letter logs"
  ON kyc_verification_letter_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = kyc_verification_letter_logs.tenant_id
      AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  );

CREATE POLICY "Tenant users can read their own letter logs"
  ON kyc_verification_letter_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND tenant_id = kyc_verification_letter_logs.tenant_id
      AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND status = 'active'
    )
  );
