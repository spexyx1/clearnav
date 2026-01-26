/*
  # Create Capital Transactions Table

  1. New Table
    - `capital_transactions`
      - Tracks all capital movements (contributions, redemptions, distributions, transfers)
      - Links to capital accounts and funds
      - Supports multiple transaction types and statuses
      - Includes settlement tracking

  2. Security
    - Enable RLS on table
    - Policies restrict access to tenant data only
    - Authenticated users can read their tenant's data
    - Only staff can create/update transactions
*/

-- Capital Transactions Table
CREATE TABLE IF NOT EXISTS capital_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'contribution',
    'redemption',
    'distribution',
    'transfer_in',
    'transfer_out',
    'fee',
    'adjustment'
  )),
  transaction_date date NOT NULL,
  settlement_date date,
  amount numeric(20,2) NOT NULL,
  shares numeric(20,6),
  price_per_share numeric(20,6),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'settled',
    'cancelled',
    'failed'
  )),
  reference_number text,
  description text,
  notes text,
  related_transaction_id uuid,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for related_transaction_id after table creation
ALTER TABLE capital_transactions 
  ADD CONSTRAINT fk_related_transaction 
  FOREIGN KEY (related_transaction_id) 
  REFERENCES capital_transactions(id);

CREATE INDEX IF NOT EXISTS idx_capital_transactions_tenant ON capital_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_account ON capital_transactions(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_fund ON capital_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_date ON capital_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_type ON capital_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_status ON capital_transactions(status);

-- Enable Row Level Security
ALTER TABLE capital_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transactions for their tenant"
  ON capital_transactions FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create transactions"
  ON capital_transactions FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update transactions"
  ON capital_transactions FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_capital_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_capital_transactions_updated_at
  BEFORE UPDATE ON capital_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_capital_transactions_updated_at();
