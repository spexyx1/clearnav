-- SECURITY DEFINER functions for email_messages queries.
-- Avoids the circular RLS dependency: email_messages -> email_account_access -> email_accounts -> email_account_access.

CREATE OR REPLACE FUNCTION get_email_messages(
  p_account_id uuid,
  p_folder     text,
  p_search     text DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  from_address     text,
  from_name        text,
  to_addresses     jsonb,
  cc_addresses     jsonb,
  subject          text,
  body_html        text,
  body_text        text,
  folder           text,
  is_read          boolean,
  is_starred       boolean,
  is_draft         boolean,
  has_attachments  boolean,
  received_at      timestamptz,
  sent_at          timestamptz,
  created_at       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must have access to this account
  IF NOT (
    EXISTS (SELECT 1 FROM email_account_access WHERE account_id = p_account_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_admin_users WHERE user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_search IS NOT NULL AND p_search <> '' THEN
    RETURN QUERY
      SELECT em.id, em.from_address, em.from_name, em.to_addresses, em.cc_addresses,
             em.subject, em.body_html, em.body_text, em.folder,
             em.is_read, em.is_starred, em.is_draft, em.has_attachments,
             em.received_at, em.sent_at, em.created_at
      FROM email_messages em
      WHERE em.account_id = p_account_id
        AND em.folder = p_folder
        AND (
          em.subject      ILIKE '%' || p_search || '%'
          OR em.from_address ILIKE '%' || p_search || '%'
          OR em.body_text    ILIKE '%' || p_search || '%'
        )
      ORDER BY em.received_at DESC NULLS LAST, em.created_at DESC
      LIMIT 100;
  ELSE
    RETURN QUERY
      SELECT em.id, em.from_address, em.from_name, em.to_addresses, em.cc_addresses,
             em.subject, em.body_html, em.body_text, em.folder,
             em.is_read, em.is_starred, em.is_draft, em.has_attachments,
             em.received_at, em.sent_at, em.created_at
      FROM email_messages em
      WHERE em.account_id = p_account_id
        AND em.folder = p_folder
      ORDER BY em.received_at DESC NULLS LAST, em.created_at DESC
      LIMIT 100;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_messages(uuid, text, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_email_folder_counts(p_account_id uuid)
RETURNS TABLE (folder text, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM email_account_access WHERE account_id = p_account_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_admin_users WHERE user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT em.folder, COUNT(*) FILTER (WHERE NOT em.is_read) AS unread_count
    FROM email_messages em
    WHERE em.account_id = p_account_id
    GROUP BY em.folder;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_folder_counts(uuid) TO authenticated;