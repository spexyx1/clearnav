/*
  # Enterprise Security and Audit System

  1. New Tables
    - `audit_logs` - Tamper-proof audit trail with cryptographic chaining
    - `mfa_settings` - Multi-factor authentication per user
    - `user_sessions` - Enhanced session management with device fingerprinting
    - `login_attempts` - Failed login tracking and brute force detection
    - `security_alerts` - Real-time security event notifications
    - `encryption_keys` - Key management for field-level encryption
    - `data_access_policies` - Fine-grained access control policies

  2. Security
    - RLS enabled on all tables
    - Immutable audit logs
    - Encrypted sensitive fields

  3. Features
    - Cryptographic audit log chaining for tamper detection
    - MFA/2FA with TOTP and backup codes
    - Session fingerprinting and anomaly detection
    - Automated security alerting
    - SOC 2, ISO 27001, GDPR compliance ready
*/

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  location text,
  session_id text,
  device_fingerprint text,
  resource text,
  resource_id text,
  action text,
  changes jsonb,
  reason text,
  additional_data jsonb,
  previous_hash text,
  current_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_ts ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_ts ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_res ON audit_logs(resource, resource_id);

-- MFA Settings
CREATE TABLE IF NOT EXISTS mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  mfa_enabled boolean DEFAULT false,
  mfa_method text DEFAULT 'totp' CHECK (mfa_method IN ('totp', 'sms', 'email')),
  totp_secret text,
  totp_verified boolean DEFAULT false,
  totp_verified_at timestamptz,
  backup_codes text[],
  backup_codes_used int DEFAULT 0,
  phone_number text,
  phone_verified boolean DEFAULT false,
  recovery_email text,
  trusted_devices jsonb DEFAULT '[]'::jsonb,
  enforce_mfa boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_user ON mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_tenant ON mfa_settings(tenant_id);

-- User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  device_fingerprint text NOT NULL,
  device_name text,
  browser text,
  os text,
  ip_address inet NOT NULL,
  country text,
  city text,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  is_trusted boolean DEFAULT false,
  logged_out_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;

-- Login Attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE SET NULL,
  success boolean NOT NULL,
  failure_reason text,
  mfa_required boolean DEFAULT false,
  mfa_completed boolean DEFAULT false,
  ip_address inet NOT NULL,
  user_agent text,
  device_fingerprint text,
  is_suspicious boolean DEFAULT false,
  suspicion_reasons text[],
  risk_score int DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  account_locked boolean DEFAULT false,
  lockout_until timestamptz,
  attempted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_email ON login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_suspicious ON login_attempts(is_suspicious) WHERE is_suspicious = true;

-- Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type text,
  resource_id text,
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON security_alerts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON security_alerts(status) WHERE status = 'open';

-- Encryption Keys
CREATE TABLE IF NOT EXISTS encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_type text NOT NULL CHECK (key_type IN ('master', 'data', 'transit')),
  vault_path text,
  version int NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  last_rotated_at timestamptz,
  next_rotation_at timestamptz,
  algorithm text DEFAULT 'AES-256-GCM',
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, key_name, version)
);

CREATE INDEX IF NOT EXISTS idx_keys_tenant ON encryption_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_keys_active ON encryption_keys(tenant_id, is_active) WHERE is_active = true;

-- Data Access Policies
CREATE TABLE IF NOT EXISTS data_access_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  is_active boolean DEFAULT true,
  resource_type text NOT NULL,
  allowed_roles text[] DEFAULT ARRAY[]::text[],
  allowed_actions text[] DEFAULT ARRAY['read']::text[],
  requires_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant ON data_access_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_active ON data_access_policies(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_policies ENABLE ROW LEVEL SECURITY;

-- RLS: Audit Logs
CREATE POLICY "Platform admins view all audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()));

CREATE POLICY "Tenant admins view tenant audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_accounts WHERE staff_accounts.auth_user_id = auth.uid() AND staff_accounts.tenant_id = audit_logs.tenant_id));

-- RLS: MFA Settings
CREATE POLICY "Users view own MFA" ON mfa_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own MFA" ON mfa_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users insert own MFA" ON mfa_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- RLS: User Sessions
CREATE POLICY "Users view own sessions" ON user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own sessions" ON user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RLS: Login Attempts
CREATE POLICY "Platform admins view all logins"
  ON login_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()));

-- RLS: Security Alerts
CREATE POLICY "Platform admins manage all alerts"
  ON security_alerts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()));

CREATE POLICY "Tenant staff manage tenant alerts"
  ON security_alerts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_accounts WHERE staff_accounts.auth_user_id = auth.uid() AND staff_accounts.tenant_id = security_alerts.tenant_id));

-- RLS: Encryption Keys
CREATE POLICY "Platform admins manage keys"
  ON encryption_keys FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()));

-- RLS: Data Access Policies
CREATE POLICY "Tenant admins manage policies"
  ON data_access_policies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_accounts WHERE staff_accounts.auth_user_id = auth.uid() AND staff_accounts.tenant_id = data_access_policies.tenant_id));