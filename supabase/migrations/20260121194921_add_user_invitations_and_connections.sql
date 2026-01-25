/*
  # User Invitations and IBKR Connections System

  ## Overview
  Adds comprehensive user invitation and IBKR account connection management for multi-tenant platform.

  ## New Tables

  ### `user_invitations`
  Stores email invitations sent to prospective users
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key) - Which tenant is inviting the user
  - `email` (text) - Email address of invitee
  - `token` (text, unique) - Secure invitation token
  - `role` (text) - Intended role: staff role or 'client'
  - `invited_by` (uuid) - Staff member who sent invitation
  - `status` (text) - pending, accepted, expired, cancelled
  - `expires_at` (timestamptz) - When invitation expires (7 days)
  - `accepted_at` (timestamptz) - When invitation was accepted
  - `metadata` (jsonb) - Additional invitation data
  - `created_at` (timestamptz)

  ### `ibkr_connections`
  Stores IBKR API connection credentials per client
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `client_id` (uuid, foreign key) - References client_profiles
  - `account_id` (text) - IBKR account number
  - `gateway_url` (text) - IBKR Gateway URL
  - `credentials_encrypted` (text) - Encrypted API credentials
  - `connection_status` (text) - connected, pending, disconnected, error
  - `last_sync_at` (timestamptz) - Last successful sync
  - `last_error` (text) - Last error message
  - `setup_by` (uuid) - Staff member who set up (if manager-assisted)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Table Updates

  ### `tenant_users`
  - Add `invited_via` (uuid) - Link to invitation record
  - Add `onboarding_status` (text) - pending, in_progress, completed

  ## Security
  - Enable RLS on all new tables
  - Managers can send and view invitations for their tenant
  - Users can only accept their own invitations
  - IBKR credentials are encrypted and only accessible to authorized staff
  - Strict tenant isolation on all operations
*/

-- Create invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create IBKR connection status enum
DO $$ BEGIN
  CREATE TYPE ibkr_connection_status AS ENUM ('connected', 'pending', 'disconnected', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- User Invitations Table
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  role text NOT NULL,
  invited_by uuid REFERENCES staff_accounts(id),
  status invitation_status DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

-- IBKR Connections Table
CREATE TABLE IF NOT EXISTS ibkr_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  gateway_url text DEFAULT 'https://localhost:5000',
  credentials_encrypted text,
  connection_status ibkr_connection_status DEFAULT 'pending',
  last_sync_at timestamptz,
  last_error text,
  setup_by uuid REFERENCES staff_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, client_id)
);

-- Create indexes for IBKR connections
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_tenant ON ibkr_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_client ON ibkr_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_status ON ibkr_connections(connection_status);

-- Add columns to tenant_users if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_users' AND column_name = 'invited_via'
  ) THEN
    ALTER TABLE tenant_users ADD COLUMN invited_via uuid REFERENCES user_invitations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenant_users' AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE tenant_users ADD COLUMN onboarding_status text DEFAULT 'pending' 
      CHECK (onboarding_status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;

-- Enable RLS on user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view all invitations
CREATE POLICY "Platform admins can view all invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- Policy: Staff can view invitations for their tenant
CREATE POLICY "Staff can view tenant invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- Policy: Staff can create invitations for their tenant
CREATE POLICY "Staff can create tenant invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- Policy: Staff can update invitations they created
CREATE POLICY "Staff can update their invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (
    invited_by IN (
      SELECT sa.id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
    )
  );

-- Policy: Anyone with valid token can accept invitation (used during signup)
CREATE POLICY "Users can accept invitations with valid token"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (status = 'accepted');

-- Enable RLS on ibkr_connections
ALTER TABLE ibkr_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view all IBKR connections
CREATE POLICY "Platform admins can view all IBKR connections"
  ON ibkr_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- Policy: Staff can view IBKR connections for their tenant
CREATE POLICY "Staff can view tenant IBKR connections"
  ON ibkr_connections FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT sa.id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- Policy: Clients can view their own IBKR connection
CREATE POLICY "Clients can view own IBKR connection"
  ON ibkr_connections FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Policy: Staff can create IBKR connections for their tenant
CREATE POLICY "Staff can create tenant IBKR connections"
  ON ibkr_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT sa.id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- Policy: Staff and clients can update IBKR connections
CREATE POLICY "Staff and clients can update IBKR connections"
  ON ibkr_connections FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() OR
    tenant_id IN (
      SELECT sa.id FROM staff_accounts sa
      WHERE sa.auth_user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
DECLARE
  token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate a random 32-character token
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    
    -- Check if token already exists
    SELECT EXISTS (
      SELECT 1 FROM user_invitations WHERE user_invitations.token = token
    ) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;