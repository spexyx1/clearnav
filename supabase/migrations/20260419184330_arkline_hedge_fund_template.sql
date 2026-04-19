/*
  # Hedge Fund Standard Template — Based on Arkline Trust

  ## Overview
  Creates a "Hedge Fund Standard" website template that captures the Arkline Trust
  site structure, theme, and page/section patterns. Future tenants can apply this
  template during onboarding for an instant, production-quality starting point.

  ## Changes

  ### 1. Website Template Record
  - Slug: `hedge-fund-standard`
  - Category: `hedge_fund`
  - Includes full theme configuration

  ### 2. Template Sections
  - Home: hero, stats, features, cta
  - About: hero, about, features (values)
  - Services: hero, features (strategies), about (process)
  - Contact: hero, contact

  ## Notes
  - All content uses {{PLACEHOLDER}} tokens that the onboarding system replaces
    with tenant-specific values when the template is applied
  - The theme palette is designed for trust/finance sector
*/

-- ============================================================
-- Step 1: Upsert the template record
-- ============================================================
INSERT INTO website_templates (
  id, name, slug, description, category,
  theme, is_active, preview_image_url
)
VALUES (
  gen_random_uuid(),
  'Hedge Fund Standard',
  'hedge-fund-standard',
  'A premium template designed for hedge funds, private equity firms, and institutional asset managers. Features a dark-navy and gold palette, Playfair Display headings, four core pages (Home, About, Services, Contact), and sections optimised for credibility and qualified investor conversion.',
  'hedge_fund',
  '{
    "colors": {
      "primary":       "#0A1628",
      "secondary":     "#152238",
      "accent":        "#C9A84C",
      "accentLight":   "#E8C96B",
      "background":    "#FFFFFF",
      "backgroundAlt": "#F8F7F4",
      "text":          "#0A1628",
      "textSecondary": "#4A5568",
      "textLight":     "#718096",
      "border":        "#E2E8F0",
      "success":       "#2D6A4F",
      "white":         "#FFFFFF"
    },
    "typography": {
      "headingFont":  "\"Playfair Display\", Georgia, serif",
      "bodyFont":     "\"Inter\", system-ui, sans-serif",
      "headingWeight":"700",
      "bodyWeight":   "400"
    },
    "custom_css": "@import url(\"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap\");"
  }'::jsonb,
  true,
  'https://images.pexels.com/photos/6801647/pexels-photo-6801647.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
)
ON CONFLICT (slug) DO UPDATE SET
  name              = EXCLUDED.name,
  description       = EXCLUDED.description,
  theme             = EXCLUDED.theme,
  preview_image_url = EXCLUDED.preview_image_url,
  updated_at        = now();

-- ============================================================
-- Step 2: Template sections — capture the Arkline pattern
-- (delete old ones for this template slug first to be idempotent)
-- ============================================================
DELETE FROM template_sections
WHERE template_id = (SELECT id FROM website_templates WHERE slug = 'hedge-fund-standard');

-- HOME sections
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'home', 'hero', 1,
  '{
    "headline": "{{COMPANY_TAGLINE}}",
    "subheadline": "{{COMPANY_NAME}} is a {{LOCATION}}-based asset management firm delivering disciplined, research-driven investment strategies for institutional and qualified investors seeking consistent, risk-adjusted performance.",
    "cta_text": "Explore Our Strategies",
    "cta_href": "/services",
    "secondary_cta_text": "Contact Us",
    "secondary_cta_href": "/contact",
    "background_style": "dark",
    "show_divider": true,
    "badge": "Registered Investment Adviser"
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'home', 'stats', 2,
  '{
    "stats": [
      {"value": "{{FOUNDED_YEAR}}", "label": "Founded"},
      {"value": "{{LOCATION}}", "label": "Headquarters"},
      {"value": "Qualified Investors", "label": "Investor Base"},
      {"value": "ClearNAV", "label": "Powered By"}
    ]
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'home', 'features', 3,
  '{
    "heading": "Our Investment Approach",
    "subheading": "We combine quantitative rigor with deep fundamental research to identify asymmetric opportunities across global markets.",
    "show_divider": true,
    "features": [
      {"icon": "TrendingUp", "title": "Long/Short Equity", "description": "Systematic exposure to high-conviction equity pairs, capturing alpha on both sides of the market cycle while managing net market exposure."},
      {"icon": "Shield",     "title": "Risk Management",  "description": "Multi-layered risk framework with real-time portfolio monitoring, drawdown controls, and independent risk oversight built into every strategy."},
      {"icon": "Globe",      "title": "Global Macro",     "description": "Top-down macroeconomic analysis driving tactical allocations across equities, fixed income, commodities, and currencies."},
      {"icon": "BarChart2",  "title": "Quantitative Strategies", "description": "Proprietary quantitative models identifying statistical mispricings and momentum signals across liquid asset classes."},
      {"icon": "Lock",       "title": "Capital Preservation", "description": "Disciplined position sizing and sector diversification designed to protect capital during periods of elevated market volatility."},
      {"icon": "FileText",   "title": "Investor Reporting", "description": "Institutional-grade reporting including monthly NAV statements, performance attribution, risk reports, and tax documentation."}
    ]
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'home', 'cta', 4,
  '{
    "heading": "Ready to Learn More?",
    "subheading": "We welcome inquiries from qualified institutional and individual investors. Our team is available to discuss our strategies, performance track record, and investor terms.",
    "cta_text": "Contact Our Team",
    "cta_href": "/contact",
    "secondary_cta_text": "View Our Services",
    "secondary_cta_href": "/services",
    "background_style": "dark"
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

-- ABOUT sections
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'about', 'hero', 1,
  '{
    "headline": "Built on Discipline. Driven by Research.",
    "subheadline": "{{COMPANY_NAME}} was founded with a singular focus: to deliver institutional-quality investment management to a select group of qualified investors.",
    "background_style": "dark",
    "show_divider": true
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'about', 'about', 2,
  '{
    "heading": "Our Story",
    "body": "{{COMPANY_NAME}} was established in {{FOUNDED_YEAR}} in {{LOCATION}} by investment professionals with backgrounds in institutional asset management, quantitative research, and risk management.\n\nWe identified a clear gap in the market: sophisticated investors deserved access to hedge fund-style strategies with the transparency, technology, and investor service standards typically reserved for the largest institutions.\n\nToday, {{COMPANY_NAME}} manages capital on behalf of qualified investors through a suite of complementary strategies, all united by a commitment to rigorous analysis, disciplined risk management, and transparent investor reporting.",
    "show_divider": true,
    "image_side": "right"
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'about', 'features', 3,
  '{
    "heading": "Our Core Values",
    "subheading": "These principles guide every decision we make — from portfolio construction to investor communication.",
    "show_divider": true,
    "features": [
      {"icon": "Eye",    "title": "Transparency", "description": "Investors receive full transparency into portfolio positioning, performance attribution, and risk metrics on a regular basis."},
      {"icon": "Target", "title": "Discipline",   "description": "We follow systematic, rules-based investment processes designed to remove emotion from decision-making and maintain consistency."},
      {"icon": "Users",  "title": "Alignment",    "description": "We invest our own capital alongside that of our investors. Our interests are fully aligned with yours."},
      {"icon": "Award",  "title": "Excellence",   "description": "We hold ourselves to the highest standards of investment performance, fiduciary conduct, and client service."}
    ]
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

-- SERVICES sections
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'services', 'hero', 1,
  '{
    "headline": "Investment Strategies & Fund Structures",
    "subheadline": "{{COMPANY_NAME}} offers a range of investment strategies designed for qualified investors seeking risk-adjusted returns uncorrelated with traditional asset classes.",
    "background_style": "dark",
    "show_divider": true,
    "badge": "Available to Qualified Investors"
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'services', 'features', 2,
  '{
    "heading": "Our Strategies",
    "subheading": "Each strategy is independently managed with its own mandate, risk parameters, and liquidity terms.",
    "show_divider": true,
    "features": [
      {"icon": "TrendingUp", "title": "{{COMPANY_NAME}} Equity L/S Fund",   "description": "A long/short equity strategy focused on US and international equities. Net exposure managed between 20%–60% long. Monthly liquidity.", "badge": "Flagship"},
      {"icon": "Globe",      "title": "{{COMPANY_NAME}} Global Macro Fund", "description": "A discretionary macro strategy across global rates, FX, commodities, and equity indices based on top-down macroeconomic analysis. Quarterly liquidity.", "badge": "Diversifying"},
      {"icon": "BarChart2",  "title": "{{COMPANY_NAME}} Quant Alpha Fund",  "description": "A systematic, factor-driven strategy deploying proprietary quantitative models across liquid global markets. Monthly liquidity.", "badge": "Systematic"}
    ]
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'services', 'about', 3,
  '{
    "heading": "Our Investment Process",
    "body": "Every strategy at {{COMPANY_NAME}} follows a structured, repeatable investment process designed to generate consistent risk-adjusted returns across market cycles.\n\nIdea generation begins with a combination of quantitative screening and fundamental research. Each potential investment is subjected to rigorous financial modeling, scenario analysis, and independent review before entering a portfolio.\n\nRisk management is integrated at every step — from initial sizing through ongoing monitoring. We employ real-time risk analytics, correlation-adjusted position limits, and predefined drawdown protocols.\n\nAll strategies are reviewed monthly by our investment committee, with formal performance attribution and risk reporting distributed to investors on a regular schedule.",
    "show_divider": true,
    "image_side": "left"
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

-- CONTACT sections
INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'contact', 'hero', 1,
  '{
    "headline": "Get in Touch",
    "subheadline": "We welcome inquiries from qualified investors, institutional allocators, and prospective partners. Our team typically responds within one business day.",
    "background_style": "dark",
    "show_divider": true
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';

INSERT INTO template_sections (template_id, page_slug, section_type, section_order, content)
SELECT
  t.id, 'contact', 'contact', 2,
  '{
    "heading": "Contact {{COMPANY_NAME}}",
    "subheading": "Reach out to discuss our investment strategies, request a fund fact sheet, or schedule an introductory call.",
    "show_divider": true,
    "email": "{{CONTACT_EMAIL}}",
    "phone": "{{CONTACT_PHONE}}",
    "address": "{{LOCATION}}",
    "office_hours": "Monday – Friday, 9:00 AM – 5:00 PM ET",
    "show_form": true,
    "form_heading": "Send a Message",
    "disclaimer": "{{COMPANY_NAME}} serves qualified investors only. Investment in our funds involves risk. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation of an offer to buy any securities."
  }'::jsonb
FROM website_templates t WHERE t.slug = 'hedge-fund-standard';
