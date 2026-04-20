/*
  # Arkline Trust — Australian AFSL Hedge Fund Rebrand

  Complete rebrand of Arkline Trust to reflect its identity as an Australian-domiciled
  hedge fund managing capital for single family offices. Key changes:

  1. Branding
     - Updated company details: Sydney, Australia; AFSL holder; wholesale investors only
     - New design language: deep eucalyptus green + warm ochre/gold + Australian slate tones
     - Typography: Cormorant Garamond (headings) + Nunito Sans (body) — refined yet approachable

  2. Site Theme
     - New colour palette inspired by Australian landscape: deep forest green, warm gold, off-white
     - Removed legacy navy/Boston palette entirely

  3. Navigation
     - Updated footer nav to reference correct Australian legal context

  4. Website Content
     - All pages rewritten: Australian jurisdiction, AFSL licence, Sydney HQ, wholesale investor focus
     - Removed all US references (SEC, RIA, Boston, Massachusetts)
     - Added AFSL disclaimer, ASIC references, wholesale investor qualification notices
*/

-- ============================================================
-- 1. UPDATE BRANDING IN tenant_settings
-- ============================================================
UPDATE tenant_settings
SET branding = jsonb_build_object(
  'company_name',   'Arkline Trust',
  'tagline',        'Institutional Capital Management for the Select Few.',
  'address',        'Sydney, New South Wales, Australia',
  'founded',        '2023',
  'website',        'https://arklinetrust.com',
  'aum_range',      'under_10m',
  'contact_name',   'N Y',
  'contact_email',  'ny@key13.co',
  'contact_phone',  '+61 2 8000 0000',
  'primary_use_case', 'hedge_fund',
  'jurisdiction',   'Australia',
  'regulator',      'ASIC',
  'afsl_number',    'AFSL 000000',
  'investor_type',  'wholesale'
)
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline');

-- ============================================================
-- 2. REPLACE SITE THEME — new Australian colour palette
-- ============================================================
UPDATE site_themes
SET
  colors = jsonb_build_object(
    'primary',       '#1B3A2D',
    'secondary',     '#244D3C',
    'accent',        '#B8934A',
    'accentLight',   '#D4A85C',
    'background',    '#FFFFFF',
    'backgroundAlt', '#F5F2EE',
    'text',          '#1A1A1A',
    'textSecondary', '#4A4A4A',
    'textLight',     '#7A7A7A',
    'border',        '#E0DBD4',
    'success',       '#2D6A4F',
    'white',         '#FFFFFF',
    'overlay',       'rgba(27,58,45,0.92)'
  ),
  typography = jsonb_build_object(
    'headingFont',  '"Cormorant Garamond", "Garamond", Georgia, serif',
    'bodyFont',     '"Nunito Sans", "Inter", system-ui, sans-serif',
    'headingWeight', '600',
    'bodyWeight',    '400',
    'monoFont',      '"JetBrains Mono", monospace'
  ),
  custom_css = '
/* Arkline Trust — Australian Brand Identity */
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito+Sans:wght@300;400;500;600;700&display=swap");

:root {
  --at-forest:       #1B3A2D;
  --at-forest-mid:   #244D3C;
  --at-forest-deep:  #122A20;
  --at-ochre:        #B8934A;
  --at-ochre-light:  #D4A85C;
  --at-sand:         #F5F2EE;
  --at-stone:        #E0DBD4;
  --at-ink:          #1A1A1A;
  --at-slate:        #4A4A4A;
}

.at-heading {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-weight: 600;
}

.at-body {
  font-family: "Nunito Sans", system-ui, sans-serif;
}

.at-ochre-text { color: var(--at-ochre); }

.at-divider {
  width: 48px;
  height: 1px;
  background: var(--at-ochre);
  margin: 1.25rem 0;
}

.at-divider-center {
  width: 48px;
  height: 1px;
  background: var(--at-ochre);
  margin: 1.25rem auto;
}
'
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline');

-- ============================================================
-- 3. UPDATE NAVIGATION MENUS
-- ============================================================
UPDATE navigation_menus
SET items = '[
  {"href": "/",        "label": "Home"},
  {"href": "/about",   "label": "About"},
  {"href": "/strategies", "label": "Strategies"},
  {"href": "/contact", "label": "Contact"}
]'::jsonb
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND menu_type = 'header';

UPDATE navigation_menus
SET items = '[
  {"href": "/about",       "label": "About"},
  {"href": "/strategies",  "label": "Strategies"},
  {"href": "/contact",     "label": "Contact"},
  {"href": "/privacy",     "label": "Privacy Policy"}
]'::jsonb
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND menu_type = 'footer';

-- ============================================================
-- 4. ENSURE SITE PAGES EXIST (home, about, strategies, contact)
-- ============================================================
INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published, show_in_nav, nav_order, template_type)
VALUES
  (
    (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
    'home', 'Home',
    'Arkline Trust — An Australian AFSL-licensed hedge fund managing capital for wholesale investors and single family offices.',
    true, false, 1, 'landing'
  )
ON CONFLICT (tenant_id, slug) DO UPDATE
  SET title = EXCLUDED.title,
      meta_description = EXCLUDED.meta_description,
      is_published = true;

INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published, show_in_nav, nav_order, template_type)
VALUES
  (
    (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
    'about', 'About',
    'Arkline Trust is an ASIC-regulated fund manager based in Sydney, Australia, serving wholesale investors and single family offices.',
    true, true, 2, 'standard'
  )
ON CONFLICT (tenant_id, slug) DO UPDATE
  SET title = EXCLUDED.title,
      meta_description = EXCLUDED.meta_description,
      is_published = true;

INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published, show_in_nav, nav_order, template_type)
VALUES
  (
    (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
    'strategies', 'Investment Strategies',
    'Arkline Trust offers a range of hedge fund strategies available exclusively to wholesale investors under Australian law.',
    true, true, 3, 'standard'
  )
ON CONFLICT (tenant_id, slug) DO UPDATE
  SET title = EXCLUDED.title,
      meta_description = EXCLUDED.meta_description,
      is_published = true;

INSERT INTO site_pages (tenant_id, slug, title, meta_description, is_published, show_in_nav, nav_order, template_type)
VALUES
  (
    (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
    'contact', 'Contact',
    'Contact Arkline Trust. We welcome enquiries from wholesale investors and single family offices located in Australia.',
    true, true, 4, 'standard'
  )
ON CONFLICT (tenant_id, slug) DO UPDATE
  SET title = EXCLUDED.title,
      meta_description = EXCLUDED.meta_description,
      is_published = true;

-- ============================================================
-- 5. REPLACE ALL WEBSITE CONTENT — delete and reinsert
-- ============================================================
DELETE FROM website_content
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline');

-- HOME PAGE ──────────────────────────────────────────────────
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'home', 'hero', 1,
  '{
    "background_style": "dark",
    "badge": "AFSL Authorised · Wholesale Investors Only",
    "headline": "Institutional Capital Management for the Select Few.",
    "subheadline": "Arkline Trust is an ASIC-regulated fund manager based in Sydney, Australia. We manage concentrated, research-driven strategies for single family offices and wholesale investors seeking superior risk-adjusted returns.",
    "cta_text": "Our Strategies",
    "cta_href": "/strategies",
    "secondary_cta_text": "Enquire Now",
    "secondary_cta_href": "/contact",
    "show_divider": true
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'home', 'stats', 2,
  '{
    "stats": [
      {"label": "Domicile",         "value": "Australia"},
      {"label": "Regulator",        "value": "ASIC"},
      {"label": "Investor Type",    "value": "Wholesale Only"},
      {"label": "Focus",            "value": "Single Family Offices"}
    ]
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'home', 'features', 3,
  '{
    "heading": "Our Investment Philosophy",
    "subheading": "We deploy capital with patience, precision, and a structural edge — anchored in deep fundamental research and disciplined risk management.",
    "show_divider": true,
    "features": [
      {
        "icon": "TrendingUp",
        "title": "Concentrated Conviction",
        "description": "We run high-conviction, concentrated portfolios. Each position is the result of rigorous analysis — we take fewer bets, but we take them seriously."
      },
      {
        "icon": "Shield",
        "title": "Risk-First Framework",
        "description": "Capital preservation is paramount. Multi-layered risk controls, real-time monitoring, and predefined drawdown protocols govern every strategy."
      },
      {
        "icon": "Globe",
        "title": "Global Opportunity Set",
        "description": "Our mandates span Australian equities, Asian markets, and global macro themes — providing investors access to opportunities beyond domestic benchmarks."
      },
      {
        "icon": "Users",
        "title": "Family Office Alignment",
        "description": "We manage capital as if it were our own. Our principals invest alongside clients, ensuring complete alignment of interests across every strategy."
      },
      {
        "icon": "FileText",
        "title": "Institutional Transparency",
        "description": "Monthly NAV statements, performance attribution, and full portfolio-level risk reporting — the same standard demanded by the world''s leading institutions."
      },
      {
        "icon": "Lock",
        "title": "AFSL Regulated",
        "description": "Arkline Trust holds an Australian Financial Services Licence (AFSL) issued by ASIC. We operate within Australia''s robust financial regulatory framework."
      }
    ]
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'home', 'cta', 4,
  '{
    "background_style": "dark",
    "heading": "Available to Wholesale Investors",
    "subheading": "Access to Arkline Trust funds is restricted to wholesale investors as defined under the Corporations Act 2001 (Cth). We invite enquiries from eligible investors and single family offices located in Australia.",
    "cta_text": "Enquire Now",
    "cta_href": "/contact",
    "secondary_cta_text": "Learn About Our Strategies",
    "secondary_cta_href": "/strategies"
  }'::jsonb,
  true
);

-- ABOUT PAGE ──────────────────────────────────────────────────
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'about', 'hero', 1,
  '{
    "background_style": "dark",
    "headline": "Built on Rigour. Grounded in Trust.",
    "subheadline": "Arkline Trust was established to deliver institutional-calibre investment management to a carefully selected group of Australian wholesale investors and single family offices.",
    "show_divider": true
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'about', 'about', 2,
  '{
    "heading": "Our Story",
    "show_divider": true,
    "image_side": "right",
    "body": "Arkline Trust was founded in Sydney, Australia by investment professionals with careers spanning institutional asset management, alternative investments, and single family office advisory. We identified a specific unmet need: wholesale investors and family offices deserved access to truly differentiated hedge fund strategies — delivered with the rigour, transparency, and personalised service typically reserved for the largest institutional allocators.\n\nThe name Arkline reflects our founding conviction. A trust is a covenant — a legal, ethical, and personal commitment to act in the interests of those who entrust us with their capital. We take that covenant seriously in every investment decision, every communication, and every interaction with our clients.\n\nArkline Trust holds an Australian Financial Services Licence (AFSL) and operates under the regulatory oversight of the Australian Securities and Investments Commission (ASIC). Our investment activities and fund structures comply fully with Australian law, including the Corporations Act 2001 (Cth).\n\nOur investors are wholesale investors as defined under the Corporations Act — high-net-worth individuals, single family offices, and professional investors who meet the eligibility criteria and seek genuine alternatives to traditional asset management."
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'about', 'features', 3,
  '{
    "heading": "Our Core Principles",
    "subheading": "These principles are not aspirational statements — they are the operating standards to which we hold ourselves accountable every day.",
    "show_divider": true,
    "features": [
      {
        "icon": "Eye",
        "title": "Transparency",
        "description": "Investors receive full transparency into portfolio positioning, performance attribution, and risk metrics. We do not manage black boxes — we manage trust."
      },
      {
        "icon": "Target",
        "title": "Discipline",
        "description": "Our investment processes are systematic and repeatable. We remove emotion from decision-making and maintain consistency through every phase of the market cycle."
      },
      {
        "icon": "Users",
        "title": "Alignment",
        "description": "Our principals invest their own capital alongside that of our investors. We succeed only when our clients succeed — full stop."
      },
      {
        "icon": "Award",
        "title": "Fiduciary Standard",
        "description": "As an AFSL-licensed manager, we are held to the highest fiduciary and regulatory standards under Australian law. That standard reflects how we operate, not just how we are required to."
      }
    ]
  }'::jsonb,
  true
);

-- STRATEGIES PAGE ──────────────────────────────────────────────
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'strategies', 'hero', 1,
  '{
    "background_style": "dark",
    "badge": "Available to Wholesale Investors Only",
    "headline": "Investment Strategies",
    "subheadline": "Arkline Trust offers a suite of complementary alternative investment strategies, each designed to generate returns uncorrelated with traditional asset classes. Access is restricted to wholesale investors under the Corporations Act 2001 (Cth).",
    "show_divider": true
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'strategies', 'features', 2,
  '{
    "heading": "Our Strategies",
    "subheading": "Each strategy operates under an independent mandate with defined risk parameters and liquidity terms.",
    "show_divider": true,
    "features": [
      {
        "icon": "TrendingUp",
        "badge": "Flagship",
        "title": "Arkline Australian Equity L/S Fund",
        "description": "A long/short equity strategy focused on the ASX and Asia-Pacific equities. Targets net exposure of 20%–50% long. Monthly liquidity with 30-day notice. ARSN registered."
      },
      {
        "icon": "Globe",
        "badge": "Diversifying",
        "title": "Arkline Global Macro Fund",
        "description": "A discretionary macro strategy expressing views across global rates, AUD/USD and G10 FX, commodities, and equity indices. Quarterly liquidity with 45-day notice."
      },
      {
        "icon": "BarChart2",
        "badge": "Systematic",
        "title": "Arkline Quant Alpha Fund",
        "description": "A systematic, factor-driven strategy deploying proprietary quantitative models across liquid global markets. Low correlation to discretionary strategies. Monthly liquidity."
      }
    ]
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'strategies', 'about', 3,
  '{
    "heading": "Our Investment Process",
    "show_divider": true,
    "image_side": "left",
    "body": "Every strategy at Arkline Trust follows a structured, repeatable investment process designed to generate consistent risk-adjusted returns across market cycles.\n\nIdea generation begins with a combination of proprietary quantitative screening and deep fundamental research. Each investment thesis is subjected to rigorous financial modelling, scenario analysis, and independent review before any capital is deployed.\n\nRisk management is embedded at every stage — from initial sizing through ongoing monitoring. We employ real-time risk analytics, correlation-adjusted position limits, and predefined drawdown protocols. When risk thresholds are breached, positions are reduced or exited systematically — without exception.\n\nAll strategies are reviewed monthly by our investment committee. Formal performance attribution and risk reporting are distributed to investors on a regular schedule, in compliance with our AFSL obligations and the disclosure standards expected of institutional-grade managers."
  }'::jsonb,
  true
);

-- CONTACT PAGE ──────────────────────────────────────────────────
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'contact', 'hero', 1,
  '{
    "background_style": "dark",
    "headline": "Get in Touch",
    "subheadline": "We welcome enquiries from wholesale investors and single family offices located in Australia. Our team typically responds within one business day.",
    "show_divider": true
  }'::jsonb,
  true
),
(
  (SELECT id FROM platform_tenants WHERE slug = 'arkline'),
  'contact', 'contact', 2,
  '{
    "heading": "Contact Arkline Trust",
    "subheading": "To discuss our investment strategies, request a fund information memorandum, or arrange an introductory call, please reach out using the details below.",
    "show_form": true,
    "form_heading": "Send an Enquiry",
    "email": "enquiries@arklinetrust.com",
    "phone": "+61 2 8000 0000",
    "address": "Sydney, New South Wales, Australia",
    "office_hours": "Monday – Friday, 9:00 AM – 5:00 PM AEST",
    "show_divider": true,
    "disclaimer": "Arkline Trust holds an Australian Financial Services Licence (AFSL) issued by the Australian Securities and Investments Commission (ASIC). Access to Arkline Trust funds is restricted to wholesale investors as defined under section 761G of the Corporations Act 2001 (Cth). Investment in our funds involves risk. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation to acquire any financial product."
  }'::jsonb,
  true
);
