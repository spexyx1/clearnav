/*
  # Create Auditor Certification and Partner Program System

  ## Overview
  This migration creates a complete auditor certification ecosystem enabling qualified auditing firms
  to become certified platform partners, complete certification exams, accept audit assignments for
  exchange listings, and manage their practice through a dedicated portal.

  ## New Tables

  ### 1. auditor_applications
  - Stores initial applications from auditing firms wanting to become certified partners
  - Captures firm details, professional background, certifications, and motivation
  - Workflow: submitted → under_review → exam_pending → exam_completed → approved/rejected
  
  ### 2. auditor_profiles
  - Stores profiles for approved, certified auditors
  - Linked to auth.users for authentication
  - Tracks certification status, specializations, fee schedules, and billing
  - Monthly billing at ~$208.34/month ($2,500/year annual fee)
  
  ### 3. auditor_qualifications
  - Professional credentials held by auditors (CPA, CFA, CISA, CIA, etc.)
  - Tracks verification status and expiry dates
  
  ### 4. auditor_exam_questions
  - Question bank for the certification exam
  - Five sections: valuation_principles, regulatory_knowledge, integrity_ethics, attention_to_detail, platform_knowledge
  - Multiple choice and scenario-based questions
  
  ### 5. auditor_exam_attempts
  - Records of exam attempts with scores and pass/fail status
  - Passing score: 80%
  - Max 3 attempts with 30-day cooldown between retakes
  
  ### 6. auditor_fee_payments
  - Tracks monthly certification fee payments (~$208.34/month)
  - Payment status and transaction records
  
  ### 7. auditor_reviews
  - Platform admin reviews of auditors (annual reviews, complaint investigations)
  - Can result in suspension or revocation of certification
  
  ### 8. auditor_tenant_preferences
  - Fund-level preferences for auditors (preferred/blocked/neutral)
  - Allows funds to choose which certified auditors they want to work with
  
  ### 9. auditor_assignments
  - Links auditors to specific audit requests on the exchange
  - Tracks assignment workflow and attestation reports
  - Stores attestation hash for tamper evidence
  
  ## Security
  - RLS policies ensure auditors can only access their own data
  - Platform admins have full access to auditor management
  - Tenant admins can view public auditor profiles and manage preferences
  - Clients can view attestation data on exchange listings
  - Anonymous users can submit applications and view public auditor directory

  ## Important Notes
  - Auditors exist at platform level (no tenant_id requirement)
  - Monthly billing cycle for certification fees
  - Auditors set their own service fees to tenants
  - Platform collects only the certification fee
*/

-- Step 1: Extend role_category enum to include 'auditor'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'role_category_enum' AND e.enumlabel = 'auditor'
  ) THEN
    ALTER TYPE role_category_enum ADD VALUE 'auditor';
  END IF;
END $$;
