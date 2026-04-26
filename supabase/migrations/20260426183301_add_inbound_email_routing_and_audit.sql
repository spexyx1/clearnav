/*
  # Inbound Email Routing and Audit

  ## Overview
  Adds infrastructure for receiving inbound emails via Resend's inbound routing webhook.
  Resend delivers inbound email as a POST to our Edge Function. This migration adds:

  1. New Tables
    - `inbound_email_log` — raw webhook audit trail; every POST Resend sends is stored
      here before processing, so we have a durable record even if routing fails.

  2. Modified Tables
    - `email_messages` — adds `inbound_provider_id` (the Resend inbound message ID) to
      allow idempotent re-delivery without duplicates.

  3. Functions
    - `route_inbound_email(p_to_address, p_from_address, p_from_name, p_subject,
        p_body_html, p_body_text, p_provider_id, p_received_at, p_reply_to, p_headers)`
      Finds the matching `email_accounts` row by `email_address`, creates or links a
      thread, inserts the message into `email_messages` with folder='inbox', and returns
      the new message id. Runs as SECURITY DEFINER so the webhook Edge Function can call
      it using the service-role client without needing RLS bypass logic in application code.

  4. Security
    - `inbound_email_log` has RLS enabled; only platform admins can read it (raw webhooks
      may contain PII). The Edge Function writes via service-role key.
    - The routing function is SECURITY DEFINER and has a fixed search_path.
*/

-- ─── inbound_email_log ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbound_email_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at     timestamptz NOT NULL    DEFAULT now(),
  provider_id     text        UNIQUE,          -- Resend's inbound message ID (idempotency key)
  to_address      text        NOT NULL,
  from_address    text        NOT NULL,
  subject         text,
  raw_payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'routed', 'undeliverable', 'duplicate')),
  message_id      uuid        REFERENCES email_messages(id) ON DELETE SET NULL,
  error_detail    text,
  processed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inbound_log_provider  ON inbound_email_log(provider_id);
CREATE INDEX IF NOT EXISTS idx_inbound_log_to        ON inbound_email_log(to_address);
CREATE INDEX IF NOT EXISTS idx_inbound_log_status    ON inbound_email_log(status);
CREATE INDEX IF NOT EXISTS idx_inbound_log_received  ON inbound_email_log(received_at DESC);

ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view inbound email log"
  ON inbound_email_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- ─── email_messages: idempotency column ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'inbound_provider_id'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN inbound_provider_id text UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_messages_inbound_provider
  ON email_messages(inbound_provider_id)
  WHERE inbound_provider_id IS NOT NULL;

-- ─── route_inbound_email() ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION route_inbound_email(
  p_to_address    text,
  p_from_address  text,
  p_from_name     text,
  p_subject       text,
  p_body_html     text,
  p_body_text     text,
  p_provider_id   text,
  p_received_at   timestamptz,
  p_reply_to      text  DEFAULT NULL,
  p_headers       jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id    uuid;
  v_thread_id     uuid;
  v_message_id    uuid;
  v_subject_norm  text;
  v_thread_subject text;
BEGIN
  -- ── 1. Find the destination account ──────────────────────────────────────
  SELECT id INTO v_account_id
  FROM email_accounts
  WHERE lower(email_address) = lower(p_to_address)
    AND is_active = true
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('routed', false, 'reason', 'no_account');
  END IF;

  -- ── 2. Idempotency: skip if already stored ────────────────────────────────
  IF p_provider_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM email_messages
      WHERE inbound_provider_id = p_provider_id
    ) THEN
      RETURN jsonb_build_object('routed', false, 'reason', 'duplicate');
    END IF;
  END IF;

  -- ── 3. Normalise subject for thread matching (strip Re:/Fwd: prefixes) ────
  v_subject_norm := regexp_replace(
    trim(p_subject),
    '^((Re|Fwd|FW|RE|FWD)\s*:\s*)+',
    '',
    'i'
  );
  -- Use the original subject when creating new thread titles
  v_thread_subject := coalesce(nullif(trim(p_subject), ''), '(no subject)');

  -- ── 4. Find or create a thread ────────────────────────────────────────────
  SELECT id INTO v_thread_id
  FROM email_threads
  WHERE account_id = v_account_id
    AND lower(regexp_replace(
          trim(subject),
          '^((Re|Fwd|FW|RE|FWD)\s*:\s*)+',
          '',
          'i'
        )) = lower(v_subject_norm)
  ORDER BY last_message_at DESC
  LIMIT 1;

  IF v_thread_id IS NULL THEN
    INSERT INTO email_threads (account_id, subject, participants, message_count, last_message_at)
    VALUES (
      v_account_id,
      v_thread_subject,
      jsonb_build_array(
        jsonb_build_object('email', p_from_address, 'name', coalesce(p_from_name, '')),
        jsonb_build_object('email', p_to_address,   'name', '')
      ),
      0,
      coalesce(p_received_at, now())
    )
    RETURNING id INTO v_thread_id;
  ELSE
    -- Update thread metadata
    UPDATE email_threads
    SET
      last_message_at = coalesce(p_received_at, now()),
      message_count   = message_count + 1
    WHERE id = v_thread_id;
  END IF;

  -- ── 5. Insert the message ─────────────────────────────────────────────────
  INSERT INTO email_messages (
    account_id,
    thread_id,
    inbound_provider_id,
    from_address,
    from_name,
    to_addresses,
    reply_to,
    subject,
    body_html,
    body_text,
    folder,
    is_read,
    is_draft,
    has_attachments,
    received_at,
    created_at
  )
  VALUES (
    v_account_id,
    v_thread_id,
    p_provider_id,
    p_from_address,
    coalesce(p_from_name, ''),
    jsonb_build_array(jsonb_build_object('email', p_to_address, 'name', '')),
    p_reply_to,
    coalesce(nullif(trim(p_subject), ''), '(no subject)'),
    p_body_html,
    p_body_text,
    'inbox',
    false,
    false,
    false,
    coalesce(p_received_at, now()),
    now()
  )
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('routed', true, 'message_id', v_message_id, 'account_id', v_account_id);
END;
$$;

GRANT EXECUTE ON FUNCTION route_inbound_email(text, text, text, text, text, text, text, timestamptz, text, jsonb)
  TO service_role;
