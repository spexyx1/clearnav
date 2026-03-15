/*
  # Payment and Onboarding Tracking System

  1. New Tables
    - `ai_payment_requests`
      - Tracks payment links sent to prospects
      - Payment status and follow-up scheduling
      - Integration with payment processors
      
    - `ai_onboarding_progress`
      - Monitors customer activation steps
      - Tracks completion of key milestones
      - Identifies at-risk customers
      
    - `ai_help_requests`
      - FAQ responses and support tickets
      - Automated resolution tracking
      - Escalation to human support
      
    - `ai_subscription_lifecycle`
      - Ongoing customer lifecycle management
      - Renewal tracking and churn prevention
      - Upsell and expansion opportunities
      
    - `ai_customer_health_scores`
      - Aggregated health scoring
      - Usage and engagement metrics
      - Churn risk prediction

  2. Security
    - Enable RLS on all tables
    - Secure payment information handling
    - Customer data privacy compliance
    - Audit trail for all interactions

  3. Features
    - Automated payment link generation
    - Onboarding milestone tracking
    - Self-service support automation
    - Proactive churn prevention
    - Health scoring and intervention
*/

-- AI Payment Requests
CREATE TABLE IF NOT EXISTS ai_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Customer reference
  lead_queue_id uuid REFERENCES ai_lead_queue(id),
  contact_id uuid,
  contact_email text NOT NULL,
  contact_name text,
  contact_company text,
  
  -- Payment details
  payment_type text NOT NULL CHECK (payment_type IN ('subscription', 'one_time', 'setup_fee', 'invoice', 'trial_conversion')),
  amount_usd decimal(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  
  -- Plan/product
  plan_name text,
  plan_interval text CHECK (plan_interval IN ('monthly', 'quarterly', 'annual', 'one_time')),
  
  -- Payment link
  payment_link_url text NOT NULL,
  payment_link_expires_at timestamptz,
  payment_provider text DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal', 'square', 'custom')),
  payment_provider_id text,
  
  -- Status
  status text DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'viewed', 'processing', 'paid', 'failed', 'expired', 'cancelled')),
  
  -- Payment tracking
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  
  -- Payment details (filled after successful payment)
  payment_method text,
  transaction_id text,
  invoice_id text,
  receipt_url text,
  
  -- Follow-up
  reminder_count int DEFAULT 0,
  last_reminder_sent_at timestamptz,
  next_reminder_scheduled_at timestamptz,
  
  -- AI context
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id),
  triggered_by text CHECK (triggered_by IN ('ai_agent', 'human', 'automation')),
  personalization_used jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  custom_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Onboarding Progress
CREATE TABLE IF NOT EXISTS ai_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Customer reference
  contact_id uuid NOT NULL,
  contact_email text NOT NULL,
  contact_name text,
  trial_account_id uuid REFERENCES ai_trial_accounts(id),
  
  -- Onboarding program
  onboarding_template_id uuid,
  onboarding_started_at timestamptz DEFAULT now(),
  onboarding_type text DEFAULT 'standard' CHECK (onboarding_type IN ('standard', 'white_glove', 'self_serve', 'enterprise')),
  
  -- Progress tracking
  current_step int DEFAULT 1,
  total_steps int NOT NULL,
  steps_completed int DEFAULT 0,
  completion_percentage decimal(5,2) DEFAULT 0,
  
  -- Milestones (tracked as JSON array)
  milestones jsonb NOT NULL,
  milestones_completed jsonb DEFAULT '[]'::jsonb,
  
  -- Key actions
  account_created boolean DEFAULT false,
  account_created_at timestamptz,
  first_login boolean DEFAULT false,
  first_login_at timestamptz,
  profile_completed boolean DEFAULT false,
  profile_completed_at timestamptz,
  first_feature_used boolean DEFAULT false,
  first_feature_used_at timestamptz,
  integration_connected boolean DEFAULT false,
  integration_connected_at timestamptz,
  team_invited boolean DEFAULT false,
  team_invited_at timestamptz,
  
  -- Custom milestones
  custom_milestones jsonb DEFAULT '{}'::jsonb,
  
  -- Engagement
  total_logins int DEFAULT 0,
  last_login_at timestamptz,
  days_since_last_login int,
  features_explored int DEFAULT 0,
  
  -- Activation
  is_activated boolean DEFAULT false,
  activation_achieved_at timestamptz,
  activation_criteria_met jsonb DEFAULT '[]'::jsonb,
  
  -- Support interaction
  help_articles_viewed int DEFAULT 0,
  support_tickets_created int DEFAULT 0,
  onboarding_emails_opened int DEFAULT 0,
  
  -- Health indicators
  engagement_score int DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  health_status text DEFAULT 'healthy' CHECK (health_status IN ('at_risk', 'needs_attention', 'healthy', 'thriving')),
  
  -- Intervention
  intervention_needed boolean DEFAULT false,
  intervention_type text CHECK (intervention_type IN ('low_engagement', 'stuck_on_step', 'feature_confusion', 'integration_help', 'custom')),
  intervention_sent boolean DEFAULT false,
  intervention_sent_at timestamptz,
  
  -- Completion
  status text DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned', 'paused')),
  completed_at timestamptz,
  time_to_complete_days decimal(8,2),
  
  -- Outcome
  converted_to_paid boolean DEFAULT false,
  converted_at timestamptz,
  churned boolean DEFAULT false,
  churned_at timestamptz,
  churn_reason text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, contact_email)
);

-- AI Help Requests
CREATE TABLE IF NOT EXISTS ai_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Customer reference
  contact_id uuid,
  contact_email text NOT NULL,
  contact_name text,
  
  -- Request details
  request_type text NOT NULL CHECK (request_type IN ('faq', 'how_to', 'troubleshooting', 'feature_request', 'bug_report', 'billing', 'general')),
  question text NOT NULL,
  category text,
  
  -- Channel
  channel text NOT NULL CHECK (channel IN ('email', 'chat', 'phone', 'web_form', 'in_app')),
  
  -- AI handling
  handled_by text DEFAULT 'ai' CHECK (handled_by IN ('ai', 'human', 'hybrid')),
  ai_confidence_score decimal(3,2),
  ai_response text,
  ai_response_sent_at timestamptz,
  
  -- Resolution
  status text DEFAULT 'new' CHECK (status IN ('new', 'ai_responded', 'escalated', 'resolved', 'closed')),
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolution_time_minutes int,
  
  -- Customer satisfaction
  customer_rated boolean DEFAULT false,
  customer_rating int CHECK (customer_rating BETWEEN 1 AND 5),
  customer_feedback text,
  
  -- Escalation
  escalated_to_human boolean DEFAULT false,
  escalated_at timestamptz,
  escalated_to_user_id uuid REFERENCES auth.users(id),
  escalation_reason text,
  
  -- Related resources
  help_articles_suggested text[] DEFAULT ARRAY[]::text[],
  help_articles_viewed text[] DEFAULT ARRAY[]::text[],
  
  -- Follow-up
  follow_up_needed boolean DEFAULT false,
  follow_up_scheduled_at timestamptz,
  follow_up_completed boolean DEFAULT false,
  
  -- Conversation
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id),
  message_history jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Subscription Lifecycle
CREATE TABLE IF NOT EXISTS ai_subscription_lifecycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Customer reference
  contact_id uuid NOT NULL,
  contact_email text NOT NULL,
  contact_name text,
  contact_company text,
  
  -- Subscription details
  subscription_id text,
  subscription_plan text NOT NULL,
  subscription_interval text CHECK (subscription_interval IN ('monthly', 'quarterly', 'annual')),
  subscription_amount_usd decimal(15,2),
  
  -- Status
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'expired', 'paused')),
  
  -- Timing
  subscription_start_date date NOT NULL,
  current_period_start date,
  current_period_end date,
  next_billing_date date,
  cancellation_date date,
  
  -- Usage tracking
  total_logins int DEFAULT 0,
  last_login_at timestamptz,
  days_since_last_login int,
  active_users int DEFAULT 0,
  features_used int DEFAULT 0,
  api_calls_made int DEFAULT 0,
  
  -- Engagement metrics
  weekly_active_users int DEFAULT 0,
  monthly_active_users int DEFAULT 0,
  feature_adoption_score int DEFAULT 0 CHECK (feature_adoption_score BETWEEN 0 AND 100),
  
  -- Health scoring
  health_score int DEFAULT 75 CHECK (health_score BETWEEN 0 AND 100),
  health_trend text DEFAULT 'stable' CHECK (health_trend IN ('improving', 'stable', 'declining')),
  
  -- Churn risk
  churn_risk_score int DEFAULT 0 CHECK (churn_risk_score BETWEEN 0 AND 100),
  churn_risk_level text DEFAULT 'low' CHECK (churn_risk_level IN ('low', 'medium', 'high', 'critical')),
  churn_risk_factors jsonb DEFAULT '[]'::jsonb,
  
  -- Intervention
  intervention_needed boolean DEFAULT false,
  intervention_type text CHECK (intervention_type IN ('check_in', 'feature_training', 'usage_optimization', 'retention_offer', 'win_back')),
  last_intervention_at timestamptz,
  intervention_count int DEFAULT 0,
  
  -- Renewal
  renewal_date date,
  days_until_renewal int,
  renewal_outreach_started boolean DEFAULT false,
  renewal_outreach_started_at timestamptz,
  renewal_likelihood_score int CHECK (renewal_likelihood_score BETWEEN 0 AND 100),
  
  -- Upsell/expansion
  upsell_opportunity boolean DEFAULT false,
  upsell_target_plan text,
  upsell_reasoning text,
  expansion_revenue_potential_usd decimal(15,2),
  
  -- Support history
  support_tickets_total int DEFAULT 0,
  support_tickets_last_30_days int DEFAULT 0,
  last_support_ticket_at timestamptz,
  avg_ticket_resolution_hours decimal(10,2),
  
  -- Financial
  lifetime_value_usd decimal(15,2) DEFAULT 0,
  total_revenue_usd decimal(15,2) DEFAULT 0,
  months_subscribed int DEFAULT 0,
  
  -- NPS and satisfaction
  nps_score int CHECK (nps_score BETWEEN -100 AND 100),
  last_nps_survey_at timestamptz,
  satisfaction_score int CHECK (satisfaction_score BETWEEN 1 AND 5),
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, contact_email)
);

-- AI Customer Health Scores (aggregated daily metrics)
CREATE TABLE IF NOT EXISTS ai_customer_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Customer reference
  subscription_lifecycle_id uuid NOT NULL REFERENCES ai_subscription_lifecycle(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  
  -- Date
  score_date date NOT NULL,
  
  -- Overall health
  overall_health_score int NOT NULL CHECK (overall_health_score BETWEEN 0 AND 100),
  health_status text NOT NULL CHECK (health_status IN ('at_risk', 'needs_attention', 'healthy', 'thriving')),
  
  -- Component scores
  usage_score int CHECK (usage_score BETWEEN 0 AND 100),
  engagement_score int CHECK (engagement_score BETWEEN 0 AND 100),
  feature_adoption_score int CHECK (feature_adoption_score BETWEEN 0 AND 100),
  support_score int CHECK (support_score BETWEEN 0 AND 100),
  payment_score int CHECK (payment_score BETWEEN 0 AND 100),
  
  -- Usage metrics
  logins_count int DEFAULT 0,
  active_users_count int DEFAULT 0,
  features_used_count int DEFAULT 0,
  time_in_app_minutes int DEFAULT 0,
  
  -- Engagement signals
  positive_signals jsonb DEFAULT '[]'::jsonb,
  negative_signals jsonb DEFAULT '[]'::jsonb,
  
  -- Trends
  score_change_from_previous_week int,
  score_trend text CHECK (score_trend IN ('improving', 'stable', 'declining')),
  
  -- Predictions
  churn_probability decimal(5,2),
  renewal_probability decimal(5,2),
  expansion_probability decimal(5,2),
  
  -- Recommended actions
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_payment_requests_tenant ON ai_payment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_payment_requests_contact ON ai_payment_requests(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_payment_requests_email ON ai_payment_requests(contact_email);
CREATE INDEX IF NOT EXISTS idx_ai_payment_requests_status ON ai_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_payment_requests_sent ON ai_payment_requests(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_onboarding_progress_tenant ON ai_onboarding_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_onboarding_progress_contact ON ai_onboarding_progress(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_onboarding_progress_status ON ai_onboarding_progress(status);
CREATE INDEX IF NOT EXISTS idx_ai_onboarding_progress_health ON ai_onboarding_progress(health_status);

CREATE INDEX IF NOT EXISTS idx_ai_help_requests_tenant ON ai_help_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_help_requests_contact ON ai_help_requests(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_help_requests_status ON ai_help_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_help_requests_type ON ai_help_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_help_requests_created ON ai_help_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_subscription_lifecycle_tenant ON ai_subscription_lifecycle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_subscription_lifecycle_contact ON ai_subscription_lifecycle(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_subscription_lifecycle_status ON ai_subscription_lifecycle(subscription_status);
CREATE INDEX IF NOT EXISTS idx_ai_subscription_lifecycle_health ON ai_subscription_lifecycle(health_score);
CREATE INDEX IF NOT EXISTS idx_ai_subscription_lifecycle_churn_risk ON ai_subscription_lifecycle(churn_risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_subscription_lifecycle_renewal ON ai_subscription_lifecycle(renewal_date) WHERE renewal_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_customer_health_scores_subscription ON ai_customer_health_scores(subscription_lifecycle_id);
CREATE INDEX IF NOT EXISTS idx_ai_customer_health_scores_date ON ai_customer_health_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_customer_health_scores_status ON ai_customer_health_scores(health_status);

-- Enable Row Level Security
ALTER TABLE ai_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_subscription_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_customer_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_payment_requests
CREATE POLICY "Tenant staff can view payment requests"
  ON ai_payment_requests FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage payment requests"
  ON ai_payment_requests FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_onboarding_progress
CREATE POLICY "Tenant staff can view onboarding progress"
  ON ai_onboarding_progress FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage onboarding progress"
  ON ai_onboarding_progress FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_help_requests
CREATE POLICY "Tenant staff can view help requests"
  ON ai_help_requests FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage help requests"
  ON ai_help_requests FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_subscription_lifecycle
CREATE POLICY "Tenant staff can view subscription lifecycle"
  ON ai_subscription_lifecycle FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage subscription lifecycle"
  ON ai_subscription_lifecycle FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_customer_health_scores
CREATE POLICY "Tenant staff can view customer health scores"
  ON ai_customer_health_scores FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage customer health scores"
  ON ai_customer_health_scores FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );