/*
  # Multi-Tenant Staff System and Newsletters

  ## Overview
  This migration adds multi-tenancy support to staff tables and creates a comprehensive
  newsletter system for tenant managers to communicate with their clients.

  ## Changes

  ### 1. Multi-Tenancy for Staff Tables
    - Add `tenant_id` to all staff-related tables
    - Update RLS policies to enforce tenant isolation
    - Expand staff roles to include: trader, bookkeeper, tax_specialist

  ### 2. Newsletter System
    - `newsletters`: Create and manage newsletters
    - `newsletter_recipients`: Track who receives each newsletter
    - `newsletter_analytics`: Track opens, clicks, and engagement

  ### 3. Enhanced Permissions
    - Add approval permissions for redemptions
    - Add client invitation permissions
    - Add newsletter creation permissions

  ## Security
    - All tables have RLS enabled
    - Tenant isolation enforced at database level
    - Only active staff can perform actions
*/

-- 1. ADD TENANT_ID TO STAFF TABLES

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_accounts' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE staff_accounts ADD COLUMN tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_staff_accounts_tenant_id ON staff_accounts(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_permissions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE staff_permissions ADD COLUMN tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_staff_permissions_tenant_id ON staff_permissions(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_audit_log' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE staff_audit_log ADD COLUMN tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_staff_audit_log_tenant_id ON staff_audit_log(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_campaigns' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id ON email_campaigns(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
  END IF;
END $$;

-- 2. EXPAND STAFF ROLES

DO $$
BEGIN
  ALTER TABLE staff_accounts DROP CONSTRAINT IF EXISTS staff_accounts_role_check;
  
  ALTER TABLE staff_accounts ADD CONSTRAINT staff_accounts_role_check 
    CHECK (role IN (
      'general_manager',
      'compliance_manager',
      'accountant',
      'cfo',
      'legal_counsel',
      'admin',
      'trader',
      'bookkeeper',
      'tax_specialist',
      'operations'
    ));
END $$;

-- 3. CREATE NEWSLETTERS TABLE

CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  summary text,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'cancelled'
  )),
  
  -- Targeting
  target_audience text DEFAULT 'all_clients' CHECK (target_audience IN (
    'all_clients',
    'specific_funds',
    'specific_share_classes',
    'custom_list'
  )),
  target_fund_ids uuid[],
  target_share_class_ids uuid[],
  target_client_ids uuid[],
  
  -- Scheduling
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  
  -- Analytics
  total_recipients integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  bounced_count integer DEFAULT 0,
  unsubscribed_count integer DEFAULT 0,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Attachments
  attachments jsonb DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS newsletter_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  email text NOT NULL,
  
  -- Delivery status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'unsubscribed'
  )),
  
  -- Tracking
  sent_at timestamptz,
  delivered_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  
  -- Links clicked
  links_clicked text[] DEFAULT ARRAY[]::text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Time-based metrics
  date date NOT NULL,
  hour integer,
  
  -- Engagement metrics
  opens integer DEFAULT 0,
  unique_opens integer DEFAULT 0,
  clicks integer DEFAULT 0,
  unique_clicks integer DEFAULT 0,
  bounces integer DEFAULT 0,
  unsubscribes integer DEFAULT 0,
  
  -- Link analytics
  link_url text,
  link_clicks integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(newsletter_id, date, hour, link_url)
);

-- 4. ENHANCE STAFF PERMISSIONS TABLE

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_permissions' AND column_name = 'can_approve_redemptions'
  ) THEN
    ALTER TABLE staff_permissions ADD COLUMN can_approve_redemptions boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_permissions' AND column_name = 'can_invite_clients'
  ) THEN
    ALTER TABLE staff_permissions ADD COLUMN can_invite_clients boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_permissions' AND column_name = 'can_create_newsletters'
  ) THEN
    ALTER TABLE staff_permissions ADD COLUMN can_create_newsletters boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_permissions' AND column_name = 'can_view_performance'
  ) THEN
    ALTER TABLE staff_permissions ADD COLUMN can_view_performance boolean DEFAULT false;
  END IF;
END $$;

-- 5. INDEXES FOR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_newsletters_tenant_id ON newsletters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled_send_at ON newsletters(scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_newsletter_id ON newsletter_recipients(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_client_id ON newsletter_recipients(client_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_status ON newsletter_recipients(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_newsletter_id ON newsletter_analytics(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_date ON newsletter_analytics(date);

-- 6. ROW LEVEL SECURITY

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;

-- Drop old policies that don't have tenant isolation
DROP POLICY IF EXISTS "Staff can view their own account" ON staff_accounts;
DROP POLICY IF EXISTS "General managers can view all staff" ON staff_accounts;
DROP POLICY IF EXISTS "General managers can manage all staff" ON staff_accounts;
DROP POLICY IF EXISTS "Active staff can view CRM contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Active staff can manage CRM contacts" ON crm_contacts;

-- Create new tenant-aware policies for staff_accounts
CREATE POLICY "Staff can view their own account"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Tenant staff can view same-tenant staff"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "General managers can manage their tenant staff"
  ON staff_accounts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role = 'general_manager'
      AND sa.status = 'active'
    )
  );

-- Newsletter policies
CREATE POLICY "Tenant staff can view their newsletters"
  ON newsletters FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized staff can create newsletters"
  ON newsletters FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (sa.role IN ('general_manager', 'admin') OR sp.can_create_newsletters = true)
    )
  );

CREATE POLICY "Authorized staff can update newsletters"
  ON newsletters FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      LEFT JOIN staff_permissions sp ON sp.staff_id = sa.id
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND (sa.role IN ('general_manager', 'admin') OR sp.can_create_newsletters = true)
    )
  );

CREATE POLICY "Authorized staff can delete newsletters"
  ON newsletters FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'admin')
    )
  );

-- Newsletter recipients policies
CREATE POLICY "Tenant staff can view their newsletter recipients"
  ON newsletter_recipients FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage newsletter recipients"
  ON newsletter_recipients FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Newsletter analytics policies
CREATE POLICY "Tenant staff can view their newsletter analytics"
  ON newsletter_analytics FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage newsletter analytics"
  ON newsletter_analytics FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );
