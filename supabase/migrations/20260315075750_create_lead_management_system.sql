/*
  # AI Lead Management System

  1. New Tables
    - `ai_lead_imports`
      - Tracks bulk CSV/Excel uploads
      - Validation status and error handling
      - Import statistics and metadata
      
    - `ai_lead_queue`
      - Central queue for lead processing
      - Priority scoring and stage management
      - Next action scheduling
      
    - `ai_lead_assignments`
      - Tracks which AI agent is processing which lead
      - Prevents duplicate processing
      - Load balancing across agent instances
      
    - `ai_lead_lifecycle_events`
      - Complete audit trail of stage transitions
      - Tracks every interaction and status change
      - Performance analytics and reporting
      
    - `ai_lead_enrichment_data`
      - Stores enriched data from external APIs
      - Company information, social profiles, technologies used
      - Helps with personalization and qualification

  2. Security
    - Enable RLS on all tables
    - Only tenant staff can access their leads
    - Complete audit trail for compliance
    - Secure handling of contact information

  3. Features
    - Bulk lead import with validation
    - Intelligent lead routing and assignment
    - Priority-based queue management
    - Complete lifecycle tracking
    - Enrichment integration ready
*/

-- AI Lead Imports
CREATE TABLE IF NOT EXISTS ai_lead_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Import details
  import_name text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  file_url text,
  
  -- Processing status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Statistics
  total_rows int DEFAULT 0,
  valid_rows int DEFAULT 0,
  invalid_rows int DEFAULT 0,
  duplicate_rows int DEFAULT 0,
  new_contacts int DEFAULT 0,
  updated_contacts int DEFAULT 0,
  
  -- Field mapping (maps CSV columns to system fields)
  field_mapping jsonb DEFAULT '{}'::jsonb,
  
  -- Validation results
  validation_errors jsonb DEFAULT '[]'::jsonb,
  
  -- Campaign assignment
  assign_to_campaign_id uuid,
  auto_enroll_in_sequence boolean DEFAULT true,
  
  -- Progress tracking
  processed_rows int DEFAULT 0,
  progress_percentage decimal(5,2) DEFAULT 0,
  
  -- Error handling
  error_message text,
  failed_rows jsonb DEFAULT '[]'::jsonb,
  
  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  
  -- Metadata
  imported_by uuid REFERENCES auth.users(id),
  import_source text DEFAULT 'manual',
  tags text[] DEFAULT ARRAY[]::text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Lead Queue
CREATE TABLE IF NOT EXISTS ai_lead_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Contact reference
  contact_id uuid NOT NULL,
  contact_email text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_company text,
  
  -- Lead source
  import_batch_id uuid REFERENCES ai_lead_imports(id),
  lead_source text DEFAULT 'import' CHECK (lead_source IN ('import', 'webform', 'api', 'referral', 'manual', 'marketplace')),
  
  -- Current status
  queue_status text DEFAULT 'new' CHECK (queue_status IN (
    'new', 'enriching', 'ready', 'in_progress', 'contacted', 
    'engaged', 'qualified', 'demo_scheduled', 'trial_active',
    'payment_sent', 'converted', 'lost', 'paused', 'archived'
  )),
  
  -- Sales stage
  sales_stage text DEFAULT 'prospecting' CHECK (sales_stage IN (
    'prospecting', 'contact_made', 'discovery', 'demo', 
    'trial', 'negotiation', 'closed_won', 'closed_lost'
  )),
  
  -- Priority and scoring
  priority_score int DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
  lead_score int DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  engagement_score int DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  
  -- Campaign tracking
  assigned_campaign_id uuid,
  assigned_sequence_id uuid REFERENCES ai_email_sequences(id),
  current_sequence_step int DEFAULT 0,
  
  -- Journey tracking
  journey_template_id uuid,
  journey_instance_id uuid,
  journey_stage text,
  
  -- Action scheduling
  next_action_type text CHECK (next_action_type IN ('email', 'call', 'sms', 'wait', 'demo', 'trial', 'payment', 'review')),
  next_action_scheduled_at timestamptz,
  last_action_taken_at timestamptz,
  
  -- Engagement metrics
  emails_sent int DEFAULT 0,
  emails_opened int DEFAULT 0,
  emails_clicked int DEFAULT 0,
  emails_replied int DEFAULT 0,
  calls_attempted int DEFAULT 0,
  calls_connected int DEFAULT 0,
  meetings_booked int DEFAULT 0,
  
  -- Disqualification
  is_disqualified boolean DEFAULT false,
  disqualification_reason text,
  disqualified_at timestamptz,
  
  -- Assignment
  assigned_to_agent_id uuid REFERENCES ai_agent_configs(id),
  assigned_to_human_id uuid REFERENCES auth.users(id),
  assignment_type text DEFAULT 'ai' CHECK (assignment_type IN ('ai', 'human', 'hybrid')),
  
  -- Timing
  entered_queue_at timestamptz DEFAULT now(),
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  qualified_at timestamptz,
  converted_at timestamptz,
  
  -- Metadata
  custom_fields jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, contact_email)
);

-- AI Lead Assignments
CREATE TABLE IF NOT EXISTS ai_lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Assignment details
  lead_queue_id uuid NOT NULL REFERENCES ai_lead_queue(id) ON DELETE CASCADE,
  agent_config_id uuid NOT NULL REFERENCES ai_agent_configs(id) ON DELETE CASCADE,
  
  -- Assignment status
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'escalated', 'reassigned')),
  
  -- Processing info
  agent_instance_id text,
  started_processing_at timestamptz DEFAULT now(),
  completed_processing_at timestamptz,
  
  -- Actions taken
  actions_taken int DEFAULT 0,
  last_action_at timestamptz,
  
  -- Performance
  response_received boolean DEFAULT false,
  positive_response boolean DEFAULT false,
  outcome text CHECK (outcome IN ('success', 'no_response', 'not_interested', 'escalated', 'error')),
  
  -- Escalation
  escalated_to_user_id uuid REFERENCES auth.users(id),
  escalation_reason text,
  escalated_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Lead Lifecycle Events
CREATE TABLE IF NOT EXISTS ai_lead_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Lead reference
  lead_queue_id uuid NOT NULL REFERENCES ai_lead_queue(id) ON DELETE CASCADE,
  contact_id uuid,
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'enriched', 'scored', 'assigned', 'contacted',
    'email_sent', 'email_opened', 'email_clicked', 'email_replied',
    'call_attempted', 'call_connected', 'voicemail_left',
    'meeting_scheduled', 'meeting_completed', 'meeting_no_show',
    'demo_completed', 'trial_started', 'trial_ended',
    'payment_requested', 'payment_received', 'converted',
    'qualified', 'disqualified', 'paused', 'resumed',
    'escalated', 'reassigned', 'archived', 'lost'
  )),
  event_description text NOT NULL,
  
  -- Stage tracking
  previous_status text,
  new_status text,
  previous_stage text,
  new_stage text,
  
  -- Actor
  triggered_by_type text CHECK (triggered_by_type IN ('ai_agent', 'human', 'system', 'automation')),
  triggered_by_agent_id uuid REFERENCES ai_agent_configs(id),
  triggered_by_user_id uuid REFERENCES auth.users(id),
  
  -- Related records
  conversation_thread_id uuid REFERENCES ai_conversation_threads(id),
  email_sequence_enrollment_id uuid,
  meeting_booking_id uuid REFERENCES ai_meeting_bookings(id),
  
  -- Event data
  event_data jsonb DEFAULT '{}'::jsonb,
  
  -- Metrics impact
  score_change int,
  priority_change int,
  
  created_at timestamptz DEFAULT now()
);

-- AI Lead Enrichment Data
CREATE TABLE IF NOT EXISTS ai_lead_enrichment_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Lead reference
  lead_queue_id uuid NOT NULL REFERENCES ai_lead_queue(id) ON DELETE CASCADE,
  contact_id uuid,
  
  -- Enrichment source
  enrichment_provider text NOT NULL CHECK (enrichment_provider IN ('clearbit', 'zoominfo', 'apollo', 'lusha', 'hunter', 'custom')),
  enrichment_type text NOT NULL CHECK (enrichment_type IN ('person', 'company', 'social', 'technographic', 'intent')),
  
  -- Person data
  person_data jsonb DEFAULT '{}'::jsonb,
  job_title text,
  seniority_level text,
  department text,
  
  -- Company data
  company_data jsonb DEFAULT '{}'::jsonb,
  company_name text,
  company_domain text,
  company_size text,
  company_industry text,
  company_revenue text,
  employee_count int,
  
  -- Social profiles
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  
  -- Technographic data
  technologies_used text[] DEFAULT ARRAY[]::text[],
  tech_stack jsonb DEFAULT '{}'::jsonb,
  
  -- Intent signals
  intent_signals jsonb DEFAULT '[]'::jsonb,
  intent_score int CHECK (intent_score BETWEEN 0 AND 100),
  
  -- Data quality
  confidence_score decimal(3,2),
  data_freshness_days int,
  
  -- Status
  enrichment_status text DEFAULT 'completed' CHECK (enrichment_status IN ('pending', 'completed', 'failed', 'partial')),
  error_message text,
  
  -- Cost tracking
  cost_usd decimal(10,4),
  
  enriched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_lead_imports_tenant ON ai_lead_imports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_imports_status ON ai_lead_imports(status);
CREATE INDEX IF NOT EXISTS idx_ai_lead_imports_created ON ai_lead_imports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_tenant ON ai_lead_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_contact ON ai_lead_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_status ON ai_lead_queue(queue_status);
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_stage ON ai_lead_queue(sales_stage);
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_priority ON ai_lead_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_next_action ON ai_lead_queue(next_action_scheduled_at) WHERE next_action_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_email ON ai_lead_queue(contact_email);

CREATE INDEX IF NOT EXISTS idx_ai_lead_assignments_lead ON ai_lead_assignments(lead_queue_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_assignments_agent ON ai_lead_assignments(agent_config_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_assignments_status ON ai_lead_assignments(status);

CREATE INDEX IF NOT EXISTS idx_ai_lead_lifecycle_tenant ON ai_lead_lifecycle_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_lifecycle_lead ON ai_lead_lifecycle_events(lead_queue_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_lifecycle_type ON ai_lead_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_lead_lifecycle_created ON ai_lead_lifecycle_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_lead_enrichment_lead ON ai_lead_enrichment_data(lead_queue_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_enrichment_provider ON ai_lead_enrichment_data(enrichment_provider);

-- Enable Row Level Security
ALTER TABLE ai_lead_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_lead_enrichment_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_lead_imports
CREATE POLICY "Tenant staff can view lead imports"
  ON ai_lead_imports FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can create lead imports"
  ON ai_lead_imports FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can update lead imports"
  ON ai_lead_imports FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_lead_queue
CREATE POLICY "Tenant staff can view lead queue"
  ON ai_lead_queue FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Tenant staff can manage lead queue"
  ON ai_lead_queue FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_lead_assignments
CREATE POLICY "Tenant staff can view lead assignments"
  ON ai_lead_assignments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage lead assignments"
  ON ai_lead_assignments FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_lead_lifecycle_events
CREATE POLICY "Tenant staff can view lifecycle events"
  ON ai_lead_lifecycle_events FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can log lifecycle events"
  ON ai_lead_lifecycle_events FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- RLS Policies for ai_lead_enrichment_data
CREATE POLICY "Tenant staff can view enrichment data"
  ON ai_lead_enrichment_data FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can manage enrichment data"
  ON ai_lead_enrichment_data FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );