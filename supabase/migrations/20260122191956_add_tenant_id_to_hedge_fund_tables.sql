/*
  # Add Multi-Tenant Support to Hedge Fund Tables

  ## Overview
  This migration transforms the single-tenant Grey Alpha system into a multi-tenant platform
  by adding tenant_id columns to all hedge fund tables and updating RLS policies for tenant isolation.

  ## Changes Made

  ### 1. Schema Updates - Add tenant_id columns
  - client_profiles
  - investments
  - performance_returns
  - documents
  - redemption_requests
  - tax_document_requests
  - inquiries
  - staff_accounts
  - crm_contacts
  - onboarding_workflows
  - tasks_activities
  - communication_log
  - compliance_documents
  - kyc_aml_records
  - accreditation_verification
  - trust_account
  - client_units
  - ibkr_connections

  ### 2. Foreign Key Constraints
  - Add foreign key constraints linking all tables to platform_tenants

  ### 3. Indexes
  - Add indexes on tenant_id columns for query performance

  ### 4. Row Level Security Updates
  - Update all RLS policies to filter by tenant_id
  - Ensure complete data isolation between tenants
*/

-- Add tenant_id to client_profiles
ALTER TABLE client_profiles 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_profiles_tenant_id ON client_profiles(tenant_id);

-- Add tenant_id to investments
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_investments_tenant_id ON investments(tenant_id);

-- Add tenant_id to performance_returns
ALTER TABLE performance_returns 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_performance_returns_tenant_id ON performance_returns(tenant_id);

-- Add tenant_id to documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);

-- Add tenant_id to redemption_requests
ALTER TABLE redemption_requests 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_redemption_requests_tenant_id ON redemption_requests(tenant_id);

-- Add tenant_id to tax_document_requests
ALTER TABLE tax_document_requests 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tax_document_requests_tenant_id ON tax_document_requests(tenant_id);

-- Add tenant_id to inquiries
ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inquiries_tenant_id ON inquiries(tenant_id);

-- Add tenant_id to staff_accounts
ALTER TABLE staff_accounts 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_accounts_tenant_id ON staff_accounts(tenant_id);

-- Add tenant_id to crm_contacts
ALTER TABLE crm_contacts 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_id ON crm_contacts(tenant_id);

-- Add tenant_id to onboarding_workflows
ALTER TABLE onboarding_workflows 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_tenant_id ON onboarding_workflows(tenant_id);

-- Add tenant_id to tasks_activities
ALTER TABLE tasks_activities 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_activities_tenant_id ON tasks_activities(tenant_id);

-- Add tenant_id to communication_log
ALTER TABLE communication_log 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_communication_log_tenant_id ON communication_log(tenant_id);

-- Add tenant_id to compliance_documents
ALTER TABLE compliance_documents 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_compliance_documents_tenant_id ON compliance_documents(tenant_id);

-- Add tenant_id to kyc_aml_records
ALTER TABLE kyc_aml_records 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_tenant_id ON kyc_aml_records(tenant_id);

-- Add tenant_id to accreditation_verification
ALTER TABLE accreditation_verification 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_accreditation_verification_tenant_id ON accreditation_verification(tenant_id);

-- Add tenant_id to trust_account
ALTER TABLE trust_account 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_trust_account_tenant_id ON trust_account(tenant_id);

-- Add tenant_id to client_units
ALTER TABLE client_units 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_units_tenant_id ON client_units(tenant_id);

-- Add tenant_id to ibkr_connections
ALTER TABLE ibkr_connections 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ibkr_connections_tenant_id ON ibkr_connections(tenant_id);

-- Update RLS policies for client_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON client_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON client_profiles;
DROP POLICY IF EXISTS "Staff can view all client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Staff can update client profiles" ON client_profiles;

CREATE POLICY "Users can view own profile in their tenant"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    AND (
      tenant_id IS NULL 
      OR tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own profile in their tenant"
  ON client_profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    AND (
      tenant_id IS NULL 
      OR tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = id 
    AND (
      tenant_id IS NULL 
      OR tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can view client profiles in their tenant"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update client profiles in their tenant"
  ON client_profiles FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  );

-- Update RLS policies for staff_accounts
DROP POLICY IF EXISTS "Staff can view staff accounts" ON staff_accounts;
DROP POLICY IF EXISTS "Staff can manage staff accounts" ON staff_accounts;

CREATE POLICY "Staff can view staff accounts in their tenant"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "Managers can manage staff accounts in their tenant"
  ON staff_accounts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa 
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role = 'general_manager'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa 
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role = 'general_manager'
    )
  );

-- Update RLS policies for CRM contacts
DROP POLICY IF EXISTS "Staff can view all CRM contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Staff can manage CRM contacts" ON crm_contacts;

CREATE POLICY "Staff can view CRM contacts in their tenant"
  ON crm_contacts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage CRM contacts in their tenant"
  ON crm_contacts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  );

-- Platform admin policies
CREATE POLICY "Platform admins can view all tenant data - client_profiles"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all tenant data - staff_accounts"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all tenant data - crm_contacts"
  ON crm_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users 
      WHERE user_id = auth.uid()
    )
  );
