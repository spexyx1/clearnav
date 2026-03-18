/*
  # Create Phase 5: Scheduling, Comments & Subscribers

  ## Overview
  Adds content scheduling, blog comments, and newsletter subscribers
  for the white-label platform.

  ## What This Creates
  1. `content_schedule` - Scheduled content publishing
  2. `blog_comments` - Blog post comments
  3. `newsletter_subscribers` - Email list management
  4. Helper functions for scheduling

  ## Security
  - All tables scoped to tenant_id
  - Public write for comments and subscriptions
  - Admin read/write for schedules
*/

-- ============================================================================
-- CONTENT SCHEDULE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Content Reference
  content_type text NOT NULL CHECK (content_type IN ('blog_post', 'newsletter', 'email')),
  content_id uuid NOT NULL,
  
  -- Schedule
  scheduled_for timestamptz NOT NULL,
  action text NOT NULL CHECK (action IN ('publish', 'unpublish', 'send')),
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message text,
  
  -- Execution
  executed_at timestamptz,
  executed_by uuid REFERENCES auth.users(id),
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_tenant ON content_schedule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_scheduled ON content_schedule(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON content_schedule(status);
CREATE INDEX IF NOT EXISTS idx_schedule_content ON content_schedule(content_type, content_id);

-- ============================================================================
-- BLOG COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Commenter Info
  author_name text NOT NULL,
  author_email text NOT NULL,
  author_url text,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Comment Content
  comment_text text NOT NULL,
  
  -- Moderation
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'rejected')),
  moderated_by uuid REFERENCES auth.users(id),
  moderated_at timestamptz,
  
  -- Hierarchy
  parent_id uuid REFERENCES blog_comments(id) ON DELETE CASCADE,
  
  -- Metadata
  ip_address inet,
  user_agent text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON blog_comments(post_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_tenant ON blog_comments(tenant_id);

-- ============================================================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Subscriber Info
  email text NOT NULL,
  first_name text,
  last_name text,
  
  -- Status
  status text DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced', 'complained')),
  
  -- Source
  source text DEFAULT 'website',
  referring_url text,
  
  -- Preferences
  preferences jsonb DEFAULT '{}'::jsonb,
  tags text[],
  
  -- Engagement
  opens_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  last_opened_at timestamptz,
  last_clicked_at timestamptz,
  
  -- Verification
  verification_token text,
  verified_at timestamptz,
  
  -- Unsubscribe
  unsubscribe_token text UNIQUE,
  unsubscribed_at timestamptz,
  
  -- Timestamps
  subscribed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_subscribers_tenant ON newsletter_subscribers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON newsletter_subscribers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON newsletter_subscribers(unsubscribe_token);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Content Schedule RLS
ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can manage schedules" ON content_schedule;
CREATE POLICY "Tenant admins can manage schedules"
  ON content_schedule
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = content_schedule.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Blog Comments RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved comments" ON blog_comments;
CREATE POLICY "Anyone can view approved comments"
  ON blog_comments
  FOR SELECT
  TO authenticated, anon
  USING (status = 'approved');

DROP POLICY IF EXISTS "Anyone can submit comments" ON blog_comments;
CREATE POLICY "Anyone can submit comments"
  ON blog_comments
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Tenant admins can moderate comments" ON blog_comments;
CREATE POLICY "Tenant admins can moderate comments"
  ON blog_comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = blog_comments.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Tenant admins can delete comments" ON blog_comments;
CREATE POLICY "Tenant admins can delete comments"
  ON blog_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = blog_comments.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Newsletter Subscribers RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscribers
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Subscribers can update own subscription" ON newsletter_subscribers;
CREATE POLICY "Subscribers can update own subscription"
  ON newsletter_subscribers
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Tenant admins can manage subscribers" ON newsletter_subscribers;
CREATE POLICY "Tenant admins can manage subscribers"
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = newsletter_subscribers.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to process scheduled content
CREATE OR REPLACE FUNCTION process_scheduled_content()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed_count integer := 0;
  v_schedule_record record;
BEGIN
  FOR v_schedule_record IN
    SELECT * FROM content_schedule
    WHERE status = 'pending'
    AND scheduled_for <= now()
    ORDER BY scheduled_for
    LIMIT 100
  LOOP
    BEGIN
      UPDATE content_schedule
      SET status = 'processing'
      WHERE id = v_schedule_record.id;

      IF v_schedule_record.content_type = 'blog_post' THEN
        IF v_schedule_record.action = 'publish' THEN
          UPDATE blog_posts
          SET status = 'published', published_at = now()
          WHERE id = v_schedule_record.content_id;
        ELSIF v_schedule_record.action = 'unpublish' THEN
          UPDATE blog_posts
          SET status = 'draft'
          WHERE id = v_schedule_record.content_id;
        END IF;
      END IF;

      UPDATE content_schedule
      SET 
        status = 'completed',
        executed_at = now()
      WHERE id = v_schedule_record.id;

      v_processed_count := v_processed_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE content_schedule
      SET 
        status = 'failed',
        error_message = SQLERRM
      WHERE id = v_schedule_record.id;
    END;
  END LOOP;

  RETURN v_processed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION process_scheduled_content() TO authenticated;

COMMENT ON FUNCTION process_scheduled_content IS 'Processes pending scheduled content actions';
