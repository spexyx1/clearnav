/*
  # CRM, Staff Management, and Compliance System

  ## Overview
  Comprehensive migration adding multi-team operations, CRM, compliance workflows, 
  and advanced portfolio risk analytics for exempt investment advisor operations.

  ## 1. Staff Accounts & Permissions
    - `staff_accounts`: Team member accounts with role-based access
      - id, email, full_name, role, phone, status, permissions, created_by
    - `staff_permissions`: Granular permission tracking
      - Links staff to specific module access rights
    - `staff_audit_log`: Complete audit trail of all staff actions

  ## 2. CRM & Contact Management
    - `crm_contacts`: Comprehensive contact database
      - Basic info, lifecycle stage, accreditation status, lead source, tags
    - `contact_interactions`: Timeline of all communications and activities
    - `contact_tags`: Flexible tagging system for segmentation
    - `lead_pipeline`: Sales pipeline tracking with stages

  ## 3. Onboarding & Compliance
    - `onboarding_workflows`: Multi-step workflow tracking per prospect
      - Tracks KYC/AML, accreditation, FATCA, subscription agreements
    - `compliance_documents`: Document repository with types and verification status
    - `kyc_aml_records`: Specific KYC/AML verification data
    - `accreditation_verification`: Accredited investor verification records

  ## 4. Communication Management
    - `communication_log`: All email and SMS communications
    - `email_templates`: Reusable email templates with merge fields
    - `sms_templates`: SMS templates for notifications
    - `email_campaigns`: Marketing campaign tracking
    - `campaign_analytics`: Campaign performance metrics

  ## 5. Task & Activity Management
    - `tasks_activities`: Task creation, assignment, and tracking
    - `task_reminders`: Automated reminder system

  ## 6. Risk Analytics
    - `portfolio_risk_metrics`: Value at Risk, Sharpe, Sortino, and other metrics
    - `risk_calculations_history`: Historical risk metric tracking

  ## 7. Marketing & Events
    - `marketing_campaigns`: Campaign management
    - `investor_events`: Webinar and meeting tracking

  ## Security
    - RLS enabled on all tables
    - Staff can only see data appropriate to their role
    - Clients can only see their own data
    - Complete audit trail for compliance
*/

-- 1. STAFF ACCOUNTS AND PERMISSIONS

CREATE TABLE IF NOT EXISTS staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN (
    'general_manager', 
    'compliance_manager', 
    'accountant', 
    'cfo', 
    'legal_counsel', 
    'admin'
  )),
  phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  permissions jsonb DEFAULT '{}',
  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_accounts(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff_accounts(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 2. CRM AND CONTACT MANAGEMENT

CREATE TABLE IF NOT EXISTS crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  company text,
  title text,
  address jsonb,
  timezone text DEFAULT 'America/New_York',
  lifecycle_stage text DEFAULT 'lead' CHECK (lifecycle_stage IN (
    'lead', 
    'prospect', 
    'qualified', 
    'onboarding', 
    'active_client', 
    'inactive'
  )),
  lead_source text,
  lead_score integer DEFAULT 0,
  accreditation_status text DEFAULT 'unknown' CHECK (accreditation_status IN (
    'unknown', 
    'pending_verification', 
    'verified_accredited', 
    'not_accredited'
  )),
  assigned_to uuid REFERENCES staff_accounts(id),
  estimated_investment_amount numeric(15,2),
  tags text[],
  custom_fields jsonb DEFAULT '{}',
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'do_not_contact')),
  converted_to_client_id uuid REFERENCES client_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff_accounts(id),
  interaction_type text NOT NULL CHECK (interaction_type IN (
    'email', 
    'sms', 
    'call', 
    'meeting', 
    'note', 
    'document_sent', 
    'document_signed'
  )),
  subject text,
  content text,
  direction text CHECK (direction IN ('inbound', 'outbound')),
  metadata jsonb DEFAULT '{}',
  interaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT '#3b82f6',
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN (
    'new_lead', 
    'contacted', 
    'qualified', 
    'accreditation_check', 
    'proposal_sent', 
    'negotiation', 
    'onboarding', 
    'won', 
    'lost'
  )),
  expected_close_date date,
  probability integer DEFAULT 0,
  value numeric(15,2),
  loss_reason text,
  notes text,
  entered_stage_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. ONBOARDING AND COMPLIANCE

CREATE TABLE IF NOT EXISTS onboarding_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'started' CHECK (status IN (
    'started', 
    'in_progress', 
    'pending_approval', 
    'approved', 
    'rejected', 
    'completed'
  )),
  current_step text DEFAULT 'accreditation',
  steps_completed text[] DEFAULT ARRAY[]::text[],
  accreditation_verified boolean DEFAULT false,
  kyc_aml_completed boolean DEFAULT false,
  fatca_completed boolean DEFAULT false,
  subscription_agreement_signed boolean DEFAULT false,
  banking_info_collected boolean DEFAULT false,
  risk_tolerance_assessed boolean DEFAULT false,
  suitability_approved boolean DEFAULT false,
  compliance_approved_by uuid REFERENCES staff_accounts(id),
  compliance_approved_at timestamptz,
  rejection_reason text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id),
  client_id uuid REFERENCES client_profiles(id),
  document_type text NOT NULL CHECK (document_type IN (
    'drivers_license', 
    'passport', 
    'proof_of_address', 
    'accreditation_letter', 
    'tax_return', 
    'bank_statement', 
    'subscription_agreement', 
    'fatca_form', 
    'beneficial_ownership', 
    'other'
  )),
  file_url text NOT NULL,
  file_name text NOT NULL,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 
    'verified', 
    'rejected', 
    'expired'
  )),
  verified_by uuid REFERENCES staff_accounts(id),
  verified_at timestamptz,
  expiration_date date,
  notes text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyc_aml_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  full_legal_name text NOT NULL,
  date_of_birth date NOT NULL,
  ssn_last_four text,
  citizenship text,
  country_of_residence text,
  politically_exposed_person boolean DEFAULT false,
  verification_method text,
  id_verification_status text DEFAULT 'pending',
  aml_screening_status text DEFAULT 'pending',
  screening_results jsonb,
  verified_by uuid REFERENCES staff_accounts(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accreditation_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  verification_method text NOT NULL CHECK (verification_method IN (
    'income', 
    'net_worth', 
    'professional_certification', 
    'entity', 
    'third_party_letter'
  )),
  annual_income numeric(15,2),
  net_worth numeric(15,2),
  professional_certifications text[],
  entity_type text,
  verification_document_id uuid REFERENCES compliance_documents(id),
  verified_accredited boolean DEFAULT false,
  verified_by uuid REFERENCES staff_accounts(id),
  verified_at timestamptz,
  expiration_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. COMMUNICATION MANAGEMENT

CREATE TABLE IF NOT EXISTS communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id),
  client_id uuid REFERENCES client_profiles(id),
  staff_id uuid REFERENCES staff_accounts(id),
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  content text NOT NULL,
  to_address text NOT NULL,
  from_address text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN (
    'queued', 
    'sent', 
    'delivered', 
    'opened', 
    'clicked', 
    'bounced', 
    'failed'
  )),
  campaign_id uuid,
  metadata jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  category text,
  merge_fields text[],
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  category text,
  merge_fields text[],
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  segment_criteria jsonb,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 
    'scheduled', 
    'sending', 
    'sent', 
    'paused'
  )),
  scheduled_for timestamptz,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  bounced_count integer DEFAULT 0,
  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id),
  sent boolean DEFAULT false,
  delivered boolean DEFAULT false,
  opened boolean DEFAULT false,
  clicked boolean DEFAULT false,
  bounced boolean DEFAULT false,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. TASK AND ACTIVITY MANAGEMENT

CREATE TABLE IF NOT EXISTS tasks_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN (
    'call', 
    'email', 
    'meeting', 
    'follow_up', 
    'review_document', 
    'compliance_check', 
    'other'
  )),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'in_progress', 
    'completed', 
    'cancelled'
  )),
  assigned_to uuid REFERENCES staff_accounts(id),
  created_by uuid REFERENCES staff_accounts(id),
  related_to_contact uuid REFERENCES crm_contacts(id),
  related_to_client uuid REFERENCES client_profiles(id),
  due_date timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks_activities(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. PORTFOLIO RISK ANALYTICS

CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE,
  trust_account_id uuid REFERENCES trust_account(id),
  calculation_date date NOT NULL,
  
  -- Value at Risk
  var_95_1day numeric(15,2),
  var_99_1day numeric(15,2),
  var_95_10day numeric(15,2),
  
  -- Sharpe and Sortino Ratios
  sharpe_ratio numeric(10,4),
  sortino_ratio numeric(10,4),
  risk_free_rate numeric(10,4) DEFAULT 0.045,
  
  -- Volatility Metrics
  volatility_annualized numeric(10,4),
  downside_deviation numeric(10,4),
  
  -- Drawdown Metrics
  max_drawdown numeric(10,4),
  current_drawdown numeric(10,4),
  
  -- Risk-Adjusted Returns
  alpha numeric(10,4),
  beta numeric(10,4),
  
  -- Correlation
  correlation_sp500 numeric(10,4),
  correlation_bonds numeric(10,4),
  
  calculation_method text,
  lookback_period_days integer DEFAULT 252,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_calculations_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid REFERENCES trust_account(id) ON DELETE CASCADE,
  calculation_date timestamptz NOT NULL,
  portfolio_value numeric(15,2) NOT NULL,
  daily_return numeric(10,6),
  rolling_volatility numeric(10,4),
  rolling_sharpe numeric(10,4),
  created_at timestamptz DEFAULT now()
);

-- 7. MARKETING AND EVENTS

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text CHECK (campaign_type IN (
    'email', 
    'event', 
    'webinar', 
    'referral', 
    'content'
  )),
  status text DEFAULT 'planning' CHECK (status IN (
    'planning', 
    'active', 
    'completed', 
    'cancelled'
  )),
  start_date date,
  end_date date,
  budget numeric(15,2),
  actual_cost numeric(15,2) DEFAULT 0,
  leads_generated integer DEFAULT 0,
  conversions integer DEFAULT 0,
  roi numeric(10,2),
  created_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text CHECK (event_type IN (
    'webinar', 
    'meeting', 
    'conference', 
    'dinner', 
    'call'
  )),
  description text,
  event_date timestamptz NOT NULL,
  duration_minutes integer,
  location text,
  meeting_link text,
  max_attendees integer,
  registered_count integer DEFAULT 0,
  attended_count integer DEFAULT 0,
  host_staff_id uuid REFERENCES staff_accounts(id),
  status text DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 
    'in_progress', 
    'completed', 
    'cancelled'
  )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES investor_events(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES crm_contacts(id),
  client_id uuid REFERENCES client_profiles(id),
  registration_status text DEFAULT 'registered' CHECK (registration_status IN (
    'registered', 
    'attended', 
    'no_show', 
    'cancelled'
  )),
  registered_at timestamptz DEFAULT now(),
  attended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- INDEXES for performance

CREATE INDEX IF NOT EXISTS idx_staff_accounts_role ON staff_accounts(role);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_status ON staff_accounts(status);
CREATE INDEX IF NOT EXISTS idx_staff_audit_log_staff_id ON staff_audit_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_log_created_at ON staff_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_lifecycle_stage ON crm_contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned_to ON crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_contact_id ON lead_pipeline(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON lead_pipeline(stage);

CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_contact_id ON onboarding_workflows(contact_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_status ON onboarding_workflows(status);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_contact_id ON compliance_documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_client_id ON compliance_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_contact_id ON kyc_aml_records(contact_id);

CREATE INDEX IF NOT EXISTS idx_communication_log_contact_id ON communication_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_client_id ON communication_log(client_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_sent_at ON communication_log(sent_at);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks_activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks_activities(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks_activities(due_date);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_client_id ON portfolio_risk_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_date ON portfolio_risk_metrics(calculation_date);
CREATE INDEX IF NOT EXISTS idx_risk_history_trust_id ON risk_calculations_history(trust_account_id);

-- ROW LEVEL SECURITY

ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_aml_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_risk_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_calculations_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES - Staff can access based on their role and permissions

CREATE POLICY "Staff can view their own account"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "General managers can view all staff"
  ON staff_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role = 'general_manager'
      AND sa.status = 'active'
    )
  );

CREATE POLICY "General managers can manage all staff"
  ON staff_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role = 'general_manager'
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view CRM contacts"
  ON crm_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage CRM contacts"
  ON crm_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view interactions"
  ON contact_interactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can log interactions"
  ON contact_interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view tags"
  ON contact_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view pipeline"
  ON lead_pipeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage pipeline"
  ON lead_pipeline FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view onboarding workflows"
  ON onboarding_workflows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage onboarding"
  ON onboarding_workflows FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Compliance and managers can view compliance docs"
  ON compliance_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager', 'legal_counsel')
    )
  );

CREATE POLICY "Compliance and managers can manage compliance docs"
  ON compliance_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager', 'legal_counsel')
    )
  );

CREATE POLICY "Compliance staff can view KYC records"
  ON kyc_aml_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager', 'legal_counsel')
    )
  );

CREATE POLICY "Compliance staff can manage KYC records"
  ON kyc_aml_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager', 'legal_counsel')
    )
  );

CREATE POLICY "Compliance staff can view accreditation"
  ON accreditation_verification FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager', 'legal_counsel')
    )
  );

CREATE POLICY "Compliance staff can manage accreditation"
  ON accreditation_verification FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager', 'legal_counsel')
    )
  );

CREATE POLICY "Active staff can view communication log"
  ON communication_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can log communications"
  ON communication_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view SMS templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage SMS templates"
  ON sms_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view campaigns"
  ON email_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage campaigns"
  ON email_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view campaign analytics"
  ON campaign_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view tasks"
  ON tasks_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage tasks"
  ON tasks_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view reminders"
  ON task_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Clients can view their own risk metrics"
  ON portfolio_risk_metrics FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM client_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all risk metrics"
  ON portfolio_risk_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Staff can manage risk metrics"
  ON portfolio_risk_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'cfo', 'accountant')
    )
  );

CREATE POLICY "Staff can view risk history"
  ON risk_calculations_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view marketing campaigns"
  ON marketing_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage marketing campaigns"
  ON marketing_campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view events"
  ON investor_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can manage events"
  ON investor_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Active staff can view event registrations"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Staff can log audit events"
  ON staff_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Managers can view audit log"
  ON staff_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role IN ('general_manager', 'compliance_manager')
    )
  );

CREATE POLICY "Staff can view their permissions"
  ON staff_permissions FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff_accounts WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "General managers can manage permissions"
  ON staff_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.role = 'general_manager'
      AND sa.status = 'active'
    )
  );
