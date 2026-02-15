/*
  # Community and Networking Platform for ClearNav

  ## Overview
  Creates a cross-tenant community platform where all authenticated users (staff and clients)
  can connect, collaborate, and support each other. Includes forums, direct messaging,
  marketplace, job board, and networking features.

  ## New Tables

  ### 1. `community_categories`
  Categories for organizing community posts
  - `id` (uuid, primary key)
  - `name` (text) - Category name
  - `slug` (text, unique) - URL-friendly identifier
  - `description` (text) - Category description
  - `icon` (text) - Lucide icon name
  - `color` (text) - Color code for UI
  - `post_count` (integer) - Number of posts in category
  - `display_order` (integer) - Sort order
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 2. `community_posts`
  Posts created by users across all tenants
  - `id` (uuid, primary key)
  - `author_user_id` (uuid, references auth.users)
  - `author_tenant_id` (uuid, references platform_tenants) - Author's tenant for display
  - `category_id` (uuid, references community_categories)
  - `post_type` (text) - 'discussion', 'question', 'marketplace', 'job', 'announcement'
  - `title` (text) - Post title
  - `content` (text) - Post content/body
  - `content_html` (text) - Rendered HTML content
  - `attachments` (jsonb) - Array of attachment metadata
  - `tags` (text[]) - Array of tags
  - `view_count` (integer) - Number of views
  - `comment_count` (integer) - Number of comments
  - `reaction_count` (integer) - Total reactions
  - `is_pinned` (boolean) - Featured/pinned posts
  - `is_locked` (boolean) - Prevent new comments
  - `is_reported` (boolean) - Flagged for moderation
  - `status` (text) - 'active', 'archived', 'deleted', 'moderated'
  - `marketplace_price` (numeric) - For marketplace posts
  - `marketplace_currency` (text) - Currency code
  - `marketplace_sold` (boolean) - Whether item is sold
  - `job_location` (text) - Job location
  - `job_type` (text) - 'full-time', 'part-time', 'contract', 'internship'
  - `job_salary_range` (text) - Salary range text
  - `job_filled` (boolean) - Whether job is filled
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `community_comments`
  Comments on posts with threading support
  - `id` (uuid, primary key)
  - `post_id` (uuid, references community_posts)
  - `author_user_id` (uuid, references auth.users)
  - `parent_comment_id` (uuid, references community_comments) - For nested replies
  - `content` (text) - Comment text
  - `content_html` (text) - Rendered HTML
  - `reaction_count` (integer)
  - `is_reported` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `community_reactions`
  Reactions/likes on posts and comments
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `post_id` (uuid, references community_posts)
  - `comment_id` (uuid, references community_comments)
  - `reaction_type` (text) - 'like', 'helpful', 'insightful', 'celebrate'
  - `created_at` (timestamptz)
  - UNIQUE(user_id, post_id, reaction_type) or UNIQUE(user_id, comment_id, reaction_type)

  ### 5. `message_threads`
  Direct message conversation threads
  - `id` (uuid, primary key)
  - `participant_ids` (uuid[]) - Array of user IDs in conversation
  - `thread_type` (text) - 'direct', 'group'
  - `thread_name` (text) - Optional name for group threads
  - `last_message_at` (timestamptz)
  - `last_message_preview` (text)
  - `created_by` (uuid, references auth.users)
  - `created_at` (timestamptz)

  ### 6. `direct_messages`
  Individual messages within threads
  - `id` (uuid, primary key)
  - `thread_id` (uuid, references message_threads)
  - `sender_id` (uuid, references auth.users)
  - `content` (text) - Message content
  - `content_html` (text) - Rendered HTML
  - `attachments` (jsonb) - File attachments
  - `is_system_message` (boolean) - System-generated message
  - `sent_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 7. `message_read_receipts`
  Track which users have read which messages
  - `message_id` (uuid, references direct_messages)
  - `user_id` (uuid, references auth.users)
  - `read_at` (timestamptz)
  - PRIMARY KEY (message_id, user_id)

  ### 8. `user_connections`
  Network connections between users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `connected_user_id` (uuid, references auth.users)
  - `connection_type` (text) - 'connection', 'follow'
  - `status` (text) - 'pending', 'accepted', 'declined', 'blocked'
  - `requested_by` (uuid, references auth.users)
  - `requested_at` (timestamptz)
  - `responded_at` (timestamptz)
  - UNIQUE(user_id, connected_user_id, connection_type)

  ### 9. `user_profiles_public`
  Public user profiles visible across platform
  - `user_id` (uuid PRIMARY KEY, references auth.users)
  - `display_name` (text) - Public display name
  - `bio` (text) - User bio/about
  - `avatar_url` (text) - Profile picture
  - `location` (text) - City/region
  - `company` (text) - Current company
  - `job_title` (text) - Current role
  - `linkedin_url` (text)
  - `website_url` (text)
  - `show_tenant` (boolean) - Whether to display tenant affiliation
  - `show_location` (boolean) - Privacy setting
  - `show_company` (boolean) - Privacy setting
  - `is_available_for_consulting` (boolean)
  - `profile_visibility` (text) - 'public', 'connections_only', 'private'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 10. `community_notifications`
  Notification system for community activity
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `notification_type` (text) - 'post_comment', 'post_reaction', 'message', 'connection_request', 'mention'
  - `title` (text) - Notification title
  - `content` (text) - Notification content
  - `reference_type` (text) - 'post', 'comment', 'message', 'user'
  - `reference_id` (uuid) - ID of referenced object
  - `action_url` (text) - Where to navigate on click
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ### 11. `saved_posts`
  Bookmarked posts for later reference
  - `user_id` (uuid, references auth.users)
  - `post_id` (uuid, references community_posts)
  - `saved_at` (timestamptz)
  - PRIMARY KEY (user_id, post_id)

  ### 12. `content_reports`
  User-reported content for moderation
  - `id` (uuid, primary key)
  - `reporter_id` (uuid, references auth.users)
  - `content_type` (text) - 'post', 'comment', 'message'
  - `content_id` (uuid) - ID of reported content
  - `reason` (text) - Report reason
  - `details` (text) - Additional details
  - `status` (text) - 'pending', 'reviewing', 'resolved', 'dismissed'
  - `reviewed_by` (uuid, references auth.users)
  - `reviewed_at` (timestamptz)
  - `resolution_note` (text)
  - `created_at` (timestamptz)

  ## Security

  ### RLS Policies
  - Community content is visible to all authenticated users
  - Users can only edit/delete their own posts and comments
  - Direct messages are only visible to conversation participants
  - Connection requests visible to both parties
  - Platform admins have moderation capabilities

  ## Indexes
  - Performance indexes on foreign keys and commonly queried fields
  - Full-text search indexes on post titles and content
*/

-- Community Categories
CREATE TABLE IF NOT EXISTS community_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'MessageSquare',
  color text NOT NULL DEFAULT '#3B82F6',
  post_count integer DEFAULT 0,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_categories_active ON community_categories(is_active) WHERE is_active = true;

-- Insert default categories
INSERT INTO community_categories (name, slug, description, icon, color, display_order) VALUES
  ('General Discussion', 'general', 'General conversations and topics', 'MessageSquare', '#3B82F6', 1),
  ('Help & Support', 'help', 'Ask questions and get help from the community', 'HelpCircle', '#10B981', 2),
  ('Job Board', 'jobs', 'Job opportunities and career discussions', 'Briefcase', '#8B5CF6', 3),
  ('Marketplace', 'marketplace', 'Buy, sell, or trade services and products', 'ShoppingBag', '#F59E0B', 4),
  ('Networking', 'networking', 'Connect with other professionals', 'Users', '#EC4899', 5),
  ('Announcements', 'announcements', 'Important platform updates and news', 'Megaphone', '#EF4444', 6)
ON CONFLICT (slug) DO NOTHING;

-- Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_tenant_id uuid REFERENCES platform_tenants(id) ON DELETE SET NULL,
  category_id uuid NOT NULL REFERENCES community_categories(id) ON DELETE RESTRICT,
  post_type text NOT NULL DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question', 'marketplace', 'job', 'announcement')),
  title text NOT NULL,
  content text NOT NULL,
  content_html text,
  attachments jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  view_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  reaction_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_reported boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted', 'moderated')),
  marketplace_price numeric(10,2),
  marketplace_currency text DEFAULT 'USD',
  marketplace_sold boolean DEFAULT false,
  job_location text,
  job_type text CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance')),
  job_salary_range text,
  job_filled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(is_pinned, created_at DESC) WHERE is_pinned = true;

-- Community Comments
CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_html text,
  reaction_count integer DEFAULT 0,
  is_reported boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author ON community_comments(author_user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created ON community_comments(created_at);

-- Community Reactions
CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'insightful', 'celebrate')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT either_post_or_comment CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_user_post ON community_reactions(user_id, post_id, reaction_type) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reactions_user_comment ON community_reactions(user_id, comment_id, reaction_type) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_comment ON community_reactions(comment_id);

-- Message Threads
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids uuid[] NOT NULL,
  thread_type text NOT NULL DEFAULT 'direct' CHECK (thread_type IN ('direct', 'group')),
  thread_name text,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON message_threads USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);

-- Direct Messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_html text,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_system_message boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread ON direct_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sent ON direct_messages(sent_at DESC);

-- Message Read Receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(user_id);

-- User Connections
CREATE TABLE IF NOT EXISTS user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_type text NOT NULL DEFAULT 'connection' CHECK (connection_type IN ('connection', 'follow')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(user_id, connected_user_id, connection_type),
  CONSTRAINT no_self_connection CHECK (user_id != connected_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_user ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connected_user ON user_connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);

-- Public User Profiles
CREATE TABLE IF NOT EXISTS user_profiles_public (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  avatar_url text,
  location text,
  company text,
  job_title text,
  linkedin_url text,
  website_url text,
  show_tenant boolean DEFAULT true,
  show_location boolean DEFAULT true,
  show_company boolean DEFAULT true,
  is_available_for_consulting boolean DEFAULT false,
  profile_visibility text NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'connections_only', 'private')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community Notifications
CREATE TABLE IF NOT EXISTS community_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('post_comment', 'post_reaction', 'message', 'connection_request', 'mention', 'post_reply')),
  title text NOT NULL,
  content text,
  reference_type text CHECK (reference_type IN ('post', 'comment', 'message', 'user', 'connection')),
  reference_id uuid,
  action_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_notifications_user ON community_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_community_notifications_unread ON community_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_community_notifications_created ON community_notifications(created_at DESC);

-- Saved Posts
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);

-- Content Reports
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'message', 'user')),
  content_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);

-- Enable Row Level Security
ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_categories
CREATE POLICY "Anyone can view active categories"
  ON community_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins can manage categories"
  ON community_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for community_posts
CREATE POLICY "Anyone can view active posts"
  ON community_posts FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors can update their own posts"
  ON community_posts FOR UPDATE
  TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors can delete their own posts"
  ON community_posts FOR DELETE
  TO authenticated
  USING (author_user_id = auth.uid());

CREATE POLICY "Platform admins can manage all posts"
  ON community_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

-- RLS Policies for community_comments
CREATE POLICY "Anyone can view comments on active posts"
  ON community_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      WHERE cp.id = community_comments.post_id
      AND cp.status = 'active'
    )
  );

CREATE POLICY "Users can create comments"
  ON community_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors can update their own comments"
  ON community_comments FOR UPDATE
  TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors can delete their own comments"
  ON community_comments FOR DELETE
  TO authenticated
  USING (author_user_id = auth.uid());

-- RLS Policies for community_reactions
CREATE POLICY "Anyone can view reactions"
  ON community_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own reactions"
  ON community_reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for message_threads
CREATE POLICY "Users can view threads they participate in"
  ON message_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = ANY(participant_ids) AND created_by = auth.uid());

CREATE POLICY "Participants can update thread"
  ON message_threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = ANY(participant_ids))
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- RLS Policies for direct_messages
CREATE POLICY "Users can view messages in their threads"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = direct_messages.thread_id
      AND auth.uid() = ANY(mt.participant_ids)
    )
  );

CREATE POLICY "Users can send messages in their threads"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM message_threads mt
      WHERE mt.id = direct_messages.thread_id
      AND auth.uid() = ANY(mt.participant_ids)
    )
  );

-- RLS Policies for message_read_receipts
CREATE POLICY "Users can view read receipts in their threads"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_messages dm
      JOIN message_threads mt ON mt.id = dm.thread_id
      WHERE dm.id = message_read_receipts.message_id
      AND auth.uid() = ANY(mt.participant_ids)
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_connections
CREATE POLICY "Users can view their own connections"
  ON user_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR connected_user_id = auth.uid());

CREATE POLICY "Users can create connection requests"
  ON user_connections FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid() AND user_id = auth.uid());

CREATE POLICY "Users can respond to connection requests"
  ON user_connections FOR UPDATE
  TO authenticated
  USING (connected_user_id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (connected_user_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can delete their connections"
  ON user_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR connected_user_id = auth.uid());

-- RLS Policies for user_profiles_public
CREATE POLICY "Anyone can view public profiles"
  ON user_profiles_public FOR SELECT
  TO authenticated
  USING (
    profile_visibility = 'public'
    OR user_id = auth.uid()
    OR (
      profile_visibility = 'connections_only'
      AND EXISTS (
        SELECT 1 FROM user_connections uc
        WHERE (uc.user_id = auth.uid() AND uc.connected_user_id = user_profiles_public.user_id)
           OR (uc.connected_user_id = auth.uid() AND uc.user_id = user_profiles_public.user_id)
        AND uc.status = 'accepted'
      )
    )
  );

CREATE POLICY "Users can manage their own profile"
  ON user_profiles_public FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for community_notifications
CREATE POLICY "Users can view their own notifications"
  ON community_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON community_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON community_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON community_notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for saved_posts
CREATE POLICY "Users can view their saved posts"
  ON saved_posts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save posts"
  ON saved_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave posts"
  ON saved_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for content_reports
CREATE POLICY "Users can view their own reports"
  ON content_reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports"
  ON content_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Platform admins can manage reports"
  ON content_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admin_users pau
      WHERE pau.user_id = auth.uid()
    )
  );
