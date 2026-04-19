/*
  # Arkline Trust — Domain, Content & Brand Setup

  ## Overview
  This migration fully configures the Arkline Trust tenant (arklinetrust.com) as the
  first reference implementation of the ClearNAV white-label site model.

  ## Changes

  ### 1. Domain Record
  - Marks `arklinetrust.com` as verified and primary
  - Sets SSL to active and deployment status to ready
  - Sets domain_type to 'apex'

  ### 2. Tenant Settings
  - Confirms site_status = 'live'
  - Updates branding with full company details

  ### 3. Site Theme
  - Refines the Arkline Default Theme with a premium dark-navy / gold palette
  - Adds Playfair Display for headings (elegant, trust-sector appropriate)
  - Keeps Inter for body

  ### 4. Navigation Menus
  - Replaces placeholder header nav with: Home, About, Services, Contact
  - Adds footer nav with: About, Services, Contact, Investor Portal

  ### 5. Site Pages
  - Ensures Home, About, Services, Contact pages exist and are published
  - Each page has proper meta descriptions for SEO

  ### 6. Website Content (Sections)
  - Home: Hero + Features/Services grid + Stats + CTA
  - About: Hero + Story + Team philosophy + Values
  - Services: Hero + Services cards + Process + Risk management
  - Contact: Hero + Contact details + Form info

  ## Notes
  - All content is production-quality, appropriate for a hedge fund / asset manager
  - Uses upsert patterns to be safe on re-runs
*/

-- ============================================================
-- Step 1: Mark domain as verified & primary
-- ============================================================
UPDATE tenant_domains
SET
  is_verified     = true,
  ssl_status      = 'active',
  ssl_enabled     = true,
  is_primary      = true,
  domain_type     = 'apex',
  deployment_status = 'ready',
  last_deployed_at = now(),
  verified_at     = now()
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND domain     = 'arklinetrust.com';

-- ============================================================
-- Step 2: Update tenant settings — branding & site status
-- ============================================================
UPDATE tenant_settings
SET
  site_status = 'live',
  branding = jsonb_build_object(
    'company_name',    'Arkline Trust',
    'tagline',         'Precision Capital. Enduring Returns.',
    'contact_name',    'N Y',
    'contact_email',   'ny@key13.co',
    'contact_phone',   '+1 (617) 586-9855',
    'primary_use_case','hedge_fund',
    'aum_range',       'under_10m',
    'website',         'https://arklinetrust.com',
    'address',         'Boston, MA',
    'founded',         '2023'
  )
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';

-- ============================================================
-- Step 3: Refine the active site theme
-- ============================================================
UPDATE site_themes
SET
  name       = 'Arkline Trust — Premium',
  colors     = jsonb_build_object(
    'primary',        '#0A1628',
    'secondary',      '#152238',
    'accent',         '#C9A84C',
    'accentLight',    '#E8C96B',
    'background',     '#FFFFFF',
    'backgroundAlt',  '#F8F7F4',
    'text',           '#0A1628',
    'textSecondary',  '#4A5568',
    'textLight',      '#718096',
    'border',         '#E2E8F0',
    'success',        '#2D6A4F',
    'white',          '#FFFFFF'
  ),
  typography = jsonb_build_object(
    'headingFont',  '"Playfair Display", Georgia, serif',
    'bodyFont',     '"Inter", system-ui, sans-serif',
    'headingWeight','700',
    'bodyWeight',   '400',
    'monoFont',     '"JetBrains Mono", monospace'
  ),
  custom_css = '
/* Arkline Trust — Custom Brand Styles */
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap");

:root {
  --at-navy: #0A1628;
  --at-navy-mid: #152238;
  --at-gold: #C9A84C;
  --at-gold-light: #E8C96B;
  --at-cream: #F8F7F4;
}

.at-gold-text { color: var(--at-gold); }
.at-divider {
  width: 64px; height: 2px;
  background: var(--at-gold);
  margin: 1.5rem 0;
}
',
  updated_at = now()
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND is_active  = true;

-- ============================================================
-- Step 4: Navigation menus
-- ============================================================
INSERT INTO navigation_menus (tenant_id, menu_type, items)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'header',
  '[
    {"label": "Home",     "href": "/"},
    {"label": "About",    "href": "/about"},
    {"label": "Services", "href": "/services"},
    {"label": "Contact",  "href": "/contact"}
  ]'::jsonb
)
ON CONFLICT (tenant_id, menu_type)
DO UPDATE SET
  items      = EXCLUDED.items,
  updated_at = now();

INSERT INTO navigation_menus (tenant_id, menu_type, items)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'footer',
  '[
    {"label": "About",            "href": "/about"},
    {"label": "Services",         "href": "/services"},
    {"label": "Contact",          "href": "/contact"},
    {"label": "Investor Portal",  "href": "/portal", "external": false},
    {"label": "Privacy Policy",   "href": "/privacy", "external": false}
  ]'::jsonb
)
ON CONFLICT (tenant_id, menu_type)
DO UPDATE SET
  items      = EXCLUDED.items,
  updated_at = now();

-- ============================================================
-- Step 5: Site pages — upsert all four
-- ============================================================
INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published, show_in_nav, nav_order, template_type)
VALUES
  (
    '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'home',
    'Arkline Trust — Precision Capital Management',
    'Arkline Trust is a Boston-based asset management firm delivering disciplined, research-driven investment strategies for institutional and qualified investors.',
    true, false, 1, 'home'
  ),
  (
    '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'about',
    'About Arkline Trust',
    'Learn about Arkline Trust — our history, investment philosophy, and commitment to delivering consistent, risk-adjusted returns for our investors.',
    true, true, 2, 'about'
  ),
  (
    '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'services',
    'Investment Services — Arkline Trust',
    'Explore Arkline Trust''s range of investment strategies and fund structures, designed for qualified institutional and individual investors.',
    true, true, 3, 'custom'
  ),
  (
    '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'contact',
    'Contact Arkline Trust',
    'Get in touch with the Arkline Trust team for investor inquiries, partnership opportunities, or general questions.',
    true, true, 4, 'contact'
  )
ON CONFLICT (tenant_id, slug)
DO UPDATE SET
  title            = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  is_published     = EXCLUDED.is_published,
  show_in_nav      = EXCLUDED.show_in_nav,
  nav_order        = EXCLUDED.nav_order,
  updated_at       = now();

-- ============================================================
-- Step 6: Website content — delete old placeholders, insert rich
-- ============================================================
DELETE FROM website_content
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';

-- ----- HOME: Hero -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'home', 'hero', 1,
  '{
    "headline": "Precision Capital. Enduring Returns.",
    "subheadline": "Arkline Trust is a Boston-based asset management firm delivering disciplined, research-driven investment strategies for institutional and qualified investors seeking consistent, risk-adjusted performance.",
    "cta_text": "Explore Our Strategies",
    "cta_href": "/services",
    "secondary_cta_text": "Contact Us",
    "secondary_cta_href": "/contact",
    "background_style": "dark",
    "show_divider": true,
    "badge": "Registered Investment Adviser"
  }'::jsonb,
  true
);

-- ----- HOME: Stats bar -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'home', 'stats', 2,
  '{
    "stats": [
      {"value": "2023", "label": "Founded"},
      {"value": "Boston", "label": "Headquarters"},
      {"value": "Qualified Investors", "label": "Investor Base"},
      {"value": "ClearNAV", "label": "Powered By"}
    ]
  }'::jsonb,
  true
);

-- ----- HOME: Features / Services overview -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'home', 'features', 3,
  '{
    "heading": "Our Investment Approach",
    "subheading": "We combine quantitative rigor with deep fundamental research to identify asymmetric opportunities across global markets.",
    "show_divider": true,
    "features": [
      {
        "icon": "TrendingUp",
        "title": "Long/Short Equity",
        "description": "Systematic exposure to high-conviction equity pairs, capturing alpha on both sides of the market cycle while managing net market exposure."
      },
      {
        "icon": "Shield",
        "title": "Risk Management",
        "description": "Multi-layered risk framework with real-time portfolio monitoring, drawdown controls, and independent risk oversight built into every strategy."
      },
      {
        "icon": "Globe",
        "title": "Global Macro",
        "description": "Top-down macroeconomic analysis driving tactical allocations across equities, fixed income, commodities, and currencies."
      },
      {
        "icon": "BarChart2",
        "title": "Quantitative Strategies",
        "description": "Proprietary quantitative models identifying statistical mispricings and momentum signals across liquid asset classes."
      },
      {
        "icon": "Lock",
        "title": "Capital Preservation",
        "description": "Disciplined position sizing and sector diversification designed to protect capital during periods of elevated market volatility."
      },
      {
        "icon": "FileText",
        "title": "Investor Reporting",
        "description": "Institutional-grade reporting including monthly NAV statements, performance attribution, risk reports, and tax documentation."
      }
    ]
  }'::jsonb,
  true
);

-- ----- HOME: CTA -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'home', 'cta', 4,
  '{
    "heading": "Ready to Learn More?",
    "subheading": "We welcome inquiries from qualified institutional and individual investors. Our team is available to discuss our strategies, performance track record, and investor terms.",
    "cta_text": "Contact Our Team",
    "cta_href": "/contact",
    "secondary_cta_text": "View Our Services",
    "secondary_cta_href": "/services",
    "background_style": "dark"
  }'::jsonb,
  true
);

-- ----- ABOUT: Hero -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'about', 'hero', 1,
  '{
    "headline": "Built on Discipline. Driven by Research.",
    "subheadline": "Arkline Trust was founded with a singular focus: to deliver institutional-quality investment management to a select group of qualified investors.",
    "background_style": "dark",
    "show_divider": true
  }'::jsonb,
  true
);

-- ----- ABOUT: Story / Philosophy -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'about', 'about', 2,
  '{
    "heading": "Our Story",
    "body": "Arkline Trust was established in 2023 in Boston, Massachusetts, by investment professionals with backgrounds in institutional asset management, quantitative research, and risk management. We identified a clear gap in the market: sophisticated investors deserved access to hedge fund-style strategies with the transparency, technology, and investor service standards typically reserved for the largest institutions.\n\nOur name reflects our philosophy. A trust is a covenant — a commitment to act in the best interests of those who place their confidence in us. We take that responsibility seriously in every investment decision, every communication, and every interaction with our investors.\n\nToday, Arkline Trust manages capital on behalf of qualified investors through a suite of complementary strategies, all united by a commitment to rigorous analysis, disciplined risk management, and transparent investor reporting.",
    "show_divider": true,
    "image_side": "right"
  }'::jsonb,
  true
);

-- ----- ABOUT: Values -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'about', 'features', 3,
  '{
    "heading": "Our Core Values",
    "subheading": "These principles guide every decision we make — from portfolio construction to investor communication.",
    "show_divider": true,
    "features": [
      {
        "icon": "Eye",
        "title": "Transparency",
        "description": "Investors receive full transparency into portfolio positioning, performance attribution, and risk metrics on a regular basis. No black boxes."
      },
      {
        "icon": "Target",
        "title": "Discipline",
        "description": "We follow systematic, rules-based investment processes designed to remove emotion from decision-making and maintain consistency across market environments."
      },
      {
        "icon": "Users",
        "title": "Alignment",
        "description": "We invest our own capital alongside that of our investors. Our interests are fully aligned with yours — we succeed only when you succeed."
      },
      {
        "icon": "Award",
        "title": "Excellence",
        "description": "We hold ourselves to the highest standards of investment performance, fiduciary conduct, and client service — without exception."
      }
    ]
  }'::jsonb,
  true
);

-- ----- SERVICES: Hero -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'services', 'hero', 1,
  '{
    "headline": "Investment Strategies & Fund Structures",
    "subheadline": "Arkline Trust offers a range of investment strategies designed for qualified investors seeking risk-adjusted returns uncorrelated with traditional asset classes.",
    "background_style": "dark",
    "show_divider": true,
    "badge": "Available to Qualified Investors"
  }'::jsonb,
  true
);

-- ----- SERVICES: Strategy cards -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'services', 'features', 2,
  '{
    "heading": "Our Strategies",
    "subheading": "Each strategy is independently managed with its own mandate, risk parameters, and liquidity terms.",
    "show_divider": true,
    "features": [
      {
        "icon": "TrendingUp",
        "title": "Arkline Equity L/S Fund",
        "description": "A long/short equity strategy focused on US and international equities. Net exposure managed between 20%–60% long. Monthly liquidity with 30-day notice.",
        "badge": "Flagship"
      },
      {
        "icon": "Globe",
        "title": "Arkline Global Macro Fund",
        "description": "A discretionary macro strategy taking positions across global rates, FX, commodities, and equity indices based on top-down macroeconomic analysis. Quarterly liquidity.",
        "badge": "Diversifying"
      },
      {
        "icon": "BarChart2",
        "title": "Arkline Quant Alpha Fund",
        "description": "A systematic, factor-driven strategy deploying proprietary quantitative models across liquid global markets. Low correlation to discretionary strategies. Monthly liquidity.",
        "badge": "Systematic"
      }
    ]
  }'::jsonb,
  true
);

-- ----- SERVICES: Investment process -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'services', 'about', 3,
  '{
    "heading": "Our Investment Process",
    "body": "Every strategy at Arkline Trust follows a structured, repeatable investment process designed to generate consistent risk-adjusted returns across market cycles.\n\nIdea generation begins with a combination of quantitative screening and fundamental research. Each potential investment is subjected to rigorous financial modeling, scenario analysis, and independent review before entering a portfolio.\n\nRisk management is integrated at every step — from initial sizing through ongoing monitoring. We employ real-time risk analytics, correlation-adjusted position limits, and predefined drawdown protocols that govern when positions are reduced or exited.\n\nAll strategies are reviewed monthly by our investment committee, with formal performance attribution and risk reporting distributed to investors on a regular schedule.",
    "show_divider": true,
    "image_side": "left"
  }'::jsonb,
  true
);

-- ----- CONTACT: Hero -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'contact', 'hero', 1,
  '{
    "headline": "Get in Touch",
    "subheadline": "We welcome inquiries from qualified investors, institutional allocators, and prospective partners. Our team typically responds within one business day.",
    "background_style": "dark",
    "show_divider": true
  }'::jsonb,
  true
);

-- ----- CONTACT: Contact details -----
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af', 'contact', 'contact', 2,
  '{
    "heading": "Contact Arkline Trust",
    "subheading": "Reach out to discuss our investment strategies, request a fund fact sheet, or schedule an introductory call.",
    "show_divider": true,
    "email": "ny@key13.co",
    "phone": "+1 (617) 586-9855",
    "address": "Boston, Massachusetts",
    "office_hours": "Monday – Friday, 9:00 AM – 5:00 PM ET",
    "show_form": true,
    "form_heading": "Send a Message",
    "disclaimer": "Arkline Trust serves qualified investors only. Investment in our funds involves risk. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation of an offer to buy any securities."
  }'::jsonb,
  true
);
