/*
  # Create Tutorial & AI Help Support System

  ## Overview
  Implements a guided first-run tutorial system and an AI-powered help chat assistant
  available across all portals (Client, Manager, Platform Admin).

  ## New Tables
  1. tutorial_definitions - ordered step definitions per portal, seeded with 3 tutorials
  2. user_tutorial_progress - per-user per-tutorial tracking (not_started|in_progress|skipped|completed)
  3. support_conversations - AI help chat threads per user
  4. support_messages - individual messages (user|ai|agent)
  5. support_feedback - thumbs up/down on AI messages

  ## Security
  - RLS on all tables
  - Users see only their own rows
  - Staff see their tenant threads
  - Platform admins have full read access
*/

-- ============================================================
-- tutorial_definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS tutorial_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  portal text NOT NULL CHECK (portal IN ('client', 'manager', 'platform_admin')),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tutorial_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active tutorial definitions"
  ON tutorial_definitions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins can insert tutorial definitions"
  ON tutorial_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users
      WHERE platform_admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can update tutorial definitions"
  ON tutorial_definitions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid())
  );

-- ============================================================
-- user_tutorial_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutorial_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'skipped', 'completed')),
  current_step integer NOT NULL DEFAULT 0,
  steps_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tutorial_key)
);

CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_user_id ON user_tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_status ON user_tutorial_progress(status);

ALTER TABLE user_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tutorial progress"
  ON user_tutorial_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tutorial progress"
  ON user_tutorial_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tutorial progress"
  ON user_tutorial_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can read all tutorial progress"
  ON user_tutorial_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid())
  );

-- ============================================================
-- support_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE SET NULL,
  portal text NOT NULL DEFAULT 'manager' CHECK (portal IN ('client', 'manager', 'platform_admin')),
  title text NOT NULL DEFAULT 'Help conversation',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_tenant_id ON support_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own support conversations"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own support conversations"
  ON support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own support conversations"
  ON support_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenant staff can read tenant support conversations"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE staff_accounts.auth_user_id = auth.uid()
      AND staff_accounts.tenant_id = support_conversations.tenant_id
      AND staff_accounts.status = 'active'
    )
  );

CREATE POLICY "Platform admins can read all support conversations"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid())
  );

CREATE POLICY "Platform admins can update all support conversations"
  ON support_conversations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()));

-- ============================================================
-- support_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'ai', 'agent')),
  body_markdown text NOT NULL DEFAULT '',
  tool_calls jsonb,
  model text,
  token_usage jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages in own conversations"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'user' AND EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can read all support messages"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid())
  );

CREATE POLICY "Platform admins can insert agent messages"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'agent' AND EXISTS (
      SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid()
    )
  );

-- ============================================================
-- support_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS support_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('up', 'down')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_support_feedback_message_id ON support_feedback(message_id);

ALTER TABLE support_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedback"
  ON support_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON support_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON support_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins can read all feedback"
  ON support_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM platform_admin_users WHERE platform_admin_users.user_id = auth.uid())
  );

-- ============================================================
-- SEED: Tutorial Definitions
-- ============================================================
INSERT INTO tutorial_definitions (key, portal, title, description, steps, version, is_active)
VALUES
(
  'client_first_run',
  'client',
  'Welcome to Your Investor Portal',
  'A quick guided tour of your investor portal and everything you can do here.',
  $steps$[
    {"id":"welcome","title":"Welcome to Your Investor Portal","body":"This is your personal investor portal. We will walk you through the key sections so you know exactly where to find everything.","target":"[data-tour=\"client-header\"]","placement":"bottom","route":null},
    {"id":"dashboard","title":"Your Dashboard","body":"Your dashboard gives you a real-time overview of your portfolio value, recent performance, and any pending actions that need your attention.","target":"[data-tour=\"client-tab-dashboard\"]","placement":"bottom","route":"dashboard"},
    {"id":"returns","title":"Returns and Performance","body":"Track your investment returns over time with charts showing monthly, quarterly, and annual performance compared to benchmarks.","target":"[data-tour=\"client-tab-returns\"]","placement":"bottom","route":"returns"},
    {"id":"risk","title":"Risk Metrics","body":"Understand the risk profile of your investments including volatility, Sharpe ratio, max drawdown, and Value at Risk.","target":"[data-tour=\"client-tab-risk\"]","placement":"bottom","route":"risk"},
    {"id":"documents","title":"Your Documents","body":"Access all your fund documents including subscription agreements, offering memoranda, side letters, and regulatory filings.","target":"[data-tour=\"client-tab-documents\"]","placement":"bottom","route":"documents"},
    {"id":"tax","title":"Tax Documents","body":"Download your annual K-1s, PFIC statements, and other tax-related documents. New documents are notified by email.","target":"[data-tour=\"client-tab-tax\"]","placement":"bottom","route":"tax"},
    {"id":"kyc","title":"Identity Verification","body":"Complete your KYC and AML verification here. This is required before your investment is fully active. The process takes under 5 minutes.","target":"[data-tour=\"client-tab-kyc\"]","placement":"bottom","route":"verification"},
    {"id":"redemptions","title":"Redemptions","body":"Submit redemption requests here. Your fund manager will review and process them according to the fund redemption schedule.","target":"[data-tour=\"client-tab-redemptions\"]","placement":"bottom","route":"redemptions"},
    {"id":"settings","title":"Your Settings","body":"Update your contact information, communication preferences, banking details, and two-factor authentication settings.","target":"[data-tour=\"client-tab-settings\"]","placement":"bottom","route":"settings"},
    {"id":"help","title":"AI Help Assistant","body":"The help button in the top right corner gives you instant access to our AI assistant. Ask it anything about your portal and it can guide you step by step.","target":"[data-tour=\"help-button\"]","placement":"bottom","route":null}
  ]$steps$::jsonb,
  1, true
),
(
  'manager_first_run',
  'manager',
  'Welcome to Your Fund Manager Portal',
  'A guided tour of all the tools available to manage your fund, investors, and operations.',
  $steps$[
    {"id":"welcome","title":"Welcome to Your Manager Portal","body":"This is your fund operations hub. We will walk through each section so you can hit the ground running.","target":"[data-tour=\"manager-header\"]","placement":"bottom","route":null},
    {"id":"portfolio","title":"Portfolio Management","body":"The Portfolio section covers your funds, share classes, capital accounts, NAV calculations, and transaction history. Everything you need to manage fund positions.","target":"[data-tour=\"sidebar-portfolio\"]","placement":"right","route":"dashboard"},
    {"id":"nav","title":"NAV Calculator","body":"Record and verify your Net Asset Value with a full audit trail. Supports multiple share classes, side pockets, and carried interest calculations.","target":"[data-tour=\"sidebar-nav\"]","placement":"right","route":"nav"},
    {"id":"operations","title":"Fund Operations","body":"Manage capital calls, distributions, redemption requests, and fee calculations. Each workflow includes approval steps and automated investor notifications.","target":"[data-tour=\"sidebar-operations\"]","placement":"right","route":"capital_calls"},
    {"id":"reporting","title":"Reporting","body":"Generate investor statements, performance reports, and tax documents. Reports can be scheduled for automatic delivery and archived for audit purposes.","target":"[data-tour=\"sidebar-reporting\"]","placement":"right","route":"statements"},
    {"id":"crm","title":"CRM and Investor Relations","body":"Track your investor pipeline from lead to active client. Manage contacts, run onboarding workflows, and keep a complete interaction history.","target":"[data-tour=\"sidebar-crm\"]","placement":"right","route":"crm"},
    {"id":"communications","title":"Communications","body":"Send investor newsletters, manage your email inbox, build invitation templates, and run targeted campaigns all from one place.","target":"[data-tour=\"sidebar-communications\"]","placement":"right","route":"email"},
    {"id":"agents","title":"AI and Voice Agents","body":"Configure AI agents to handle lead outreach, answer investor questions, and run automated voice campaigns. Monitor all activity in real time.","target":"[data-tour=\"sidebar-agents\"]","placement":"right","route":"ai_agents"},
    {"id":"website","title":"Your White-Label Website","body":"Build and publish your fund marketing website with no code required. Edit pages visually, manage your blog, testimonials, FAQs, and SEO settings.","target":"[data-tour=\"sidebar-website\"]","placement":"right","route":"blog"},
    {"id":"compliance","title":"Compliance and KYC","body":"Review KYC and AML verification status for all investors, manage regulatory frameworks, and access the full compliance audit log.","target":"[data-tour=\"sidebar-admin\"]","placement":"right","route":"compliance"},
    {"id":"help","title":"AI Help Assistant","body":"Use the help button at any time to ask our AI assistant about any feature. It understands your current screen and can navigate you directly to what you need.","target":"[data-tour=\"help-button\"]","placement":"left","route":null}
  ]$steps$::jsonb,
  1, true
),
(
  'platform_admin_first_run',
  'platform_admin',
  'Welcome to Platform Administration',
  'A tour of all platform-level controls for managing tenants, billing, compliance, and operations.',
  $steps$[
    {"id":"welcome","title":"Welcome, Platform Admin","body":"This is the master control panel for the entire ClearNAV platform. Here you manage all tenant accounts, billing, and platform-wide settings.","target":"[data-tour=\"platform-header\"]","placement":"bottom","route":null},
    {"id":"tenants","title":"Tenant Management","body":"View, create, and manage all tenant accounts. Drill into any tenant to see their settings, users, subscription status, and usage metrics.","target":"[data-tour=\"platform-tab-tenants\"]","placement":"bottom","route":"tenants"},
    {"id":"users","title":"Platform Users","body":"Manage all users across every tenant. Reset passwords, adjust roles, and investigate activity across the platform.","target":"[data-tour=\"platform-tab-users\"]","placement":"bottom","route":"users"},
    {"id":"billing","title":"Billing and Subscriptions","body":"Monitor subscription revenue, manage plans, apply discounts, and view invoicing history across all tenants.","target":"[data-tour=\"platform-tab-billing\"]","placement":"bottom","route":"billing"},
    {"id":"analytics","title":"Platform Analytics","body":"Track platform-wide growth metrics including active tenants, user counts, feature adoption, AI agent usage, and revenue trends.","target":"[data-tour=\"platform-tab-analytics\"]","placement":"bottom","route":"analytics"},
    {"id":"support","title":"Support and AI Conversations","body":"Review AI help conversations from all users. Escalate to human support and reply directly within any conversation thread.","target":"[data-tour=\"platform-tab-support\"]","placement":"bottom","route":"support"},
    {"id":"settings","title":"Platform Settings","body":"Configure global platform defaults, manage tutorial content, toggle per-tenant feature flags, and set compliance policies.","target":"[data-tour=\"platform-tab-settings\"]","placement":"bottom","route":"settings"},
    {"id":"help","title":"AI Help Assistant","body":"The help assistant is available here too. Ask it about any platform administration task and it will guide you with context-aware answers.","target":"[data-tour=\"help-button\"]","placement":"left","route":null}
  ]$steps$::jsonb,
  1, true
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Helper: get or create tutorial progress row
-- ============================================================
CREATE OR REPLACE FUNCTION get_or_create_tutorial_progress(p_user_id uuid, p_tutorial_key text)
RETURNS user_tutorial_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress user_tutorial_progress;
BEGIN
  SELECT * INTO v_progress
  FROM user_tutorial_progress
  WHERE user_id = p_user_id AND tutorial_key = p_tutorial_key;

  IF NOT FOUND THEN
    INSERT INTO user_tutorial_progress (user_id, tutorial_key, status, current_step, steps_completed)
    VALUES (p_user_id, p_tutorial_key, 'not_started', 0, '[]'::jsonb)
    RETURNING * INTO v_progress;
  END IF;

  RETURN v_progress;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_tutorial_progress(uuid, text) TO authenticated;
