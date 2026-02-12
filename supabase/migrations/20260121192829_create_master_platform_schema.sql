/*
  # Master Platform Database Schema
  
  Creates the core multi-tenant platform infrastructure for managing investment fund tenants.
  
  ## New Tables
  
  ### `platform_tenants`
  Stores each tenant (investment fund) on the platform
  - `id` (uuid, primary key)
  - `slug` (text, unique) - URL-friendly identifier for subdomain
  - `name` (text) - Display name of the investment fund
  - `status` (text) - active, suspended, trial, cancelled
  - `database_type` (text) - managed or byod (bring your own database)
  - `database_connection` (jsonb) - encrypted connection details for BYOD
  - `trial_ends_at` (timestamptz) - when trial period ends
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `subscription_plans`
  Defines available subscription tiers
  - `id` (uuid, primary key)
  - `name` (text) - Plan name
  - `price_monthly` (integer) - Base price in cents
  - `database_type` (text) - managed or byod
  - `user_limit` (integer) - Base user limit (null = unlimited)
  - `overage_price_per_user` (integer) - Price per additional user in cents
  - `features` (jsonb) - Feature flags and limits
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  
  ### `tenant_subscriptions`
  Tracks active subscriptions for each tenant
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `plan_id` (uuid, foreign key)
  - `status` (text) - active, past_due, cancelled
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `cancel_at_period_end` (boolean)
  - `created_at` (timestamptz)
  
  ### `billing_records`
  Tracks billing history and invoices
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `subscription_id` (uuid, foreign key)
  - `amount` (integer) - Amount in cents
  - `status` (text) - pending, paid, failed
  - `period_start` (timestamptz)
  - `period_end` (timestamptz)
  - `user_count` (integer) - Number of users in billing period
  - `overage_users` (integer) - Users beyond base limit
  - `invoice_data` (jsonb) - Full invoice details
  - `paid_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### `tenant_users`
  Maps platform admin users to tenants with roles
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `tenant_id` (uuid, foreign key)
  - `role` (text) - owner, admin, user
  - `created_at` (timestamptz)
  
  ### `tenant_domains`
  Manages custom domains for tenants
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `domain` (text, unique) - Custom domain
  - `is_verified` (boolean)
  - `verification_token` (text)
  - `ssl_status` (text) - pending, active, failed
  - `created_at` (timestamptz)
  - `verified_at` (timestamptz)
  
  ### `usage_metrics`
  Tracks usage for billing calculations
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `metric_type` (text) - users, storage, api_calls, etc.
  - `value` (integer)
  - `recorded_at` (timestamptz)
  - `metadata` (jsonb)
  
  ### `tenant_settings`
  Stores tenant configuration and branding
  - `tenant_id` (uuid, primary key, foreign key)
  - `branding` (jsonb) - logo, colors, etc.
  - `features` (jsonb) - enabled features
  - `notifications` (jsonb) - notification preferences
  - `integrations` (jsonb) - third-party integrations
  - `updated_at` (timestamptz)
  
  ### `platform_admin_users`
  Tracks platform administrators (super users)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `role` (text) - super_admin, support, billing
  - `permissions` (jsonb)
  - `created_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Platform admin users can manage all tenants
  - Tenant users can only access their own tenant data
  - Strict isolation between tenants
*/

-- Create enum types for status fields
DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE database_type AS ENUM ('managed', 'byod');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Platform Tenants Table
CREATE TABLE IF NOT EXISTS platform_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  status tenant_status DEFAULT 'trial',
  database_type database_type DEFAULT 'managed',
  database_connection jsonb,
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly integer NOT NULL,
  database_type database_type NOT NULL,
  user_limit integer,
  overage_price_per_user integer DEFAULT 0,
  features jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tenant Subscriptions Table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  status subscription_status DEFAULT 'active',
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Billing Records Table
CREATE TABLE IF NOT EXISTS billing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES tenant_subscriptions(id),
  amount integer NOT NULL,
  status billing_status DEFAULT 'pending',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  user_count integer DEFAULT 0,
  overage_users integer DEFAULT 0,
  invoice_data jsonb DEFAULT '{}',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tenant Users Table (maps auth.users to tenants)
CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Tenant Domains Table
CREATE TABLE IF NOT EXISTS tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  domain text UNIQUE NOT NULL,
  is_verified boolean DEFAULT false,
  verification_token text,
  ssl_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz
);

-- Usage Metrics Table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  value integer NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Tenant Settings Table
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE CASCADE,
  branding jsonb DEFAULT '{}',
  features jsonb DEFAULT '{}',
  notifications jsonb DEFAULT '{}',
  integrations jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Platform Admin Users Table
CREATE TABLE IF NOT EXISTS platform_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role text NOT NULL CHECK (role IN ('super_admin', 'support', 'billing')),
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_tenants_slug ON platform_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_platform_tenants_status ON platform_tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_records_tenant ON billing_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant ON usage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_recorded ON usage_metrics(recorded_at);

-- Enable RLS on all tables
ALTER TABLE platform_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Platform Admin Users

-- Platform admins can view all tenants
CREATE POLICY "Platform admins can view all tenants"
  ON platform_tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage tenants"
  ON platform_tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
      AND platform_admin_users.role = 'super_admin'
    )
  );

-- Tenant users can view their own tenant
CREATE POLICY "Tenant users can view own tenant"
  ON platform_tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
    )
  );

-- Subscription plans are viewable by all authenticated users
CREATE POLICY "Authenticated users can view plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Platform admins can manage plans
CREATE POLICY "Platform admins can manage plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
      AND platform_admin_users.role IN ('super_admin', 'billing')
    )
  );

-- Tenant subscriptions viewable by platform admins and tenant users
CREATE POLICY "Platform admins can view all subscriptions"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can view own subscriptions"
  ON tenant_subscriptions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
    )
  );

-- Platform admins can manage subscriptions
CREATE POLICY "Platform admins can manage subscriptions"
  ON tenant_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
      AND platform_admin_users.role IN ('super_admin', 'billing')
    )
  );

-- Billing records policies (similar pattern)
CREATE POLICY "Platform admins can view all billing"
  ON billing_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners can view own billing"
  ON billing_records FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'owner'
    )
  );

CREATE POLICY "Platform admins can manage billing"
  ON billing_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
      AND platform_admin_users.role IN ('super_admin', 'billing')
    )
  );

-- Tenant users policies
CREATE POLICY "Platform admins can view all tenant users"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own tenant associations"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can manage tenant users"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
    )
  );

-- Platform admins can manage all tenant users
CREATE POLICY "Platform admins can manage all tenant users"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
      AND platform_admin_users.role = 'super_admin'
    )
  );

-- Tenant domains policies
CREATE POLICY "Platform admins can manage all domains"
  ON tenant_domains FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage own domains"
  ON tenant_domains FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
    )
  );

-- Usage metrics policies
CREATE POLICY "Platform admins can view all metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can insert metrics"
  ON usage_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- Tenant settings policies
CREATE POLICY "Platform admins can view all settings"
  ON tenant_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can view own settings"
  ON tenant_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage own settings"
  ON tenant_settings FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('owner', 'admin')
    )
  );

-- Platform admin users policies
CREATE POLICY "Platform admins can view admin users"
  ON platform_admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage admin users"
  ON platform_admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
      AND platform_admin_users.role = 'super_admin'
    )
  );

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, database_type, user_limit, overage_price_per_user, features)
VALUES 
  (
    'Managed Database Plan',
    49900,
    'managed',
    10,
    2500,
    '{"support": "email", "backups": true, "custom_domain": true, "api_access": true}'
  ),
  (
    'BYOD Plan',
    39900,
    'byod',
    10,
    2500,
    '{"support": "email", "backups": false, "custom_domain": true, "api_access": true}'
  )
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_platform_tenants_updated_at
  BEFORE UPDATE ON platform_tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();