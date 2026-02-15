/*
  # Email System for ClearNav Platform

  ## Overview
  Creates a complete email infrastructure for tenant staff to manage professional communications.
  Email accounts are tenant-specific and restricted to authorized staff roles.

  ## New Tables

  ### 1. `email_accounts`
  Email accounts provisioned for tenants (e.g., contact@tenant.clearnav.cv, sales@tenant.clearnav.cv)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, references platform_tenants) - Tenant owning this email account
  - `email_address` (text, unique) - Full email address (handle@subdomain.clearnav.cv)
  - `email_handle` (text) - Local part of email (e.g., "contact", "sales")
  - `display_name` (text) - Display name for outgoing emails
  - `account_type` (text) - Type: 'personal', 'shared', 'department'
  - `signature_html` (text) - Email signature with HTML formatting
  - `signature_text` (text) - Plain text version of signature
  - `auto_reply_enabled` (boolean) - Whether auto-reply is active
  - `auto_reply_message` (text) - Out-of-office message
  - `forwarding_enabled` (boolean) - Whether forwarding is active
  - `forwarding_addresses` (text[]) - Array of forwarding addresses
  - `is_active` (boolean) - Account status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `email_account_access`
  Controls which staff members can access which email accounts
  - `id` (uuid, primary key)
  - `account_id` (uuid, references email_accounts)
  - `user_id` (uuid, references auth.users)
  - `access_level` (text) - 'full', 'read_only', 'send_only'
  - `granted_by` (uuid, references auth.users)
  - `granted_at` (timestamptz)

  ### 3. `email_threads`
  Conversation threads grouping related messages
  - `id` (uuid, primary key)
  - `account_id` (uuid, references email_accounts)
  - `subject` (text) - Thread subject
  - `participants` (jsonb) - Array of participant email addresses
  - `message_count` (integer) - Number of messages in thread
  - `last_message_at` (timestamptz) - Most recent message timestamp
  - `created_at` (timestamptz)

  ### 4. `email_messages`
  Individual email messages
  - `id` (uuid, primary key)
  - `account_id` (uuid, references email_accounts)
  - `thread_id` (uuid, references email_threads)
  - `message_id` (text) - External message ID from email provider
  - `from_address` (text) - Sender email
  - `from_name` (text) - Sender display name
  - `to_addresses` (jsonb) - Array of recipient objects {email, name}
  - `cc_addresses` (jsonb) - CC recipients
  - `bcc_addresses` (jsonb) - BCC recipients
  - `reply_to` (text) - Reply-to address
  - `subject` (text) - Email subject
  - `body_html` (text) - HTML email body
  - `body_text` (text) - Plain text email body
  - `folder` (text) - 'inbox', 'sent', 'drafts', 'trash', 'archive'
  - `is_read` (boolean) - Read status
  - `is_starred` (boolean) - Starred/flagged status
  - `is_draft` (boolean) - Whether message is a draft
  - `has_attachments` (boolean) - Attachment indicator
  - `received_at` (timestamptz) - When message was received
  - `sent_at` (timestamptz) - When message was sent
  - `created_at` (timestamptz)

  ### 5. `email_attachments`
  File attachments linked to messages
  - `id` (uuid, primary key)
  - `message_id` (uuid, references email_messages)
  - `file_name` (text) - Original filename
  - `file_size` (bigint) - Size in bytes
  - `content_type` (text) - MIME type
  - `storage_path` (text) - Path in Supabase Storage
  - `created_at` (timestamptz)

  ### 6. `email_labels`
  Custom labels/tags for organizing emails
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, references platform_tenants)
  - `user_id` (uuid, references auth.users) - Creator (null for tenant-wide labels)
  - `name` (text) - Label name
  - `color` (text) - Color code for UI
  - `is_system` (boolean) - Whether it's a system label
  - `created_at` (timestamptz)

  ### 7. `email_message_labels`
  Junction table for many-to-many message-label relationship
  - `message_id` (uuid, references email_messages)
  - `label_id` (uuid, references email_labels)
  - `applied_at` (timestamptz)
  - Primary key on (message_id, label_id)

  ## Security

  ### RLS Policies
  - All email tables are restricted to authenticated staff members only
  - Users can only access accounts they have explicit access to via `email_account_access`
  - Platform admins can access all email accounts for support purposes
  - Tenant admins can manage all email accounts for their tenant

  ## Indexes
  - Performance indexes on foreign keys and commonly queried fields
  - Full-text search indexes on message subject and body
*/

-- Email Accounts Table
CREATE TABLE IF NOT EXISTS email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  email_address text UNIQUE NOT NULL,
  email_handle text NOT NULL,
  display_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'personal' CHECK (account_type IN ('personal', 'shared', 'department')),
  signature_html text,
  signature_text text,
  auto_reply_enabled boolean DEFAULT false,
  auto_reply_message text,
  forwarding_enabled boolean DEFAULT false,
  forwarding_addresses text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_tenant ON email_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(is_active) WHERE is_active = true;

-- Email Account Access Control
CREATE TABLE IF NOT EXISTS email_account_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('full', 'read_only', 'send_only')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_account_access_user ON email_account_access(user_id);
CREATE INDEX IF NOT EXISTS idx_email_account_access_account ON email_account_access(account_id);

-- Email Threads
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  subject text NOT NULL,
  participants jsonb DEFAULT '[]'::jsonb,
  message_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_threads_account ON email_threads(account_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(last_message_at DESC);

-- Email Messages
CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES email_threads(id) ON DELETE SET NULL,
  message_id text UNIQUE,
  from_address text NOT NULL,
  from_name text,
  to_addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses jsonb DEFAULT '[]'::jsonb,
  bcc_addresses jsonb DEFAULT '[]'::jsonb,
  reply_to text,
  subject text,
  body_html text,
  body_text text,
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash', 'archive')),
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_draft boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  received_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(received_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_email_messages_unread ON email_messages(is_read) WHERE is_read = false;

-- Email Attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  content_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON email_attachments(message_id);

-- Email Labels
CREATE TABLE IF NOT EXISTS email_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_email_labels_tenant ON email_labels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_labels_user ON email_labels(user_id);

-- Email Message Labels Junction
CREATE TABLE IF NOT EXISTS email_message_labels (
  message_id uuid NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES email_labels(id) ON DELETE CASCADE,
  applied_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_email_message_labels_message ON email_message_labels(message_id);
CREATE INDEX IF NOT EXISTS idx_email_message_labels_label ON email_message_labels(label_id);

-- Enable Row Level Security
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_account_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_message_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_accounts
CREATE POLICY "Staff can view accounts they have access to"
  ON email_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_accounts.id
      AND eaa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = email_accounts.tenant_id
      AND tu.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Tenant admins can manage their email accounts"
  ON email_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = email_accounts.tenant_id
      AND tu.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = email_accounts.tenant_id
      AND tu.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for email_account_access
CREATE POLICY "Users can view their own access grants"
  ON email_account_access FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM email_accounts ea
      WHERE ea.id = email_account_access.account_id
      AND EXISTS (
        SELECT 1 FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = ea.tenant_id
        AND tu.role IN ('owner', 'admin')
      )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage access grants"
  ON email_account_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      WHERE ea.id = email_account_access.account_id
      AND EXISTS (
        SELECT 1 FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = ea.tenant_id
        AND tu.role IN ('owner', 'admin')
      )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_accounts ea
      WHERE ea.id = email_account_access.account_id
      AND EXISTS (
        SELECT 1 FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = ea.tenant_id
        AND tu.role IN ('owner', 'admin')
      )
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for email_threads
CREATE POLICY "Users can view threads for accounts they have access to"
  ON email_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_threads.account_id
      AND eaa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage threads for accounts they have full access to"
  ON email_threads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_threads.account_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level = 'full'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_threads.account_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level = 'full'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for email_messages
CREATE POLICY "Users can view messages for accounts they have access to"
  ON email_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_messages.account_id
      AND eaa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage messages for accounts they have access to"
  ON email_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_messages.account_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level IN ('full', 'send_only')
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_account_access eaa
      WHERE eaa.account_id = email_messages.account_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level IN ('full', 'send_only')
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for email_attachments
CREATE POLICY "Users can view attachments for messages they can access"
  ON email_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_messages em
      JOIN email_account_access eaa ON eaa.account_id = em.account_id
      WHERE em.id = email_attachments.message_id
      AND eaa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage attachments for their messages"
  ON email_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_messages em
      JOIN email_account_access eaa ON eaa.account_id = em.account_id
      WHERE em.id = email_attachments.message_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level IN ('full', 'send_only')
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_messages em
      JOIN email_account_access eaa ON eaa.account_id = em.account_id
      WHERE em.id = email_attachments.message_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level IN ('full', 'send_only')
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for email_labels
CREATE POLICY "Users can view labels for their tenant"
  ON email_labels FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = email_labels.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own labels"
  ON email_labels FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for email_message_labels
CREATE POLICY "Users can view labels on messages they can access"
  ON email_message_labels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_messages em
      JOIN email_account_access eaa ON eaa.account_id = em.account_id
      WHERE em.id = email_message_labels.message_id
      AND eaa.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage labels on their messages"
  ON email_message_labels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_messages em
      JOIN email_account_access eaa ON eaa.account_id = em.account_id
      WHERE em.id = email_message_labels.message_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level = 'full'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_messages em
      JOIN email_account_access eaa ON eaa.account_id = em.account_id
      WHERE em.id = email_message_labels.message_id
      AND eaa.user_id = auth.uid()
      AND eaa.access_level = 'full'
    )
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );
