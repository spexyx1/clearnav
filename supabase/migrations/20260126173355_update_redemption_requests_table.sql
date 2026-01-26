/*
  # Update Redemption Requests Table

  1. Changes
    - Add missing columns for comprehensive redemption tracking
    - Update to match new transaction management schema
    - Add proper workflow status tracking
    - Add fund_id and capital_account_id references

  2. Security
    - Maintains existing RLS policies
    - Updates policies to use auth_user_id
*/

-- Add missing columns to redemption_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'fund_id') THEN
    ALTER TABLE redemption_requests ADD COLUMN fund_id uuid REFERENCES funds(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'capital_account_id') THEN
    ALTER TABLE redemption_requests ADD COLUMN capital_account_id uuid REFERENCES capital_accounts(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'request_number') THEN
    ALTER TABLE redemption_requests ADD COLUMN request_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'request_date') THEN
    ALTER TABLE redemption_requests ADD COLUMN request_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'redemption_date') THEN
    ALTER TABLE redemption_requests ADD COLUMN redemption_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'shares_requested') THEN
    ALTER TABLE redemption_requests ADD COLUMN shares_requested numeric(20,6);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'amount_requested') THEN
    ALTER TABLE redemption_requests ADD COLUMN amount_requested numeric(20,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'shares_approved') THEN
    ALTER TABLE redemption_requests ADD COLUMN shares_approved numeric(20,6);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'amount_approved') THEN
    ALTER TABLE redemption_requests ADD COLUMN amount_approved numeric(20,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'redemption_price') THEN
    ALTER TABLE redemption_requests ADD COLUMN redemption_price numeric(20,6);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'settlement_date') THEN
    ALTER TABLE redemption_requests ADD COLUMN settlement_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'settlement_amount') THEN
    ALTER TABLE redemption_requests ADD COLUMN settlement_amount numeric(20,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'currency') THEN
    ALTER TABLE redemption_requests ADD COLUMN currency text DEFAULT 'USD';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'rejection_reason') THEN
    ALTER TABLE redemption_requests ADD COLUMN rejection_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'requested_by') THEN
    ALTER TABLE redemption_requests ADD COLUMN requested_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'reviewed_by') THEN
    ALTER TABLE redemption_requests ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'approved_by') THEN
    ALTER TABLE redemption_requests ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemption_requests' AND column_name = 'updated_at') THEN
    ALTER TABLE redemption_requests ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update status check constraint to include new statuses
ALTER TABLE redemption_requests DROP CONSTRAINT IF EXISTS redemption_requests_status_check;
ALTER TABLE redemption_requests ADD CONSTRAINT redemption_requests_status_check 
  CHECK (status IN (
    'requested',
    'under_review',
    'approved',
    'rejected',
    'processing',
    'completed',
    'cancelled',
    'pending'
  ));

-- Update redemption_type check constraint
ALTER TABLE redemption_requests DROP CONSTRAINT IF EXISTS redemption_requests_redemption_type_check;
ALTER TABLE redemption_requests ADD CONSTRAINT redemption_requests_redemption_type_check 
  CHECK (redemption_type IN ('full', 'partial', 'standard'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_redemption_requests_fund ON redemption_requests(fund_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_account ON redemption_requests(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_status ON redemption_requests(status);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_date ON redemption_requests(redemption_date);

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view redemption requests for their tenant" ON redemption_requests;
DROP POLICY IF EXISTS "Users can create redemption requests" ON redemption_requests;
DROP POLICY IF EXISTS "Staff can update redemption requests" ON redemption_requests;

-- Create updated RLS policies
CREATE POLICY "Users can view redemption requests for their tenant"
  ON redemption_requests FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can create redemption requests"
  ON redemption_requests FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Staff can update redemption requests"
  ON redemption_requests FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM staff_accounts WHERE auth_user_id = auth.uid()
  ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_redemption_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_redemption_requests_updated_at ON redemption_requests;
CREATE TRIGGER trigger_redemption_requests_updated_at
  BEFORE UPDATE ON redemption_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_redemption_requests_updated_at();
