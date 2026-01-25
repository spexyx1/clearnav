/*
  # Add Self-Service Signup Support

  ## Overview
  Adds support for client self-service signup with automatic tenant provisioning
  
  ## Changes
  
  1. New Tables
    - `reserved_subdomains` - Prevents signup with reserved/system subdomains
    - `signup_requests` - Tracks tenant signup requests with contact info
  
  2. Table Modifications
    - `platform_tenants` - Add fields to track self-service signups:
      - `is_self_service` - Flag for auto-created vs admin-created tenants
      - `contact_email` - Primary contact email for the tenant
      - `contact_name` - Primary contact name
      - `signup_completed_at` - When signup process completed
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated platform admin access
    - Add policy for public signup request creation
  
  4. Data
    - Pre-populate reserved subdomains (admin, www, api, app, etc.)
*/

-- Add fields to platform_tenants for self-service tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_tenants' AND column_name = 'is_self_service'
  ) THEN
    ALTER TABLE platform_tenants 
    ADD COLUMN is_self_service boolean DEFAULT false,
    ADD COLUMN contact_email text,
    ADD COLUMN contact_name text,
    ADD COLUMN signup_completed_at timestamptz;
  END IF;
END $$;

-- Create reserved subdomains table
CREATE TABLE IF NOT EXISTS reserved_subdomains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain text UNIQUE NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reserved_subdomains ENABLE ROW LEVEL SECURITY;

-- Create signup requests table (for tracking)
CREATE TABLE IF NOT EXISTS signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id),
  requested_slug text NOT NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reserved_subdomains
CREATE POLICY "Anyone can read reserved subdomains"
  ON reserved_subdomains
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Platform admins can manage reserved subdomains"
  ON reserved_subdomains
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for signup_requests
CREATE POLICY "Anyone can create signup requests"
  ON signup_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Platform admins can view all signup requests"
  ON signup_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can update signup requests"
  ON signup_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Insert reserved subdomains
INSERT INTO reserved_subdomains (subdomain, reason) VALUES
  ('admin', 'Platform administration portal'),
  ('www', 'Main website'),
  ('api', 'API endpoints'),
  ('app', 'Application root'),
  ('cdn', 'Content delivery'),
  ('static', 'Static assets'),
  ('assets', 'Asset storage'),
  ('files', 'File storage'),
  ('docs', 'Documentation'),
  ('help', 'Help center'),
  ('support', 'Support portal'),
  ('status', 'Status page'),
  ('blog', 'Blog'),
  ('mail', 'Email services'),
  ('email', 'Email services'),
  ('smtp', 'Email services'),
  ('ftp', 'File transfer'),
  ('ssh', 'Secure shell'),
  ('vpn', 'Virtual private network'),
  ('test', 'Testing environment'),
  ('demo', 'Demo environment'),
  ('dev', 'Development environment'),
  ('staging', 'Staging environment'),
  ('production', 'Production environment'),
  ('internal', 'Internal use')
ON CONFLICT (subdomain) DO NOTHING;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_platform_tenants_slug ON platform_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON signup_requests(status);
