/*
  # Seed Demo Public Website Data

  ## Overview
  Creates demo website content for the Arkline tenant to test the public website rendering.

  ## What This Creates
  1. A site theme with colors and typography
  2. A homepage with hero and features sections
  3. An about page
  4. Header and footer navigation menus
  5. Sets the site status to 'live'

  ## Security
  - All content is marked as published for public viewing
  - Uses existing tenant data (arkline)
*/

-- Create a site theme for arkline
INSERT INTO site_themes (
  tenant_id,
  name,
  is_active,
  colors,
  typography
)
SELECT
  id,
  'Arkline Default Theme',
  true,
  jsonb_build_object(
    'primary', '#0F172A',
    'secondary', '#1E293B',
    'accent', '#3B82F6',
    'background', '#FFFFFF',
    'text', '#1F2937',
    'textSecondary', '#6B7280'
  ),
  jsonb_build_object(
    'headingFont', 'Inter, sans-serif',
    'bodyFont', 'Inter, sans-serif',
    'headingWeight', '700',
    'bodyWeight', '400'
  )
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT DO NOTHING;

-- Create homepage
INSERT INTO site_pages (
  tenant_id,
  slug,
  title,
  meta_description,
  is_published,
  show_in_nav,
  nav_order,
  template_type
)
SELECT
  id,
  'home',
  'Arkline Trust - Asset Management Excellence',
  'Arkline Trust provides institutional-grade asset management services with a focus on long-term value creation and risk management.',
  true,
  true,
  1,
  'home'
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, slug) DO UPDATE
SET is_published = true;

-- Create about page
INSERT INTO site_pages (
  tenant_id,
  slug,
  title,
  meta_description,
  is_published,
  show_in_nav,
  nav_order,
  template_type
)
SELECT
  id,
  'about',
  'About Arkline Trust',
  'Learn about our history, team, and investment philosophy at Arkline Trust.',
  true,
  true,
  2,
  'about'
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, slug) DO UPDATE
SET is_published = true;

-- Create contact page
INSERT INTO site_pages (
  tenant_id,
  slug,
  title,
  meta_description,
  is_published,
  show_in_nav,
  nav_order,
  template_type
)
SELECT
  id,
  'contact',
  'Contact Arkline Trust',
  'Get in touch with the Arkline Trust team for investment inquiries and partnership opportunities.',
  true,
  true,
  3,
  'contact'
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, slug) DO UPDATE
SET is_published = true;

-- Create hero section for homepage
INSERT INTO website_content (
  tenant_id,
  page_slug,
  section_type,
  section_order,
  content,
  is_published
)
SELECT
  id,
  'home',
  'hero',
  1,
  jsonb_build_object(
    'headline', 'Institutional Asset Management for the Modern Era',
    'subheadline', 'Arkline Trust delivers sophisticated investment solutions with transparency and excellence',
    'ctaText', 'Learn More',
    'ctaLink', '#features',
    'alignment', 'center'
  ),
  true
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, page_slug, section_type, section_order) DO UPDATE
SET is_published = true, content = EXCLUDED.content;

-- Create features section for homepage
INSERT INTO website_content (
  tenant_id,
  page_slug,
  section_type,
  section_order,
  content,
  is_published
)
SELECT
  id,
  'home',
  'features',
  2,
  jsonb_build_object(
    'title', 'Why Choose Arkline Trust',
    'subtitle', 'We combine institutional expertise with innovative technology to deliver exceptional results',
    'columns', 3,
    'features', jsonb_build_array(
      jsonb_build_object(
        'icon', 'TrendingUp',
        'title', 'Proven Performance',
        'description', 'Consistent returns through disciplined investment strategies and risk management'
      ),
      jsonb_build_object(
        'icon', 'Shield',
        'title', 'Institutional Grade',
        'description', 'Bank-level security and compliance with rigorous operational standards'
      ),
      jsonb_build_object(
        'icon', 'BarChart3',
        'title', 'Full Transparency',
        'description', 'Real-time portfolio tracking and comprehensive reporting for all investors'
      ),
      jsonb_build_object(
        'icon', 'Users',
        'title', 'Dedicated Support',
        'description', 'Personal relationship managers and 24/7 client service'
      ),
      jsonb_build_object(
        'icon', 'Globe',
        'title', 'Global Reach',
        'description', 'Access to international markets and diversified investment opportunities'
      ),
      jsonb_build_object(
        'icon', 'Lock',
        'title', 'Secure Platform',
        'description', 'Enterprise-grade infrastructure with multi-layered security protocols'
      )
    )
  ),
  true
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, page_slug, section_type, section_order) DO UPDATE
SET is_published = true, content = EXCLUDED.content;

-- Create about section for about page
INSERT INTO website_content (
  tenant_id,
  page_slug,
  section_type,
  section_order,
  content,
  is_published
)
SELECT
  id,
  'about',
  'about',
  1,
  jsonb_build_object(
    'title', 'About Arkline Trust',
    'text', '<p>Founded in 2010, Arkline Trust has grown to become a leading asset management firm, overseeing portfolios for institutional investors, family offices, and high-net-worth individuals worldwide.</p><p>Our investment philosophy is built on three pillars: rigorous fundamental analysis, disciplined risk management, and a long-term perspective. We believe that sustainable value creation requires patience, expertise, and unwavering commitment to our clients'' success.</p><p>With offices in New York, London, and Singapore, our team of 50+ investment professionals brings diverse perspectives and deep market expertise to every decision we make.</p>',
    'imagePosition', 'right'
  ),
  true
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, page_slug, section_type, section_order) DO UPDATE
SET is_published = true, content = EXCLUDED.content;

-- Create contact section for contact page
INSERT INTO website_content (
  tenant_id,
  page_slug,
  section_type,
  section_order,
  content,
  is_published
)
SELECT
  id,
  'contact',
  'contact',
  1,
  jsonb_build_object(
    'title', 'Get in Touch',
    'subtitle', 'Our team is here to answer your questions and discuss investment opportunities',
    'email', 'info@arklinetrust.com',
    'phone', '+1 (555) 123-4567',
    'address', '123 Wall Street, New York, NY 10005',
    'showForm', true
  ),
  true
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, page_slug, section_type, section_order) DO UPDATE
SET is_published = true, content = EXCLUDED.content;

-- Create header navigation
INSERT INTO navigation_menus (
  tenant_id,
  menu_type,
  items
)
SELECT
  id,
  'header',
  jsonb_build_array(
    jsonb_build_object('label', 'Home', 'href', '/'),
    jsonb_build_object('label', 'About', 'href', '/about'),
    jsonb_build_object('label', 'Contact', 'href', '/contact')
  )
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, menu_type) DO UPDATE
SET items = EXCLUDED.items;

-- Create footer navigation
INSERT INTO navigation_menus (
  tenant_id,
  menu_type,
  items
)
SELECT
  id,
  'footer',
  jsonb_build_array(
    jsonb_build_object('label', 'Privacy Policy', 'href', '/privacy'),
    jsonb_build_object('label', 'Terms of Service', 'href', '/terms'),
    jsonb_build_object('label', 'Disclosures', 'href', '/disclosures')
  )
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id, menu_type) DO UPDATE
SET items = EXCLUDED.items;

-- Set site status to live
INSERT INTO tenant_settings (tenant_id, site_status)
SELECT id, 'live'
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT (tenant_id) DO UPDATE
SET site_status = 'live';
