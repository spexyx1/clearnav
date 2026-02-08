/*
  # AI BDR Agent System

  1. New Tables
    - `ai_agent_configs`
      - Stores AI personality, tone, and behavior settings per tenant
      - Customizable guardrails and approval workflows
      
    - `ai_conversation_threads`
      - Tracks complete conversation history across all channels
      - Links to CRM contacts and opportunity tracking
      
    - `ai_agent_scripts`
      - Conversation flows with branching logic
      - Customizable for different industries and use cases
      
    - `ai_agent_training_data`
      - Successful conversation examples for model fine-tuning
      - Tracks performance metrics for continuous improvement
      
    - `ai_call_logs`
      - Voice call tracking with recordings and transcriptions
      - Sentiment analysis and outcome tracking
      
    - `ai_email_sequences`
      - Multi-step email campaigns with AI personalization
      - A/B testing and engagement tracking
      
    - `ai_meeting_bookings`
      - Calendar integration for demo scheduling
      - Automated follow-ups and reminders
      
    - `ai_trial_accounts`
      - Trial provisioning and engagement tracking
      - Conversion optimization and intervention triggers
      
    - `ai_agent_actions`
      - Audit log of all actions taken by AI agent
      - Approval workflow for sensitive actions
      
    - `ai_agent_performance`
      - Performance metrics and conversion analytics
      - Cost tracking and ROI calculation

  2. Security
    - Enable RLS on all tables
    - Only authorized staff can configure AI agents
    - Complete audit trail for compliance
    - Configurable approval workflows

  3. Features
    - Multi-channel support (voice, email, SMS, chat)
    - Customizable personality and tone
    - Dynamic conversation flows with branching logic
    - Real-time sentiment analysis
    - Predictive lead scoring
    - Automated trial provisioning
    - Human escalation triggers
*/

-- AI Agent Configurations
CREATE TABLE IF NOT EXISTS ai_agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Agent identity
  agent_name text NOT NULL DEFAULT 'Sales Assistant',
  agent_description text,
  
  -- Personality settings
  personality_type text DEFAULT 'professional' CHECK (personality_type IN ('professional', 'friendly', 'consultative', 'direct', 'empathetic', 'custom')),
  tone text DEFAULT 'neutral' CHECK (tone IN ('formal', 'neutral', 'casual', 'warm', 'confident', 'custom')),
  formality_level int DEFAULT 5 CHECK (formality_level BETWEEN 1 AND 10),
  enthusiasm_level int DEFAULT 5 CHECK (enthusiasm_level BETWEEN 1 AND 10),
  
  -- Voice settings (for phone calls)
  voice_provider text DEFAULT 'elevenlabs' CHECK (voice_provider IN ('elevenlabs', 'bland', 'vapi', 'google', 'aws')),
  voice_id text,
  voice_accent text DEFAULT 'american',
  voice_pace text DEFAULT 'medium' CHECK (voice_pace IN ('slow', 'medium', 'fast')),
  voice_pitch int DEFAULT 0 CHECK (voice_pitch BETWEEN -10 AND 10),
  
  -- Behavior settings
  max_conversation_turns int DEFAULT 15,
  auto_escalate_after_turns int DEFAULT 20,
  enable_small_talk boolean DEFAULT true,
  use_prospect_name boolean DEFAULT true,
  ask_qualification_questions boolean DEFAULT true,
  
  -- Guardrails and approval workflows
  require_approval_for_demos boolean DEFAULT false,
  require_approval_for_trials boolean DEFAULT false,
  require_approval_for_pricing boolean DEFAULT false,
  require_approval_amount_threshold decimal(10,2),
  auto_block_competitors boolean DEFAULT true,
  competitor_domains text[] DEFAULT ARRAY[]::text[],
  
  -- Operating hours
  operating_hours jsonb DEFAULT '{"timezone": "America/New_York", "schedule": {"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}}}'::jsonb,
  
  -- Channel enablement
  voice_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  chat_enabled boolean DEFAULT false,
  
  -- Performance tracking
  total_conversations int DEFAULT 0,
  total_conversions int DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0,
  avg_conversation_duration_seconds int DEFAULT 0,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- AI Conversation Threads
CREATE TABLE IF NOT EXISTS ai_conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid NOT NULL REFERENCES ai_agent_configs(id) ON DELETE CASCADE,
  
  -- Contact information
  contact_id uuid,
  contact_email text,
  contact_name text,
  contact_phone text,
  
  -- Thread details
  channel text NOT NULL CHECK (channel IN ('voice', 'email', 'sms', 'chat', 'web')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'escalated', 'abandoned', 'failed')),
  
  -- Conversation data
  messages jsonb DEFAULT '[]'::jsonb,
  message_count int DEFAULT 0,
  
  -- Call-specific data
  call_sid text,
  call_duration_seconds int,
  call_recording_url text,
  call_transcription text,
  
  -- Analysis
  sentiment_score decimal(3,2),
  sentiment_trend text CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),
  intent_detected text,
  qualification_score int CHECK (qualification_score BETWEEN 0 AND 100),
  
  -- Outcomes
  outcome text CHECK (outcome IN ('demo_booked', 'trial_started', 'qualified', 'disqualified', 'follow_up_needed', 'escalated', 'no_answer', 'voicemail')),
  outcome_notes text,
  demo_booking_id uuid,
  trial_account_id uuid,
  
  -- Timing
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  last_activity_at timestamptz DEFAULT now(),
  
  -- Escalation
  escalated_to_user_id uuid REFERENCES auth.users(id),
  escalated_at timestamptz,
  escalation_reason text,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- AI Agent Scripts
CREATE TABLE IF NOT EXISTS ai_agent_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Script details
  script_name text NOT NULL,
  description text,
  script_type text NOT NULL CHECK (script_type IN ('inbound_inquiry', 'outbound_cold', 'demo_booking', 'trial_follow_up', 'objection_handling', 'qualification', 'custom')),
  
  -- Target audience
  target_industry text,
  target_company_size text CHECK (target_company_size IN ('startup', 'smb', 'mid_market', 'enterprise', 'all')),
  
  -- Script flow (JSON structure with branching logic)
  flow_definition jsonb NOT NULL,
  
  -- Qualification criteria
  qualification_questions jsonb DEFAULT '[]'::jsonb,
  disqualification_criteria jsonb DEFAULT '[]'::jsonb,
  
  -- Objection handling
  common_objections jsonb DEFAULT '[]'::jsonb,
  
  -- Performance
  usage_count int DEFAULT 0,
  success_count int DEFAULT 0,
  success_rate decimal(5,2) DEFAULT 0,
  avg_conversation_length int DEFAULT 0,
  
  -- Version control
  version int DEFAULT 1,
  parent_script_id uuid REFERENCES ai_agent_scripts(id),
  is_active boolean DEFAULT true,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, script_name, version)
);

-- AI Agent Training Data
CREATE TABLE IF NOT EXISTS ai_agent_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Training example details
  example_type text NOT NULL CHECK (example_type IN ('successful_conversation', 'objection_handling', 'qualification', 'escalation_trigger', 'tone_example')),
  
  -- Context
  scenario_description text NOT NULL,
  prospect_context text,
  
  -- Conversation
  conversation_transcript text NOT NULL,
  ai_responses jsonb NOT NULL,
  
  -- Outcome
  outcome_achieved text,
  outcome_rating int CHECK (outcome_rating BETWEEN 1 AND 5),
  
  -- Metadata for training
  key_phrases text[] DEFAULT ARRAY[]::text[],
  tags text[] DEFAULT ARRAY[]::text[],
  use_for_training boolean DEFAULT true,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- AI Call Logs
CREATE TABLE IF NOT EXISTS ai_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id) ON DELETE CASCADE,
  
  -- Call details
  call_sid text UNIQUE NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Contact info
  from_number text NOT NULL,
  to_number text NOT NULL,
  contact_id uuid,
  contact_name text,
  
  -- Call status
  status text NOT NULL CHECK (status IN ('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'busy', 'no_answer', 'voicemail')),
  
  -- Call data
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  
  -- Recording and transcription
  recording_url text,
  recording_duration_seconds int,
  transcription text,
  transcription_status text CHECK (transcription_status IN ('pending', 'completed', 'failed')),
  
  -- AI analysis
  sentiment_score decimal(3,2),
  keywords_detected text[] DEFAULT ARRAY[]::text[],
  intent_detected text,
  objections_raised text[] DEFAULT ARRAY[]::text[],
  
  -- Outcome
  outcome text CHECK (outcome IN ('demo_booked', 'qualified', 'follow_up', 'not_interested', 'voicemail_left', 'no_answer')),
  outcome_notes text,
  
  -- Cost tracking
  call_cost_usd decimal(10,4),
  ai_cost_usd decimal(10,4),
  transcription_cost_usd decimal(10,4),
  total_cost_usd decimal(10,4),
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- AI Email Sequences
CREATE TABLE IF NOT EXISTS ai_email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Sequence details
  sequence_name text NOT NULL,
  description text,
  sequence_type text NOT NULL CHECK (sequence_type IN ('cold_outreach', 'demo_follow_up', 'trial_onboarding', 'nurture', 're_engagement')),
  
  -- Targeting
  target_audience jsonb DEFAULT '{}'::jsonb,
  
  -- Sequence steps
  steps jsonb NOT NULL,
  total_steps int NOT NULL,
  
  -- AI personalization settings
  use_ai_personalization boolean DEFAULT true,
  personalization_fields text[] DEFAULT ARRAY['name', 'company', 'industry']::text[],
  tone text DEFAULT 'professional',
  
  -- Timing
  delay_between_steps_hours int[] DEFAULT ARRAY[24, 48, 96, 168],
  optimal_send_times text[] DEFAULT ARRAY['09:00', '14:00'],
  
  -- A/B testing
  subject_line_variants text[] DEFAULT ARRAY[]::text[],
  body_variants jsonb DEFAULT '[]'::jsonb,
  
  -- Performance
  enrollments_count int DEFAULT 0,
  opened_count int DEFAULT 0,
  clicked_count int DEFAULT 0,
  replied_count int DEFAULT 0,
  conversion_count int DEFAULT 0,
  
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, sequence_name)
);

-- AI Email Sequence Enrollments
CREATE TABLE IF NOT EXISTS ai_email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES ai_email_sequences(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Contact details
  contact_id uuid,
  contact_email text NOT NULL,
  contact_name text,
  
  -- Enrollment status
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'unsubscribed', 'bounced')),
  current_step int DEFAULT 0,
  
  -- Engagement tracking
  emails_sent int DEFAULT 0,
  emails_opened int DEFAULT 0,
  emails_clicked int DEFAULT 0,
  has_replied boolean DEFAULT false,
  
  -- Personalization data
  personalization_data jsonb DEFAULT '{}'::jsonb,
  
  -- Timing
  enrolled_at timestamptz DEFAULT now(),
  next_email_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz,
  
  -- Outcome
  conversion_event text,
  converted_at timestamptz,
  
  metadata jsonb DEFAULT '{}'::jsonb
);

-- AI Meeting Bookings
CREATE TABLE IF NOT EXISTS ai_meeting_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id),
  
  -- Contact details
  contact_id uuid,
  contact_email text NOT NULL,
  contact_name text NOT NULL,
  contact_phone text,
  contact_company text,
  
  -- Meeting details
  meeting_type text DEFAULT 'demo' CHECK (meeting_type IN ('demo', 'discovery', 'consultation', 'follow_up')),
  meeting_title text NOT NULL,
  meeting_duration_minutes int DEFAULT 30,
  
  -- Scheduling
  scheduled_at timestamptz NOT NULL,
  timezone text DEFAULT 'America/New_York',
  
  -- Calendar integration
  calendar_provider text CHECK (calendar_provider IN ('google', 'outlook', 'calendly', 'cal_com')),
  calendar_event_id text,
  meeting_link text,
  
  -- Assignment
  assigned_to_user_id uuid REFERENCES auth.users(id),
  assigned_to_staff_id uuid REFERENCES staff_accounts(id),
  
  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'reminded', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  
  -- Reminders
  reminder_sent_24h boolean DEFAULT false,
  reminder_sent_1h boolean DEFAULT false,
  
  -- Outcome
  attended boolean,
  outcome_notes text,
  next_steps text,
  demo_completed boolean DEFAULT false,
  trial_started boolean DEFAULT false,
  
  -- Timestamps
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Trial Accounts
CREATE TABLE IF NOT EXISTS ai_trial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id),
  
  -- Contact details
  contact_id uuid,
  contact_email text NOT NULL,
  contact_name text NOT NULL,
  contact_company text,
  
  -- Trial details
  trial_type text DEFAULT 'free_trial' CHECK (trial_type IN ('free_trial', 'freemium', 'demo_account')),
  trial_length_days int DEFAULT 14,
  trial_started_at timestamptz DEFAULT now(),
  trial_ends_at timestamptz NOT NULL,
  
  -- Account provisioning
  account_provisioned boolean DEFAULT false,
  provisioned_at timestamptz,
  account_id text,
  login_credentials jsonb,
  
  -- Usage tracking
  login_count int DEFAULT 0,
  last_login_at timestamptz,
  features_used text[] DEFAULT ARRAY[]::text[],
  usage_score int DEFAULT 0 CHECK (usage_score BETWEEN 0 AND 100),
  
  -- Engagement tracking
  activation_achieved boolean DEFAULT false,
  activation_date timestamptz,
  key_actions_completed jsonb DEFAULT '[]'::jsonb,
  
  -- Intervention triggers
  low_engagement_alert boolean DEFAULT false,
  intervention_sent boolean DEFAULT false,
  intervention_type text CHECK (intervention_type IN ('onboarding_help', 'feature_tour', 'consultation_offer', 'trial_extension')),
  
  -- Conversion
  status text DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled', 'extended')),
  converted_at timestamptz,
  conversion_plan text,
  conversion_amount decimal(10,2),
  
  -- Extension
  extended boolean DEFAULT false,
  extension_days int,
  extended_at timestamptz,
  extension_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Agent Actions (Audit Log)
CREATE TABLE IF NOT EXISTS ai_agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id),
  
  -- Action details
  action_type text NOT NULL CHECK (action_type IN (
    'demo_booked', 'trial_started', 'email_sent', 'call_made', 
    'contact_created', 'contact_updated', 'opportunity_created',
    'price_quoted', 'document_sent', 'escalation_requested'
  )),
  action_description text NOT NULL,
  
  -- Approval workflow
  requires_approval boolean DEFAULT false,
  approval_status text CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  
  -- Action data
  action_data jsonb DEFAULT '{}'::jsonb,
  
  -- Result
  action_result text CHECK (action_result IN ('success', 'failed', 'pending', 'cancelled')),
  error_message text,
  
  -- Cost tracking
  action_cost_usd decimal(10,4),
  
  created_at timestamptz DEFAULT now()
);

-- AI Agent Performance Metrics
CREATE TABLE IF NOT EXISTS ai_agent_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid NOT NULL REFERENCES ai_agent_configs(id) ON DELETE CASCADE,
  
  -- Time period
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  
  -- Activity metrics
  total_conversations int DEFAULT 0,
  inbound_conversations int DEFAULT 0,
  outbound_conversations int DEFAULT 0,
  avg_conversation_length_seconds int DEFAULT 0,
  
  -- Outcome metrics
  demos_booked int DEFAULT 0,
  trials_started int DEFAULT 0,
  qualified_leads int DEFAULT 0,
  disqualified_leads int DEFAULT 0,
  escalations int DEFAULT 0,
  
  -- Engagement metrics
  avg_sentiment_score decimal(3,2),
  positive_sentiment_pct decimal(5,2),
  objections_handled int DEFAULT 0,
  
  -- Conversion metrics
  conversation_to_demo_rate decimal(5,2),
  conversation_to_trial_rate decimal(5,2),
  trial_to_paid_rate decimal(5,2),
  
  -- Cost metrics
  total_call_costs_usd decimal(10,2) DEFAULT 0,
  total_ai_costs_usd decimal(10,2) DEFAULT 0,
  total_email_costs_usd decimal(10,2) DEFAULT 0,
  cost_per_conversation_usd decimal(10,4),
  cost_per_conversion_usd decimal(10,4),
  
  -- ROI metrics
  pipeline_value_generated_usd decimal(15,2) DEFAULT 0,
  revenue_generated_usd decimal(15,2) DEFAULT 0,
  roi_percentage decimal(10,2),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, agent_config_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_agent_configs_tenant ON ai_agent_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_tenant ON ai_conversation_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_contact ON ai_conversation_threads(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_status ON ai_conversation_threads(status);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_started ON ai_conversation_threads(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_scripts_tenant ON ai_agent_scripts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_scripts_type ON ai_agent_scripts(script_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_tenant ON ai_agent_training_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_tenant ON ai_call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_contact ON ai_call_logs(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_call_logs_started ON ai_call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_email_sequences_tenant ON ai_email_sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_enrollments_sequence ON ai_email_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_enrollments_contact ON ai_email_sequence_enrollments(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_meeting_bookings_tenant ON ai_meeting_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_bookings_scheduled ON ai_meeting_bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_bookings_status ON ai_meeting_bookings(status);
CREATE INDEX IF NOT EXISTS idx_ai_trial_accounts_tenant ON ai_trial_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_trial_accounts_contact ON ai_trial_accounts(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_trial_accounts_status ON ai_trial_accounts(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_tenant ON ai_agent_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_approval ON ai_agent_actions(approval_status) WHERE requires_approval = true;
CREATE INDEX IF NOT EXISTS idx_ai_agent_performance_tenant ON ai_agent_performance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_performance_period ON ai_agent_performance(period_start, period_end);

-- Enable Row Level Security
ALTER TABLE ai_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_meeting_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_trial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_agent_configs
CREATE POLICY "Tenant admins can view AI agent configs"
  ON ai_agent_configs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can manage AI agent configs"
  ON ai_agent_configs FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role IN ('admin', 'general_manager')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_conversation_threads
CREATE POLICY "Tenant staff can view conversation threads"
  ON ai_conversation_threads FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage conversation threads"
  ON ai_conversation_threads FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_agent_scripts
CREATE POLICY "Tenant staff can view AI scripts"
  ON ai_agent_scripts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can manage AI scripts"
  ON ai_agent_scripts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role IN ('admin', 'general_manager')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_agent_training_data
CREATE POLICY "Tenant staff can view training data"
  ON ai_agent_training_data FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can add training data"
  ON ai_agent_training_data FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_call_logs
CREATE POLICY "Tenant staff can view call logs"
  ON ai_call_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage call logs"
  ON ai_call_logs FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_email_sequences
CREATE POLICY "Tenant staff can view email sequences"
  ON ai_email_sequences FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage email sequences"
  ON ai_email_sequences FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_email_sequence_enrollments
CREATE POLICY "Tenant staff can view sequence enrollments"
  ON ai_email_sequence_enrollments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage sequence enrollments"
  ON ai_email_sequence_enrollments FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_meeting_bookings
CREATE POLICY "Tenant staff can view meeting bookings"
  ON ai_meeting_bookings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage meeting bookings"
  ON ai_meeting_bookings FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_trial_accounts
CREATE POLICY "Tenant staff can view trial accounts"
  ON ai_trial_accounts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage trial accounts"
  ON ai_trial_accounts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_agent_actions
CREATE POLICY "Tenant staff can view agent actions"
  ON ai_agent_actions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can log agent actions"
  ON ai_agent_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can approve actions"
  ON ai_agent_actions FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role IN ('admin', 'general_manager')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_agent_performance
CREATE POLICY "Tenant staff can view performance metrics"
  ON ai_agent_performance FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can update performance metrics"
  ON ai_agent_performance FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );