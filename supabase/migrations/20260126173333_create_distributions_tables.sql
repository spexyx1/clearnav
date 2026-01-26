/*
  # Create Distributions Tables

  1. New Tables
    - `distributions`
      - Manages fund distribution events
      - Tracks distribution amounts per share class
      - Supports different distribution types
    
    - `distribution_allocations`
      - Links distributions to capital accounts
      - Tracks individual investor allocations

  2. Security
    - Enable RLS on both tables
    - Policies restrict access to tenant data only
    - Only staff can create/update distributions
*/

-- Distributions Table
CREATE TABLE IF NOT EXISTS distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  share_class_id uuid REFERENCES share_classes(id),
  distribution_number text NOT NULL,
  record_date date NOT NULL,
  payment_date date NOT NULL,
  distribution_type text NOT NULL CHECK (distribution_type IN (
    'dividend',
    'capital_gain',
    'return_of_capital',
    'interest',
    'other'
  )),
  amount_per_share numeric(20,6) NOT NULL,
  total_amount numeric(20,2) NOT NULL,
  total_shares numeric(20,6) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'processing',
    'completed',
    'cancelled'
  )),
  description text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distributions_tenant ON distributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_distributions_fund ON distributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_distributions_class ON distributions(share_class_id);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON distributions(status);
CREATE INDEX IF NOT EXISTS idx_distributions_payment_date ON distributions(payment_date);

-- Distribution Allocations Table
CREATE TABLE IF NOT EXISTS distribution_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid REFERENCES distributions(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  shares_held numeric(20,6) NOT NULL,
  allocation_amount numeric(20,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'paid',
    'cancelled'
  )),
  transaction_id uuid REFERENCES capital_transactions(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_allocations_distribution ON distribution_allocations(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_allocations_account ON distribution_allocations(capital_account_id);

-- Enable Row Level Security
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for distributions
CREATE POLICY "Users can view distributions for their tenant"
  ON distributions FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create distributions"
  ON distributions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update distributions"
  ON distributions FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- RLS Policies for distribution_allocations
CREATE POLICY "Users can view distribution allocations for their tenant"
  ON distribution_allocations FOR SELECT
  TO authenticated
  USING (capital_account_id IN (
    SELECT ca.id FROM capital_accounts ca
    WHERE ca.tenant_id IN (
      SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "Staff can create distribution allocations"
  ON distribution_allocations FOR INSERT
  TO authenticated
  WITH CHECK (capital_account_id IN (
    SELECT ca.id FROM capital_accounts ca
    WHERE ca.tenant_id IN (
      SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "Staff can update distribution allocations"
  ON distribution_allocations FOR UPDATE
  TO authenticated
  USING (capital_account_id IN (
    SELECT ca.id FROM capital_accounts ca
    WHERE ca.tenant_id IN (
      SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
    )
  ))
  WITH CHECK (capital_account_id IN (
    SELECT ca.id FROM capital_accounts ca
    WHERE ca.tenant_id IN (
      SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
    )
  ));

-- Trigger to update updated_at on distributions
CREATE OR REPLACE FUNCTION update_distributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_distributions_updated_at
  BEFORE UPDATE ON distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_distributions_updated_at();
