/*
  # Campaign and Journey Management System

  1. New Tables
    - `ai_sales_campaigns`
      - Multi-channel outreach campaign definitions
      - Target audience and goals
      - Performance tracking
      
    - `ai_journey_templates`
      - Predefined sales cycle workflows
      - Stage definitions and transition rules
      - Customizable per industry or product
      
    - `ai_journey_instances`
      - Tracks each lead's progress through journey
      - Stage timing and completion metrics
      - Decision points and branching logic
      
    - `ai_touchpoint_schedule`
      - Manages timing of outreach attempts
      - Multi-channel coordination
      - Prevents over-communication
      
    - `ai_campaign_performance`
      - Aggregated campaign metrics
      - A/B test results
      - ROI tracking

  2. Security
    - Enable RLS on all tables
    - Only tenant staff can manage campaigns
    - Complete audit trail
    - Secure customer journey data

  3. Features
    - Multi-step campaign orchestration
    - Customer journey mapping
    - Intelligent scheduling
    - Performance analytics
    - A/B testing framework
*/

-- AI Sales Campaigns
CREATE TABLE IF NOT EXISTS ai_sales_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Campaign details
  campaign_name text NOT NULL,
  description text,
  campaign_type text NOT NULL CHECK (campaign_type IN ('cold_outreach', 'demo_follow_up', 'trial_nurture', 'onboarding', 're_engagement', 'renewal', 'upsell')),
  
  -- Target audience
  target_criteria jsonb DEFAULT '{}'::jsonb,
  target_industry text[] DEFAULT ARRAY[]::text[],
  target_company_size text[] DEFAULT ARRAY[]::text[],
  target_job_titles text[] DEFAULT ARRAY[]::text[],
  
  -- Campaign strategy
  primary_channel text DEFAULT 'email' CHECK (primary_channel IN ('email', 'phone', 'sms', 'linkedin', 'multi_channel')),
  max_touchpoints int DEFAULT 7,
  touchpoint_spacing_days int[] DEFAULT ARRAY[1, 3, 7, 14],
  
  -- Journey assignment
  journey_template_id uuid,
  
  -- Goals
  goal_type text CHECK (goal_type IN ('demos', 'trials', 'meetings', 'replies', 'conversions')),
  goal_target int,
  
  -- Performance metrics
  leads_enrolled int DEFAULT 0,
  leads_contacted int DEFAULT 0,
  leads_engaged int DEFAULT 0,
  leads_qualified int DEFAULT 0,
  leads_converted int DEFAULT 0,
  
  -- Engagement metrics
  emails_sent int DEFAULT 0,
  emails_opened int DEFAULT 0,
  emails_clicked int DEFAULT 0,
  emails_replied int DEFAULT 0,
  calls_made int DEFAULT 0,
  calls_connected int DEFAULT 0,
  meetings_booked int DEFAULT 0,
  
  -- Conversion metrics
  conversion_rate decimal(5,2) DEFAULT 0,
  avg_time_to_conversion_days decimal(8,2),
  pipeline_value_usd decimal(15,2) DEFAULT 0,
  revenue_generated_usd decimal(15,2) DEFAULT 0,
  
  -- Cost tracking
  total_cost_usd decimal(10,2) DEFAULT 0,
  cost_per_lead_usd decimal(10,4),
  cost_per_conversion_usd decimal(10,4),
  roi_percentage decimal(10,2),
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  
  -- Timing
  start_date date,
  end_date date,
  
  -- Settings
  enable_ai_optimization boolean DEFAULT true,
  enable_ab_testing boolean DEFAULT false,
  auto_pause_on_low_performance boolean DEFAULT false,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, campaign_name)
);

-- AI Journey Templates
CREATE TABLE IF NOT EXISTS ai_journey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Template details
  template_name text NOT NULL,
  description text,
  template_type text NOT NULL CHECK (template_type IN ('sales_cycle', 'onboarding', 'nurture', 'retention', 'custom')),
  
  -- Target use case
  industry text,
  product_type text,
  avg_deal_size_usd decimal(15,2),
  avg_sales_cycle_days int,
  
  -- Journey stages (ordered array of stages)
  stages jsonb NOT NULL,
  stage_count int NOT NULL,
  
  -- Transition rules
  transition_rules jsonb DEFAULT '{}'::jsonb,
  
  -- Stage definitions with actions
  stage_definitions jsonb NOT NULL,
  
  -- Success criteria
  success_metrics jsonb DEFAULT '{}'::jsonb,
  exit_criteria jsonb DEFAULT '{}'::jsonb,
  
  -- Performance
  instances_created int DEFAULT 0,
  instances_completed int DEFAULT 0,
  avg_completion_time_days decimal(8,2),
  completion_rate decimal(5,2) DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  version int DEFAULT 1,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, template_name, version)
);

-- AI Journey Instances
CREATE TABLE IF NOT EXISTS ai_journey_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Journey assignment
  journey_template_id uuid NOT NULL REFERENCES ai_journey_templates(id) ON DELETE RESTRICT,
  lead_queue_id uuid NOT NULL REFERENCES ai_lead_queue(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES ai_sales_campaigns(id),
  
  -- Contact info (denormalized for performance)
  contact_id uuid,
  contact_email text NOT NULL,
  contact_name text,
  
  -- Current state
  current_stage text NOT NULL,
  current_stage_index int DEFAULT 0,
  total_stages int NOT NULL,
  
  -- Progress tracking
  stages_completed int DEFAULT 0,
  completion_percentage decimal(5,2) DEFAULT 0,
  
  -- Stage timing
  stage_entered_at timestamptz DEFAULT now(),
  stage_duration_hours decimal(10,2),
  
  -- Overall timing
  journey_started_at timestamptz DEFAULT now(),
  journey_completed_at timestamptz,
  total_journey_duration_days decimal(8,2),
  
  -- Actions taken
  total_touchpoints int DEFAULT 0,
  emails_sent int DEFAULT 0,
  calls_made int DEFAULT 0,
  meetings_held int DEFAULT 0,
  
  -- Engagement
  engagement_score int DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  last_engagement_at timestamptz,
  days_since_last_engagement int,
  
  -- Decision tracking
  decision_points_encountered int DEFAULT 0,
  paths_taken jsonb DEFAULT '[]'::jsonb,
  
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused', 'escalated')),
  
  -- Outcome
  outcome text CHECK (outcome IN ('converted', 'disqualified', 'no_response', 'lost_to_competitor', 'timing_not_right', 'escalated')),
  outcome_notes text,
  outcome_recorded_at timestamptz,
  
  -- Next action
  next_action_stage text,
  next_action_type text,
  next_action_due_at timestamptz,
  
  -- Metadata
  custom_data jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(lead_queue_id, journey_template_id)
);

-- AI Touchpoint Schedule
CREATE TABLE IF NOT EXISTS ai_touchpoint_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Lead and campaign reference
  lead_queue_id uuid NOT NULL REFERENCES ai_lead_queue(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES ai_sales_campaigns(id),
  journey_instance_id uuid REFERENCES ai_journey_instances(id),
  sequence_id uuid REFERENCES ai_email_sequences(id),
  
  -- Touchpoint details
  touchpoint_number int NOT NULL,
  touchpoint_type text NOT NULL CHECK (touchpoint_type IN ('email', 'call', 'sms', 'linkedin', 'wait', 'task', 'demo', 'review')),
  
  -- Scheduling
  scheduled_for timestamptz NOT NULL,
  scheduled_timezone text DEFAULT 'America/New_York',
  optimal_send_time time,
  
  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'completed', 'failed', 'cancelled', 'skipped')),
  
  -- Execution
  executed_at timestamptz,
  execution_duration_seconds int,
  
  -- Content
  content_template_id text,
  content_subject text,
  content_body text,
  personalization_applied jsonb DEFAULT '{}'::jsonb,
  
  -- Channel-specific data
  email_message_id text,
  call_sid text,
  sms_sid text,
  
  -- Engagement tracking
  was_opened boolean DEFAULT false,
  opened_at timestamptz,
  was_clicked boolean DEFAULT false,
  clicked_at timestamptz,
  was_replied boolean DEFAULT false,
  replied_at timestamptz,
  
  -- Call-specific
  call_answered boolean DEFAULT false,
  call_duration_seconds int,
  voicemail_left boolean DEFAULT false,
  
  -- Result
  result text CHECK (result IN ('success', 'bounced', 'no_answer', 'response_received', 'error', 'opted_out')),
  result_message text,
  
  -- Next action determination
  triggered_next_action boolean DEFAULT false,
  next_touchpoint_id uuid REFERENCES ai_touchpoint_schedule(id),
  
  -- Cost tracking
  cost_usd decimal(10,4),
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Campaign Performance (aggregated metrics)
CREATE TABLE IF NOT EXISTS ai_campaign_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ai_sales_campaigns(id) ON DELETE CASCADE,
  
  -- Time period
  period_date date NOT NULL,
  period_type text CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  
  -- Lead metrics
  leads_enrolled int DEFAULT 0,
  leads_active int DEFAULT 0,
  leads_contacted int DEFAULT 0,
  leads_engaged int DEFAULT 0,
  leads_qualified int DEFAULT 0,
  leads_converted int DEFAULT 0,
  leads_lost int DEFAULT 0,
  
  -- Touchpoint metrics
  touchpoints_scheduled int DEFAULT 0,
  touchpoints_sent int DEFAULT 0,
  touchpoints_delivered int DEFAULT 0,
  touchpoints_failed int DEFAULT 0,
  
  -- Email metrics
  emails_sent int DEFAULT 0,
  emails_delivered int DEFAULT 0,
  emails_opened int DEFAULT 0,
  emails_clicked int DEFAULT 0,
  emails_replied int DEFAULT 0,
  emails_bounced int DEFAULT 0,
  email_open_rate decimal(5,2),
  email_click_rate decimal(5,2),
  email_reply_rate decimal(5,2),
  
  -- Call metrics
  calls_attempted int DEFAULT 0,
  calls_connected int DEFAULT 0,
  calls_voicemail int DEFAULT 0,
  call_connection_rate decimal(5,2),
  avg_call_duration_seconds int,
  
  -- Meeting metrics
  meetings_requested int DEFAULT 0,
  meetings_scheduled int DEFAULT 0,
  meetings_completed int DEFAULT 0,
  meeting_no_shows int DEFAULT 0,
  meeting_completion_rate decimal(5,2),
  
  -- Conversion metrics
  demos_completed int DEFAULT 0,
  trials_started int DEFAULT 0,
  opportunities_created int DEFAULT 0,
  deals_closed int DEFAULT 0,
  
  -- Conversion rates
  contact_to_engagement_rate decimal(5,2),
  engagement_to_qualified_rate decimal(5,2),
  qualified_to_conversion_rate decimal(5,2),
  overall_conversion_rate decimal(5,2),
  
  -- Timing metrics
  avg_first_response_time_hours decimal(10,2),
  avg_time_to_qualified_days decimal(8,2),
  avg_time_to_conversion_days decimal(8,2),
  
  -- Financial metrics
  pipeline_value_usd decimal(15,2) DEFAULT 0,
  revenue_generated_usd decimal(15,2) DEFAULT 0,
  total_costs_usd decimal(10,2) DEFAULT 0,
  cost_per_lead_usd decimal(10,4),
  cost_per_qualified_lead_usd decimal(10,4),
  cost_per_conversion_usd decimal(10,4),
  roi_percentage decimal(10,2),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, campaign_id, period_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_sales_campaigns_tenant ON ai_sales_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_sales_campaigns_status ON ai_sales_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ai_sales_campaigns_type ON ai_sales_campaigns(campaign_type);

CREATE INDEX IF NOT EXISTS idx_ai_journey_templates_tenant ON ai_journey_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_journey_templates_type ON ai_journey_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_ai_journey_templates_active ON ai_journey_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_journey_instances_tenant ON ai_journey_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_journey_instances_lead ON ai_journey_instances(lead_queue_id);
CREATE INDEX IF NOT EXISTS idx_ai_journey_instances_template ON ai_journey_instances(journey_template_id);
CREATE INDEX IF NOT EXISTS idx_ai_journey_instances_status ON ai_journey_instances(status);
CREATE INDEX IF NOT EXISTS idx_ai_journey_instances_stage ON ai_journey_instances(current_stage);
CREATE INDEX IF NOT EXISTS idx_ai_journey_instances_next_action ON ai_journey_instances(next_action_due_at) WHERE next_action_due_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_touchpoint_schedule_lead ON ai_touchpoint_schedule(lead_queue_id);
CREATE INDEX IF NOT EXISTS idx_ai_touchpoint_schedule_campaign ON ai_touchpoint_schedule(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_touchpoint_schedule_status ON ai_touchpoint_schedule(status);
CREATE INDEX IF NOT EXISTS idx_ai_touchpoint_schedule_scheduled ON ai_touchpoint_schedule(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_ai_touchpoint_schedule_type ON ai_touchpoint_schedule(touchpoint_type);

CREATE INDEX IF NOT EXISTS idx_ai_campaign_performance_campaign ON ai_campaign_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_campaign_performance_date ON ai_campaign_performance(period_date DESC);

-- Enable Row Level Security
ALTER TABLE ai_sales_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_journey_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_touchpoint_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_campaign_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_sales_campaigns
CREATE POLICY "Tenant staff can view campaigns"
  ON ai_sales_campaigns FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage campaigns"
  ON ai_sales_campaigns FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_journey_templates
CREATE POLICY "Tenant staff can view journey templates"
  ON ai_journey_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage journey templates"
  ON ai_journey_templates FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_journey_instances
CREATE POLICY "Tenant staff can view journey instances"
  ON ai_journey_instances FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage journey instances"
  ON ai_journey_instances FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_touchpoint_schedule
CREATE POLICY "Tenant staff can view touchpoint schedule"
  ON ai_touchpoint_schedule FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage touchpoint schedule"
  ON ai_touchpoint_schedule FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_campaign_performance
CREATE POLICY "Tenant staff can view campaign performance"
  ON ai_campaign_performance FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage campaign performance"
  ON ai_campaign_performance FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );