/*
  # Seed Website Templates

  ## Overview
  Seeds 4 production-ready website templates with complete page layouts and themes.

  ## Templates Included
  1. **Professional** - Classic corporate/financial services design
  2. **Modern** - Clean tech/startup aesthetic
  3. **Minimalist** - Simple, elegant design
  4. **Creative** - Bold, expressive design for agencies

  Each template includes complete home, about, and contact pages.
*/

-- ============================================================================
-- TEMPLATE 1: PROFESSIONAL (Corporate/Financial)
-- ============================================================================

INSERT INTO website_templates (slug, name, description, category, theme, is_active)
VALUES (
  'professional',
  'Professional',
  'Classic corporate design perfect for financial services, law firms, and consulting businesses',
  'business',
  jsonb_build_object(
    'colors', jsonb_build_object(
      'primary', '#0F172A',
      'secondary', '#1E293B',
      'accent', '#3B82F6',
      'background', '#FFFFFF',
      'text', '#1F2937',
      'textSecondary', '#6B7280'
    ),
    'typography', jsonb_build_object(
      'headingFont', 'Inter, sans-serif',
      'bodyFont', 'Inter, sans-serif'
    )
  ),
  true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, theme = EXCLUDED.theme;

-- Professional Template: Home Page
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'hero',
  1,
  jsonb_build_object(
    'headline', 'Excellence in Professional Services',
    'subheadline', 'Trusted expertise and innovative solutions for your business needs',
    'ctaText', 'Get Started',
    'ctaLink', '#contact',
    'alignment', 'center'
  )
FROM website_templates WHERE slug = 'professional'
ON CONFLICT DO NOTHING;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'features',
  2,
  jsonb_build_object(
    'title', 'Why Choose Us',
    'subtitle', 'Delivering results through expertise, integrity, and dedication',
    'columns', 3,
    'features', jsonb_build_array(
      jsonb_build_object('icon', 'Award', 'title', 'Proven Track Record', 'description', '25+ years of excellence serving clients worldwide'),
      jsonb_build_object('icon', 'Shield', 'title', 'Trusted & Secure', 'description', 'Industry-leading security and compliance standards'),
      jsonb_build_object('icon', 'Users', 'title', 'Expert Team', 'description', 'Dedicated professionals committed to your success'),
      jsonb_build_object('icon', 'TrendingUp', 'title', 'Results Driven', 'description', 'Measurable outcomes and continuous improvement'),
      jsonb_build_object('icon', 'Globe', 'title', 'Global Reach', 'description', 'International presence with local expertise'),
      jsonb_build_object('icon', 'Clock', 'title', '24/7 Support', 'description', 'Always available when you need us most')
    )
  )
FROM website_templates WHERE slug = 'professional'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEMPLATE 2: MODERN (Tech/Startup)
-- ============================================================================

INSERT INTO website_templates (slug, name, description, category, theme, is_active)
VALUES (
  'modern',
  'Modern',
  'Clean, contemporary design ideal for tech startups, SaaS products, and innovative businesses',
  'technology',
  jsonb_build_object(
    'colors', jsonb_build_object(
      'primary', '#6366F1',
      'secondary', '#8B5CF6',
      'accent', '#EC4899',
      'background', '#FFFFFF',
      'text', '#111827',
      'textSecondary', '#6B7280'
    ),
    'typography', jsonb_build_object(
      'headingFont', 'Inter, sans-serif',
      'bodyFont', 'Inter, sans-serif'
    )
  ),
  true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, theme = EXCLUDED.theme;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'hero',
  1,
  jsonb_build_object(
    'headline', 'Build Something Amazing',
    'subheadline', 'The modern platform for next-generation businesses',
    'ctaText', 'Start Free Trial',
    'ctaLink', '#contact',
    'alignment', 'center'
  )
FROM website_templates WHERE slug = 'modern'
ON CONFLICT DO NOTHING;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'features',
  2,
  jsonb_build_object(
    'title', 'Everything You Need',
    'subtitle', 'Powerful features designed for modern teams',
    'columns', 3,
    'features', jsonb_build_array(
      jsonb_build_object('icon', 'Zap', 'title', 'Lightning Fast', 'description', 'Built for speed with cutting-edge technology'),
      jsonb_build_object('icon', 'Smartphone', 'title', 'Mobile First', 'description', 'Perfect experience on any device'),
      jsonb_build_object('icon', 'Lock', 'title', 'Secure by Default', 'description', 'Enterprise-grade security built in'),
      jsonb_build_object('icon', 'Layers', 'title', 'Easy Integration', 'description', 'Connect with your favorite tools'),
      jsonb_build_object('icon', 'BarChart', 'title', 'Powerful Analytics', 'description', 'Real-time insights and reporting'),
      jsonb_build_object('icon', 'Heart', 'title', 'Made with Love', 'description', 'Crafted by passionate developers')
    )
  )
FROM website_templates WHERE slug = 'modern'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEMPLATE 3: MINIMALIST (Clean & Simple)
-- ============================================================================

INSERT INTO website_templates (slug, name, description, category, theme, is_active)
VALUES (
  'minimalist',
  'Minimalist',
  'Clean, distraction-free design perfect for portfolios, consultants, and premium brands',
  'creative',
  jsonb_build_object(
    'colors', jsonb_build_object(
      'primary', '#000000',
      'secondary', '#374151',
      'accent', '#059669',
      'background', '#FFFFFF',
      'text', '#111827',
      'textSecondary', '#6B7280'
    ),
    'typography', jsonb_build_object(
      'headingFont', 'Inter, sans-serif',
      'bodyFont', 'Inter, sans-serif'
    )
  ),
  true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, theme = EXCLUDED.theme;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'hero',
  1,
  jsonb_build_object(
    'headline', 'Simple. Powerful. Beautiful.',
    'subheadline', 'We create experiences that matter',
    'ctaText', 'Learn More',
    'ctaLink', '#about',
    'alignment', 'center'
  )
FROM website_templates WHERE slug = 'minimalist'
ON CONFLICT DO NOTHING;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'features',
  2,
  jsonb_build_object(
    'title', 'What We Do',
    'subtitle', 'Excellence through simplicity',
    'columns', 3,
    'features', jsonb_build_array(
      jsonb_build_object('icon', 'Target', 'title', 'Focused', 'description', 'Every detail serves a purpose'),
      jsonb_build_object('icon', 'Sparkles', 'title', 'Refined', 'description', 'Polished to perfection'),
      jsonb_build_object('icon', 'Eye', 'title', 'Visual', 'description', 'Beauty in every interaction')
    )
  )
FROM website_templates WHERE slug = 'minimalist'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEMPLATE 4: CREATIVE (Bold & Expressive)
-- ============================================================================

INSERT INTO website_templates (slug, name, description, category, theme, is_active)
VALUES (
  'creative',
  'Creative',
  'Bold, vibrant design perfect for creative agencies, designers, and artists',
  'creative',
  jsonb_build_object(
    'colors', jsonb_build_object(
      'primary', '#F59E0B',
      'secondary', '#EF4444',
      'accent', '#8B5CF6',
      'background', '#FFFFFF',
      'text', '#111827',
      'textSecondary', '#4B5563'
    ),
    'typography', jsonb_build_object(
      'headingFont', 'Inter, sans-serif',
      'bodyFont', 'Inter, sans-serif'
    )
  ),
  true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, theme = EXCLUDED.theme;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'hero',
  1,
  jsonb_build_object(
    'headline', 'We Create Bold Experiences',
    'subheadline', 'Design that stands out, work that speaks volumes',
    'ctaText', 'View Our Work',
    'ctaLink', '#contact',
    'alignment', 'left'
  )
FROM website_templates WHERE slug = 'creative'
ON CONFLICT DO NOTHING;

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'home',
  'features',
  2,
  jsonb_build_object(
    'title', 'Our Expertise',
    'subtitle', 'Bringing ideas to life with passion and creativity',
    'columns', 4,
    'features', jsonb_build_array(
      jsonb_build_object('icon', 'Palette', 'title', 'Brand Design', 'description', 'Memorable identities that resonate'),
      jsonb_build_object('icon', 'Layout', 'title', 'Web Design', 'description', 'Digital experiences that engage'),
      jsonb_build_object('icon', 'Film', 'title', 'Motion Graphics', 'description', 'Stories that come alive'),
      jsonb_build_object('icon', 'Package', 'title', 'Packaging', 'description', 'Products that pop off shelves')
    )
  )
FROM website_templates WHERE slug = 'creative'
ON CONFLICT DO NOTHING;

-- Add About sections for all templates
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'about',
  'about',
  1,
  jsonb_build_object(
    'title', 'About Us',
    'text', '<p>We are a team of dedicated professionals committed to delivering excellence. With years of experience and a passion for innovation, we help our clients achieve their goals.</p><p>Our approach combines deep industry knowledge with creative problem-solving to deliver results that exceed expectations.</p>',
    'imagePosition', 'right'
  )
FROM website_templates
ON CONFLICT DO NOTHING;

-- Add Contact sections for all templates
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  id,
  'contact',
  'contact',
  1,
  jsonb_build_object(
    'title', 'Get in Touch',
    'subtitle', 'We would love to hear from you',
    'email', 'hello@example.com',
    'phone', '+1 (555) 123-4567',
    'address', '123 Main Street, Suite 100, City, ST 12345',
    'showForm', true
  )
FROM website_templates
ON CONFLICT DO NOTHING;
