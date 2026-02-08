/*
  # Accounting Integration System

  1. New Tables
    - `accounting_integrations`
      - Stores connection details for multiple accounting platforms per tenant
      - Supports Xero, QuickBooks, FreshBooks, Wave, Sage
      - Handles OAuth tokens with automatic refresh capabilities
      
    - `accounting_sync_log`
      - Tracks all synchronization activities and status
      - Records sync duration, records processed, and errors
      
    - `chart_of_accounts_mapping`
      - Maps platform-specific account codes to unified schema
      - Enables consistent reporting across different platforms
      
    - `bank_accounts`
      - Stores connected bank account details from accounting platforms
      - Tracks balances and last sync timestamps
      
    - `accounting_transactions`
      - Normalized storage for transactions from all platforms
      - Links to fund operations for comprehensive financial view
      
    - `expense_categories`
      - Customizable expense categorization for fund operations
      - Maps to tax categories for automated reporting

  2. Security
    - Enable RLS on all tables
    - Only tenant admins and authorized staff can manage integrations
    - Financial data visible only to authorized users within tenant
    - Encrypted storage for OAuth tokens and sensitive credentials

  3. Features
    - Multi-platform support (connect multiple accounting systems simultaneously)
    - Automatic token refresh for OAuth connections
    - Real-time sync status tracking
    - Comprehensive audit trail for all financial data access
*/

-- Accounting Integrations table
CREATE TABLE IF NOT EXISTS accounting_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('xero', 'quickbooks', 'freshbooks', 'wave', 'sage')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  
  -- OAuth credentials (encrypted)
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  
  -- Platform-specific IDs
  organization_id text,
  organization_name text,
  
  -- Connection metadata
  connected_at timestamptz,
  last_sync_at timestamptz,
  sync_frequency_minutes int DEFAULT 60,
  
  -- Error tracking
  last_error text,
  error_count int DEFAULT 0,
  
  -- Settings
  auto_sync_enabled boolean DEFAULT true,
  sync_transactions boolean DEFAULT true,
  sync_contacts boolean DEFAULT true,
  sync_invoices boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, platform, organization_id)
);

-- Accounting Sync Log
CREATE TABLE IF NOT EXISTS accounting_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  sync_type text NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  status text NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds int,
  
  records_processed int DEFAULT 0,
  records_created int DEFAULT 0,
  records_updated int DEFAULT 0,
  records_failed int DEFAULT 0,
  
  error_message text,
  error_details jsonb,
  
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Chart of Accounts Mapping
CREATE TABLE IF NOT EXISTS chart_of_accounts_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Platform-specific account details
  platform_account_id text NOT NULL,
  platform_account_code text,
  platform_account_name text NOT NULL,
  platform_account_type text,
  
  -- Normalized mapping
  unified_category text NOT NULL,
  unified_subcategory text,
  
  -- Tax and reporting
  tax_deductible boolean DEFAULT false,
  tax_category text,
  
  -- Fund operations mapping
  allocate_to_fund_expenses boolean DEFAULT false,
  fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(integration_id, platform_account_id)
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Platform details
  platform_account_id text NOT NULL,
  account_name text NOT NULL,
  account_number_last4 text,
  account_type text,
  
  -- Balance information
  current_balance decimal(20,2),
  currency text DEFAULT 'USD',
  balance_as_of timestamptz,
  
  -- Bank details
  bank_name text,
  bank_account_type text CHECK (bank_account_type IN ('checking', 'savings', 'credit_card', 'line_of_credit', 'other')),
  
  -- Reconciliation
  last_reconciled_at timestamptz,
  reconciled_balance decimal(20,2),
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(integration_id, platform_account_id)
);

-- Accounting Transactions
CREATE TABLE IF NOT EXISTS accounting_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES accounting_integrations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Platform details
  platform_transaction_id text NOT NULL,
  platform_type text,
  
  -- Transaction details
  transaction_date date NOT NULL,
  description text,
  reference text,
  
  -- Amounts
  amount decimal(20,2) NOT NULL,
  currency text DEFAULT 'USD',
  exchange_rate decimal(10,6) DEFAULT 1.0,
  
  -- Categorization
  account_id uuid REFERENCES chart_of_accounts_mapping(id),
  category text,
  subcategory text,
  
  -- Bank account link
  bank_account_id uuid REFERENCES bank_accounts(id),
  
  -- Contact/vendor
  contact_name text,
  contact_id text,
  
  -- Tax information
  tax_amount decimal(20,2) DEFAULT 0,
  tax_rate decimal(5,4),
  is_tax_deductible boolean DEFAULT false,
  
  -- Fund allocation
  fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  allocation_percentage decimal(5,2) DEFAULT 100.00,
  
  -- Status
  status text CHECK (status IN ('pending', 'cleared', 'reconciled', 'void')),
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamptz,
  
  -- Attachments
  attachment_count int DEFAULT 0,
  attachments jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(integration_id, platform_transaction_id)
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  
  -- Tax and compliance
  tax_category text,
  irs_category_code text,
  is_tax_deductible boolean DEFAULT false,
  requires_documentation boolean DEFAULT false,
  
  -- Fund operations
  is_operational_expense boolean DEFAULT true,
  is_fund_expense boolean DEFAULT false,
  default_allocation_method text CHECK (default_allocation_method IN ('equal', 'aum_weighted', 'manual', 'none')),
  
  -- Budgeting
  has_budget boolean DEFAULT false,
  monthly_budget_amount decimal(20,2),
  annual_budget_amount decimal(20,2),
  
  is_active boolean DEFAULT true,
  display_order int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_tenant ON accounting_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_status ON accounting_integrations(status) WHERE status = 'connected';
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_integration ON accounting_sync_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_tenant ON accounting_sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_log_started ON accounting_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_integration ON chart_of_accounts_mapping(integration_id);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_tenant ON chart_of_accounts_mapping(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_integration ON bank_accounts(integration_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_trans_integration ON accounting_transactions(integration_id);
CREATE INDEX IF NOT EXISTS idx_accounting_trans_tenant ON accounting_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_trans_date ON accounting_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_trans_fund ON accounting_transactions(fund_id) WHERE fund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON expense_categories(tenant_id);

-- Enable Row Level Security
ALTER TABLE accounting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounting_integrations
CREATE POLICY "Tenant admins can view accounting integrations"
  ON accounting_integrations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo', 'accountant')
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can insert accounting integrations"
  ON accounting_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo')
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can update accounting integrations"
  ON accounting_integrations FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo')
      AND sa.status = 'active'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo')
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can delete accounting integrations"
  ON accounting_integrations FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for accounting_sync_log
CREATE POLICY "Authorized staff can view sync logs"
  ON accounting_sync_log FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can insert sync logs"
  ON accounting_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for chart_of_accounts_mapping
CREATE POLICY "Authorized staff can view account mappings"
  ON chart_of_accounts_mapping FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Finance staff can manage account mappings"
  ON chart_of_accounts_mapping FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo', 'accountant', 'bookkeeper')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for bank_accounts
CREATE POLICY "Authorized staff can view bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Finance staff can manage bank accounts"
  ON bank_accounts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo', 'accountant', 'bookkeeper')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for accounting_transactions
CREATE POLICY "Authorized staff can view accounting transactions"
  ON accounting_transactions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Finance staff can manage accounting transactions"
  ON accounting_transactions FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role IN ('admin', 'general_manager', 'cfo', 'accountant', 'bookkeeper')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for expense_categories
CREATE POLICY "Authorized staff can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Finance staff can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid() 
      AND sa.role IN ('admin', 'general_manager', 'cfo', 'accountant')
      AND sa.status = 'active'
    )
  );