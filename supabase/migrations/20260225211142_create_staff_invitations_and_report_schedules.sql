/*
  # Staff Invitations and Report Schedules

  1. New Tables
    - `staff_invitations`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, FK to platform_tenants)
      - `email` (text) - invitee email address
      - `full_name` (text) - invitee full name
      - `role` (text) - pre-assigned staff role
      - `permissions` (jsonb) - pre-configured permissions
      - `token` (text, unique) - unique invitation token
      - `invited_by` (uuid, FK to auth.users)
      - `status` (text) - pending, sent, accepted, expired, cancelled
      - `custom_message` (text) - optional message to include
      - `expires_at` (timestamptz) - when the invitation expires
      - `accepted_at` (timestamptz) - when the invitation was accepted
      - `created_at` (timestamptz)

    - `report_schedules`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, FK to platform_tenants)
      - `report_type` (text) - type of report to generate
      - `report_name` (text) - display name for the schedule
      - `frequency` (text) - monthly, quarterly, annually
      - `day_of_period` (integer) - day in the period to generate
      - `auto_send` (boolean) - whether to auto-send after generation
      - `fund_id` (uuid, FK to funds, nullable)
      - `recipients` (jsonb) - array of recipient references
      - `parameters` (jsonb) - additional report parameters
      - `is_active` (boolean) - whether schedule is active
      - `last_run_at` (timestamptz) - last generation timestamp
      - `next_run_at` (timestamptz) - next scheduled generation
      - `created_by` (uuid, FK to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `reports` - adds `report_content` (jsonb) for storing generated data

  3. Security
    - RLS enabled on both new tables
    - Policies scoped to tenant membership via user_roles
*/

-- Staff Invitations table
CREATE TABLE IF NOT EXISTS staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  permissions jsonb DEFAULT '{}'::jsonb,
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  custom_message text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage staff invitations"
  ON staff_invitations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Tenant admins can create staff invitations"
  ON staff_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category = 'tenant_admin'
    )
    OR
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role = 'general_manager'
    )
  );

CREATE POLICY "Tenant admins can update staff invitations"
  ON staff_invitations FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category = 'tenant_admin'
    )
    OR
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role = 'general_manager'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category = 'tenant_admin'
    )
    OR
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role = 'general_manager'
    )
  );

CREATE POLICY "Tenant admins can delete staff invitations"
  ON staff_invitations FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category = 'tenant_admin'
    )
    OR
    tenant_id IN (
      SELECT sa.tenant_id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
      AND sa.role = 'general_manager'
    )
  );

-- Allow anonymous token lookups for invitation acceptance
CREATE POLICY "Anyone can read invitations by token"
  ON staff_invitations FOR SELECT
  TO anon
  USING (status = 'pending' OR status = 'sent');

-- Report Schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id),
  report_type text NOT NULL,
  report_name text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT 'monthly',
  day_of_period integer NOT NULL DEFAULT 5,
  auto_send boolean DEFAULT false,
  fund_id uuid REFERENCES funds(id),
  recipients jsonb DEFAULT '[]'::jsonb,
  parameters jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view report schedules"
  ON report_schedules FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Staff can create report schedules"
  ON report_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Staff can update report schedules"
  ON report_schedules FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

CREATE POLICY "Staff can delete report schedules"
  ON report_schedules FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND ur.role_category IN ('tenant_admin', 'staff_user')
    )
  );

-- Add report_content column to reports table for storing generated data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'report_content'
  ) THEN
    ALTER TABLE reports ADD COLUMN report_content jsonb;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_invitations_tenant ON staff_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_report_schedules_tenant ON report_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;
