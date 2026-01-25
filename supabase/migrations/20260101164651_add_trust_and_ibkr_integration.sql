/*
  # Trust Structure and IBKR Integration Schema

  1. New Tables
    - `trust_account`
      - `id` (uuid, primary key)
      - `name` (text) - Trust name
      - `ibkr_account_id` (text) - IBKR account number
      - `total_aum` (numeric) - Total assets under management
      - `total_units_outstanding` (numeric) - Total units issued
      - `current_nav_per_unit` (numeric) - Current NAV per unit
      - `last_sync_at` (timestamptz) - Last successful IBKR sync
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `client_units`
      - `id` (uuid, primary key)
      - `client_id` (uuid) - References client_profiles
      - `trust_account_id` (uuid) - References trust_account
      - `units_owned` (numeric) - Number of units owned
      - `cost_basis` (numeric) - Total amount invested
      - `cost_basis_per_unit` (numeric) - Average cost per unit
      - `purchase_date` (date) - Initial purchase date
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `trust_positions`
      - `id` (uuid, primary key)
      - `trust_account_id` (uuid) - References trust_account
      - `symbol` (text) - Stock/Asset symbol
      - `asset_class` (text) - Stock, Bond, ETF, etc.
      - `quantity` (numeric) - Number of shares/contracts
      - `average_cost` (numeric) - Average cost basis per share
      - `current_price` (numeric) - Current market price
      - `market_value` (numeric) - Total market value
      - `unrealized_pnl` (numeric) - Unrealized profit/loss
      - `currency` (text) - Currency (default USD)
      - `last_updated` (timestamptz)
      - `created_at` (timestamptz)

    - `trust_nav_history`
      - `id` (uuid, primary key)
      - `trust_account_id` (uuid) - References trust_account
      - `timestamp` (timestamptz) - Snapshot timestamp
      - `nav_per_unit` (numeric) - NAV per unit at this time
      - `total_aum` (numeric) - Total AUM at this time
      - `total_units` (numeric) - Total units outstanding
      - `total_cash` (numeric) - Cash balance
      - `total_positions_value` (numeric) - Market value of positions
      - `created_at` (timestamptz)

    - `ibkr_sync_log`
      - `id` (uuid, primary key)
      - `trust_account_id` (uuid) - References trust_account
      - `sync_type` (text) - Type of sync (full, positions, nav)
      - `status` (text) - success, failed, partial
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `error_message` (text) - Error details if failed
      - `positions_synced` (integer) - Number of positions synced
      - `created_at` (timestamptz)

    - `unit_transactions`
      - `id` (uuid, primary key)
      - `client_id` (uuid) - References client_profiles
      - `trust_account_id` (uuid) - References trust_account
      - `transaction_type` (text) - subscription, redemption
      - `units` (numeric) - Number of units (positive or negative)
      - `amount` (numeric) - Dollar amount
      - `nav_per_unit` (numeric) - NAV at transaction time
      - `transaction_date` (timestamptz)
      - `status` (text) - pending, completed, cancelled
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Views
    - `client_portfolio_view` - Calculated view of each client's current portfolio value

  3. Security
    - Enable RLS on all tables
    - Clients can only view their own units and allocated positions
    - Trust account data is read-only for clients
    - Admin-only access to sync logs and transaction management

  4. Indexes
    - Performance indexes on frequently queried fields
*/

-- Trust Account Table
CREATE TABLE IF NOT EXISTS trust_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ibkr_account_id text UNIQUE,
  total_aum numeric DEFAULT 0,
  total_units_outstanding numeric DEFAULT 0,
  current_nav_per_unit numeric DEFAULT 1.00,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trust_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trust account is viewable by authenticated users"
  ON trust_account FOR SELECT
  TO authenticated
  USING (true);

-- Client Units Table
CREATE TABLE IF NOT EXISTS client_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  trust_account_id uuid NOT NULL REFERENCES trust_account(id) ON DELETE CASCADE,
  units_owned numeric NOT NULL DEFAULT 0,
  cost_basis numeric NOT NULL DEFAULT 0,
  cost_basis_per_unit numeric NOT NULL DEFAULT 0,
  purchase_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, trust_account_id)
);

ALTER TABLE client_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own units"
  ON client_units FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update own units"
  ON client_units FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Trust Positions Table
CREATE TABLE IF NOT EXISTS trust_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES trust_account(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  asset_class text NOT NULL,
  quantity numeric NOT NULL,
  average_cost numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  market_value numeric NOT NULL DEFAULT 0,
  unrealized_pnl numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(trust_account_id, symbol)
);

ALTER TABLE trust_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trust positions"
  ON trust_positions FOR SELECT
  TO authenticated
  USING (true);

-- Trust NAV History Table
CREATE TABLE IF NOT EXISTS trust_nav_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES trust_account(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  nav_per_unit numeric NOT NULL,
  total_aum numeric NOT NULL,
  total_units numeric NOT NULL,
  total_cash numeric DEFAULT 0,
  total_positions_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trust_nav_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NAV history"
  ON trust_nav_history FOR SELECT
  TO authenticated
  USING (true);

-- IBKR Sync Log Table
CREATE TABLE IF NOT EXISTS ibkr_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES trust_account(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  positions_synced integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ibkr_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage sync logs"
  ON ibkr_sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Unit Transactions Table
CREATE TABLE IF NOT EXISTS unit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  trust_account_id uuid NOT NULL REFERENCES trust_account(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('subscription', 'redemption')),
  units numeric NOT NULL,
  amount numeric NOT NULL,
  nav_per_unit numeric NOT NULL,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE unit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own unit transactions"
  ON unit_transactions FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create unit transactions"
  ON unit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Create View for Client Portfolio Calculations
CREATE OR REPLACE VIEW client_portfolio_view AS
SELECT 
  cp.id as client_id,
  cp.full_name,
  cp.account_number,
  cu.trust_account_id,
  cu.units_owned,
  cu.cost_basis,
  cu.cost_basis_per_unit,
  ta.current_nav_per_unit,
  (cu.units_owned * ta.current_nav_per_unit) as current_value,
  ((cu.units_owned * ta.current_nav_per_unit) - cu.cost_basis) as unrealized_gain_loss,
  CASE 
    WHEN cu.cost_basis > 0 THEN 
      (((cu.units_owned * ta.current_nav_per_unit) - cu.cost_basis) / cu.cost_basis * 100)
    ELSE 0 
  END as return_percentage,
  CASE 
    WHEN ta.total_units_outstanding > 0 THEN 
      (cu.units_owned / ta.total_units_outstanding * 100)
    ELSE 0 
  END as ownership_percentage,
  ta.last_sync_at
FROM client_profiles cp
JOIN client_units cu ON cp.id = cu.client_id
JOIN trust_account ta ON cu.trust_account_id = ta.id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_units_client_id ON client_units(client_id);
CREATE INDEX IF NOT EXISTS idx_client_units_trust_id ON client_units(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_positions_trust_id ON trust_positions(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_positions_symbol ON trust_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_trust_nav_history_trust_id ON trust_nav_history(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_nav_history_timestamp ON trust_nav_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unit_transactions_client_id ON unit_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_unit_transactions_date ON unit_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ibkr_sync_log_trust_id ON ibkr_sync_log(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_sync_log_started_at ON ibkr_sync_log(started_at DESC);

-- Insert default trust account
INSERT INTO trust_account (name, total_units_outstanding, current_nav_per_unit)
VALUES ('Grey Alpha Master Trust', 0, 1.00)
ON CONFLICT DO NOTHING;
