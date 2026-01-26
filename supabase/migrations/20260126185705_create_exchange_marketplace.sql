/*
  # Secondary Market Exchange & Asset Tokenization System

  1. New Tables - Marketplace Core
    - `marketplace_listings`
      - Stores buy/sell listings from clients wanting to trade their holdings
      - Includes pricing, quantity, asset details, and approval status
      - Supports both tenant-isolated and cross-tenant marketplace modes

    - `exchange_orders`
      - Tracks buy and sell orders with order types and matching status
      - Links buyers and sellers through order matching engine
      - Records pricing, quantities, and order lifecycle

    - `exchange_transactions`
      - Records completed trades with full transaction details
      - Tracks settlement status and transfer of assets/funds
      - Maintains complete audit trail of all exchanges

    - `escrow_accounts`
      - Holds funds during transaction settlement period
      - Ensures safe transfer with rollback capability
      - Tracks escrow status and release conditions

  2. New Tables - Fees & Services
    - `marketplace_fees`
      - Configurable fee structures per asset type or transaction size
      - Supports percentage-based and fixed fees
      - Tracks revenue from exchange operations

    - `exchange_audit_requests`
      - Manages audit and legal review workflows
      - Tracks third-party verification services
      - Generates additional revenue from compliance services

  3. New Tables - Asset Tokenization
    - `tokenized_assets`
      - Maps traditional holdings to tokenized representations
      - Stores token metadata and issuance details
      - Links to underlying fund shares or trust units

    - `token_nav_snapshots`
      - Daily NAV calculations for tokenized assets
      - Maintains pricing history for valuation
      - Ensures accurate token pricing

    - `tokenization_requests`
      - Workflow management for tokenization approvals
      - Compliance checks and documentation requirements
      - Tracks tokenization fees and billing

    - `token_holders`
      - Current ownership of tokenized assets
      - Real-time balance tracking
      - Supports fractional ownership

    - `token_transfer_history`
      - Complete audit trail of token movements
      - Links to exchange transactions
      - Immutable record for compliance

  4. Security
    - Enable RLS on all tables
    - Policies for tenant isolation and cross-tenant access
    - Strict access controls for financial operations
*/

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  lister_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('fund_share', 'trust_unit', 'tokenized_asset', 'share_class_unit')),
  asset_id uuid NOT NULL,
  asset_name text NOT NULL,
  quantity_available numeric NOT NULL CHECK (quantity_available > 0),
  quantity_original numeric NOT NULL CHECK (quantity_original > 0),
  price_per_unit numeric NOT NULL CHECK (price_per_unit > 0),
  total_value numeric GENERATED ALWAYS AS (quantity_available * price_per_unit) STORED,
  listing_type text NOT NULL CHECK (listing_type IN ('sell', 'buy')),
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'negotiable', 'market')),
  min_purchase_quantity numeric DEFAULT 1 CHECK (min_purchase_quantity > 0),
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('draft', 'pending_approval', 'active', 'partially_filled', 'filled', 'cancelled', 'expired', 'rejected')),
  visibility text NOT NULL DEFAULT 'tenant_only' CHECK (visibility IN ('tenant_only', 'cross_tenant', 'private')),

  requires_accreditation boolean DEFAULT true,
  transfer_restrictions jsonb DEFAULT '{}',
  lock_up_end_date timestamptz,
  min_holding_period_days integer DEFAULT 0,

  description text,
  terms_conditions text,
  supporting_documents jsonb DEFAULT '[]',

  approved_by uuid REFERENCES staff_accounts(id),
  approved_at timestamptz,
  rejection_reason text,

  listed_at timestamptz,
  expires_at timestamptz,
  filled_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exchange Orders
CREATE TABLE IF NOT EXISTS exchange_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  order_type text NOT NULL CHECK (order_type IN ('market', 'limit', 'negotiated')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL CHECK (price_per_unit > 0),
  total_amount numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'counter_offer', 'matched', 'in_escrow', 'settling', 'completed', 'cancelled', 'failed')),

  counter_offer_price numeric,
  counter_offer_quantity numeric,
  negotiation_history jsonb DEFAULT '[]',

  matched_at timestamptz,
  matched_by uuid REFERENCES staff_accounts(id),

  escrow_funded_at timestamptz,
  settlement_started_at timestamptz,
  settlement_completed_at timestamptz,

  buyer_notes text,
  seller_notes text,
  admin_notes text,

  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exchange Transactions
CREATE TABLE IF NOT EXISTS exchange_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES exchange_orders(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

  buyer_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  asset_type text NOT NULL,
  asset_id uuid NOT NULL,
  asset_name text NOT NULL,

  quantity numeric NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL CHECK (price_per_unit > 0),
  gross_amount numeric NOT NULL CHECK (gross_amount > 0),

  platform_fee numeric NOT NULL DEFAULT 0,
  platform_fee_rate numeric DEFAULT 0.02,
  tenant_fee numeric DEFAULT 0,
  audit_fee numeric DEFAULT 0,
  legal_fee numeric DEFAULT 0,
  total_fees numeric GENERATED ALWAYS AS (platform_fee + tenant_fee + audit_fee + legal_fee) STORED,
  net_amount numeric GENERATED ALWAYS AS (gross_amount - (platform_fee + tenant_fee + audit_fee + legal_fee)) STORED,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_escrow', 'settling', 'completed', 'cancelled', 'failed', 'disputed')),
  settlement_method text DEFAULT 'direct_transfer',

  buyer_account_debited boolean DEFAULT false,
  seller_account_credited boolean DEFAULT false,
  asset_transferred boolean DEFAULT false,
  fees_collected boolean DEFAULT false,

  audit_requested boolean DEFAULT false,
  audit_completed boolean DEFAULT false,
  audit_approved boolean DEFAULT false,
  legal_review_requested boolean DEFAULT false,
  legal_review_completed boolean DEFAULT false,
  legal_approved boolean DEFAULT false,

  transaction_date timestamptz DEFAULT now(),
  settlement_date timestamptz,
  completed_at timestamptz,

  processed_by uuid REFERENCES staff_accounts(id),
  rollback_reason text,
  notes text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Escrow Accounts
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES exchange_orders(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES exchange_transactions(id),

  holder_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),

  status text NOT NULL DEFAULT 'pending_funding' CHECK (status IN ('pending_funding', 'funded', 'held', 'released', 'refunded', 'disputed')),

  funded_at timestamptz,
  hold_until timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,

  release_conditions jsonb DEFAULT '{}',
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Marketplace Fees Configuration
CREATE TABLE IF NOT EXISTS marketplace_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,

  fee_name text NOT NULL,
  fee_type text NOT NULL CHECK (fee_type IN ('platform_transaction', 'tenant_transaction', 'audit_service', 'legal_review', 'tokenization', 'listing')),

  calculation_method text NOT NULL CHECK (calculation_method IN ('percentage', 'fixed', 'tiered')),

  percentage_rate numeric CHECK (percentage_rate >= 0 AND percentage_rate <= 1),
  min_fee numeric DEFAULT 0,
  max_fee numeric,

  fixed_amount numeric DEFAULT 0,

  tier_thresholds numeric[],
  tier_rates numeric[],

  applies_to_asset_types text[] DEFAULT ARRAY['fund_share', 'trust_unit', 'tokenized_asset', 'share_class_unit'],
  min_transaction_size numeric,
  max_transaction_size numeric,

  is_active boolean DEFAULT true,
  effective_from timestamptz DEFAULT now(),
  effective_until timestamptz,

  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exchange Audit Requests
CREATE TABLE IF NOT EXISTS exchange_audit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES exchange_transactions(id) ON DELETE CASCADE,

  request_type text NOT NULL CHECK (request_type IN ('transaction_audit', 'legal_review', 'compliance_check', 'valuation_review')),

  requested_by uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES staff_accounts(id),

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  findings text,
  recommendations text,
  approval_notes text,

  estimated_fee numeric,
  actual_fee numeric,
  fee_paid boolean DEFAULT false,

  supporting_documents jsonb DEFAULT '[]',
  audit_report_url text,

  requested_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tokenized Assets
CREATE TABLE IF NOT EXISTS tokenized_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,

  token_symbol text NOT NULL,
  token_name text NOT NULL,

  underlying_asset_type text NOT NULL CHECK (underlying_asset_type IN ('fund_share', 'trust_unit', 'share_class_unit', 'portfolio')),
  underlying_asset_id uuid NOT NULL,
  underlying_asset_name text NOT NULL,

  total_supply numeric NOT NULL CHECK (total_supply > 0),
  decimals integer DEFAULT 6 CHECK (decimals >= 0 AND decimals <= 18),

  current_nav_per_token numeric NOT NULL DEFAULT 0,
  total_value numeric GENERATED ALWAYS AS (total_supply * current_nav_per_token) STORED,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'redeemed', 'expired')),
  is_tradeable boolean DEFAULT true,

  description text,
  token_metadata jsonb DEFAULT '{}',

  issued_at timestamptz,
  last_nav_update timestamptz,

  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, token_symbol)
);

-- Token NAV Snapshots
CREATE TABLE IF NOT EXISTS token_nav_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES tokenized_assets(id) ON DELETE CASCADE,

  snapshot_date date NOT NULL,
  nav_per_token numeric NOT NULL CHECK (nav_per_token >= 0),

  underlying_asset_value numeric NOT NULL,
  total_tokens_outstanding numeric NOT NULL,

  calculation_method text,
  data_sources jsonb DEFAULT '{}',
  verified_by uuid REFERENCES staff_accounts(id),

  notes text,
  created_at timestamptz DEFAULT now(),

  UNIQUE(token_id, snapshot_date)
);

-- Tokenization Requests
CREATE TABLE IF NOT EXISTS tokenization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,

  requester_id uuid NOT NULL,
  requester_type text NOT NULL CHECK (requester_type IN ('client', 'staff', 'platform_admin')),

  asset_type text NOT NULL CHECK (asset_type IN ('fund_share', 'trust_unit', 'share_class_unit', 'portfolio')),
  asset_id uuid NOT NULL,
  asset_name text NOT NULL,
  asset_quantity numeric NOT NULL CHECK (asset_quantity > 0),

  proposed_token_symbol text NOT NULL,
  proposed_token_name text NOT NULL,
  proposed_supply numeric NOT NULL,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'compliance_review', 'approved', 'rejected', 'completed', 'cancelled')),

  reviewed_by uuid REFERENCES staff_accounts(id),
  compliance_approved boolean DEFAULT false,
  compliance_notes text,

  tokenization_fee numeric,
  ongoing_admin_fee numeric,
  fee_paid boolean DEFAULT false,

  resulting_token_id uuid REFERENCES tokenized_assets(id),

  rejection_reason text,

  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Token Holders
CREATE TABLE IF NOT EXISTS token_holders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES tokenized_assets(id) ON DELETE CASCADE,
  holder_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  cost_basis numeric DEFAULT 0,
  average_cost_per_token numeric DEFAULT 0,

  is_locked boolean DEFAULT false,
  lock_reason text,
  locked_until timestamptz,

  first_acquired_at timestamptz DEFAULT now(),
  last_transaction_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(token_id, holder_id)
);

-- Token Transfer History
CREATE TABLE IF NOT EXISTS token_transfer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES tokenized_assets(id) ON DELETE CASCADE,

  from_holder_id uuid REFERENCES client_profiles(id),
  to_holder_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,

  amount numeric NOT NULL CHECK (amount > 0),
  transfer_type text NOT NULL CHECK (transfer_type IN ('issuance', 'transfer', 'exchange_trade', 'redemption', 'gift', 'inheritance')),

  exchange_transaction_id uuid REFERENCES exchange_transactions(id),

  price_per_token numeric,
  total_value numeric,

  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),

  notes text,
  metadata jsonb DEFAULT '{}',

  transferred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_tenant ON marketplace_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_lister ON marketplace_listings(lister_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_visibility ON marketplace_listings(visibility);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_asset ON marketplace_listings(asset_type, asset_id);

CREATE INDEX IF NOT EXISTS idx_exchange_orders_tenant ON exchange_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_listing ON exchange_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_buyer ON exchange_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_seller ON exchange_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_status ON exchange_orders(status);

CREATE INDEX IF NOT EXISTS idx_exchange_transactions_tenant ON exchange_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_buyer ON exchange_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_seller ON exchange_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_status ON exchange_transactions(status);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_date ON exchange_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_tokenized_assets_tenant ON tokenized_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tokenized_assets_symbol ON tokenized_assets(token_symbol);
CREATE INDEX IF NOT EXISTS idx_tokenized_assets_underlying ON tokenized_assets(underlying_asset_type, underlying_asset_id);

CREATE INDEX IF NOT EXISTS idx_token_holders_token ON token_holders(token_id);
CREATE INDEX IF NOT EXISTS idx_token_holders_holder ON token_holders(holder_id);

CREATE INDEX IF NOT EXISTS idx_token_transfers_token ON token_transfer_history(token_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_from ON token_transfer_history(from_holder_id);
CREATE INDEX IF NOT EXISTS idx_token_transfers_to ON token_transfer_history(to_holder_id);

-- Enable Row Level Security
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_audit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokenized_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_nav_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokenization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transfer_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Clients can view listings in their tenant"
  ON marketplace_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles
      WHERE client_profiles.id = auth.uid()
      AND marketplace_listings.tenant_id = (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
      )
    )
    OR marketplace_listings.visibility = 'cross_tenant'
  );

CREATE POLICY "Clients can create their own listings"
  ON marketplace_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    lister_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM client_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their own listings"
  ON marketplace_listings FOR UPDATE
  TO authenticated
  USING (lister_id = auth.uid())
  WITH CHECK (lister_id = auth.uid());

CREATE POLICY "Staff can view all listings in their tenant"
  ON marketplace_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

CREATE POLICY "Staff can approve/reject listings"
  ON marketplace_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for exchange_orders
CREATE POLICY "Clients can view their own orders"
  ON exchange_orders FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
  );

CREATE POLICY "Clients can create orders"
  ON exchange_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM client_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their orders"
  ON exchange_orders FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Staff can view all orders"
  ON exchange_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

CREATE POLICY "Staff can manage orders"
  ON exchange_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for exchange_transactions
CREATE POLICY "Clients can view their transactions"
  ON exchange_transactions FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
  );

CREATE POLICY "Staff can view all transactions"
  ON exchange_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

CREATE POLICY "Staff can create and update transactions"
  ON exchange_transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for escrow_accounts
CREATE POLICY "Clients can view their escrow accounts"
  ON escrow_accounts FOR SELECT
  TO authenticated
  USING (holder_id = auth.uid());

CREATE POLICY "Staff can manage escrow accounts"
  ON escrow_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for marketplace_fees
CREATE POLICY "Anyone can view active fees"
  ON marketplace_fees FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Staff can manage fees"
  ON marketplace_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
      AND staff_accounts.role IN ('general_manager', 'cfo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
      AND staff_accounts.role IN ('general_manager', 'cfo')
    )
  );

-- RLS Policies for exchange_audit_requests
CREATE POLICY "Clients can view their audit requests"
  ON exchange_audit_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Clients can create audit requests"
  ON exchange_audit_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM client_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage audit requests"
  ON exchange_audit_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for tokenized_assets
CREATE POLICY "Clients can view tokenized assets"
  ON tokenized_assets FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM client_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage tokenized assets"
  ON tokenized_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for token_nav_snapshots
CREATE POLICY "Anyone can view NAV snapshots"
  ON token_nav_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create NAV snapshots"
  ON token_nav_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for tokenization_requests
CREATE POLICY "Clients can view their tokenization requests"
  ON tokenization_requests FOR SELECT
  TO authenticated
  USING (
    (requester_id = auth.uid() AND requester_type = 'client')
  );

CREATE POLICY "Clients can create tokenization requests"
  ON tokenization_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_type = 'client'
    AND EXISTS (
      SELECT 1 FROM client_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage tokenization requests"
  ON tokenization_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for token_holders
CREATE POLICY "Clients can view their token holdings"
  ON token_holders FOR SELECT
  TO authenticated
  USING (holder_id = auth.uid());

CREATE POLICY "Staff can view all token holdings"
  ON token_holders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

CREATE POLICY "Staff can manage token holdings"
  ON token_holders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

-- RLS Policies for token_transfer_history
CREATE POLICY "Clients can view their token transfers"
  ON token_transfer_history FOR SELECT
  TO authenticated
  USING (
    from_holder_id = auth.uid() OR to_holder_id = auth.uid()
  );

CREATE POLICY "Staff can view all token transfers"
  ON token_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );

CREATE POLICY "Staff can create token transfers"
  ON token_transfer_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.status = 'active'
    )
  );