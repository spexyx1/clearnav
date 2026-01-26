/*
  # Phase 5: Advanced Fund Administration Features

  1. New Tables
    - `waterfall_structures`
      - Defines waterfall calculation rules (European, American, Hybrid)
      - Tracks hurdle rates, catch-up provisions, carried interest
      - Multiple tier support for complex structures
    
    - `carried_interest_accounts`
      - Tracks GP/manager carried interest
      - Accrued vs. distributed carry
      - Clawback provisions and high water mark
    
    - `side_pockets`
      - Manages illiquid or special investments
      - Separate valuation and liquidity tracking
      - Pro-rata or waterfall distribution methods
    
    - `side_pocket_allocations`
      - Links side pockets to investor capital accounts
      - Tracks allocation amounts and current values
      - Unit-based accounting
    
    - `tax_documents`
      - Stores K-1, 1099, and other tax forms
      - Tax year tracking with generation status
      - Income breakdown by type
    
    - `clawback_provisions`
      - Tracks GP clawback obligations
      - Return of excess carried interest
      - Payment tracking and status
    
    - `waterfall_calculations`
      - Historical waterfall calculation records
      - Tier breakdown and allocation details
      - Audit trail for distributions
    
    - `currency_conversions`
      - Historical FX rate tracking
      - Multi-currency support for global funds
      - Rate source and date tracking

  2. Security
    - Enable RLS on all tables
    - Policies restrict access to tenant data
    - Staff manage advanced features
    - Audit trail for all calculations

  3. Important Notes
    - All monetary values use NUMERIC for precision
    - Exchange rates stored with 10 decimal places
    - Waterfall tiers stored as JSONB for flexibility
    - Tax documents linked to capital accounts
    - Clawback calculations with detailed methodology
*/

-- Currency Conversions Table (if currencies table exists from previous migration)
CREATE TABLE IF NOT EXISTS currency_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  exchange_rate numeric(20,10) NOT NULL,
  rate_date date NOT NULL,
  rate_source text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_currency_conversions_tenant ON currency_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_date ON currency_conversions(rate_date);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_pair ON currency_conversions(from_currency, to_currency);

-- Waterfall Structures Table
CREATE TABLE IF NOT EXISTS waterfall_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  structure_name text NOT NULL,
  structure_type text NOT NULL CHECK (structure_type IN (
    'european',
    'american',
    'hybrid'
  )),
  tiers jsonb NOT NULL,
  hurdle_rate numeric(10,6),
  catch_up_rate numeric(10,6),
  carried_interest_rate numeric(10,6) NOT NULL,
  gp_commitment_percent numeric(10,6),
  calculation_method text NOT NULL CHECK (calculation_method IN (
    'deal_by_deal',
    'whole_fund',
    'distribution_waterfall'
  )),
  clawback_provision boolean DEFAULT true,
  preferred_return_compounded boolean DEFAULT true,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waterfall_structures_tenant ON waterfall_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_structures_fund ON waterfall_structures(fund_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_structures_status ON waterfall_structures(status);

-- Carried Interest Accounts Table
CREATE TABLE IF NOT EXISTS carried_interest_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  waterfall_structure_id uuid REFERENCES waterfall_structures(id),
  gp_entity_name text NOT NULL,
  total_carry_accrued numeric(20,2) DEFAULT 0,
  total_carry_distributed numeric(20,2) DEFAULT 0,
  clawback_reserve numeric(20,2) DEFAULT 0,
  high_water_mark numeric(20,2) DEFAULT 0,
  last_calculation_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'suspended')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carried_interest_accounts_tenant ON carried_interest_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carried_interest_accounts_fund ON carried_interest_accounts(fund_id);
CREATE INDEX IF NOT EXISTS idx_carried_interest_accounts_status ON carried_interest_accounts(status);

-- Side Pockets Table
CREATE TABLE IF NOT EXISTS side_pockets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  side_pocket_name text NOT NULL,
  side_pocket_code text NOT NULL,
  investment_description text,
  creation_date date NOT NULL,
  creation_reason text,
  total_value numeric(20,2) DEFAULT 0,
  unrealized_gain_loss numeric(20,2) DEFAULT 0,
  liquidity_status text NOT NULL DEFAULT 'illiquid' CHECK (liquidity_status IN (
    'illiquid',
    'partially_liquid',
    'liquid'
  )),
  distribution_priority text CHECK (distribution_priority IN (
    'pro_rata',
    'pari_passu',
    'waterfall'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'distributing', 'closed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_side_pockets_tenant ON side_pockets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_side_pockets_fund ON side_pockets(fund_id);
CREATE INDEX IF NOT EXISTS idx_side_pockets_status ON side_pockets(status);

-- Side Pocket Allocations Table
CREATE TABLE IF NOT EXISTS side_pocket_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  side_pocket_id uuid REFERENCES side_pockets(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  allocation_date date NOT NULL,
  allocated_amount numeric(20,2) NOT NULL,
  current_value numeric(20,2) NOT NULL,
  units_allocated numeric(20,6),
  unrealized_gain_loss numeric(20,2) DEFAULT 0,
  distributions_received numeric(20,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'distributed', 'written_off')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_side_pocket_allocations_tenant ON side_pocket_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_side_pocket_allocations_pocket ON side_pocket_allocations(side_pocket_id);
CREATE INDEX IF NOT EXISTS idx_side_pocket_allocations_account ON side_pocket_allocations(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_side_pocket_allocations_status ON side_pocket_allocations(status);

-- Tax Documents Table
CREATE TABLE IF NOT EXISTS tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'k1',
    '1099_div',
    '1099_int',
    '1099_b',
    '5498',
    'annual_statement',
    'other'
  )),
  tax_year integer NOT NULL,
  document_status text NOT NULL DEFAULT 'draft' CHECK (document_status IN (
    'draft',
    'review',
    'finalized',
    'sent',
    'filed'
  )),
  generation_date date,
  finalized_date date,
  sent_date date,
  filing_date date,
  ordinary_income numeric(20,2),
  qualified_dividends numeric(20,2),
  capital_gains_short numeric(20,2),
  capital_gains_long numeric(20,2),
  interest_income numeric(20,2),
  other_income numeric(20,2),
  file_url text,
  file_size integer,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_documents_tenant ON tax_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_account ON tax_documents(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_fund ON tax_documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_year ON tax_documents(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_documents_type ON tax_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_tax_documents_status ON tax_documents(document_status);

-- Clawback Provisions Table
CREATE TABLE IF NOT EXISTS clawback_provisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  carried_interest_account_id uuid REFERENCES carried_interest_accounts(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  calculation_date date NOT NULL,
  total_carry_distributed numeric(20,2) NOT NULL,
  total_carry_earned numeric(20,2) NOT NULL,
  clawback_amount numeric(20,2) NOT NULL,
  clawback_status text NOT NULL DEFAULT 'calculated' CHECK (clawback_status IN (
    'calculated',
    'notified',
    'payment_plan',
    'paid',
    'waived'
  )),
  payment_due_date date,
  amount_paid numeric(20,2) DEFAULT 0,
  payment_date date,
  calculation_details jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clawback_provisions_tenant ON clawback_provisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clawback_provisions_carry_account ON clawback_provisions(carried_interest_account_id);
CREATE INDEX IF NOT EXISTS idx_clawback_provisions_fund ON clawback_provisions(fund_id);
CREATE INDEX IF NOT EXISTS idx_clawback_provisions_status ON clawback_provisions(clawback_status);

-- Waterfall Calculations Table
CREATE TABLE IF NOT EXISTS waterfall_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  waterfall_structure_id uuid REFERENCES waterfall_structures(id) NOT NULL,
  calculation_date date NOT NULL,
  total_contributions numeric(20,2) NOT NULL,
  total_distributions numeric(20,2) NOT NULL,
  current_nav numeric(20,2) NOT NULL,
  preferred_return numeric(20,2),
  lp_allocation numeric(20,2) NOT NULL,
  gp_allocation numeric(20,2) NOT NULL,
  catch_up_amount numeric(20,2),
  tier_breakdown jsonb,
  calculation_details jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waterfall_calculations_tenant ON waterfall_calculations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_calculations_fund ON waterfall_calculations(fund_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_calculations_structure ON waterfall_calculations(waterfall_structure_id);
CREATE INDEX IF NOT EXISTS idx_waterfall_calculations_date ON waterfall_calculations(calculation_date);

-- Enable Row Level Security
ALTER TABLE currency_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waterfall_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE carried_interest_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_pocket_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clawback_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waterfall_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for currency_conversions
CREATE POLICY "Users can view currency conversions for their tenant"
  ON currency_conversions FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create currency conversions"
  ON currency_conversions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for waterfall_structures
CREATE POLICY "Users can view waterfall structures for their tenant"
  ON waterfall_structures FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create waterfall structures"
  ON waterfall_structures FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update waterfall structures"
  ON waterfall_structures FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for carried_interest_accounts
CREATE POLICY "Users can view carried interest accounts for their tenant"
  ON carried_interest_accounts FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create carried interest accounts"
  ON carried_interest_accounts FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update carried interest accounts"
  ON carried_interest_accounts FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for side_pockets
CREATE POLICY "Users can view side pockets for their tenant"
  ON side_pockets FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create side pockets"
  ON side_pockets FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update side pockets"
  ON side_pockets FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for side_pocket_allocations
CREATE POLICY "Users can view side pocket allocations for their tenant"
  ON side_pocket_allocations FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create side pocket allocations"
  ON side_pocket_allocations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update side pocket allocations"
  ON side_pocket_allocations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for tax_documents
CREATE POLICY "Users can view tax documents for their tenant"
  ON tax_documents FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create tax documents"
  ON tax_documents FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update tax documents"
  ON tax_documents FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for clawback_provisions
CREATE POLICY "Users can view clawback provisions for their tenant"
  ON clawback_provisions FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create clawback provisions"
  ON clawback_provisions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update clawback provisions"
  ON clawback_provisions FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for waterfall_calculations
CREATE POLICY "Users can view waterfall calculations for their tenant"
  ON waterfall_calculations FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create waterfall calculations"
  ON waterfall_calculations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_advanced_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_waterfall_structures_updated_at
  BEFORE UPDATE ON waterfall_structures
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_features_updated_at();

CREATE TRIGGER trigger_carried_interest_accounts_updated_at
  BEFORE UPDATE ON carried_interest_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_features_updated_at();

CREATE TRIGGER trigger_side_pockets_updated_at
  BEFORE UPDATE ON side_pockets
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_features_updated_at();

CREATE TRIGGER trigger_side_pocket_allocations_updated_at
  BEFORE UPDATE ON side_pocket_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_features_updated_at();

CREATE TRIGGER trigger_tax_documents_updated_at
  BEFORE UPDATE ON tax_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_features_updated_at();

CREATE TRIGGER trigger_clawback_provisions_updated_at
  BEFORE UPDATE ON clawback_provisions
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_features_updated_at();
