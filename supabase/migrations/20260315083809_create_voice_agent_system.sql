/*
  # Voice Agent System with Telnyx Integration

  1. New Tables
    - `voice_agent_configurations` - Tenant-specific voice agent settings and Telnyx credentials
    - `telnyx_phone_numbers` - Purchased phone numbers with cost tracking
    - `voice_call_sessions` - Real-time call tracking and monitoring
    - `voice_call_transcripts` - Conversation transcripts with speaker identification
    - `voice_agent_knowledge_base` - Knowledge articles and FAQs
    - `voice_agent_scripts` - Conversation templates and scripts
    - `voice_agent_escalation_rules` - Escalation triggers and conditions
    - `voice_agent_analytics` - Performance metrics and analytics

  2. Security
    - Enable RLS on all tables
    - Tenant isolation policies
    - Staff and admin access controls

  3. Features
    - Multi-agent support (sales outbound, sales inbound, support)
    - Operating hours and timezone management
    - Real-time sentiment analysis
    - Call recording and transcription
    - Knowledge base for context-aware responses
    - Escalation rules for human handoff
*/

-- Voice Agent Configurations
CREATE TABLE IF NOT EXISTS voice_agent_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Telnyx Integration
  telnyx_api_key_encrypted text,
  telnyx_public_key text,
  telnyx_connection_id text,
  
  -- Agent Settings
  agent_name text NOT NULL DEFAULT 'AI Assistant',
  agent_type text NOT NULL CHECK (agent_type IN ('sales_outbound', 'sales_inbound', 'support_inbound', 'general')),
  
  -- Voice Settings
  voice_provider text DEFAULT 'telnyx' CHECK (voice_provider IN ('telnyx', 'elevenlabs', 'google', 'aws')),
  voice_id text,
  voice_gender text CHECK (voice_gender IN ('male', 'female', 'neutral')),
  voice_accent text DEFAULT 'american',
  voice_speed decimal(3,2) DEFAULT 1.0 CHECK (voice_speed BETWEEN 0.5 AND 2.0),
  voice_pitch int DEFAULT 0 CHECK (voice_pitch BETWEEN -10 AND 10),
  
  -- Personality
  personality_traits jsonb DEFAULT '{"friendliness": 8, "formality": 6, "enthusiasm": 7}'::jsonb,
  greeting_message text DEFAULT 'Hello! How can I help you today?',
  hold_message text DEFAULT 'Please hold while I look that up for you.',
  closing_message text DEFAULT 'Thank you for calling. Have a great day!',
  
  -- Language Settings
  primary_language text DEFAULT 'en-US',
  supported_languages text[] DEFAULT ARRAY['en-US'],
  auto_detect_language boolean DEFAULT true,
  
  -- Operating Hours (timezone-aware)
  timezone text DEFAULT 'America/New_York',
  business_hours jsonb DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false},
    "sunday": {"enabled": false}
  }'::jsonb,
  after_hours_action text DEFAULT 'voicemail' CHECK (after_hours_action IN ('voicemail', 'callback', 'emergency_only', 'forward')),
  after_hours_forward_number text,
  
  -- AI Model Settings
  ai_model text DEFAULT 'gpt-4' CHECK (ai_model IN ('gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet')),
  ai_temperature decimal(3,2) DEFAULT 0.7 CHECK (ai_temperature BETWEEN 0 AND 2),
  max_conversation_turns int DEFAULT 50,
  context_window_size int DEFAULT 10,
  
  -- Behavior Settings
  interrupt_sensitivity text DEFAULT 'medium' CHECK (interrupt_sensitivity IN ('low', 'medium', 'high')),
  silence_timeout_seconds int DEFAULT 3,
  enable_background_noise_suppression boolean DEFAULT true,
  
  -- Recording Settings
  record_calls boolean DEFAULT true,
  recording_consent_required boolean DEFAULT true,
  consent_message text DEFAULT 'This call may be recorded for quality and training purposes.',
  
  -- Limits and Quotas
  max_concurrent_calls int DEFAULT 5,
  max_call_duration_minutes int DEFAULT 30,
  daily_call_limit int,
  monthly_minutes_included int DEFAULT 1000,
  
  -- Status
  is_active boolean DEFAULT true,
  last_activated_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, agent_type)
);

-- Telnyx Phone Numbers
CREATE TABLE IF NOT EXISTS telnyx_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid REFERENCES voice_agent_configurations(id) ON DELETE SET NULL,
  
  -- Number Details
  phone_number text NOT NULL UNIQUE,
  phone_number_id text UNIQUE,
  friendly_name text,
  
  -- Number Type
  number_type text NOT NULL CHECK (number_type IN ('local', 'toll_free', 'mobile', 'international')),
  country_code text NOT NULL DEFAULT 'US',
  area_code text,
  
  -- Capabilities
  voice_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  mms_enabled boolean DEFAULT false,
  
  -- Usage Assignment
  assigned_to text CHECK (assigned_to IN ('sales_outbound', 'sales_inbound', 'support_inbound', 'general')),
  
  -- Provisioning
  provisioning_status text DEFAULT 'pending' CHECK (provisioning_status IN ('pending', 'active', 'suspended', 'cancelled')),
  provisioned_at timestamptz,
  
  -- Cost Tracking
  monthly_cost_usd decimal(10,2),
  per_minute_cost_usd decimal(10,4),
  setup_cost_usd decimal(10,2),
  
  -- Webhook Configuration
  webhook_url text,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Voice Call Sessions
CREATE TABLE IF NOT EXISTS voice_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid REFERENCES voice_agent_configurations(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES telnyx_phone_numbers(id) ON DELETE SET NULL,
  ai_call_log_id uuid REFERENCES ai_call_logs(id) ON DELETE SET NULL,
  
  -- Telnyx Call Control
  call_control_id text UNIQUE,
  call_session_id text UNIQUE,
  call_leg_id text,
  
  -- Call Details
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  caller_name text,
  
  -- Contact Association
  contact_id uuid,
  lead_id uuid,
  client_id uuid,
  
  -- Call Status
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated', 'ringing', 'answered', 'in_progress', 
    'on_hold', 'transferring', 'transferred', 
    'completed', 'failed', 'busy', 'no_answer', 'voicemail'
  )),
  
  -- Timing
  initiated_at timestamptz DEFAULT now(),
  ringing_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  billable_seconds int,
  
  -- AI Processing
  intent_detected text,
  sentiment_current text CHECK (sentiment_current IN ('positive', 'neutral', 'negative', 'frustrated', 'satisfied')),
  sentiment_score decimal(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
  confidence_score decimal(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  language_detected text,
  
  -- Conversation Context
  conversation_summary text,
  key_points text[] DEFAULT ARRAY[]::text[],
  action_items text[] DEFAULT ARRAY[]::text[],
  
  -- Escalation
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  escalation_reason text,
  escalated_to_user_id uuid REFERENCES auth.users(id),
  transfer_type text CHECK (transfer_type IN ('warm', 'cold', 'conference')),
  
  -- Recording
  recording_enabled boolean DEFAULT true,
  recording_url text,
  recording_duration_seconds int,
  recording_size_bytes bigint,
  
  -- Outcome
  call_outcome text CHECK (call_outcome IN (
    'demo_booked', 'qualified', 'follow_up_scheduled', 
    'issue_resolved', 'ticket_created', 'not_interested', 
    'voicemail_left', 'no_answer', 'wrong_number'
  )),
  outcome_notes text,
  next_action text,
  follow_up_date timestamptz,
  
  -- Cost Tracking
  call_cost_usd decimal(10,4),
  ai_processing_cost_usd decimal(10,4),
  transcription_cost_usd decimal(10,4),
  tts_cost_usd decimal(10,4),
  total_cost_usd decimal(10,4),
  
  -- Quality Metrics
  audio_quality_score int CHECK (audio_quality_score BETWEEN 1 AND 10),
  customer_satisfaction_score int CHECK (customer_satisfaction_score BETWEEN 1 AND 5),
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Voice Call Transcripts
CREATE TABLE IF NOT EXISTS voice_call_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES voice_call_sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  sequence_number int NOT NULL,
  speaker text NOT NULL CHECK (speaker IN ('agent', 'customer', 'system')),
  utterance text NOT NULL,
  
  timestamp_offset_ms int NOT NULL,
  duration_ms int,
  
  intent text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence decimal(3,2),
  
  keywords text[] DEFAULT ARRAY[]::text[],
  entities jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(call_session_id, sequence_number)
);

-- Voice Agent Knowledge Base
CREATE TABLE IF NOT EXISTS voice_agent_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid REFERENCES voice_agent_configurations(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'faq', 'product_info', 'pricing', 'support_procedure', 
    'sales_script', 'objection_handling', 'company_info', 'policy'
  )),
  
  tags text[] DEFAULT ARRAY[]::text[],
  keywords text[] DEFAULT ARRAY[]::text[],
  search_vector tsvector,
  
  access_count int DEFAULT 0,
  last_accessed_at timestamptz,
  
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Voice Agent Scripts
CREATE TABLE IF NOT EXISTS voice_agent_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid REFERENCES voice_agent_configurations(id) ON DELETE CASCADE,
  
  script_name text NOT NULL,
  script_type text NOT NULL CHECK (script_type IN (
    'opening', 'closing', 'qualification', 'objection_handling', 
    'information_gathering', 'upsell', 'retention', 'escalation'
  )),
  
  script_content text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  
  trigger_conditions jsonb DEFAULT '{}'::jsonb,
  use_case_scenarios text[] DEFAULT ARRAY[]::text[],
  
  times_used int DEFAULT 0,
  success_rate decimal(5,2),
  average_duration_seconds int,
  
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, script_name)
);

-- Voice Agent Escalation Rules
CREATE TABLE IF NOT EXISTS voice_agent_escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid REFERENCES voice_agent_configurations(id) ON DELETE CASCADE,
  
  rule_name text NOT NULL,
  priority int DEFAULT 0,
  is_active boolean DEFAULT true,
  
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'keyword', 'sentiment', 'duration', 'intent', 
    'customer_request', 'confidence_low', 'vip_customer', 'time_based'
  )),
  
  keywords text[] DEFAULT ARRAY[]::text[],
  sentiment_threshold decimal(3,2),
  duration_threshold_seconds int,
  confidence_threshold decimal(3,2),
  
  escalation_action text NOT NULL CHECK (escalation_action IN (
    'transfer_to_human', 'schedule_callback', 'create_ticket', 
    'send_alert', 'offer_callback', 'escalate_to_manager'
  )),
  
  transfer_to_phone text,
  transfer_to_department text,
  transfer_message text,
  
  notify_staff_members uuid[] DEFAULT ARRAY[]::uuid[],
  notification_message_template text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, rule_name)
);

-- Voice Agent Analytics
CREATE TABLE IF NOT EXISTS voice_agent_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  agent_config_id uuid REFERENCES voice_agent_configurations(id) ON DELETE CASCADE,
  
  date date NOT NULL,
  hour int CHECK (hour BETWEEN 0 AND 23),
  
  total_calls int DEFAULT 0,
  inbound_calls int DEFAULT 0,
  outbound_calls int DEFAULT 0,
  answered_calls int DEFAULT 0,
  missed_calls int DEFAULT 0,
  
  total_duration_seconds bigint DEFAULT 0,
  average_duration_seconds int DEFAULT 0,
  total_billable_seconds bigint DEFAULT 0,
  
  successful_outcomes int DEFAULT 0,
  escalated_calls int DEFAULT 0,
  demos_booked int DEFAULT 0,
  issues_resolved int DEFAULT 0,
  
  average_sentiment_score decimal(3,2),
  average_confidence_score decimal(3,2),
  average_satisfaction_score decimal(3,2),
  
  total_cost_usd decimal(10,2) DEFAULT 0,
  average_cost_per_call_usd decimal(10,4),
  
  first_call_resolution_rate decimal(5,2),
  average_handle_time_seconds int,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, agent_config_id, date, hour)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_agent_configs_tenant ON voice_agent_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_agent_configs_active ON voice_agent_configurations(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_telnyx_numbers_tenant ON telnyx_phone_numbers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_telnyx_numbers_phone ON telnyx_phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_telnyx_numbers_status ON telnyx_phone_numbers(provisioning_status);

CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_tenant ON voice_call_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_status ON voice_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_initiated ON voice_call_sessions(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_control ON voice_call_sessions(call_control_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_contact ON voice_call_sessions(contact_id) WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_transcripts_session ON voice_call_transcripts(call_session_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_sequence ON voice_call_transcripts(call_session_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_voice_knowledge_tenant ON voice_agent_knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_knowledge_category ON voice_agent_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_voice_knowledge_active ON voice_agent_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_voice_knowledge_search ON voice_agent_knowledge_base USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_voice_scripts_tenant ON voice_agent_scripts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_scripts_type ON voice_agent_scripts(script_type);

CREATE INDEX IF NOT EXISTS idx_voice_escalation_tenant ON voice_agent_escalation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_escalation_active ON voice_agent_escalation_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_voice_analytics_tenant_date ON voice_agent_analytics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_voice_analytics_agent_date ON voice_agent_analytics(agent_config_id, date DESC);

-- Enable RLS
ALTER TABLE voice_agent_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE telnyx_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agent_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agent_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agent_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agent_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant admins view voice configs"
  ON voice_agent_configurations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant admins manage voice configs"
  ON voice_agent_configurations FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant staff view phone numbers"
  ON telnyx_phone_numbers FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins manage phone numbers"
  ON telnyx_phone_numbers FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant staff view call sessions"
  ON voice_call_sessions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff manage call sessions"
  ON voice_call_sessions FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff view transcripts"
  ON voice_call_transcripts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System insert transcripts"
  ON voice_call_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff view knowledge base"
  ON voice_agent_knowledge_base FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff manage knowledge base"
  ON voice_agent_knowledge_base FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff view scripts"
  ON voice_agent_scripts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff manage scripts"
  ON voice_agent_scripts FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff view escalation rules"
  ON voice_agent_escalation_rules FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins manage escalation rules"
  ON voice_agent_escalation_rules FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_category = 'tenant_admin'
    )
  );

CREATE POLICY "Tenant staff view analytics"
  ON voice_agent_analytics FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System insert analytics"
  ON voice_agent_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );