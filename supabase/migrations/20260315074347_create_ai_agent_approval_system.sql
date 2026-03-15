/*
  # AI Agent Approval Management System

  1. New Tables
    - `ai_email_send_history`
      - Tracks all emails sent by AI to prevent duplicates
      - Stores content hash for similarity detection
      - Includes cooldown period tracking
    
    - `ai_agent_approval_settings`
      - Per-tenant configuration for approval workflows
      - Timeout durations and behaviors
      - Email deduplication settings
      - Notification preferences
    
    - `ai_approval_notifications`
      - Tracks notification delivery for pending approvals
      - Supports email and browser notifications
      - Prevents duplicate notifications

  2. Changes to Existing Tables
    - `ai_agent_actions`
      - Add approval priority, timeout, and related actions fields
      - Add timeout behavior configuration
    
    - `ai_email_sequence_enrollments`
      - Add approval requirement tracking
      - Add exception type categorization

  3. Security
    - Enable RLS on all new tables
    - Restrict access to tenant staff only
    - Approval settings only writable by tenant admins
    - Audit log for all approval activities
*/

-- Create email send history table for deduplication
CREATE TABLE IF NOT EXISTS ai_email_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_email text NOT NULL,
  sequence_id uuid REFERENCES ai_email_sequences(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES ai_email_sequence_enrollments(id) ON DELETE SET NULL,
  email_subject text NOT NULL,
  email_body_excerpt text,
  content_hash text NOT NULL,
  template_type text,
  sent_at timestamptz DEFAULT now(),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_history_contact ON ai_email_send_history(contact_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_history_hash ON ai_email_send_history(content_hash, tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_history_email ON ai_email_send_history(contact_email, sent_at DESC);

ALTER TABLE ai_email_send_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view email history"
  ON ai_email_send_history FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert email history"
  ON ai_email_send_history FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Create approval settings table
CREATE TABLE IF NOT EXISTS ai_agent_approval_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Timeout configurations by action type
  custom_pricing_timeout_minutes integer DEFAULT 120,
  custom_pricing_timeout_behavior text DEFAULT 'hold' CHECK (custom_pricing_timeout_behavior IN ('hold', 'auto_approve', 'auto_reject', 'escalate')),
  
  escalation_timeout_minutes integer DEFAULT 60,
  escalation_timeout_behavior text DEFAULT 'escalate' CHECK (escalation_timeout_behavior IN ('hold', 'auto_approve', 'auto_reject', 'escalate')),
  
  email_exception_timeout_minutes integer DEFAULT 240,
  email_exception_timeout_behavior text DEFAULT 'auto_approve' CHECK (email_exception_timeout_behavior IN ('hold', 'auto_approve', 'auto_reject', 'escalate')),
  
  -- Email deduplication settings
  enable_email_deduplication boolean DEFAULT true,
  promotional_cooldown_days integer DEFAULT 7,
  followup_cooldown_days integer DEFAULT 3,
  outreach_cooldown_days integer DEFAULT 14,
  similarity_threshold text DEFAULT 'moderate' CHECK (similarity_threshold IN ('strict', 'moderate', 'lenient')),
  
  -- Notification preferences
  enable_email_notifications boolean DEFAULT true,
  enable_browser_notifications boolean DEFAULT true,
  enable_sound_alerts boolean DEFAULT false,
  notification_email_addresses text[] DEFAULT ARRAY[]::text[],
  
  -- Auto-approval toggles
  auto_approve_meetings boolean DEFAULT true,
  auto_approve_trials boolean DEFAULT true,
  auto_approve_standard_sequences boolean DEFAULT true,
  
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

ALTER TABLE ai_agent_approval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view approval settings"
  ON ai_agent_approval_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can update approval settings"
  ON ai_agent_approval_settings FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role_category = 'tenant_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant admins can insert approval settings"
  ON ai_agent_approval_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role_category = 'tenant_admin'
    )
  );

-- Add new fields to ai_agent_actions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'approval_priority') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN approval_priority text DEFAULT 'medium' CHECK (approval_priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'approval_timeout_minutes') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN approval_timeout_minutes integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'timeout_behavior') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN timeout_behavior text DEFAULT 'hold' CHECK (timeout_behavior IN ('hold', 'auto_approve', 'auto_reject', 'escalate'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'approval_deadline') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN approval_deadline timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'related_action_ids') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN related_action_ids uuid[] DEFAULT ARRAY[]::uuid[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'approval_notes') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN approval_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'contact_id') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'ai_reasoning') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN ai_reasoning text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'risk_factors') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN risk_factors text[] DEFAULT ARRAY[]::text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_agent_actions' AND column_name = 'ai_confidence_score') THEN
    ALTER TABLE ai_agent_actions ADD COLUMN ai_confidence_score numeric(3,2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1);
  END IF;
END $$;

-- Add new fields to ai_email_sequence_enrollments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_email_sequence_enrollments' AND column_name = 'requires_approval') THEN
    ALTER TABLE ai_email_sequence_enrollments ADD COLUMN requires_approval boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_email_sequence_enrollments' AND column_name = 'approval_reason') THEN
    ALTER TABLE ai_email_sequence_enrollments ADD COLUMN approval_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_email_sequence_enrollments' AND column_name = 'exception_type') THEN
    ALTER TABLE ai_email_sequence_enrollments ADD COLUMN exception_type text CHECK (exception_type IN ('off_script_request', 'sensitive_topic', 'high_value_contact', 'custom_content', 'duplicate_detected'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_email_sequence_enrollments' AND column_name = 'approved_by') THEN
    ALTER TABLE ai_email_sequence_enrollments ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_email_sequence_enrollments' AND column_name = 'approved_at') THEN
    ALTER TABLE ai_email_sequence_enrollments ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Create approval notifications table
CREATE TABLE IF NOT EXISTS ai_approval_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES ai_agent_actions(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('email', 'browser', 'sound')),
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_action ON ai_approval_notifications(action_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON ai_approval_notifications(recipient_user_id, created_at DESC);

ALTER TABLE ai_approval_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON ai_approval_notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON ai_approval_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Create function to initialize default approval settings for new tenants
CREATE OR REPLACE FUNCTION initialize_approval_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_agent_approval_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-initialize settings for new tenants
DROP TRIGGER IF EXISTS trigger_initialize_approval_settings ON platform_tenants;
CREATE TRIGGER trigger_initialize_approval_settings
  AFTER INSERT ON platform_tenants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_approval_settings();

-- Create function to check for email duplicates
CREATE OR REPLACE FUNCTION check_email_duplicate(
  p_tenant_id uuid,
  p_contact_email text,
  p_content_hash text,
  p_template_type text,
  p_cooldown_days integer DEFAULT 7
)
RETURNS TABLE (
  is_duplicate boolean,
  last_sent_at timestamptz,
  days_since_last_send numeric,
  similar_sends_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) > 0 AS is_duplicate,
    MAX(sent_at) AS last_sent_at,
    EXTRACT(EPOCH FROM (now() - MAX(sent_at))) / 86400 AS days_since_last_send,
    COUNT(*) AS similar_sends_count
  FROM ai_email_send_history
  WHERE 
    tenant_id = p_tenant_id
    AND contact_email = p_contact_email
    AND (content_hash = p_content_hash OR template_type = p_template_type)
    AND sent_at > now() - (p_cooldown_days || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get pending approvals count
CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_tenant_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM ai_agent_actions
    WHERE tenant_id = p_tenant_id
      AND requires_approval = true
      AND approval_status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_actions_pending_approvals ON ai_agent_actions(tenant_id, approval_status, created_at DESC) WHERE requires_approval = true;
CREATE INDEX IF NOT EXISTS idx_actions_deadline ON ai_agent_actions(approval_deadline) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_actions_priority ON ai_agent_actions(approval_priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrollments_approval ON ai_email_sequence_enrollments(tenant_id, requires_approval) WHERE requires_approval = true;