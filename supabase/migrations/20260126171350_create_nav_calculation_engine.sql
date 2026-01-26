/*
  # NAV Calculation Engine Schema

  ## Overview
  Creates comprehensive NAV calculation infrastructure for fund administration.
  Supports multi-fund, multi-class, multi-currency NAV calculations with full audit trail.

  ## New Tables

  ### 1. `funds`
  Core fund entities with multi-class support
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key) - Multi-tenant isolation
  - `fund_code` (text, unique) - Short identifier (e.g., "FUND-001")
  - `fund_name` (text) - Full fund name
  - `fund_type` (text) - hedge, pe, vc, real_estate, etc.
  - `base_currency` (text) - Base currency for NAV (USD, EUR, etc.)
  - `inception_date` (date) - Fund start date
  - `fiscal_year_end` (text) - MM-DD format (e.g., "12-31")
  - `accounting_standard` (text) - GAAP, IFRS, etc.
  - `nav_frequency` (text) - daily, weekly, monthly, quarterly
  - `status` (text) - active, closed, liquidating
  - `total_commitments` (numeric) - Total investor commitments
  - `metadata` (jsonb) - Additional fund details
  - `created_at`, `updated_at` (timestamptz)

  ### 2. `share_classes`
  Multiple share classes per fund (Class A, B, Institutional, etc.)
  - `id` (uuid, primary key)
  - `fund_id` (uuid, foreign key)
  - `class_code` (text) - e.g., "A", "B", "INST"
  - `class_name` (text) - Display name
  - `currency` (text) - Share class currency
  - `management_fee_pct` (numeric) - Annual management fee %
  - `performance_fee_pct` (numeric) - Performance/carry fee %
  - `hurdle_rate_pct` (numeric) - Preferred return %
  - `high_water_mark` (boolean) - Use HWM for performance fees
  - `share_price_precision` (integer) - Decimal places for NAV per share
  - `minimum_investment` (numeric) - Minimum initial investment
  - `status` (text) - active, closed
  - `created_at` (timestamptz)

  ### 3. `capital_accounts`
  Individual investor capital accounts across funds and classes
  - `id` (uuid, primary key)
  - `fund_id` (uuid, foreign key)
  - `share_class_id` (uuid, foreign key)
  - `investor_id` (uuid, foreign key) - References client_profiles
  - `account_number` (text, unique) - Unique account identifier
  - `commitment_amount` (numeric) - Total commitment
  - `capital_called` (numeric) - Total called to date
  - `capital_contributed` (numeric) - Total contributed
  - `capital_returned` (numeric) - Total distributions
  - `shares_owned` (numeric) - Current share balance
  - `cost_basis` (numeric) - Total cost basis
  - `unrealized_gain_loss` (numeric) - Current unrealized P&L
  - `realized_gain_loss` (numeric) - Lifetime realized P&L
  - `inception_date` (date) - Account start date
  - `status` (text) - active, redeemed, transferred
  - `metadata` (jsonb)
  - `created_at`, `updated_at` (timestamptz)

  ### 4. `nav_calculations`
  Versioned NAV calculation records
  - `id` (uuid, primary key)
  - `fund_id` (uuid, foreign key)
  - `share_class_id` (uuid, foreign key) - NULL for fund-level NAV
  - `nav_date` (date) - NAV as of date
  - `version` (integer) - Version number (allows corrections)
  - `status` (text) - draft, pending_approval, approved, superseded
  - `total_assets` (numeric) - Total fund assets
  - `total_liabilities` (numeric) - Total fund liabilities
  - `net_asset_value` (numeric) - NAV = Assets - Liabilities
  - `total_shares` (numeric) - Shares outstanding
  - `nav_per_share` (numeric) - NAV / Shares
  - `management_fees_accrued` (numeric) - Fees for period
  - `performance_fees_accrued` (numeric) - Performance fees
  - `total_fees` (numeric) - All fees
  - `calculated_by` (uuid) - User who ran calculation
  - `approved_by` (uuid) - User who approved
  - `calculation_method` (text) - Method used
  - `notes` (text) - Calculation notes
  - `calculation_data` (jsonb) - Full calculation details
  - `created_at`, `approved_at` (timestamptz)

  ### 5. `nav_calculation_details`
  Line-by-line breakdown of NAV components
  - `id` (uuid, primary key)
  - `nav_calculation_id` (uuid, foreign key)
  - `line_type` (text) - asset, liability, adjustment, fee
  - `category` (text) - securities, cash, receivables, etc.
  - `description` (text) - Line item description
  - `quantity` (numeric) - Position size
  - `unit_price` (numeric) - Price per unit
  - `amount` (numeric) - Total value
  - `currency` (text) - Currency code
  - `fx_rate` (numeric) - FX rate to base currency
  - `base_currency_amount` (numeric) - Amount in base currency
  - `source` (text) - Data source (manual, broker, api)
  - `sort_order` (integer) - Display order
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### 6. `transactions`
  All fund transactions (subscriptions, redemptions, transfers)
  - `id` (uuid, primary key)
  - `fund_id` (uuid, foreign key)
  - `capital_account_id` (uuid, foreign key)
  - `transaction_type` (text) - subscription, redemption, distribution, transfer
  - `transaction_date` (date) - Effective date
  - `settlement_date` (date) - Settlement date
  - `amount` (numeric) - Transaction amount
  - `shares` (numeric) - Share quantity (can be negative)
  - `price_per_share` (numeric) - Execution price
  - `currency` (text) - Transaction currency
  - `status` (text) - pending, settled, cancelled
  - `reference_number` (text) - External reference
  - `description` (text) - Transaction description
  - `nav_calculation_id` (uuid) - Related NAV calculation
  - `created_by` (uuid) - User who created
  - `metadata` (jsonb)
  - `created_at`, `updated_at` (timestamptz)

  ### 7. `fee_structures`
  Configurable fee calculation rules
  - `id` (uuid, primary key)
  - `fund_id` (uuid, foreign key)
  - `share_class_id` (uuid, foreign key)
  - `fee_type` (text) - management, performance, admin, other
  - `calculation_method` (text) - percentage_of_nav, percentage_of_commitment, tiered, waterfall
  - `rate_pct` (numeric) - Base fee percentage
  - `frequency` (text) - annual, quarterly, monthly
  - `payment_schedule` (text) - arrears, advance
  - `hurdle_rate_pct` (numeric) - For performance fees
  - `catch_up_pct` (numeric) - GP catch-up percentage
  - `tiers` (jsonb) - Tiered fee structure
  - `effective_from` (date) - Start date
  - `effective_to` (date) - End date (NULL if current)
  - `status` (text) - active, inactive
  - `metadata` (jsonb)
  - `created_at` (timestamptz)

  ### 8. `currencies`
  Currency reference data and exchange rates
  - `id` (uuid, primary key)
  - `currency_code` (text, unique) - ISO code (USD, EUR, etc.)
  - `currency_name` (text) - Full name
  - `symbol` (text) - Currency symbol
  - `decimal_places` (integer) - Precision
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 9. `exchange_rates`
  Historical FX rates for multi-currency NAV
  - `id` (uuid, primary key)
  - `from_currency` (text) - Source currency
  - `to_currency` (text) - Target currency
  - `rate_date` (date) - Rate date
  - `rate` (numeric) - Exchange rate
  - `source` (text) - Data source
  - `created_at` (timestamptz)
  - UNIQUE(from_currency, to_currency, rate_date)

  ## Security
  - Enable RLS on all tables
  - Tenants can only access their own fund data
  - Role-based access for NAV approval workflow
  - Audit trail for all NAV calculations
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE fund_status AS ENUM ('active', 'closed', 'liquidating', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE nav_status AS ENUM ('draft', 'pending_approval', 'approved', 'superseded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'settled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Funds Table
CREATE TABLE IF NOT EXISTS funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_code text NOT NULL,
  fund_name text NOT NULL,
  fund_type text DEFAULT 'hedge',
  base_currency text DEFAULT 'USD',
  inception_date date DEFAULT CURRENT_DATE,
  fiscal_year_end text DEFAULT '12-31',
  accounting_standard text DEFAULT 'GAAP',
  nav_frequency text DEFAULT 'monthly',
  status fund_status DEFAULT 'active',
  total_commitments numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, fund_code)
);

-- Share Classes Table
CREATE TABLE IF NOT EXISTS share_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  class_code text NOT NULL,
  class_name text NOT NULL,
  currency text DEFAULT 'USD',
  management_fee_pct numeric DEFAULT 0,
  performance_fee_pct numeric DEFAULT 0,
  hurdle_rate_pct numeric DEFAULT 0,
  high_water_mark boolean DEFAULT true,
  share_price_precision integer DEFAULT 4,
  minimum_investment numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(fund_id, class_code)
);

-- Capital Accounts Table
CREATE TABLE IF NOT EXISTS capital_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid REFERENCES share_classes(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE,
  account_number text UNIQUE NOT NULL,
  commitment_amount numeric DEFAULT 0,
  capital_called numeric DEFAULT 0,
  capital_contributed numeric DEFAULT 0,
  capital_returned numeric DEFAULT 0,
  shares_owned numeric DEFAULT 0,
  cost_basis numeric DEFAULT 0,
  unrealized_gain_loss numeric DEFAULT 0,
  realized_gain_loss numeric DEFAULT 0,
  inception_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- NAV Calculations Table
CREATE TABLE IF NOT EXISTS nav_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid REFERENCES share_classes(id) ON DELETE SET NULL,
  nav_date date NOT NULL,
  version integer DEFAULT 1,
  status nav_status DEFAULT 'draft',
  total_assets numeric DEFAULT 0,
  total_liabilities numeric DEFAULT 0,
  net_asset_value numeric DEFAULT 0,
  total_shares numeric DEFAULT 0,
  nav_per_share numeric DEFAULT 0,
  management_fees_accrued numeric DEFAULT 0,
  performance_fees_accrued numeric DEFAULT 0,
  total_fees numeric DEFAULT 0,
  calculated_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  calculation_method text DEFAULT 'standard',
  notes text,
  calculation_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  UNIQUE(fund_id, share_class_id, nav_date, version)
);

-- NAV Calculation Details Table
CREATE TABLE IF NOT EXISTS nav_calculation_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_calculation_id uuid REFERENCES nav_calculations(id) ON DELETE CASCADE,
  line_type text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  quantity numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  fx_rate numeric DEFAULT 1.0,
  base_currency_amount numeric DEFAULT 0,
  source text DEFAULT 'manual',
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  capital_account_id uuid REFERENCES capital_accounts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  transaction_date date DEFAULT CURRENT_DATE,
  settlement_date date,
  amount numeric NOT NULL,
  shares numeric DEFAULT 0,
  price_per_share numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  status transaction_status DEFAULT 'pending',
  reference_number text,
  description text,
  nav_calculation_id uuid REFERENCES nav_calculations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fee Structures Table
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE,
  share_class_id uuid REFERENCES share_classes(id) ON DELETE CASCADE,
  fee_type text NOT NULL,
  calculation_method text DEFAULT 'percentage_of_nav',
  rate_pct numeric DEFAULT 0,
  frequency text DEFAULT 'annual',
  payment_schedule text DEFAULT 'arrears',
  hurdle_rate_pct numeric DEFAULT 0,
  catch_up_pct numeric DEFAULT 0,
  tiers jsonb DEFAULT '[]',
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Currencies Table
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name text NOT NULL,
  symbol text,
  decimal_places integer DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate_date date NOT NULL,
  rate numeric NOT NULL,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_currency, to_currency, rate_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_funds_tenant ON funds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);
CREATE INDEX IF NOT EXISTS idx_share_classes_fund ON share_classes(fund_id);
CREATE INDEX IF NOT EXISTS idx_capital_accounts_fund ON capital_accounts(fund_id);
CREATE INDEX IF NOT EXISTS idx_capital_accounts_investor ON capital_accounts(investor_id);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_fund ON nav_calculations(fund_id);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_date ON nav_calculations(nav_date);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_status ON nav_calculations(status);
CREATE INDEX IF NOT EXISTS idx_nav_details_calculation ON nav_calculation_details(nav_calculation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fund ON transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fee_structures_fund ON fee_structures(fund_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, rate_date);

-- Enable RLS on all tables
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_calculation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Funds
CREATE POLICY "Tenant users can view own funds"
  ON funds FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can manage funds"
  ON funds FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Share Classes
CREATE POLICY "Users can view share classes of their tenant funds"
  ON share_classes FOR SELECT
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can manage share classes"
  ON share_classes FOR ALL
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Capital Accounts
CREATE POLICY "Investors can view own capital accounts"
  ON capital_accounts FOR SELECT
  TO authenticated
  USING (
    investor_id = auth.uid() OR
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can manage capital accounts"
  ON capital_accounts FOR ALL
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for NAV Calculations
CREATE POLICY "Users can view NAV calculations of their funds"
  ON nav_calculations FOR SELECT
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can create and update NAV calculations"
  ON nav_calculations FOR INSERT
  TO authenticated
  WITH CHECK (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Fund managers can update NAV calculations"
  ON nav_calculations FOR UPDATE
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for NAV Calculation Details
CREATE POLICY "Users can view NAV details of their funds"
  ON nav_calculation_details FOR SELECT
  TO authenticated
  USING (
    nav_calculation_id IN (
      SELECT nc.id FROM nav_calculations nc
      JOIN funds f ON nc.fund_id = f.id
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can manage NAV details"
  ON nav_calculation_details FOR ALL
  TO authenticated
  USING (
    nav_calculation_id IN (
      SELECT nc.id FROM nav_calculations nc
      JOIN funds f ON nc.fund_id = f.id
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Transactions
CREATE POLICY "Users can view transactions of their funds"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
    ) OR
    capital_account_id IN (
      SELECT id FROM capital_accounts WHERE investor_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can manage transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Fee Structures
CREATE POLICY "Users can view fee structures of their funds"
  ON fee_structures FOR SELECT
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fund managers can manage fee structures"
  ON fee_structures FOR ALL
  TO authenticated
  USING (
    fund_id IN (
      SELECT f.id FROM funds f
      JOIN tenant_users tu ON f.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Currencies (public read)
CREATE POLICY "Anyone can view currencies"
  ON currencies FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- RLS Policies for Exchange Rates (public read)
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- Insert common currencies
INSERT INTO currencies (currency_code, currency_name, symbol, decimal_places, is_active)
VALUES
  ('USD', 'US Dollar', '$', 2, true),
  ('EUR', 'Euro', '€', 2, true),
  ('GBP', 'British Pound', '£', 2, true),
  ('JPY', 'Japanese Yen', '¥', 0, true),
  ('CHF', 'Swiss Franc', 'CHF', 2, true),
  ('CAD', 'Canadian Dollar', 'C$', 2, true),
  ('AUD', 'Australian Dollar', 'A$', 2, true),
  ('HKD', 'Hong Kong Dollar', 'HK$', 2, true),
  ('SGD', 'Singapore Dollar', 'S$', 2, true),
  ('CNY', 'Chinese Yuan', '¥', 2, true)
ON CONFLICT (currency_code) DO NOTHING;

-- Create helper function to get latest NAV for a fund
CREATE OR REPLACE FUNCTION get_latest_nav(fund_uuid uuid, class_uuid uuid DEFAULT NULL)
RETURNS numeric AS $$
  SELECT nav_per_share
  FROM nav_calculations
  WHERE fund_id = fund_uuid
    AND (class_uuid IS NULL OR share_class_id = class_uuid)
    AND status = 'approved'
  ORDER BY nav_date DESC, version DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Create helper function to get latest approved NAV calculation
CREATE OR REPLACE FUNCTION get_latest_nav_calculation(fund_uuid uuid, class_uuid uuid DEFAULT NULL)
RETURNS uuid AS $$
  SELECT id
  FROM nav_calculations
  WHERE fund_id = fund_uuid
    AND (class_uuid IS NULL OR share_class_id = class_uuid)
    AND status = 'approved'
  ORDER BY nav_date DESC, version DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Create function to calculate total fund NAV across all classes
CREATE OR REPLACE FUNCTION calculate_total_fund_nav(fund_uuid uuid, nav_date_param date)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(net_asset_value), 0)
  FROM nav_calculations
  WHERE fund_id = fund_uuid
    AND nav_date = nav_date_param
    AND status = 'approved'
    AND share_class_id IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_latest_nav(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_nav_calculation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_total_fund_nav(uuid, date) TO authenticated;
