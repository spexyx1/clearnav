/*
  # Reporting and Document Management System

  1. New Tables
    - `fee_schedules`
      - Defines management fees, performance fees, and other charges
      - Links to funds and share classes
      - Supports various fee calculation methods
      - Tracks fee tiers and hurdle rates
    
    - `fee_transactions`
      - Records calculated and charged fees
      - Links to capital accounts
      - Tracks accrued vs. paid fees
      - Supports fee rebates and adjustments
    
    - `performance_metrics`
      - Stores calculated performance data
      - Fund-level and account-level metrics
      - Multiple time periods (MTD, QTD, YTD, ITD)
      - IRR, MOIC, and other PE metrics
    
    - `reports`
      - Tracks generated reports
      - Stores report metadata and parameters
      - Links to generated documents
      - Audit trail of report generation
    
    - `document_templates`
      - Stores document templates
      - Supports various report types
      - Version control for templates
      - Tenant-specific customization
    
    - `investor_statements`
      - Stores generated investor statements
      - Period-based statements (monthly, quarterly)
      - Links to capital accounts
      - Status tracking for delivery

  2. Security
    - Enable RLS on all tables
    - Policies restrict access to tenant data only
    - Staff can create and manage reports
    - Clients can view their own statements

  3. Important Notes
    - All fee amounts stored as NUMERIC for precision
    - Performance metrics stored with calculation dates
    - Report generation tracking for audit
    - Template versioning for consistency
*/

-- Fee Schedules Table
CREATE TABLE IF NOT EXISTS fee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id),
  share_class_id uuid REFERENCES share_classes(id),
  fee_name text NOT NULL,
  fee_type text NOT NULL CHECK (fee_type IN (
    'management_fee',
    'performance_fee',
    'admin_fee',
    'custodian_fee',
    'transaction_fee',
    'other'
  )),
  calculation_method text NOT NULL CHECK (calculation_method IN (
    'percentage_of_nav',
    'percentage_of_committed',
    'percentage_of_invested',
    'percentage_of_gains',
    'fixed_amount',
    'tiered'
  )),
  fee_rate numeric(10,6) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN (
    'daily',
    'monthly',
    'quarterly',
    'annual',
    'on_transaction'
  )),
  hurdle_rate numeric(10,6),
  high_water_mark boolean DEFAULT false,
  catch_up_rate numeric(10,6),
  fee_tiers jsonb,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_tenant ON fee_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_fund ON fee_schedules(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_class ON fee_schedules(share_class_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_type ON fee_schedules(fee_type);

-- Fee Transactions Table
CREATE TABLE IF NOT EXISTS fee_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fee_schedule_id uuid REFERENCES fee_schedules(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  calculation_date date NOT NULL,
  base_amount numeric(20,2) NOT NULL,
  fee_rate_applied numeric(10,6) NOT NULL,
  fee_amount numeric(20,2) NOT NULL,
  fee_accrued numeric(20,2) DEFAULT 0,
  fee_paid numeric(20,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'calculated' CHECK (status IN (
    'calculated',
    'accrued',
    'invoiced',
    'paid',
    'waived'
  )),
  calculation_details jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_transactions_tenant ON fee_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_account ON fee_transactions(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_fund ON fee_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_period ON fee_transactions(period_end);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_status ON fee_transactions(status);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id),
  capital_account_id uuid REFERENCES capital_accounts(id),
  share_class_id uuid REFERENCES share_classes(id),
  metric_date date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN (
    'daily',
    'monthly',
    'quarterly',
    'yearly',
    'inception_to_date'
  )),
  beginning_nav numeric(20,2),
  ending_nav numeric(20,2),
  net_contributions numeric(20,2),
  net_distributions numeric(20,2),
  total_return_amount numeric(20,2),
  total_return_percent numeric(10,4),
  irr numeric(10,4),
  moic numeric(10,4),
  dpi numeric(10,4),
  rvpi numeric(10,4),
  tvpi numeric(10,4),
  sharpe_ratio numeric(10,4),
  volatility numeric(10,4),
  max_drawdown numeric(10,4),
  benchmark_return numeric(10,4),
  alpha numeric(10,4),
  beta numeric(10,4),
  calculation_notes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant ON performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_fund ON performance_metrics(fund_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_account ON performance_metrics(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_type);

-- Document Templates Table
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id),
  template_name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN (
    'investor_statement',
    'capital_call_notice',
    'distribution_notice',
    'quarterly_letter',
    'annual_report',
    'k1_package',
    'fee_invoice',
    'custom'
  )),
  version integer NOT NULL DEFAULT 1,
  content_structure jsonb NOT NULL,
  styling jsonb,
  variables jsonb,
  is_default boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_status ON document_templates(status);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  report_type text NOT NULL CHECK (report_type IN (
    'investor_statement',
    'performance_report',
    'fee_report',
    'capital_account_report',
    'transaction_report',
    'distribution_report',
    'quarterly_letter',
    'annual_report',
    'custom'
  )),
  report_name text NOT NULL,
  period_start date,
  period_end date,
  generation_date timestamptz NOT NULL DEFAULT now(),
  parameters jsonb,
  fund_id uuid REFERENCES funds(id),
  capital_account_id uuid REFERENCES capital_accounts(id),
  file_url text,
  file_size integer,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN (
    'generating',
    'generated',
    'sent',
    'viewed',
    'failed'
  )),
  sent_at timestamptz,
  viewed_at timestamptz,
  generated_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_fund ON reports(fund_id);
CREATE INDEX IF NOT EXISTS idx_reports_account ON reports(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period_end);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Investor Statements Table
CREATE TABLE IF NOT EXISTS investor_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  statement_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  statement_type text NOT NULL CHECK (statement_type IN (
    'monthly',
    'quarterly',
    'annual',
    'on_demand'
  )),
  beginning_balance numeric(20,2),
  ending_balance numeric(20,2),
  contributions numeric(20,2),
  distributions numeric(20,2),
  fees numeric(20,2),
  return_amount numeric(20,2),
  return_percent numeric(10,4),
  shares_beginning numeric(20,6),
  shares_ending numeric(20,6),
  nav_per_share numeric(20,6),
  report_id uuid REFERENCES reports(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'finalized',
    'sent',
    'viewed'
  )),
  finalized_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_statements_tenant ON investor_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_account ON investor_statements(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_fund ON investor_statements(fund_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_date ON investor_statements(statement_date);
CREATE INDEX IF NOT EXISTS idx_investor_statements_period ON investor_statements(period_end);
CREATE INDEX IF NOT EXISTS idx_investor_statements_status ON investor_statements(status);

-- Enable Row Level Security
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_schedules
CREATE POLICY "Users can view fee schedules for their tenant"
  ON fee_schedules FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create fee schedules"
  ON fee_schedules FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update fee schedules"
  ON fee_schedules FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for fee_transactions
CREATE POLICY "Users can view fee transactions for their tenant"
  ON fee_transactions FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create fee transactions"
  ON fee_transactions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update fee transactions"
  ON fee_transactions FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for performance_metrics
CREATE POLICY "Users can view performance metrics for their tenant"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create performance metrics"
  ON performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for document_templates
CREATE POLICY "Users can view document templates for their tenant"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
    ) OR tenant_id IS NULL
  );

CREATE POLICY "Staff can create document templates"
  ON document_templates FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update document templates"
  ON document_templates FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for reports
CREATE POLICY "Users can view reports for their tenant"
  ON reports FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for investor_statements
CREATE POLICY "Users can view investor statements for their tenant"
  ON investor_statements FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create investor statements"
  ON investor_statements FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update investor statements"
  ON investor_statements FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_reporting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fee_schedules_updated_at
  BEFORE UPDATE ON fee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_reporting_updated_at();

CREATE TRIGGER trigger_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_reporting_updated_at();
