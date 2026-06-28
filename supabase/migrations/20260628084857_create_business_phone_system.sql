-- ── Business Phone: Tenant Phone Numbers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_phone_numbers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  phone_number                text NOT NULL,
  phone_number_e164           text NOT NULL,
  telnyx_phone_number_id      text UNIQUE,
  number_type                 text NOT NULL DEFAULT 'local'
                                CHECK (number_type IN ('local','toll_free','international')),
  country_code                text NOT NULL DEFAULT 'US',
  area_code                   text,
  label                       text,

  -- Forwarding
  forward_to                  text,
  forward_to_secondary        text,
  forward_whisper_enabled     boolean NOT NULL DEFAULT true,
  forward_ring_timeout_secs   integer NOT NULL DEFAULT 25,

  -- Business hours
  business_hours_enabled      boolean NOT NULL DEFAULT false,
  business_hours              jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone                    text NOT NULL DEFAULT 'America/New_York',
  after_hours_action          text NOT NULL DEFAULT 'voicemail'
                                CHECK (after_hours_action IN ('voicemail','forward_secondary','do_not_disturb')),

  -- Features
  voicemail_enabled           boolean NOT NULL DEFAULT true,
  voicemail_greeting_text     text NOT NULL DEFAULT 'You have reached our office. Please leave a message after the tone.',
  recording_enabled           boolean NOT NULL DEFAULT false,

  -- Costs
  monthly_cost_usd            numeric(10,4) NOT NULL DEFAULT 1.00,
  per_minute_inbound_usd      numeric(10,4) NOT NULL DEFAULT 0.0055,
  per_minute_outbound_usd     numeric(10,4) NOT NULL DEFAULT 0.0070,

  -- Status
  status                      text NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','suspended','releasing','released')),
  next_renewal_date           date,
  provisioned_at              timestamptz NOT NULL DEFAULT now(),
  released_at                 timestamptz,

  created_by                  uuid REFERENCES auth.users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ── Call Log ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_number_call_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  phone_number_id     uuid REFERENCES tenant_phone_numbers(id) ON DELETE SET NULL,
  telnyx_call_id      text,
  telnyx_call_session text,
  direction           text NOT NULL DEFAULT 'inbound'
                        CHECK (direction IN ('inbound','outbound')),
  from_number         text,
  to_number           text,
  forwarded_to        text,
  caller_name         text,
  status              text NOT NULL DEFAULT 'initiated'
                        CHECK (status IN ('initiated','ringing','answered','voicemail','missed','failed','busy','no_answer')),
  started_at          timestamptz NOT NULL DEFAULT now(),
  answered_at         timestamptz,
  ended_at            timestamptz,
  duration_seconds    integer NOT NULL DEFAULT 0,
  billable_seconds    integer NOT NULL DEFAULT 0,
  recording_url       text,
  cost_usd            numeric(10,4),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Voicemails ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_number_voicemails (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  phone_number_id     uuid REFERENCES tenant_phone_numbers(id) ON DELETE SET NULL,
  call_log_id         uuid REFERENCES phone_number_call_log(id) ON DELETE SET NULL,
  from_number         text,
  caller_name         text,
  duration_seconds    integer NOT NULL DEFAULT 0,
  recording_url       text,
  transcription       text,
  is_read             boolean NOT NULL DEFAULT false,
  received_at         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_phone_numbers_tenant_id ON tenant_phone_numbers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_phone_numbers_status ON tenant_phone_numbers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_phone_number_call_log_tenant ON phone_number_call_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_number_call_log_number ON phone_number_call_log(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_phone_number_call_log_started ON phone_number_call_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_number_voicemails_tenant ON phone_number_voicemails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_number_voicemails_unread ON phone_number_voicemails(tenant_id, is_read) WHERE is_read = false;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE tenant_phone_numbers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_number_call_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_number_voicemails ENABLE ROW LEVEL SECURITY;

-- Helper: returns the tenant_id for the current authenticated user
-- (reuses the existing get_user_tenant_id() function if present)

-- tenant_phone_numbers policies
CREATE POLICY "select_own_phone_numbers" ON tenant_phone_numbers
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "insert_own_phone_numbers" ON tenant_phone_numbers
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "update_own_phone_numbers" ON tenant_phone_numbers
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "delete_own_phone_numbers" ON tenant_phone_numbers
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- phone_number_call_log policies
CREATE POLICY "select_own_call_log" ON phone_number_call_log
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "insert_own_call_log" ON phone_number_call_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "update_own_call_log" ON phone_number_call_log
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "delete_own_call_log" ON phone_number_call_log
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- phone_number_voicemails policies
CREATE POLICY "select_own_voicemails" ON phone_number_voicemails
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "insert_own_voicemails" ON phone_number_voicemails
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "update_own_voicemails" ON phone_number_voicemails
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "delete_own_voicemails" ON phone_number_voicemails
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Service-role INSERT policies for the webhook edge function
CREATE POLICY "service_insert_call_log" ON phone_number_call_log
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_update_call_log" ON phone_number_call_log
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_insert_voicemails" ON phone_number_voicemails
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_select_phone_numbers" ON tenant_phone_numbers
  FOR SELECT TO service_role USING (true);

CREATE POLICY "service_update_phone_numbers" ON tenant_phone_numbers
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_tenant_phone_numbers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_phone_numbers_updated_at ON tenant_phone_numbers;
CREATE TRIGGER trg_tenant_phone_numbers_updated_at
  BEFORE UPDATE ON tenant_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_tenant_phone_numbers_updated_at();

-- ── RPC: unread voicemail count ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_voicemail_count(p_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM phone_number_voicemails
  WHERE tenant_id = p_tenant_id AND is_read = false;
$$;

GRANT EXECUTE ON FUNCTION get_unread_voicemail_count(uuid) TO authenticated;
