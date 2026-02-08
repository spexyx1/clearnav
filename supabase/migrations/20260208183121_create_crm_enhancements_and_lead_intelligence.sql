/*
  # CRM Enhancements and Lead Intelligence

  1. New Tables
    - `lead_enrichment_data`
      - Stores enriched contact data from LinkedIn, company databases
      - Automatic updates from web scraping and APIs
      
    - `lead_scoring_rules`
      - Configurable scoring criteria and weights
      - Industry-specific scoring models
      
    - `lead_scores`
      - Historical lead scores with change tracking
      - Predictive analytics for conversion probability
      
    - `contact_activities`
      - Comprehensive activity tracking across all channels
      - AI-generated insights and next best actions
      
    - `opportunity_pipeline`
      - Sales pipeline tracking with AI predictions
      - Stage progression and velocity metrics
      
    - `competitive_intelligence`
      - Track competitor mentions and win/loss analysis
      - Market intelligence gathering

  2. Enhancements to Existing Tables
    - Add enrichment fields to crm_contacts
    - Add AI-generated insights
    - Add predictive scoring

  3. Security
    - Enable RLS on all tables
    - Tenant isolation enforced
    - Activity logging for compliance

  4. Features
    - Automatic contact enrichment from multiple sources
    - Predictive lead scoring using AI
    - Activity timeline with AI insights
    - Competitive intelligence tracking
    - Pipeline forecasting
*/

-- Lead Enrichment Data
CREATE TABLE IF NOT EXISTS lead_enrichment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  contact_id uuid,
  
  -- Company information
  company_name text,
  company_domain text,
  company_linkedin_url text,
  company_size text CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+')),
  company_industry text,
  company_revenue_range text,
  company_founded_year int,
  company_description text,
  company_headquarters_location text,
  
  -- Contact information
  contact_linkedin_url text,
  contact_title text,
  contact_seniority text CHECK (contact_seniority IN ('individual_contributor', 'manager', 'director', 'vp', 'c_level', 'founder', 'other')),
  contact_department text,
  contact_location text,
  
  -- Social profiles
  twitter_handle text,
  github_username text,
  personal_website text,
  
  -- Technographics
  technologies_used text[] DEFAULT ARRAY[]::text[],
  tech_stack jsonb DEFAULT '{}'::jsonb,
  
  -- Firmographics
  funding_raised_usd bigint,
  funding_stage text CHECK (funding_stage IN ('bootstrap', 'seed', 'series_a', 'series_b', 'series_c', 'series_d+', 'public')),
  employee_growth_rate decimal(5,2),
  
  -- Enrichment metadata
  enrichment_source text CHECK (enrichment_source IN ('clearbit', 'zoominfo', 'apollo', 'linkedin', 'manual', 'ai_research')),
  enrichment_confidence_score decimal(3,2),
  last_enriched_at timestamptz DEFAULT now(),
  auto_refresh_enabled boolean DEFAULT true,
  
  -- Verification
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(contact_id)
);

-- Lead Scoring Rules
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Rule details
  rule_name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('demographic', 'firmographic', 'behavioral', 'engagement', 'technographic')),
  
  -- Scoring criteria
  criteria_field text NOT NULL,
  criteria_operator text NOT NULL CHECK (criteria_operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'in_list')),
  criteria_value text NOT NULL,
  
  -- Score impact
  points int NOT NULL,
  is_negative boolean DEFAULT false,
  
  -- Conditions
  applies_to_industries text[] DEFAULT ARRAY[]::text[],
  applies_to_company_sizes text[] DEFAULT ARRAY[]::text[],
  
  -- Status
  is_active boolean DEFAULT true,
  priority int DEFAULT 0,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, rule_name)
);

-- Lead Scores
CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  
  -- Scores
  total_score int DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  demographic_score int DEFAULT 0,
  firmographic_score int DEFAULT 0,
  behavioral_score int DEFAULT 0,
  engagement_score int DEFAULT 0,
  
  -- Grade/Tier
  score_grade text CHECK (score_grade IN ('A', 'B', 'C', 'D', 'F')),
  score_tier text CHECK (score_tier IN ('hot', 'warm', 'cold')),
  
  -- Predictive analytics
  conversion_probability decimal(5,2),
  predicted_deal_size_usd decimal(10,2),
  predicted_close_days int,
  
  -- Change tracking
  previous_score int,
  score_change int,
  score_trend text CHECK (score_trend IN ('increasing', 'stable', 'decreasing')),
  
  -- Last calculation
  calculated_at timestamptz DEFAULT now(),
  calculation_method text DEFAULT 'rule_based' CHECK (calculation_method IN ('rule_based', 'ai_predicted', 'hybrid')),
  
  -- Reasons
  top_positive_factors text[] DEFAULT ARRAY[]::text[],
  top_negative_factors text[] DEFAULT ARRAY[]::text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead Score History
CREATE TABLE IF NOT EXISTS lead_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  
  -- Historical score
  score int NOT NULL,
  score_change int,
  
  -- Reason for change
  change_reason text,
  triggering_event text,
  
  recorded_at timestamptz DEFAULT now()
);

-- Contact Activities (Enhanced)
CREATE TABLE IF NOT EXISTS contact_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  
  -- Activity details
  activity_type text NOT NULL CHECK (activity_type IN (
    'email_sent', 'email_opened', 'email_clicked', 'email_replied',
    'call_made', 'call_received', 'voicemail_left',
    'meeting_scheduled', 'meeting_completed', 'meeting_no_show',
    'website_visit', 'demo_requested', 'trial_started', 'trial_converted',
    'document_viewed', 'proposal_sent', 'contract_signed',
    'support_ticket', 'feature_request', 'pricing_inquiry',
    'linkedin_connection', 'linkedin_message',
    'note_added', 'status_changed'
  )),
  
  -- Activity content
  title text NOT NULL,
  description text,
  
  -- Related objects
  related_email_id uuid,
  related_call_id uuid,
  related_meeting_id uuid,
  related_conversation_id uuid,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- AI insights
  sentiment_detected text CHECK (sentiment_detected IN ('positive', 'neutral', 'negative')),
  intent_detected text,
  urgency_level text CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  ai_summary text,
  ai_suggested_action text,
  
  -- Attribution
  performed_by_user_id uuid REFERENCES auth.users(id),
  performed_by_agent boolean DEFAULT false,
  
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Opportunity Pipeline
CREATE TABLE IF NOT EXISTS opportunity_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Opportunity details
  opportunity_name text NOT NULL,
  description text,
  
  -- Contact/Company
  primary_contact_id uuid,
  company_name text NOT NULL,
  
  -- Pipeline stage
  stage text NOT NULL CHECK (stage IN (
    'lead', 'qualified', 'meeting_scheduled', 'demo_completed',
    'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'
  )),
  stage_changed_at timestamptz DEFAULT now(),
  
  -- Value
  estimated_value_usd decimal(15,2),
  probability_pct int CHECK (probability_pct BETWEEN 0 AND 100),
  expected_close_date date,
  
  -- AI predictions
  predicted_close_probability decimal(5,2),
  predicted_close_date date,
  predicted_value_usd decimal(15,2),
  at_risk boolean DEFAULT false,
  risk_factors text[] DEFAULT ARRAY[]::text[],
  
  -- Sales velocity
  days_in_current_stage int DEFAULT 0,
  total_days_in_pipeline int DEFAULT 0,
  expected_days_to_close int,
  
  -- Assignment
  assigned_to_user_id uuid REFERENCES auth.users(id),
  assigned_to_staff_id uuid REFERENCES staff_accounts(id),
  
  -- Competition
  competitors text[] DEFAULT ARRAY[]::text[],
  competitive_situation text,
  
  -- Outcome (for closed opportunities)
  outcome_reason text,
  lost_to_competitor text,
  closed_notes text,
  actual_close_date date,
  actual_value_usd decimal(15,2),
  
  -- Status
  status text DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'abandoned')),
  
  -- Source attribution
  source text CHECK (source IN ('inbound', 'outbound', 'referral', 'partner', 'marketing', 'ai_generated')),
  source_campaign text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Opportunity Stage History
CREATE TABLE IF NOT EXISTS opportunity_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunity_pipeline(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  from_stage text,
  to_stage text NOT NULL,
  
  days_in_previous_stage int,
  changed_by_user_id uuid REFERENCES auth.users(id),
  change_reason text,
  
  changed_at timestamptz DEFAULT now()
);

-- Competitive Intelligence
CREATE TABLE IF NOT EXISTS competitive_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Competitor details
  competitor_name text NOT NULL,
  competitor_domain text,
  
  -- Intelligence type
  intelligence_type text NOT NULL CHECK (intelligence_type IN (
    'win_loss', 'feature_comparison', 'pricing_intel',
    'customer_feedback', 'market_position', 'product_update',
    'mention_in_call', 'mention_in_email'
  )),
  
  -- Content
  title text NOT NULL,
  description text,
  source text,
  source_url text,
  
  -- Context
  related_opportunity_id uuid REFERENCES opportunity_pipeline(id),
  related_contact_id uuid,
  
  -- Analysis
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  key_insights text[] DEFAULT ARRAY[]::text[],
  action_items text[] DEFAULT ARRAY[]::text[],
  
  -- Metadata
  tags text[] DEFAULT ARRAY[]::text[],
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Win/Loss Analysis
CREATE TABLE IF NOT EXISTS win_loss_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunity_pipeline(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Outcome
  outcome text NOT NULL CHECK (outcome IN ('won', 'lost')),
  
  -- Primary reasons (ranked)
  primary_reason text NOT NULL,
  secondary_reasons text[] DEFAULT ARRAY[]::text[],
  
  -- Competition
  competed_against text[] DEFAULT ARRAY[]::text[],
  winner text,
  
  -- Decision factors
  decision_factors jsonb DEFAULT '{}'::jsonb,
  key_differentiators text[] DEFAULT ARRAY[]::text[],
  
  -- Feedback
  customer_feedback text,
  internal_notes text,
  
  -- Lessons learned
  what_went_well text[] DEFAULT ARRAY[]::text[],
  what_could_improve text[] DEFAULT ARRAY[]::text[],
  action_items text[] DEFAULT ARRAY[]::text[],
  
  -- Attribution
  analyzed_by uuid REFERENCES auth.users(id),
  analyzed_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_tenant ON lead_enrichment_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_contact ON lead_enrichment_data(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_company ON lead_enrichment_data(company_domain) WHERE company_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_tenant ON lead_scoring_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_tenant ON lead_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_grade ON lead_scores(score_grade);
CREATE INDEX IF NOT EXISTS idx_lead_scores_tier ON lead_scores(score_tier);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_contact ON lead_score_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_recorded ON lead_score_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_activities_tenant ON contact_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact ON contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_occurred ON contact_activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_tenant ON opportunity_pipeline(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_stage ON opportunity_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_status ON opportunity_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_contact ON opportunity_pipeline(primary_contact_id) WHERE primary_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_pipeline_assigned ON opportunity_pipeline(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_opp ON opportunity_stage_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_tenant ON competitive_intelligence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_competitor ON competitive_intelligence(competitor_name);
CREATE INDEX IF NOT EXISTS idx_competitive_intel_type ON competitive_intelligence(intelligence_type);
CREATE INDEX IF NOT EXISTS idx_win_loss_analysis_opp ON win_loss_analysis(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_win_loss_analysis_outcome ON win_loss_analysis(outcome);

-- Enable Row Level Security
ALTER TABLE lead_enrichment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE win_loss_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_enrichment_data
CREATE POLICY "Tenant staff can view enrichment data"
  ON lead_enrichment_data FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage enrichment data"
  ON lead_enrichment_data FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for lead_scoring_rules
CREATE POLICY "Tenant staff can view scoring rules"
  ON lead_scoring_rules FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant admins can manage scoring rules"
  ON lead_scoring_rules FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role IN ('admin', 'general_manager')
      AND sa.status = 'active'
    )
  );

-- RLS Policies for lead_scores
CREATE POLICY "Tenant staff can view lead scores"
  ON lead_scores FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage lead scores"
  ON lead_scores FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for lead_score_history
CREATE POLICY "Tenant staff can view score history"
  ON lead_score_history FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can insert score history"
  ON lead_score_history FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for contact_activities
CREATE POLICY "Tenant staff can view contact activities"
  ON contact_activities FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage contact activities"
  ON contact_activities FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for opportunity_pipeline
CREATE POLICY "Tenant staff can view opportunities"
  ON opportunity_pipeline FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage opportunities"
  ON opportunity_pipeline FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for opportunity_stage_history
CREATE POLICY "Tenant staff can view stage history"
  ON opportunity_stage_history FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can insert stage history"
  ON opportunity_stage_history FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for competitive_intelligence
CREATE POLICY "Tenant staff can view competitive intelligence"
  ON competitive_intelligence FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage competitive intelligence"
  ON competitive_intelligence FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for win_loss_analysis
CREATE POLICY "Tenant staff can view win/loss analysis"
  ON win_loss_analysis FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage win/loss analysis"
  ON win_loss_analysis FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );