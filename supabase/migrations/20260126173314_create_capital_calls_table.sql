/*
  # Create Capital Calls Table

  1. New Table
    - `capital_calls`
      - Manages capital call notices to investors
      - Tracks call amounts, due dates, and payment status
      - Links to capital accounts
      - Supports partial payments

  2. Security
    - Enable RLS on table
    - Policies restrict access to tenant data only
    - Only staff can create/update capital calls
*/

-- Capital Calls Table
CREATE TABLE IF NOT EXISTS capital_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) NOT NULL,
  fund_id uuid REFERENCES funds(id) NOT NULL,
  capital_account_id uuid REFERENCES capital_accounts(id) NOT NULL,
  call_number text NOT NULL,
  call_date date NOT NULL,
  due_date date NOT NULL,
  call_amount numeric(20,2) NOT NULL,
  amount_paid numeric(20,2) DEFAULT 0,
  amount_outstanding numeric(20,2),
  percentage_of_commitment numeric(5,2),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'issued' CHECK (status IN (
    'draft',
    'issued',
    'partial',
    'paid',
    'overdue',
    'cancelled'
  )),
  purpose text,
  notes text,
  payment_instructions text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_calls_tenant ON capital_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capital_calls_fund ON capital_calls(fund_id);
CREATE INDEX IF NOT EXISTS idx_capital_calls_account ON capital_calls(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_capital_calls_status ON capital_calls(status);
CREATE INDEX IF NOT EXISTS idx_capital_calls_due_date ON capital_calls(due_date);

-- Enable Row Level Security
ALTER TABLE capital_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view capital calls for their tenant"
  ON capital_calls FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can create capital calls"
  ON capital_calls FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update capital calls"
  ON capital_calls FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- Trigger to update amount_outstanding
CREATE OR REPLACE FUNCTION update_capital_call_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  NEW.amount_outstanding = NEW.call_amount - NEW.amount_paid;
  
  IF NEW.amount_paid >= NEW.call_amount THEN
    NEW.status = 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status = 'issued' THEN
    NEW.status = 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_capital_call_outstanding
  BEFORE INSERT OR UPDATE ON capital_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_capital_call_outstanding();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_capital_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_capital_calls_updated_at
  BEFORE UPDATE ON capital_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_capital_calls_updated_at();
