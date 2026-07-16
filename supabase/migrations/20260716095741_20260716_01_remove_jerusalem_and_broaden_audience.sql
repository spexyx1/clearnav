/*
  # Arkline Trust — Remove Jerusalem references, broaden audience messaging

  1. Remove Jerusalem Office from contact page
  2. Update home/stats: HQ → Melbourne only, Focus → Qualified Investors
  3. Update home/hero: broaden headline and subheadline beyond family offices
  4. Update home/features: broaden language
  5. Update home/cta: broaden language
  6. Update contact/hero: broaden language
  7. Update tenant_settings branding address
*/

-- ============================================================
-- 1. CONTACT PAGE — Remove Jerusalem Office, keep Australia only
-- ============================================================
UPDATE website_content
SET content = jsonb_set(
  content,
  '{offices}',
  '[
    {
      "label": "Australia Office",
      "lines": ["Level 6, 111 Cecil Street", "South Melbourne, VIC", "Australia 3205"]
    }
  ]'::jsonb
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'contact'
  AND section_type = 'contact';

-- ============================================================
-- 2. HOME STATS — Melbourne only, broader focus
-- ============================================================
UPDATE website_content
SET content = '{
  "stats": [
    {"label": "Headquarters",  "value": "Melbourne, Australia"},
    {"label": "Regulator",     "value": "ASIC"},
    {"label": "Investor Type", "value": "Wholesale Only"},
    {"label": "Focus",         "value": "Qualified Investors"}
  ]
}'::jsonb
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'stats';

-- ============================================================
-- 3. HOME HERO — Broader headline & subheadline
-- ============================================================
UPDATE website_content
SET content = content || '{
  "headline": "Disciplined Capital Stewardship for Qualified Investors",
  "subheadline": "Arkline Trust applies institutional-grade investment management to the distinct needs of qualified investors, family offices, and investment firms. We preserve, grow, and govern capital with precision.",
  "badge": "ASIC Regulated · AFSL 548921 · Wholesale Investors Only"
}'::jsonb
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'hero';

-- ============================================================
-- 4. HOME FEATURES — Broaden language away from family-office-only
-- ============================================================
UPDATE website_content
SET content = content || jsonb_build_object(
  'subheading', 'Six principles that define how we manage capital for our investors.',
  'features', '[
    {"icon": "Shield",     "title": "Capital Preservation",       "description": "We treat the avoidance of permanent capital loss as the primary objective. Risk is priced before return."},
    {"icon": "TrendingUp", "title": "Risk-Adjusted Returns",      "description": "Performance is measured on a risk-adjusted basis across full market cycles, not relative to short-term benchmarks."},
    {"icon": "Users",      "title": "Alignment of Interests",     "description": "Partners invest alongside clients in every strategy. Our interests are structurally identical to yours."},
    {"icon": "Settings",   "title": "Bespoke Mandates",           "description": "Each mandate is constructed to the specific objectives, liquidity requirements, tax position, and governance preferences of the investor."},
    {"icon": "FileCheck",  "title": "Institutional Governance",   "description": "AFSL-licensed and ASIC-regulated. Independent custodian, Big-4 audit, and robust compliance infrastructure."},
    {"icon": "Lock",       "title": "Qualified Investor Focus",   "description": "We work exclusively with wholesale investors, family offices, and investment firms. Our entire operating model is designed around their complexity."}
  ]'::jsonb
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'features';

-- ============================================================
-- 5. HOME CTA — Broaden language
-- ============================================================
UPDATE website_content
SET content = content || jsonb_build_object(
  'heading', 'Ready to Begin a Conversation?',
  'subheading', 'We accept introductions from qualified wholesale investors, family offices, and investment firms by appointment only. Minimum investment thresholds apply.',
  'cta_text', 'Request a Private Introduction',
  'cta_href', '/contact'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'cta';

-- ============================================================
-- 6. CONTACT HERO — Broaden language
-- ============================================================
UPDATE website_content
SET content = content || jsonb_build_object(
  'subheadline', 'We accept new client relationships by introduction only. If you are a qualified wholesale investor, investment firm, or family office adviser, we welcome the opportunity to begin a conversation.'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'contact'
  AND section_type = 'hero';

-- ============================================================
-- 7. TENANT SETTINGS — Remove Jerusalem from address
-- ============================================================
UPDATE tenant_settings
SET branding = branding || '{"address": "Melbourne, Australia"}'::jsonb
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';
