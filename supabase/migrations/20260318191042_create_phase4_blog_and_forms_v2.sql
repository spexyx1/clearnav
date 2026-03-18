/*
  # Create Phase 4: Blog System and Form Builder

  ## Overview
  Adds a comprehensive blog system with categories, tags, and a form builder
  with submissions tracking for white-label websites.

  ## What This Creates
  1. `blog_posts` - Blog post content and metadata
  2. `blog_categories` - Blog post categories
  3. `blog_tags` - Reusable tags
  4. `blog_post_tags` - Many-to-many relationship
  5. `custom_forms` - Form definitions
  6. `form_fields` - Form field configurations
  7. `form_submissions` - Submitted form data
  8. `testimonials` - Client testimonials
  9. `faq_items` - Frequently asked questions

  ## Security
  - All tables scoped to tenant_id
  - Public read for published content
  - Admin write for configuration
  - Secure form submission handling
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS increment_post_views(uuid);
DROP FUNCTION IF EXISTS increment_faq_helpful(uuid);
DROP FUNCTION IF EXISTS get_blog_posts_with_metadata(uuid, integer, integer);

-- ============================================================================
-- BLOG CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  icon text,
  display_order integer DEFAULT 0,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_tenant ON blog_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(tenant_id, slug);

-- ============================================================================
-- BLOG TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  slug text NOT NULL,
  color text DEFAULT '#8b5cf6',
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_tenant ON blog_tags(tenant_id);

-- ============================================================================
-- BLOG POSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES blog_categories(id) ON DELETE SET NULL,
  
  -- Content
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content jsonb NOT NULL,
  featured_image_url text,
  
  -- SEO
  meta_title text,
  meta_description text,
  meta_keywords text[],
  
  -- Author
  author_name text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Publishing
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  
  -- Stats
  view_count integer DEFAULT 0,
  read_time_minutes integer,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(tenant_id, published_at DESC);

-- ============================================================================
-- BLOG POST TAGS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- ============================================================================
-- CUSTOM FORMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Basic Info
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  
  -- Configuration
  submit_button_text text DEFAULT 'Submit',
  success_message text DEFAULT 'Thank you for your submission!',
  redirect_url text,
  
  -- Email Notifications
  send_notification_email boolean DEFAULT true,
  notification_email text,
  notification_subject text,
  
  -- Settings
  allow_multiple_submissions boolean DEFAULT true,
  require_authentication boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_custom_forms_tenant ON custom_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_forms_slug ON custom_forms(tenant_id, slug);

-- ============================================================================
-- FORM FIELDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
  
  -- Field Configuration
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN (
    'text', 'email', 'phone', 'textarea', 'number', 
    'select', 'radio', 'checkbox', 'date', 'file'
  )),
  
  -- Options
  placeholder text,
  help_text text,
  default_value text,
  options jsonb,
  
  -- Validation
  is_required boolean DEFAULT false,
  min_length integer,
  max_length integer,
  pattern text,
  validation_message text,
  
  -- Display
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_order ON form_fields(form_id, display_order);

-- ============================================================================
-- FORM SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Submission Data
  submission_data jsonb NOT NULL,
  
  -- Submitter Info
  submitter_name text,
  submitter_email text,
  submitter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  ip_address inet,
  user_agent text,
  referrer_url text,
  
  -- Status
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived', 'spam')),
  notes text,
  
  -- Timestamps
  submitted_at timestamptz DEFAULT now(),
  read_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant ON form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_date ON form_submissions(tenant_id, submitted_at DESC);

-- ============================================================================
-- TESTIMONIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Content
  client_name text NOT NULL,
  client_position text,
  client_company text,
  client_photo_url text,
  testimonial_text text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  
  -- Display
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_tenant ON testimonials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(tenant_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_order ON testimonials(tenant_id, display_order);

-- ============================================================================
-- FAQ ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  
  -- Content
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  
  -- Display
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  
  -- Stats
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_items_tenant ON faq_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_faq_items_order ON faq_items(tenant_id, display_order);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Blog Categories RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON blog_categories;
CREATE POLICY "Public can view active categories"
  ON blog_categories
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admins can manage categories" ON blog_categories;
CREATE POLICY "Tenant admins can manage categories"
  ON blog_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = blog_categories.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Blog Tags RLS
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tags" ON blog_tags;
CREATE POLICY "Public can view tags"
  ON blog_tags
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Tenant admins can manage tags" ON blog_tags;
CREATE POLICY "Tenant admins can manage tags"
  ON blog_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = blog_tags.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Blog Posts RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published posts" ON blog_posts;
CREATE POLICY "Public can view published posts"
  ON blog_posts
  FOR SELECT
  TO authenticated, anon
  USING (status = 'published' AND published_at <= now());

DROP POLICY IF EXISTS "Tenant admins can manage posts" ON blog_posts;
CREATE POLICY "Tenant admins can manage posts"
  ON blog_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = blog_posts.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Blog Post Tags RLS
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view post tags" ON blog_post_tags;
CREATE POLICY "Public can view post tags"
  ON blog_post_tags
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Tenant admins can manage post tags" ON blog_post_tags;
CREATE POLICY "Tenant admins can manage post tags"
  ON blog_post_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      JOIN user_roles ON user_roles.tenant_id = blog_posts.tenant_id
      WHERE blog_posts.id = blog_post_tags.post_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role_category IN ('tenant_admin', 'staff_user')
      AND user_roles.status = 'active'
    )
  );

-- Custom Forms RLS
ALTER TABLE custom_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active forms" ON custom_forms;
CREATE POLICY "Public can view active forms"
  ON custom_forms
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admins can manage forms" ON custom_forms;
CREATE POLICY "Tenant admins can manage forms"
  ON custom_forms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = custom_forms.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Form Fields RLS
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active form fields" ON form_fields;
CREATE POLICY "Public can view active form fields"
  ON form_fields
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admins can manage form fields" ON form_fields;
CREATE POLICY "Tenant admins can manage form fields"
  ON form_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_forms
      JOIN user_roles ON user_roles.tenant_id = custom_forms.tenant_id
      WHERE custom_forms.id = form_fields.form_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role_category IN ('tenant_admin', 'staff_user')
      AND user_roles.status = 'active'
    )
  );

-- Form Submissions RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit forms" ON form_submissions;
CREATE POLICY "Anyone can submit forms"
  ON form_submissions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Tenant admins can view submissions" ON form_submissions;
CREATE POLICY "Tenant admins can view submissions"
  ON form_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = form_submissions.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Tenant admins can update submissions" ON form_submissions;
CREATE POLICY "Tenant admins can update submissions"
  ON form_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = form_submissions.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- Testimonials RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active testimonials" ON testimonials;
CREATE POLICY "Public can view active testimonials"
  ON testimonials
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admins can manage testimonials" ON testimonials;
CREATE POLICY "Tenant admins can manage testimonials"
  ON testimonials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = testimonials.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- FAQ Items RLS
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active FAQs" ON faq_items;
CREATE POLICY "Public can view active FAQs"
  ON faq_items
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant admins can manage FAQs" ON faq_items;
CREATE POLICY "Tenant admins can manage FAQs"
  ON faq_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_roles.tenant_id = faq_items.tenant_id
      AND role_category IN ('tenant_admin', 'staff_user')
      AND status = 'active'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment blog post view count
CREATE FUNCTION increment_post_views(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_post_views(uuid) TO authenticated, anon;

-- Function to increment FAQ helpful count
CREATE FUNCTION increment_faq_helpful(p_faq_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE faq_items
  SET helpful_count = helpful_count + 1
  WHERE id = p_faq_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_faq_helpful(uuid) TO authenticated, anon;

-- Function to get blog posts with category and tags
CREATE FUNCTION get_blog_posts_with_metadata(
  p_tenant_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bp.id,
      'title', bp.title,
      'slug', bp.slug,
      'excerpt', bp.excerpt,
      'featured_image_url', bp.featured_image_url,
      'author_name', bp.author_name,
      'published_at', bp.published_at,
      'read_time_minutes', bp.read_time_minutes,
      'view_count', bp.view_count,
      'category', jsonb_build_object(
        'id', bc.id,
        'name', bc.name,
        'slug', bc.slug,
        'color', bc.color
      ),
      'tags', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', bt.id,
            'name', bt.name,
            'slug', bt.slug,
            'color', bt.color
          )
        )
        FROM blog_post_tags bpt
        JOIN blog_tags bt ON bt.id = bpt.tag_id
        WHERE bpt.post_id = bp.id
      )
    )
  )
  INTO v_result
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bc.id = bp.category_id
  WHERE bp.tenant_id = p_tenant_id
  AND bp.status = 'published'
  AND bp.published_at <= now()
  ORDER BY bp.published_at DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_blog_posts_with_metadata(uuid, integer, integer) TO authenticated, anon;

COMMENT ON FUNCTION get_blog_posts_with_metadata IS 'Retrieves blog posts with category and tags for display';
