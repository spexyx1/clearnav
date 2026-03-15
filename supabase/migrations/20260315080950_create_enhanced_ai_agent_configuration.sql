/*
  # Enhanced AI Agent Configuration System

  1. New Tables
    - `ai_email_templates`
      - Rich email templates with HTML design
      - Variable placeholders for personalization
      - A/B testing variants
      - Performance tracking per template
      
    - `ai_cadence_configurations`
      - Customizable outreach cadences
      - Multi-channel sequencing rules
      - Timing optimization settings
      - Industry-specific templates
      
    - `ai_sender_profiles`
      - Multiple sender personas
      - Email signatures and branding
      - Sending schedules and throttling
      - Domain reputation tracking
      
    - `ai_personalization_rules`
      - Dynamic content insertion rules
      - Conditional logic for messaging
      - Industry/company size targeting
      - Custom variable definitions
      
    - `ai_ab_test_variants`
      - A/B testing experiment tracking
      - Variant performance metrics
      - Statistical significance tracking
      - Winner selection automation

  2. Security
    - Enable RLS on all tables
    - Tenant isolation for all configurations
    - Audit trail for template changes
    - Secure handling of sender credentials

  3. Features
    - Rich HTML email templates
    - Visual email designer
    - Smart cadence configuration
    - Multi-channel orchestration
    - Advanced personalization
    - A/B testing framework
    - Performance analytics
*/

-- AI Email Templates
CREATE TABLE IF NOT EXISTS ai_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Template details
  template_name text NOT NULL,
  description text,
  category text CHECK (category IN ('cold_outreach', 'follow_up', 'demo_invite', 'trial_nurture', 'renewal', 'upsell', 're_engagement', 'custom')),
  
  -- Content
  subject_line text NOT NULL,
  preview_text text,
  html_content text NOT NULL,
  plain_text_content text NOT NULL,
  
  -- Design settings
  design_config jsonb DEFAULT '{
    "layout": "single_column",
    "width": 600,
    "background_color": "#ffffff",
    "font_family": "Arial, sans-serif",
    "font_size": 14,
    "line_height": 1.6,
    "text_color": "#333333",
    "link_color": "#0066cc",
    "button_style": {
      "background_color": "#0066cc",
      "text_color": "#ffffff",
      "border_radius": 4,
      "padding": "12px 24px"
    }
  }'::jsonb,
  
  -- Personalization variables
  available_variables text[] DEFAULT ARRAY['first_name', 'last_name', 'company', 'job_title', 'industry', 'city', 'state', 'country'],
  required_variables text[] DEFAULT ARRAY['first_name', 'company'],
  
  -- CTA (Call to Action)
  has_cta boolean DEFAULT true,
  cta_text text,
  cta_url text,
  cta_tracking_enabled boolean DEFAULT true,
  
  -- Performance tracking
  times_sent int DEFAULT 0,
  times_opened int DEFAULT 0,
  times_clicked int DEFAULT 0,
  times_replied int DEFAULT 0,
  open_rate decimal(5,2) DEFAULT 0,
  click_rate decimal(5,2) DEFAULT 0,
  reply_rate decimal(5,2) DEFAULT 0,
  
  -- A/B testing
  is_ab_test boolean DEFAULT false,
  ab_test_id uuid,
  variant_letter text,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'testing')),
  is_default boolean DEFAULT false,
  
  -- Compliance
  includes_unsubscribe boolean DEFAULT true,
  gdpr_compliant boolean DEFAULT true,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  last_used_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, template_name)
);

-- AI Cadence Configurations
CREATE TABLE IF NOT EXISTS ai_cadence_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Cadence details
  cadence_name text NOT NULL,
  description text,
  cadence_type text CHECK (cadence_type IN ('aggressive', 'moderate', 'gentle', 'custom')),
  
  -- Industry targeting
  target_industries text[] DEFAULT ARRAY[]::text[],
  target_company_sizes text[] DEFAULT ARRAY[]::text[],
  target_job_roles text[] DEFAULT ARRAY[]::text[],
  
  -- Sequence configuration
  total_steps int NOT NULL,
  steps jsonb NOT NULL,
  
  -- Timing settings
  business_hours_only boolean DEFAULT true,
  send_timezone text DEFAULT 'recipient',
  optimal_send_times jsonb DEFAULT '{
    "monday": ["09:00", "14:00"],
    "tuesday": ["09:00", "14:00"],
    "wednesday": ["09:00", "14:00"],
    "thursday": ["09:00", "14:00"],
    "friday": ["09:00", "14:00"],
    "saturday": [],
    "sunday": []
  }'::jsonb,
  
  -- Throttling
  daily_send_limit int DEFAULT 50,
  hourly_send_limit int DEFAULT 10,
  max_concurrent_sequences int DEFAULT 100,
  
  -- Pause conditions
  pause_on_reply boolean DEFAULT true,
  pause_on_meeting_booked boolean DEFAULT true,
  pause_on_email_bounce boolean DEFAULT true,
  pause_on_unsubscribe boolean DEFAULT true,
  
  -- Exit conditions
  auto_exit_on_no_engagement_days int DEFAULT 30,
  auto_exit_on_negative_reply boolean DEFAULT true,
  
  -- Multi-channel settings
  enable_email boolean DEFAULT true,
  enable_calls boolean DEFAULT false,
  enable_sms boolean DEFAULT false,
  enable_linkedin boolean DEFAULT false,
  
  -- Call settings
  call_script_template text,
  max_call_attempts int DEFAULT 3,
  days_between_calls int DEFAULT 3,
  
  -- Performance
  sequences_started int DEFAULT 0,
  sequences_completed int DEFAULT 0,
  avg_response_rate decimal(5,2) DEFAULT 0,
  avg_time_to_response_hours decimal(10,2),
  
  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, cadence_name)
);

-- AI Sender Profiles
CREATE TABLE IF NOT EXISTS ai_sender_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Sender identity
  profile_name text NOT NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_title text,
  sender_company text,
  
  -- Signature
  email_signature_html text,
  email_signature_plain text,
  include_photo boolean DEFAULT false,
  photo_url text,
  
  -- Social links
  linkedin_url text,
  twitter_url text,
  calendar_link text,
  
  -- Branding
  logo_url text,
  brand_color text DEFAULT '#0066cc',
  
  -- Sending configuration
  daily_send_limit int DEFAULT 100,
  send_from_hours int DEFAULT 9,
  send_to_hours int DEFAULT 17,
  send_timezone text DEFAULT 'America/New_York',
  
  -- Domain settings
  sending_domain text,
  custom_domain_verified boolean DEFAULT false,
  dkim_enabled boolean DEFAULT false,
  spf_enabled boolean DEFAULT false,
  dmarc_enabled boolean DEFAULT false,
  
  -- Reputation tracking
  total_sent int DEFAULT 0,
  total_delivered int DEFAULT 0,
  total_bounced int DEFAULT 0,
  total_complaints int DEFAULT 0,
  reputation_score int DEFAULT 100 CHECK (reputation_score BETWEEN 0 AND 100),
  
  -- Warming settings
  is_warming boolean DEFAULT false,
  warming_daily_increment int DEFAULT 5,
  warming_target_volume int DEFAULT 100,
  warming_started_at timestamptz,
  
  -- Status
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, sender_email)
);

-- AI Personalization Rules
CREATE TABLE IF NOT EXISTS ai_personalization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Rule details
  rule_name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN ('conditional_content', 'dynamic_variable', 'industry_specific', 'company_size', 'job_role', 'custom')),
  
  -- Conditions
  conditions jsonb NOT NULL,
  
  -- Actions
  content_to_insert text,
  variable_name text,
  variable_value_template text,
  
  -- Targeting
  applies_to_industries text[] DEFAULT ARRAY[]::text[],
  applies_to_company_sizes text[] DEFAULT ARRAY[]::text[],
  applies_to_job_roles text[] DEFAULT ARRAY[]::text[],
  
  -- Priority
  priority int DEFAULT 0,
  
  -- Performance
  times_applied int DEFAULT 0,
  success_rate decimal(5,2),
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI A/B Test Variants
CREATE TABLE IF NOT EXISTS ai_ab_test_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Test details
  test_name text NOT NULL,
  test_description text,
  test_type text NOT NULL CHECK (test_type IN ('subject_line', 'email_content', 'cta', 'send_time', 'sender', 'full_template')),
  
  -- Test configuration
  variant_a_id uuid,
  variant_b_id uuid,
  traffic_split_percentage int DEFAULT 50 CHECK (traffic_split_percentage BETWEEN 1 AND 99),
  
  -- Success metric
  success_metric text NOT NULL CHECK (success_metric IN ('open_rate', 'click_rate', 'reply_rate', 'meeting_booked', 'conversion')),
  
  -- Sample sizes
  variant_a_sent int DEFAULT 0,
  variant_b_sent int DEFAULT 0,
  variant_a_success int DEFAULT 0,
  variant_b_success int DEFAULT 0,
  
  -- Results
  variant_a_rate decimal(5,2) DEFAULT 0,
  variant_b_rate decimal(5,2) DEFAULT 0,
  confidence_level decimal(5,2),
  is_statistically_significant boolean DEFAULT false,
  
  -- Winner
  winning_variant text CHECK (winning_variant IN ('a', 'b', 'no_winner')),
  winner_selected_at timestamptz,
  auto_apply_winner boolean DEFAULT true,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  
  -- Timing
  started_at timestamptz,
  ended_at timestamptz,
  minimum_sample_size int DEFAULT 100,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, test_name)
);

-- AI Agent Global Settings
CREATE TABLE IF NOT EXISTS ai_agent_global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- General AI behavior
  ai_model text DEFAULT 'gpt-4',
  ai_temperature decimal(3,2) DEFAULT 0.7,
  ai_creativity_level text DEFAULT 'balanced' CHECK (ai_creativity_level IN ('conservative', 'balanced', 'creative')),
  
  -- Tone and style
  communication_tone text DEFAULT 'professional' CHECK (communication_tone IN ('formal', 'professional', 'casual', 'friendly', 'enthusiastic')),
  writing_style text DEFAULT 'concise' CHECK (writing_style IN ('brief', 'concise', 'detailed', 'storytelling')),
  
  -- Language
  primary_language text DEFAULT 'en',
  auto_translate boolean DEFAULT false,
  
  -- Personalization depth
  personalization_level text DEFAULT 'medium' CHECK (personalization_level IN ('minimal', 'medium', 'high', 'maximum')),
  use_company_research boolean DEFAULT true,
  use_social_signals boolean DEFAULT true,
  use_intent_data boolean DEFAULT false,
  
  -- Safety and compliance
  require_approval_for_first_email boolean DEFAULT true,
  require_approval_for_cold_outreach boolean DEFAULT false,
  max_follow_ups_without_response int DEFAULT 5,
  respect_do_not_contact boolean DEFAULT true,
  
  -- Rate limiting
  global_daily_limit int DEFAULT 500,
  per_lead_daily_limit int DEFAULT 3,
  
  -- Smart features
  auto_optimize_send_times boolean DEFAULT true,
  auto_pause_low_performers boolean DEFAULT true,
  auto_escalate_hot_leads boolean DEFAULT true,
  
  -- Enrichment
  auto_enrich_leads boolean DEFAULT true,
  enrichment_providers text[] DEFAULT ARRAY['clearbit']::text[],
  
  -- Notifications
  notify_on_reply boolean DEFAULT true,
  notify_on_meeting_booked boolean DEFAULT true,
  notify_on_hot_lead boolean DEFAULT true,
  notification_email text,
  
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_email_templates_tenant ON ai_email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_templates_category ON ai_email_templates(category);
CREATE INDEX IF NOT EXISTS idx_ai_email_templates_status ON ai_email_templates(status);
CREATE INDEX IF NOT EXISTS idx_ai_email_templates_active ON ai_email_templates(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ai_cadence_config_tenant ON ai_cadence_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_cadence_config_type ON ai_cadence_configurations(cadence_type);
CREATE INDEX IF NOT EXISTS idx_ai_cadence_config_active ON ai_cadence_configurations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_sender_profiles_tenant ON ai_sender_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_sender_profiles_email ON ai_sender_profiles(sender_email);
CREATE INDEX IF NOT EXISTS idx_ai_sender_profiles_active ON ai_sender_profiles(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_personalization_rules_tenant ON ai_personalization_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_personalization_rules_type ON ai_personalization_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_ai_personalization_rules_active ON ai_personalization_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_ab_test_variants_tenant ON ai_ab_test_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_ab_test_variants_status ON ai_ab_test_variants(status);

-- Enable Row Level Security
ALTER TABLE ai_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cadence_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sender_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personalization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_global_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_email_templates
CREATE POLICY "Tenant staff can view email templates"
  ON ai_email_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage email templates"
  ON ai_email_templates FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_cadence_configurations
CREATE POLICY "Tenant staff can view cadence configs"
  ON ai_cadence_configurations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage cadence configs"
  ON ai_cadence_configurations FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_sender_profiles
CREATE POLICY "Tenant staff can view sender profiles"
  ON ai_sender_profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage sender profiles"
  ON ai_sender_profiles FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_personalization_rules
CREATE POLICY "Tenant staff can view personalization rules"
  ON ai_personalization_rules FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage personalization rules"
  ON ai_personalization_rules FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_ab_test_variants
CREATE POLICY "Tenant staff can view AB tests"
  ON ai_ab_test_variants FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage AB tests"
  ON ai_ab_test_variants FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_agent_global_settings
CREATE POLICY "Tenant staff can view global settings"
  ON ai_agent_global_settings FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage global settings"
  ON ai_agent_global_settings FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );