/*
  # Create Auditor Tables, Constraints, and RLS Policies

  ## Tables Created
  1. auditor_applications - Application submissions
  2. auditor_profiles - Certified auditor profiles
  3. auditor_qualifications - Professional credentials
  4. auditor_exam_questions - Exam question bank
  5. auditor_exam_attempts - Exam history
  6. auditor_fee_payments - Billing records
  7. auditor_reviews - Performance reviews
  8. auditor_tenant_preferences - Fund preferences
  9. auditor_assignments - Audit assignments

  ## Security
  - Comprehensive RLS policies for each table
  - Role-based access control
  - Data isolation per role category
*/

-- Step 1: Relax user_roles constraints to allow auditors without tenant_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_tenant_required'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT check_tenant_required;
  END IF;
  
  ALTER TABLE user_roles ADD CONSTRAINT check_tenant_required 
    CHECK (
      role_category IN ('superadmin', 'auditor') OR tenant_id IS NOT NULL
    );
END $$;

-- Step 2: Create auditor_applications table
CREATE TABLE IF NOT EXISTS auditor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Firm Information
  firm_name text NOT NULL,
  registration_number text,
  jurisdiction text NOT NULL,
  website text,
  years_in_operation integer,
  
  -- Contact Details
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  professional_title text,
  
  -- Professional Background
  specializations jsonb DEFAULT '[]'::jsonb,
  years_of_experience integer NOT NULL,
  certifications_held jsonb DEFAULT '[]'::jsonb,
  methodology_description text,
  resume_url text,
  
  -- Motivation
  motivation_statement text NOT NULL,
  
  -- Acknowledgments
  fee_acknowledged boolean DEFAULT false,
  exam_acknowledged boolean DEFAULT false,
  standards_acknowledged boolean DEFAULT false,
  
  -- Workflow
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'exam_pending', 'exam_completed', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewer_notes text,
  rejection_reason text,
  
  -- Timestamps
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create auditor_profiles table
CREATE TABLE IF NOT EXISTS auditor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES auditor_applications(id),
  
  -- Public Profile
  firm_name text NOT NULL,
  registration_number text,
  bio text,
  profile_photo_url text,
  website text,
  
  -- Expertise
  specializations jsonb DEFAULT '[]'::jsonb,
  jurisdictions_covered jsonb DEFAULT '[]'::jsonb,
  years_of_experience integer NOT NULL,
  
  -- Certification Status
  certification_status text NOT NULL DEFAULT 'active' CHECK (certification_status IN ('active', 'suspended', 'revoked', 'expired')),
  certification_granted_at timestamptz DEFAULT now(),
  certification_expires_at timestamptz DEFAULT (now() + interval '1 year'),
  suspension_reason text,
  revocation_reason text,
  
  -- Billing
  annual_fee_amount integer DEFAULT 250000,
  monthly_billing_amount integer DEFAULT 20834,
  next_billing_date timestamptz DEFAULT (now() + interval '1 month'),
  last_payment_at timestamptz,
  payment_status text DEFAULT 'current' CHECK (payment_status IN ('current', 'overdue', 'suspended')),
  
  -- Performance Metrics
  total_audits_completed integer DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0.00,
  
  -- Visibility
  is_publicly_listed boolean DEFAULT true,
  
  -- Custom Fee Schedule
  custom_fee_schedule jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Create auditor_qualifications table
CREATE TABLE IF NOT EXISTS auditor_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_profile_id uuid NOT NULL REFERENCES auditor_profiles(id) ON DELETE CASCADE,
  
  -- Qualification Details
  qualification_name text NOT NULL,
  issuing_body text NOT NULL,
  credential_number text,
  
  -- Validity
  issue_date date,
  expiry_date date,
  verification_url text,
  
  -- Verification
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  verification_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 5: Create auditor_exam_questions table
CREATE TABLE IF NOT EXISTS auditor_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Question Organization
  section text NOT NULL CHECK (section IN ('valuation_principles', 'regulatory_knowledge', 'integrity_ethics', 'attention_to_detail', 'platform_knowledge')),
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'scenario', 'practical')),
  difficulty text DEFAULT 'standard' CHECK (difficulty IN ('standard', 'advanced')),
  
  -- Question Content
  question_text text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  explanation text,
  
  -- Scoring
  points_value integer DEFAULT 1,
  
  -- Version Control
  version_number integer DEFAULT 1,
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 6: Create auditor_exam_attempts table
CREATE TABLE IF NOT EXISTS auditor_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES auditor_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Exam Details
  exam_version integer DEFAULT 1,
  attempt_number integer NOT NULL,
  
  -- Scoring
  total_score integer NOT NULL,
  passing_score integer DEFAULT 80,
  passed boolean NOT NULL,
  section_scores jsonb DEFAULT '{}'::jsonb,
  
  -- Timing
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  time_taken_minutes integer,
  
  -- Answers
  answers jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Step 7: Create auditor_fee_payments table
CREATE TABLE IF NOT EXISTS auditor_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_profile_id uuid NOT NULL REFERENCES auditor_profiles(id) ON DELETE CASCADE,
  
  -- Payment Details
  amount integer NOT NULL,
  payment_date timestamptz DEFAULT now(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Payment Method
  payment_method text,
  payment_reference text,
  transaction_id text,
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  is_monthly boolean DEFAULT true,
  
  -- Notes
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 8: Create auditor_reviews table
CREATE TABLE IF NOT EXISTS auditor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_profile_id uuid NOT NULL REFERENCES auditor_profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Review Details
  review_type text NOT NULL CHECK (review_type IN ('annual_review', 'complaint_investigation', 'performance_review')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  findings text NOT NULL,
  
  -- Recommendation
  recommendation text NOT NULL CHECK (recommendation IN ('maintain', 'warn', 'suspend', 'revoke')),
  action_taken text,
  
  -- Timestamps
  review_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Step 9: Create auditor_tenant_preferences table
CREATE TABLE IF NOT EXISTS auditor_tenant_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  auditor_profile_id uuid NOT NULL REFERENCES auditor_profiles(id) ON DELETE CASCADE,
  
  -- Preference
  preference_status text NOT NULL DEFAULT 'neutral' CHECK (preference_status IN ('preferred', 'blocked', 'neutral')),
  notes text,
  
  -- Set By
  set_by uuid REFERENCES auth.users(id),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint
  UNIQUE(tenant_id, auditor_profile_id)
);

-- Step 10: Create auditor_assignments table
CREATE TABLE IF NOT EXISTS auditor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_profile_id uuid NOT NULL REFERENCES auditor_profiles(id) ON DELETE CASCADE,
  listing_id uuid,
  tenant_id uuid REFERENCES platform_tenants(id),
  
  -- Assignment Details
  assignment_type text DEFAULT 'listing_audit' CHECK (assignment_type IN ('listing_audit', 'nav_verification', 'valuation_review', 'compliance_check')),
  assignment_status text NOT NULL DEFAULT 'offered' CHECK (assignment_status IN ('offered', 'accepted', 'declined', 'in_progress', 'completed', 'disputed')),
  
  -- Report and Attestation
  auditor_report text,
  attestation_text text,
  attestation_hash text,
  findings jsonb DEFAULT '{}'::jsonb,
  recommendation text,
  
  -- Fee
  fee_agreed integer,
  fee_paid boolean DEFAULT false,
  fee_paid_at timestamptz,
  
  -- Workflow Timestamps
  offered_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  completed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 11: Create indexes
CREATE INDEX IF NOT EXISTS idx_auditor_applications_user_id ON auditor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_auditor_applications_status ON auditor_applications(status);
CREATE INDEX IF NOT EXISTS idx_auditor_applications_submitted_at ON auditor_applications(submitted_at);

CREATE INDEX IF NOT EXISTS idx_auditor_profiles_user_id ON auditor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_auditor_profiles_certification_status ON auditor_profiles(certification_status);
CREATE INDEX IF NOT EXISTS idx_auditor_profiles_is_publicly_listed ON auditor_profiles(is_publicly_listed);
CREATE INDEX IF NOT EXISTS idx_auditor_profiles_next_billing_date ON auditor_profiles(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_auditor_profiles_certification_expires_at ON auditor_profiles(certification_expires_at);

CREATE INDEX IF NOT EXISTS idx_auditor_qualifications_auditor_profile_id ON auditor_qualifications(auditor_profile_id);
CREATE INDEX IF NOT EXISTS idx_auditor_qualifications_is_verified ON auditor_qualifications(is_verified);

CREATE INDEX IF NOT EXISTS idx_auditor_exam_questions_section ON auditor_exam_questions(section);
CREATE INDEX IF NOT EXISTS idx_auditor_exam_questions_is_active ON auditor_exam_questions(is_active);

CREATE INDEX IF NOT EXISTS idx_auditor_exam_attempts_application_id ON auditor_exam_attempts(application_id);
CREATE INDEX IF NOT EXISTS idx_auditor_exam_attempts_user_id ON auditor_exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_auditor_exam_attempts_passed ON auditor_exam_attempts(passed);

CREATE INDEX IF NOT EXISTS idx_auditor_fee_payments_auditor_profile_id ON auditor_fee_payments(auditor_profile_id);
CREATE INDEX IF NOT EXISTS idx_auditor_fee_payments_status ON auditor_fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_auditor_fee_payments_payment_date ON auditor_fee_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_auditor_reviews_auditor_profile_id ON auditor_reviews(auditor_profile_id);
CREATE INDEX IF NOT EXISTS idx_auditor_reviews_review_type ON auditor_reviews(review_type);

CREATE INDEX IF NOT EXISTS idx_auditor_tenant_preferences_tenant_id ON auditor_tenant_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auditor_tenant_preferences_auditor_profile_id ON auditor_tenant_preferences(auditor_profile_id);
CREATE INDEX IF NOT EXISTS idx_auditor_tenant_preferences_preference_status ON auditor_tenant_preferences(preference_status);

CREATE INDEX IF NOT EXISTS idx_auditor_assignments_auditor_profile_id ON auditor_assignments(auditor_profile_id);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_listing_id ON auditor_assignments(listing_id);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_tenant_id ON auditor_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auditor_assignments_assignment_status ON auditor_assignments(assignment_status);

-- Step 12: Enable RLS
ALTER TABLE auditor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_tenant_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditor_assignments ENABLE ROW LEVEL SECURITY;

-- Step 13: RLS Policies for auditor_applications

CREATE POLICY "Anyone can submit auditor application"
  ON auditor_applications FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can view own application"
  ON auditor_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pending application"
  ON auditor_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'submitted')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all applications"
  ON auditor_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can update applications"
  ON auditor_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 14: RLS Policies for auditor_profiles

CREATE POLICY "Auditors can view own profile"
  ON auditor_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Auditors can update own profile"
  ON auditor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view public auditor profiles"
  ON auditor_profiles FOR SELECT
  TO authenticated
  USING (is_publicly_listed = true AND certification_status = 'active');

CREATE POLICY "Platform admins can view all auditor profiles"
  ON auditor_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can create auditor profiles"
  ON auditor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can update auditor profiles"
  ON auditor_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 15: RLS Policies for auditor_qualifications

CREATE POLICY "Auditors can view own qualifications"
  ON auditor_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_qualifications.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Auditors can add own qualifications"
  ON auditor_qualifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_qualifications.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Auditors can update own qualifications"
  ON auditor_qualifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_qualifications.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_qualifications.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all qualifications"
  ON auditor_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can update qualifications"
  ON auditor_qualifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 16: RLS Policies for auditor_exam_questions

CREATE POLICY "Platform admins can view exam questions"
  ON auditor_exam_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can insert exam questions"
  ON auditor_exam_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can update exam questions"
  ON auditor_exam_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 17: RLS Policies for auditor_exam_attempts

CREATE POLICY "Users can view own exam attempts"
  ON auditor_exam_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exam attempts"
  ON auditor_exam_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all exam attempts"
  ON auditor_exam_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 18: RLS Policies for auditor_fee_payments

CREATE POLICY "Auditors can view own fee payments"
  ON auditor_fee_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_fee_payments.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all fee payments"
  ON auditor_fee_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can insert fee payments"
  ON auditor_fee_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can update fee payments"
  ON auditor_fee_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 19: RLS Policies for auditor_reviews

CREATE POLICY "Auditors can view own reviews"
  ON auditor_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_reviews.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all reviews"
  ON auditor_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Platform admins can create reviews"
  ON auditor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

-- Step 20: RLS Policies for auditor_tenant_preferences

CREATE POLICY "Tenant staff can view own tenant preferences"
  ON auditor_tenant_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = auditor_tenant_preferences.tenant_id
      AND user_roles.role_category = 'staff_user'
    )
  );

CREATE POLICY "Tenant admins can insert preferences"
  ON auditor_tenant_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = auditor_tenant_preferences.tenant_id
      AND (user_roles.role_category = 'tenant_admin' OR user_roles.role_detail = 'tenant_admin')
    )
  );

CREATE POLICY "Tenant admins can update preferences"
  ON auditor_tenant_preferences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = auditor_tenant_preferences.tenant_id
      AND (user_roles.role_category = 'tenant_admin' OR user_roles.role_detail = 'tenant_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = auditor_tenant_preferences.tenant_id
      AND (user_roles.role_category = 'tenant_admin' OR user_roles.role_detail = 'tenant_admin')
    )
  );

CREATE POLICY "Auditors can view preferences about themselves"
  ON auditor_tenant_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_tenant_preferences.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

-- Step 21: RLS Policies for auditor_assignments

CREATE POLICY "Auditors can view own assignments"
  ON auditor_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_assignments.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Auditors can update own assignments"
  ON auditor_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_assignments.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auditor_profiles
      WHERE auditor_profiles.id = auditor_assignments.auditor_profile_id
      AND auditor_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant staff can view tenant assignments"
  ON auditor_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = auditor_assignments.tenant_id
    )
  );

CREATE POLICY "Tenant admins can create assignments"
  ON auditor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.tenant_id = auditor_assignments.tenant_id
      AND (user_roles.role_category = 'tenant_admin' OR user_roles.role_detail = 'tenant_admin')
    )
  );

CREATE POLICY "Platform admins can view all assignments"
  ON auditor_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Clients can view completed assignments"
  ON auditor_assignments FOR SELECT
  TO authenticated
  USING (
    assignment_status = 'completed'
    AND attestation_hash IS NOT NULL
  );
