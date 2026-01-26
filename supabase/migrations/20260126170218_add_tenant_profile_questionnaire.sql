/*
  # Tenant Profile Questionnaire

  ## Overview
  Adds comprehensive tenant profile system to capture organization requirements,
  compliance needs, investment structure preferences, and reporting standards.

  ## New Tables

  ### `tenant_profiles`
  Stores detailed tenant profile information from questionnaire
  - `tenant_id` (uuid, primary key, foreign key)
  - `organization_type` (text) - institutional_fund, private_equity, family_office, other
  - `organization_type_other` (text) - Custom organization type if "other"
  - `accounting_standards` (text[]) - Array: gaap, ifrs, both
  - `requires_performance_letters` (boolean)
  - `performance_letter_frequency` (text) - monthly, quarterly, annual
  - `investment_complexity` (text) - simple, moderate, complex, highly_complex
  - `has_illiquid_investments` (boolean)
  - `structure_types` (text[]) - Array of: master_feeder, parallel_funds, side_pockets, spvs, blocker_corps, other
  - `entity_jurisdictions` (text[]) - Array of jurisdictions: us, cayman, bvi, delaware, luxembourg, ireland, other
  - `aum_range` (text) - under_10m, 10m_50m, 50m_100m, 100m_500m, 500m_1b, over_1b
  - `number_of_investors` (text) - under_10, 10_50, 50_100, 100_500, over_500
  - `regulatory_status` (text[]) - Array: sec_registered, cftc_registered, exempt, other
  - `requires_consolidated_reporting` (boolean)
  - `reporting_currencies` (text[]) - Array of currency codes
  - `custom_requirements` (text) - Free-form text for additional requirements
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on tenant_profiles
  - Tenant admins can view and update their own profile
*/

-- Create tenant profiles table
CREATE TABLE IF NOT EXISTS tenant_profiles (
  tenant_id uuid PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE CASCADE,
  organization_type text NOT NULL,
  organization_type_other text,
  accounting_standards text[] DEFAULT '{}',
  requires_performance_letters boolean DEFAULT false,
  performance_letter_frequency text,
  investment_complexity text,
  has_illiquid_investments boolean DEFAULT false,
  structure_types text[] DEFAULT '{}',
  entity_jurisdictions text[] DEFAULT '{}',
  aum_range text,
  number_of_investors text,
  regulatory_status text[] DEFAULT '{}',
  requires_consolidated_reporting boolean DEFAULT false,
  reporting_currencies text[] DEFAULT '{}',
  custom_requirements text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_org_type ON tenant_profiles(organization_type);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_completed ON tenant_profiles(completed_at);

-- Enable RLS
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant users can view their own profile
CREATE POLICY "Tenant users can view own profile"
  ON tenant_profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Tenant admins can update their own profile
CREATE POLICY "Tenant admins can update own profile"
  ON tenant_profiles FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Policy: Tenant admins can insert their own profile
CREATE POLICY "Tenant admins can insert own profile"
  ON tenant_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS tenant_profiles_updated_at ON tenant_profiles;
  CREATE TRIGGER tenant_profiles_updated_at
    BEFORE UPDATE ON tenant_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_profiles_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
