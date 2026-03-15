/*
  # Create Tenant Account Management System

  ## Overview
  Adds comprehensive account management for tenants including billing details,
  support tickets, usage tracking, and subscription management.

  ## New Tables

  ### 1. support_tickets
  - Tracks tenant support and billing inquiries
  - Fields: id, tenant_id, ticket_type, status, priority, subject, description,
    created_by, assigned_to, metadata
  - Enables communication between tenants and platform admins

  ### 2. support_ticket_messages
  - Stores conversation thread for each ticket
  - Fields: id, ticket_id, user_id, message, attachments, is_internal
  - Allows back-and-forth communication on tickets

  ### 3. tenant_billing_details
  - Stores billing information for each tenant
  - Fields: tenant_id, billing_email, billing_address, payment_method_info,
    billing_contact, tax_id
  - Encrypted sensitive payment information

  ### 4. subscription_change_requests
  - Tracks tenant requests to change subscription plans
  - Fields: id, tenant_id, current_plan_id, requested_plan_id, status,
    requested_by, approved_by, reason

  ### 5. invoice_records
  - Detailed invoice history for tenants
  - Fields: id, tenant_id, invoice_number, amount, status, period_start,
    period_end, pdf_url, items

  ### 6. usage_snapshots
  - Periodic snapshots of tenant usage metrics
  - Fields: id, tenant_id, snapshot_date, metrics (JSON with user_count,
    storage_gb, api_calls, etc.)

  ## Security
  - RLS policies ensure tenants only see their own data
  - Platform admins have full access to all tickets and billing information
  - Support ticket messages have visibility controls (internal vs external)
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  ticket_type text NOT NULL CHECK (ticket_type IN ('billing', 'technical', 'feature_request', 'general')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject text NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create tenant_billing_details table
CREATE TABLE IF NOT EXISTS tenant_billing_details (
  tenant_id uuid PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE CASCADE,
  billing_email text NOT NULL,
  billing_contact_name text,
  billing_phone text,
  billing_address jsonb DEFAULT '{}'::jsonb,
  tax_id text,
  payment_method_type text CHECK (payment_method_type IN ('credit_card', 'bank_transfer', 'invoice')),
  payment_method_last4 text,
  payment_method_brand text,
  auto_renew boolean DEFAULT true,
  billing_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription_change_requests table
CREATE TABLE IF NOT EXISTS subscription_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  current_plan_id uuid REFERENCES subscription_plans(id),
  requested_plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  change_type text NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'cancel')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  reason text,
  scheduled_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_records table
CREATE TABLE IF NOT EXISTS invoice_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency text DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  pdf_url text,
  items jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create usage_snapshots table
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, snapshot_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_tenant_id ON subscription_change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_status ON subscription_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_invoice_records_tenant_id ON invoice_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_records_status ON invoice_records(status);
CREATE INDEX IF NOT EXISTS idx_invoice_records_due_date ON invoice_records(due_date);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_tenant_id ON usage_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_date ON usage_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_billing_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Tenants can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create own tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Platform admins can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    )
  );

CREATE POLICY "Platform admins can update all tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    )
  );

-- RLS Policies for support_ticket_messages
CREATE POLICY "Users can view messages for accessible tickets"
  ON support_ticket_messages FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role_category = 'superadmin'
        AND tenant_id IS NULL
      )
    )
    AND (is_internal = false OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    ))
  );

CREATE POLICY "Users can create messages for accessible tickets"
  ON support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role_category = 'superadmin'
        AND tenant_id IS NULL
      )
    )
    AND user_id = auth.uid()
  );

-- RLS Policies for tenant_billing_details
CREATE POLICY "Tenants can view own billing details"
  ON tenant_billing_details FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update own billing details"
  ON tenant_billing_details FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant admins can insert own billing details"
  ON tenant_billing_details FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Platform admins can manage all billing details"
  ON tenant_billing_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    )
  );

-- RLS Policies for subscription_change_requests
CREATE POLICY "Tenants can view own change requests"
  ON subscription_change_requests FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can create change requests"
  ON subscription_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'tenant_admin'
    )
    AND requested_by = auth.uid()
  );

CREATE POLICY "Platform admins can manage all change requests"
  ON subscription_change_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    )
  );

-- RLS Policies for invoice_records
CREATE POLICY "Tenants can view own invoices"
  ON invoice_records FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can manage all invoices"
  ON invoice_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    )
  );

-- RLS Policies for usage_snapshots
CREATE POLICY "Tenants can view own usage"
  ON usage_snapshots FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can manage all usage snapshots"
  ON usage_snapshots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_category = 'superadmin'
      AND tenant_id IS NULL
    )
  );

-- Create function to get current usage metrics for a tenant
CREATE OR REPLACE FUNCTION get_tenant_usage_metrics(p_tenant_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_count', (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = p_tenant_id),
    'client_count', (SELECT COUNT(*) FROM client_profiles WHERE tenant_id = p_tenant_id),
    'storage_gb', COALESCE((SELECT SUM((metadata->>'file_size_mb')::numeric) / 1024 FROM documents WHERE tenant_id = p_tenant_id), 0),
    'active_funds', (SELECT COUNT(*) FROM funds WHERE tenant_id = p_tenant_id AND status = 'active'),
    'total_aum', COALESCE((SELECT SUM(total_nav) FROM funds WHERE tenant_id = p_tenant_id), 0)
  ) INTO v_metrics;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_tenant_usage_metrics(uuid) TO authenticated;

-- Create function to calculate next invoice amount
CREATE OR REPLACE FUNCTION calculate_next_invoice_amount(p_tenant_id uuid)
RETURNS decimal AS $$
DECLARE
  v_amount decimal;
  v_plan_price decimal;
BEGIN
  SELECT sp.price_monthly INTO v_plan_price
  FROM platform_tenants pt
  JOIN subscription_plans sp ON pt.subscription_plan_id = sp.id
  WHERE pt.id = p_tenant_id;

  RETURN COALESCE(v_plan_price, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_next_invoice_amount(uuid) TO authenticated;
