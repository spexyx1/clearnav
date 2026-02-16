/*
  # Discount Codes and Promotional Campaigns System

  Creates a comprehensive discount and promotion management system for the platform.

  ## New Tables

  ### `discount_codes`
  Manages discount codes that can be applied to subscriptions
  - `id` (uuid, primary key)
  - `code` (text, unique) - The discount code string (e.g., "LAUNCH50")
  - `name` (text) - Friendly name for the discount
  - `description` (text) - Internal description
  - `discount_type` (text) - "percentage" or "fixed_amount"
  - `discount_value` (integer) - Percentage (0-100) or amount in cents
  - `stripe_coupon_id` (text) - Synced Stripe coupon ID
  - `valid_from` (timestamptz) - When the code becomes valid
  - `valid_until` (timestamptz) - When the code expires
  - `usage_limit` (integer) - Max number of uses (null = unlimited)
  - `times_used` (integer) - Current usage count
  - `is_active` (boolean) - Whether code is currently active
  - `applies_to_plans` (jsonb) - Array of plan IDs this applies to (null = all plans)
  - `recurring_months` (integer) - Number of months to apply discount (null = once, 0 = forever)
  - `metadata` (jsonb) - Additional configuration
  - `created_by` (uuid) - Platform admin who created the code
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `tenant_discounts`
  Tracks which tenants have used which discount codes
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `discount_code_id` (uuid, foreign key)
  - `subscription_id` (uuid, foreign key)
  - `applied_at` (timestamptz)
  - `discount_amount` (integer) - Amount discounted in cents
  - `metadata` (jsonb)

  ### `promotional_campaigns`
  Organizes discount codes into marketing campaigns
  - `id` (uuid, primary key)
  - `name` (text) - Campaign name
  - `description` (text)
  - `campaign_type` (text) - "launch", "seasonal", "partner", "referral"
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `target_audience` (jsonb) - Targeting criteria
  - `discount_codes` (jsonb) - Array of associated discount code IDs
  - `status` (text) - "draft", "active", "paused", "completed"
  - `performance_metrics` (jsonb) - Tracks campaign performance
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `platform_admin_audit_logs`
  Comprehensive audit trail for platform admin actions
  - `id` (uuid, primary key)
  - `admin_user_id` (uuid, foreign key)
  - `action_type` (text) - Type of action performed
  - `resource_type` (text) - What was acted upon
  - `resource_id` (uuid) - ID of the resource
  - `details` (jsonb) - Action details and changes
  - `ip_address` (text)
  - `user_agent` (text)
  - `created_at` (timestamptz)

  ### `tenant_notes`
  Internal notes about tenants for platform admin
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `created_by` (uuid, foreign key)
  - `note_type` (text) - "general", "support", "billing", "compliance"
  - `content` (text)
  - `is_flagged` (boolean) - Marks important notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modified Tables

  ### `billing_records`
  - Add `discount_amount` (integer) - Amount discounted
  - Add `stripe_discount_id` (text) - Stripe coupon/promotion code ID
  - Add `applied_discount_code` (text) - The discount code that was used

  ### `tenant_subscriptions`
  - Add `applied_discount_code_id` (uuid) - FK to discount_codes
  - Add `discount_end_date` (timestamptz) - When recurring discount expires

  ## Security
  - Enable RLS on all new tables
  - Only platform admins can manage discounts
  - All admin actions are logged in audit trail
*/

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value integer NOT NULL CHECK (discount_value > 0),
  stripe_coupon_id text,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  usage_limit integer,
  times_used integer DEFAULT 0,
  is_active boolean DEFAULT true,
  applies_to_plans jsonb,
  recurring_months integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_discounts table
CREATE TABLE IF NOT EXISTS tenant_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  discount_code_id uuid REFERENCES discount_codes(id),
  subscription_id uuid REFERENCES tenant_subscriptions(id),
  applied_at timestamptz DEFAULT now(),
  discount_amount integer,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create promotional_campaigns table
CREATE TABLE IF NOT EXISTS promotional_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text CHECK (campaign_type IN ('launch', 'seasonal', 'partner', 'referral', 'other')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  target_audience jsonb DEFAULT '{}'::jsonb,
  discount_codes jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform_admin_audit_logs table
CREATE TABLE IF NOT EXISTS platform_admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user ON platform_admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON platform_admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON platform_admin_audit_logs(resource_type, resource_id);

-- Create tenant_notes table
CREATE TABLE IF NOT EXISTS tenant_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'support', 'billing', 'compliance')),
  content text NOT NULL,
  is_flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_notes_tenant ON tenant_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notes_flagged ON tenant_notes(tenant_id, is_flagged) WHERE is_flagged = true;

-- Add columns to billing_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_records' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE billing_records ADD COLUMN discount_amount integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_records' AND column_name = 'stripe_discount_id'
  ) THEN
    ALTER TABLE billing_records ADD COLUMN stripe_discount_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_records' AND column_name = 'applied_discount_code'
  ) THEN
    ALTER TABLE billing_records ADD COLUMN applied_discount_code text;
  END IF;
END $$;

-- Add columns to tenant_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_subscriptions' AND column_name = 'applied_discount_code_id'
  ) THEN
    ALTER TABLE tenant_subscriptions ADD COLUMN applied_discount_code_id uuid REFERENCES discount_codes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_subscriptions' AND column_name = 'discount_end_date'
  ) THEN
    ALTER TABLE tenant_subscriptions ADD COLUMN discount_end_date timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_codes (Platform Admin Only)
CREATE POLICY "Platform admins can view all discount codes"
  ON discount_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can create discount codes"
  ON discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can update discount codes"
  ON discount_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can delete discount codes"
  ON discount_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- RLS Policies for tenant_discounts
CREATE POLICY "Platform admins can view all tenant discounts"
  ON tenant_discounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert tenant discounts"
  ON tenant_discounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for promotional_campaigns
CREATE POLICY "Platform admins can manage campaigns"
  ON promotional_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- RLS Policies for platform_admin_audit_logs
CREATE POLICY "Platform admins can view audit logs"
  ON platform_admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs"
  ON platform_admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for tenant_notes
CREATE POLICY "Platform admins can manage tenant notes"
  ON tenant_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_discounts_tenant ON tenant_discounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_discounts_code ON tenant_discounts(discount_code_id);

-- Function to validate and apply discount code
CREATE OR REPLACE FUNCTION validate_discount_code(
  p_code text,
  p_plan_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount discount_codes%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Find the discount code
  SELECT * INTO v_discount
  FROM discount_codes
  WHERE code = p_code
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until > now())
    AND (usage_limit IS NULL OR times_used < usage_limit);

  -- Check if code exists and is valid
  IF v_discount.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired discount code'
    );
  END IF;

  -- Check if code applies to the plan
  IF v_discount.applies_to_plans IS NOT NULL AND p_plan_id IS NOT NULL THEN
    IF NOT (v_discount.applies_to_plans @> jsonb_build_array(p_plan_id::text)) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'Discount code not valid for this plan'
      );
    END IF;
  END IF;

  -- Return discount details
  RETURN jsonb_build_object(
    'valid', true,
    'discount_id', v_discount.id,
    'discount_type', v_discount.discount_type,
    'discount_value', v_discount.discount_value,
    'recurring_months', v_discount.recurring_months,
    'stripe_coupon_id', v_discount.stripe_coupon_id
  );
END;
$$;

-- Function to apply discount to subscription
CREATE OR REPLACE FUNCTION apply_discount_to_subscription(
  p_tenant_id uuid,
  p_subscription_id uuid,
  p_discount_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount_validation jsonb;
  v_discount_id uuid;
  v_discount_amount integer;
BEGIN
  -- Validate discount code
  v_discount_validation := validate_discount_code(p_discount_code);
  
  IF (v_discount_validation->>'valid')::boolean = false THEN
    RETURN v_discount_validation;
  END IF;

  v_discount_id := (v_discount_validation->>'discount_id')::uuid;

  -- Update subscription with discount
  UPDATE tenant_subscriptions
  SET applied_discount_code_id = v_discount_id
  WHERE id = p_subscription_id;

  -- Increment usage count
  UPDATE discount_codes
  SET times_used = times_used + 1,
      updated_at = now()
  WHERE id = v_discount_id;

  -- Record the discount application
  INSERT INTO tenant_discounts (tenant_id, discount_code_id, subscription_id)
  VALUES (p_tenant_id, v_discount_id, p_subscription_id);

  RETURN jsonb_build_object(
    'success', true,
    'discount_applied', v_discount_validation
  );
END;
$$;
