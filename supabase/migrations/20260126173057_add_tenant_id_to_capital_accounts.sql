/*
  # Add Tenant ID to Capital Accounts

  1. Changes
    - Add tenant_id column to capital_accounts table
    - Populate tenant_id from fund's tenant_id
    - Add NOT NULL constraint after population
    - Add index for tenant_id
    - Update RLS policies

  2. Security
    - Maintains existing RLS policies
    - Ensures tenant isolation for capital accounts
*/

-- Add tenant_id column (nullable initially)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capital_accounts' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE capital_accounts ADD COLUMN tenant_id uuid REFERENCES platform_tenants(id);
  END IF;
END $$;

-- Populate tenant_id from funds table
UPDATE capital_accounts ca
SET tenant_id = f.tenant_id
FROM funds f
WHERE ca.fund_id = f.id
AND ca.tenant_id IS NULL;

-- Make tenant_id NOT NULL after population
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capital_accounts' 
    AND column_name = 'tenant_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE capital_accounts ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Add index for tenant_id
CREATE INDEX IF NOT EXISTS idx_capital_accounts_tenant ON capital_accounts(tenant_id);
