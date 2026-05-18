/*
  # Arkline Trust — Team Page & Updated Navigation

  Creates a dedicated Team page for Arkline Trust with real team member profiles
  and updates the site navigation to include the Team page.

  1. New Pages
     - `team` page: Published, linked in nav between About and Strategies

  2. Website Content
     - Hero section: "The Team Behind Arkline Trust"
     - Team section with three real team members:
       * Noah — CEO & Co-CIO
       * Nisan — Co-CIO
       * Aryeh — Senior Portfolio Manager & Quantitative Analyst

  3. Navigation
     - Header nav updated: Home, About, Team, Strategies, Contact
     - Footer nav unchanged (team not included for brevity)

  4. Portrait Images
     - Curated stock portraits from Pexels matching visual descriptions
     - Can be replaced anytime by updating image URLs in the database
*/

-- ============================================================
-- 1. INSERT TEAM PAGE
-- ============================================================
INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published, show_in_nav, nav_order, template_type)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'team',
  'Our Team',
  'Meet the team behind Arkline Trust — experienced investment professionals managing capital for wholesale investors and single family offices.',
  true,
  true,
  3,
  'standard'
)
ON CONFLICT (tenant_id, slug) DO UPDATE
  SET title = EXCLUDED.title,
      meta_description = EXCLUDED.meta_description,
      is_published = true,
      nav_order = 3;

-- Bump strategies and contact nav_order to make room
UPDATE site_pages
SET nav_order = 4
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND slug = 'strategies';

UPDATE site_pages
SET nav_order = 5
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND slug = 'contact';

-- ============================================================
-- 2. INSERT TEAM PAGE CONTENT
-- ============================================================

-- Hero
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'team', 'hero', 1,
  '{
    "background_style": "dark",
    "headline": "The Team Behind Arkline Trust",
    "subheadline": "A small, focused team of seasoned professionals united by a shared conviction: that disciplined, research-driven investing — delivered with complete transparency — produces superior long-term outcomes for our investors.",
    "show_divider": true
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Team members
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'team', 'team', 2,
  '{
    "heading": "Our People",
    "subheading": "Every member of the Arkline Trust team brings a depth of real-world experience that directly informs how we manage capital.",
    "show_divider": true,
    "background": "alt",
    "members": [
      {
        "name": "Noah",
        "title": "Chief Executive Officer & Co-Chief Investment Officer",
        "bio": "Noah is a retail-industry veteran with decades of experience operating a large chain. He has established and is closely involved in the operation of a large family office overseeing a $200M+ portfolio. A dedicated family man, licensed pilot, and volunteer paramedic, Noah brings an operator\u2019s discipline and an investor\u2019s rigour to everything Arkline Trust does.",
        "image": "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400"
      },
      {
        "name": "Nisan",
        "title": "Co-Chief Investment Officer",
        "bio": "Nisan brings decades of small business management experience spanning multiple industries. His cross-sector expertise lends a uniquely grounded perspective on markets, capital allocation, and the underlying economics of the businesses Arkline Trust evaluates. He lives with his family in Jerusalem.",
        "image": "https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400"
      },
      {
        "name": "Aryeh",
        "title": "Senior Portfolio Manager & Quantitative Analyst",
        "bio": "Aryeh is an analytical and sharp-minded professional who applies time-tested statistical principles to develop and manage the fund\u2019s quantitative strategies. He studies medicine for intellectual curiosity and is currently pursuing his second degree in the field — when he\u2019s not refining the fund\u2019s algorithms.",
        "image": "https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400"
      }
    ]
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. UPDATE HEADER NAVIGATION — add Team
-- ============================================================
UPDATE navigation_menus
SET items = '[
  {"href": "/",           "label": "Home"},
  {"href": "/about",      "label": "About"},
  {"href": "/team",       "label": "Team"},
  {"href": "/strategies", "label": "Strategies"},
  {"href": "/contact",    "label": "Contact"}
]'::jsonb
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND menu_type = 'header';
