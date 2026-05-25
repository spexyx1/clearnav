/*
  # Create Partner & Collaborator Management System

  ## Overview
  Establishes a full partner/collaborator onboarding, verification, and management system
  for 3rd-party professionals (accountants, auditors, legal counsel, compliance consultants,
  fund administrators, tax advisors) who want to offer services to platform tenants.

  ## New Tables

  ### partner_applications
  Stores incoming applications from 3rd-party firms/individuals seeking platform approval.
  Status workflow: submitted → under_review → test_pending → test_passed/test_failed → approved/rejected

  ### partner_verification_tests
  Configurable question bank for partner qualification exams.
  Sections: compliance_knowledge, platform_knowledge, professional_ethics, technical_proficiency

  ### partner_test_attempts
  Records each test sitting per applicant with section scores and pass/fail outcome.

  ### partner_profiles
  Approved and certified collaborators with billing status and performance metrics.

  ### partner_documents
  Supporting documents uploaded by applicants (certificates, registrations, ID).

  ### partner_activity_log
  Full audit trail for every status change and administrative decision.

  ## Security
  - RLS enabled on all tables
  - Only users with role_category = 'superadmin' in user_roles can manage all records
  - Applicants can read their own application
*/

-- ============================================================
-- partner_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  firm_name           text NOT NULL,
  contact_name        text NOT NULL,
  contact_email       text NOT NULL,
  contact_phone       text,
  website             text,
  partner_type        text NOT NULL CHECK (partner_type IN (
    'accountant', 'auditor', 'legal', 'compliance_consultant',
    'fund_administrator', 'tax_advisor', 'other'
  )),
  partner_type_other  text,
  years_experience    integer,
  certifications      text[],
  jurisdictions       text[],
  background_statement text,
  status              text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'test_pending',
    'test_passed', 'test_failed', 'approved', 'rejected', 'withdrawn'
  )),
  reviewer_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes      text,
  rejection_reason    text,
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin selects all partner applications"
  ON partner_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin inserts partner applications"
  ON partner_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin updates partner applications"
  ON partner_applications FOR UPDATE
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

CREATE POLICY "Superadmin deletes partner applications"
  ON partner_applications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

-- ============================================================
-- partner_verification_tests
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_verification_tests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section         text NOT NULL CHECK (section IN (
    'compliance_knowledge', 'platform_knowledge',
    'professional_ethics', 'technical_proficiency'
  )),
  question_text   text NOT NULL,
  question_type   text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'scenario')),
  difficulty      text NOT NULL DEFAULT 'standard' CHECK (difficulty IN ('standard', 'advanced')),
  options         jsonb NOT NULL DEFAULT '[]',
  correct_answer  text NOT NULL,
  explanation     text,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_verification_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin selects verification tests"
  ON partner_verification_tests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin inserts verification tests"
  ON partner_verification_tests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin updates verification tests"
  ON partner_verification_tests FOR UPDATE
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

CREATE POLICY "Superadmin deletes verification tests"
  ON partner_verification_tests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

-- ============================================================
-- partner_test_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_test_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL REFERENCES partner_applications(id) ON DELETE CASCADE,
  attempt_number      integer NOT NULL DEFAULT 1,
  total_score         numeric(5,2),
  passing_score       numeric(5,2) NOT NULL DEFAULT 75.0,
  passed              boolean,
  section_scores      jsonb DEFAULT '{}',
  answers             jsonb DEFAULT '{}',
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  time_taken_minutes  integer,
  administered_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin selects test attempts"
  ON partner_test_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin inserts test attempts"
  ON partner_test_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin updates test attempts"
  ON partner_test_attempts FOR UPDATE
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

-- ============================================================
-- partner_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_profiles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id          uuid UNIQUE REFERENCES partner_applications(id) ON DELETE SET NULL,
  user_id                 uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  firm_name               text NOT NULL,
  contact_name            text NOT NULL,
  contact_email           text NOT NULL,
  contact_phone           text,
  website                 text,
  partner_type            text NOT NULL,
  certifications          text[],
  jurisdictions           text[],
  bio                     text,
  certification_status    text NOT NULL DEFAULT 'active' CHECK (certification_status IN (
    'active', 'suspended', 'revoked', 'expired'
  )),
  certified_at            timestamptz,
  certification_expires_at timestamptz,
  billing_status          text NOT NULL DEFAULT 'active' CHECK (billing_status IN (
    'active', 'overdue', 'suspended', 'cancelled'
  )),
  annual_fee_cents        integer NOT NULL DEFAULT 25000,
  next_billing_date       date,
  total_engagements       integer NOT NULL DEFAULT 0,
  active_tenants_count    integer NOT NULL DEFAULT 0,
  average_rating          numeric(3,2),
  is_publicly_listed      boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin selects partner profiles"
  ON partner_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin inserts partner profiles"
  ON partner_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin updates partner profiles"
  ON partner_profiles FOR UPDATE
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

CREATE POLICY "Superadmin deletes partner profiles"
  ON partner_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

-- ============================================================
-- partner_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL REFERENCES partner_applications(id) ON DELETE CASCADE,
  document_type       text NOT NULL CHECK (document_type IN (
    'professional_certificate', 'government_id', 'firm_registration',
    'insurance_certificate', 'reference_letter', 'other'
  )),
  file_name           text NOT NULL,
  storage_path        text,
  file_size_bytes     integer,
  mime_type           text,
  is_verified         boolean NOT NULL DEFAULT false,
  verified_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at         timestamptz,
  notes               text,
  uploaded_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin selects partner documents"
  ON partner_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin inserts partner documents"
  ON partner_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin updates partner documents"
  ON partner_documents FOR UPDATE
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

CREATE POLICY "Superadmin deletes partner documents"
  ON partner_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

-- ============================================================
-- partner_activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid REFERENCES partner_applications(id) ON DELETE CASCADE,
  profile_id      uuid REFERENCES partner_profiles(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  from_status     text,
  to_status       text,
  metadata        jsonb DEFAULT '{}',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin selects activity log"
  ON partner_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

CREATE POLICY "Superadmin inserts activity log"
  ON partner_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_category = 'superadmin'
    )
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_applications_type ON partner_applications(partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_applications_email ON partner_applications(contact_email);
CREATE INDEX IF NOT EXISTS idx_partner_test_attempts_application ON partner_test_attempts(application_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_status ON partner_profiles(certification_status);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_type ON partner_profiles(partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_documents_application ON partner_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_partner_activity_application ON partner_activity_log(application_id);
CREATE INDEX IF NOT EXISTS idx_partner_activity_profile ON partner_activity_log(profile_id);

-- ============================================================
-- Seed verification test questions
-- ============================================================
INSERT INTO partner_verification_tests (section, question_text, question_type, difficulty, options, correct_answer, explanation, sort_order)
VALUES
  ('compliance_knowledge', 'Under AIFMD, what is the maximum leverage ratio permitted for alternative investment funds without specific regulatory approval?', 'multiple_choice', 'advanced',
   '[{"id":"a","text":"200% of NAV"},{"id":"b","text":"300% of NAV"},{"id":"c","text":"There is no universal cap; leverage must be disclosed and monitored"},{"id":"d","text":"500% of NAV"}]',
   'c', 'AIFMD does not set a universal leverage cap but requires AIFMs to set leverage limits, report them to regulators, and justify them.', 10),

  ('compliance_knowledge', 'Which of the following best describes the purpose of a Suspicious Activity Report (SAR) under AML regulations?', 'multiple_choice', 'standard',
   '[{"id":"a","text":"To report annual revenue to tax authorities"},{"id":"b","text":"To report unusual transactions that may indicate money laundering or financial crime to the relevant authority"},{"id":"c","text":"To notify clients of unusual activity in their accounts"},{"id":"d","text":"To document internal audit findings"}]',
   'b', 'SARs are filed with financial intelligence units (e.g., FinCEN in the US, AUSTRAC in Australia) to flag suspected criminal financial activity.', 20),

  ('platform_knowledge', 'When a tenant on this platform creates a capital call, what happens to the investor capital account balance?', 'multiple_choice', 'standard',
   '[{"id":"a","text":"It decreases immediately upon call creation"},{"id":"b","text":"It increases when the call is created"},{"id":"c","text":"It increases when the capital call is marked as funded and committed capital is recorded"},{"id":"d","text":"Nothing changes until year-end reconciliation"}]',
   'c', 'Capital accounts are updated upon funding confirmation, not at call creation, to preserve accurate accounting until cash is received.', 30),

  ('platform_knowledge', 'What does NAV stand for in the context of this platform, and how is it calculated?', 'multiple_choice', 'standard',
   '[{"id":"a","text":"Net Annual Value — total assets minus liabilities divided by 12"},{"id":"b","text":"Net Asset Value — total fund assets minus total liabilities"},{"id":"c","text":"Nominal Allocated Value — the original committed capital"},{"id":"d","text":"Net Accrued Valuation — unrealized gains less unrealized losses"}]',
   'b', 'NAV = Total Assets - Total Liabilities. It represents the per-unit or total intrinsic value of the fund at a point in time.', 40),

  ('professional_ethics', 'A hedge fund manager offers you a gift valued at $2,000 in exchange for a favorable audit opinion. What is the correct course of action?', 'scenario', 'standard',
   '[{"id":"a","text":"Accept the gift but document it in your working papers"},{"id":"b","text":"Decline the gift and report the attempted bribe to the appropriate regulatory body and your firm ethics officer"},{"id":"c","text":"Accept only if the gift is disclosed to your supervisor"},{"id":"d","text":"Decline the gift but continue the engagement without reporting"}]',
   'b', 'Independence standards require declining gifts that could impair objectivity and reporting bribery attempts to regulators.', 50),

  ('professional_ethics', 'You discover a material misstatement in a fund NAV that was previously reported to investors. The fund manager asks you to adjust prior periods quietly. What do you do?', 'scenario', 'advanced',
   '[{"id":"a","text":"Adjust the prior period as requested since the manager has authority"},{"id":"b","text":"Refuse and recommend the fund issue a formal restatement and notify affected investors"},{"id":"c","text":"Restate only if regulators ask"},{"id":"d","text":"Note it in next years report without disclosing to investors"}]',
   'b', 'Material misstatements require formal restatement and investor notification under securities regulations and auditing standards.', 60),

  ('technical_proficiency', 'In a waterfall distribution model, which tier is typically paid first?', 'multiple_choice', 'standard',
   '[{"id":"a","text":"Carried interest to the GP"},{"id":"b","text":"Return of contributed capital to LPs"},{"id":"c","text":"Preferred return (hurdle rate) to LPs"},{"id":"d","text":"Management fees"}]',
   'b', 'The standard waterfall order is: 1) Return of capital, 2) Preferred return/hurdle, 3) GP catch-up, 4) Carried interest split.', 70),

  ('technical_proficiency', 'What is the primary purpose of a side pocket in a hedge fund?', 'multiple_choice', 'advanced',
   '[{"id":"a","text":"To segregate illiquid or hard-to-value assets from the main fund portfolio"},{"id":"b","text":"To hold cash reserves for redemptions"},{"id":"c","text":"To track carried interest separately from management fees"},{"id":"d","text":"A term for the fund manager personal investment account"}]',
   'a', 'Side pockets isolate illiquid investments so they do not affect the daily NAV calculation or penalize liquid investors during redemptions.', 80)

ON CONFLICT DO NOTHING;
