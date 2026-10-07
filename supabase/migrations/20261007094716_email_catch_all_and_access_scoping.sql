/*
# Email catch-all mailbox and tenant-scoped access visibility

1. Modified Tables
- `tenant_email_settings`
  - `catch_all_account_id` (uuid, nullable, FK to email_accounts): mailbox that receives
    inbound mail addressed to an unknown handle on the tenant's domain.

2. Data
- Arkline Trust: catch-all set to hello@arklinetrust.com.

3. Functions
- `route_inbound_email`: when no active mailbox matches the recipient, the message is
  delivered to the catch-all mailbox of the tenant whose `from_domain` matches the
  recipient's domain.

4. Security
- `email_account_access` SELECT policy: tenant admins can now only see access grants for
  mailboxes belonging to their own tenant (previously any tenant admin could see all grants).
*/

ALTER TABLE tenant_email_settings
  ADD COLUMN IF NOT EXISTS catch_all_account_id uuid REFERENCES email_accounts(id) ON DELETE SET NULL;

UPDATE tenant_email_settings s
SET catch_all_account_id = a.id
FROM email_accounts a
WHERE s.tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND a.tenant_id = s.tenant_id
  AND lower(a.email_address) = 'hello@arklinetrust.com'
  AND s.catch_all_account_id IS NULL;

DROP POLICY IF EXISTS "eaa_select" ON email_account_access;
CREATE POLICY "eaa_select" ON email_account_access FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.status = 'active'
      AND (
        ur.role_category = 'superadmin'
        OR (ur.role_category = 'tenant_admin' AND ur.tenant_id = get_email_account_tenant_id(email_account_access.account_id))
      )
  )
  OR EXISTS (SELECT 1 FROM platform_admin_users pau WHERE pau.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.route_inbound_email(p_to_address text, p_from_address text, p_from_name text, p_subject text, p_body_html text, p_body_text text, p_provider_id text, p_received_at timestamp with time zone, p_reply_to text DEFAULT NULL::text, p_headers jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_account_id    uuid;
v_thread_id     uuid;
v_message_id    uuid;
v_subject_norm  text;
v_thread_subject text;
BEGIN
SELECT id INTO v_account_id
FROM email_accounts
WHERE lower(email_address) = lower(p_to_address)
AND is_active = true
LIMIT 1;

IF v_account_id IS NULL THEN
  SELECT ea.id INTO v_account_id
  FROM tenant_email_settings s
  JOIN email_accounts ea ON ea.id = s.catch_all_account_id AND ea.is_active = true
  WHERE lower(s.from_domain) = lower(split_part(p_to_address, '@', 2))
  LIMIT 1;
END IF;

IF v_account_id IS NULL THEN
RETURN jsonb_build_object('routed', false, 'reason', 'no_account');
END IF;

IF p_provider_id IS NOT NULL THEN
IF EXISTS (SELECT 1 FROM email_messages WHERE inbound_provider_id = p_provider_id) THEN
RETURN jsonb_build_object('routed', false, 'reason', 'duplicate');
END IF;
END IF;

v_subject_norm := regexp_replace(trim(coalesce(p_subject, '')), '^((Re|Fwd|FW|RE|FWD)\s*:\s*)+', '', 'i');
v_thread_subject := coalesce(nullif(trim(p_subject), ''), '(no subject)');

SELECT id INTO v_thread_id
FROM email_threads
WHERE account_id = v_account_id
AND lower(regexp_replace(trim(subject), '^((Re|Fwd|FW|RE|FWD)\s*:\s*)+', '', 'i')) = lower(v_subject_norm)
ORDER BY last_message_at DESC
LIMIT 1;

IF v_thread_id IS NULL THEN
INSERT INTO email_threads (account_id, subject, participants, message_count, last_message_at)
VALUES (
v_account_id,
v_thread_subject,
jsonb_build_array(
jsonb_build_object('email', p_from_address, 'name', coalesce(p_from_name, '')),
jsonb_build_object('email', p_to_address, 'name', '')
),
0,
coalesce(p_received_at, now())
)
RETURNING id INTO v_thread_id;
ELSE
UPDATE email_threads
SET last_message_at = coalesce(p_received_at, now()), message_count = message_count + 1
WHERE id = v_thread_id;
END IF;

INSERT INTO email_messages (
account_id, thread_id, inbound_provider_id, from_address, from_name, to_addresses, reply_to,
subject, body_html, body_text, folder, is_read, is_draft, has_attachments, received_at, created_at
)
VALUES (
v_account_id, v_thread_id, p_provider_id, p_from_address, coalesce(p_from_name, ''),
jsonb_build_array(jsonb_build_object('email', p_to_address, 'name', '')),
p_reply_to, v_thread_subject, p_body_html, p_body_text, 'inbox', false, false, false,
coalesce(p_received_at, now()), now()
)
RETURNING id INTO v_message_id;

RETURN jsonb_build_object('routed', true, 'message_id', v_message_id, 'account_id', v_account_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.route_inbound_email(text, text, text, text, text, text, text, timestamptz, text, jsonb) FROM PUBLIC, anon, authenticated;
