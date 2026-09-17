/*
# Create Trade Uploads Table

1. New Tables
   - `trade_uploads` - Stores monthly trade CSV uploads for fund managers
     - `id` (uuid, primary key)
     - `tenant_id` (uuid, references platform_tenants)
     - `fund_id` (uuid, nullable, references funds)
     - `upload_month` (integer, 1-12)
     - `upload_year` (integer)
     - `status` (text: draft, confirmed, superseded)
     - `filename` (text, original CSV filename)
     - `uploaded_by` (uuid, references auth.users)
     - `confirmed_at` (timestamptz, nullable)
     - `notes` (text, nullable)
     - `created_at` (timestamptz)
   - `trade_upload_items` - Individual trade line items parsed from CSV
     - `id` (uuid, primary key)
     - `upload_id` (uuid, references trade_uploads)
     - `trade_date` (date)
     - `instrument` (text, ticker/name)
     - `direction` (text: buy/sell)
     - `quantity` (numeric)
     - `price` (numeric)
     - `fees` (numeric, default 0)
     - `total_value` (numeric, computed)
     - `notes` (text, nullable)
     - `sort_order` (integer)

2. Security
   - RLS enabled on both tables
   - Tenant-scoped CRUD for authenticated staff members
   - Uses existing staff_accounts tenant membership pattern

3. Indexes
   - trade_uploads(tenant_id, upload_year, upload_month)
   - trade_upload_items(upload_id)
*/

-- Trade uploads (batch header)
CREATE TABLE IF NOT EXISTS trade_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid REFERENCES funds(id) ON DELETE SET NULL,
  upload_month integer NOT NULL CHECK (upload_month BETWEEN 1 AND 12),
  upload_year integer NOT NULL CHECK (upload_year BETWEEN 2000 AND 2100),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'superseded')),
  filename text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_uploads_tenant_period
  ON trade_uploads(tenant_id, upload_year, upload_month);

ALTER TABLE trade_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_trade_uploads" ON trade_uploads;
CREATE POLICY "select_trade_uploads" ON trade_uploads FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_trade_uploads" ON trade_uploads;
CREATE POLICY "insert_trade_uploads" ON trade_uploads FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "update_trade_uploads" ON trade_uploads;
CREATE POLICY "update_trade_uploads" ON trade_uploads FOR UPDATE
  TO authenticated
  USING (tenant_id IN (
    SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_trade_uploads" ON trade_uploads;
CREATE POLICY "delete_trade_uploads" ON trade_uploads FOR DELETE
  TO authenticated
  USING (tenant_id IN (
    SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
  ));

-- Trade upload line items
CREATE TABLE IF NOT EXISTS trade_upload_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES trade_uploads(id) ON DELETE CASCADE,
  trade_date date NOT NULL,
  instrument text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('buy', 'sell')),
  quantity numeric(20,6) NOT NULL,
  price numeric(20,6) NOT NULL,
  fees numeric(20,2) NOT NULL DEFAULT 0,
  total_value numeric(20,2) NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_trade_upload_items_upload
  ON trade_upload_items(upload_id);

ALTER TABLE trade_upload_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_trade_upload_items" ON trade_upload_items;
CREATE POLICY "select_trade_upload_items" ON trade_upload_items FOR SELECT
  TO authenticated
  USING (upload_id IN (
    SELECT tu.id FROM trade_uploads tu WHERE tu.tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "insert_trade_upload_items" ON trade_upload_items;
CREATE POLICY "insert_trade_upload_items" ON trade_upload_items FOR INSERT
  TO authenticated
  WITH CHECK (upload_id IN (
    SELECT tu.id FROM trade_uploads tu WHERE tu.tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "update_trade_upload_items" ON trade_upload_items;
CREATE POLICY "update_trade_upload_items" ON trade_upload_items FOR UPDATE
  TO authenticated
  USING (upload_id IN (
    SELECT tu.id FROM trade_uploads tu WHERE tu.tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  ))
  WITH CHECK (upload_id IN (
    SELECT tu.id FROM trade_uploads tu WHERE tu.tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "delete_trade_upload_items" ON trade_upload_items;
CREATE POLICY "delete_trade_upload_items" ON trade_upload_items FOR DELETE
  TO authenticated
  USING (upload_id IN (
    SELECT tu.id FROM trade_uploads tu WHERE tu.tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa WHERE sa.auth_user_id = auth.uid()
    )
  ));
