/*
  # Fix Arkline Website Content Field Names

  ## Purpose
  The section renderers use specific field names that differ from what was inserted
  in the previous migration. This migration fixes all field-name mismatches:

  - FeaturesSection expects: heading, subheading, features[] (not headline, subheadline, items[])
  - StatsSection expects: stats[] (not items[])
  - AboutSection expects: heading, body (not headline, content)
  - CTASection expects: heading, subheading (not headline, subheadline)
  - HeroSection already uses headline/subheadline correctly
  - About preview needs: heading, body, cta_text, cta_href

  ## Approach
  Delete and re-insert all non-hero sections with corrected field names.
*/

-- Remove all non-hero sections inserted in previous migration
DELETE FROM website_content
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND section_type != 'hero';

-- ============================================================
-- HOME PAGE
-- ============================================================

-- Home: Stats
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'home',
  'stats',
  2,
  '{
    "headline": "Built on Conviction. Measured by Results.",
    "stats": [
      { "value": "AUD $85M", "label": "Assets Under Management" },
      { "value": "12", "label": "Family Office Mandates" },
      { "value": "2023", "label": "Year Founded" },
      { "value": "4", "label": "Investment Partners" }
    ]
  }'::jsonb,
  true
);

-- Home: Features (6 items)
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'home',
  'features',
  3,
  '{
    "heading": "The Arkline Advantage",
    "subheading": "Six principles that define how we manage capital for Australia''s most discerning investors.",
    "background": "alt",
    "features": [
      {
        "icon": "Shield",
        "title": "Capital Preservation",
        "description": "We treat the avoidance of permanent capital loss as the primary objective. Risk is priced before return."
      },
      {
        "icon": "TrendingUp",
        "title": "Risk-Adjusted Returns",
        "description": "Performance is measured on a risk-adjusted basis across full market cycles, not relative to short-term benchmarks."
      },
      {
        "icon": "Users",
        "title": "Alignment of Interests",
        "description": "Partners invest alongside clients in every strategy. Our interests are structurally identical to yours."
      },
      {
        "icon": "Settings",
        "title": "Bespoke Mandates",
        "description": "Each mandate is constructed to the family''s specific objectives, liquidity requirements, tax position, and governance preferences."
      },
      {
        "icon": "FileCheck",
        "title": "Institutional Governance",
        "description": "AFSL-licensed and ASIC-regulated. Independent custodian, Big-4 audit, and robust compliance infrastructure."
      },
      {
        "icon": "Lock",
        "title": "Family-Office Specialisation",
        "description": "We work exclusively with wholesale investors and family offices. Our entire operating model is designed around their complexity."
      }
    ]
  }'::jsonb,
  true
);

-- Home: About Preview
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'home',
  'about',
  4,
  '{
    "heading": "Who We Are",
    "body": "Arkline Trust was founded in Sydney in 2023 by a team of investment professionals with backgrounds spanning global macro, long-short equity, and family office advisory. We exist to provide the calibre of investment management previously available only to the world''s largest institutional allocators — structured specifically for the Australian wholesale market.\n\nOur client relationships are long-term by design, and our capacity is deliberately constrained to preserve the quality of service and judgment we provide to each family.",
    "cta_text": "Read Our Story",
    "cta_href": "/about",
    "image": "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "image_side": "right"
  }'::jsonb,
  true
);

-- Home: CTA
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'home',
  'cta',
  5,
  '{
    "heading": "Ready to Begin a Conversation?",
    "subheading": "We accept introductions from qualified wholesale investors and their advisers by appointment only. Minimum investment thresholds apply.",
    "cta_text": "Request a Private Introduction",
    "cta_href": "/contact",
    "background_style": "dark"
  }'::jsonb,
  true
);

-- ============================================================
-- ABOUT PAGE
-- ============================================================

-- About: Narrative
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'about',
  2,
  '{
    "heading": "Our Story",
    "body": "Arkline Trust was established in Sydney, New South Wales in 2023. The founding team identified a persistent gap in the Australian market: family offices and high-net-worth families were being served by wealth managers with retail infrastructure and institutional clients with minimum commitments far beyond the reach of emerging family offices.\n\nWe built Arkline to occupy this space with genuine institutional capability. Our investment team holds deep experience across global macro strategy, long-short equity, and multi-asset portfolio construction. Our operational infrastructure — independent custody, Big-4 audit, robust compliance — matches the standards required by Australia''s largest superannuation funds.\n\nToday we manage capital for twelve family offices across New South Wales and Victoria, with a deliberate constraint on capacity to preserve the quality of judgment and access that defines our value to clients.",
    "image": "https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "image_side": "left",
    "background": "alt"
  }'::jsonb,
  true
);

-- About: Three Principles
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'features',
  3,
  '{
    "heading": "Three Principles. No Exceptions.",
    "subheading": "Everything at Arkline flows from three governing principles that inform every investment decision, client interaction, and operational process.",
    "columns": 3,
    "features": [
      {
        "icon": "Target",
        "title": "Discipline",
        "description": "Investment decisions are governed by a repeatable, documented process. We do not deviate from our framework in response to short-term market noise, client pressure, or competitor positioning. Consistency of process produces consistency of outcome."
      },
      {
        "icon": "Eye",
        "title": "Transparency",
        "description": "Clients receive full transparency into portfolio positioning, risk exposures, fee calculations, and performance attribution. We publish monthly reports with the same detail we would demand if our roles were reversed."
      },
      {
        "icon": "Scale",
        "title": "Accountability",
        "description": "We hold ourselves accountable to the mandate, not the market. Underperformance is explained with specificity. Fees are earned through value delivered. Our reputation is the only currency that matters."
      }
    ]
  }'::jsonb,
  true
);

-- About: Stats
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'stats',
  4,
  '{
    "stats": [
      { "value": "2023", "label": "Year Founded" },
      { "value": "4", "label": "Investment Partners" },
      { "value": "12", "label": "Client Families" },
      { "value": "AUD $85M", "label": "Assets Under Management" }
    ]
  }'::jsonb,
  true
);

-- About: Leadership (Custom Section)
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'custom',
  5,
  '{
    "type": "leadership",
    "heading": "Leadership",
    "subheading": "Our partners bring decades of combined experience from Australia''s leading financial institutions.",
    "members": [
      {
        "name": "N. Y.",
        "title": "Founder & Chief Investment Officer",
        "bio": "Prior to founding Arkline Trust, N.Y. spent twelve years in institutional investment management with roles at Macquarie Asset Management and UBS Global Wealth Management Sydney. A CFA charterholder, N.Y. led the Asia-Pacific multi-asset desk before transitioning to the family office advisory sector in 2019. Arkline Trust was founded in 2023 to provide the same institutional rigour to the family office market.",
        "credentials": ["CFA Charterholder", "B.Com (Finance), University of Sydney"]
      }
    ],
    "note": "Full partner biographies are available to prospective clients upon introduction."
  }'::jsonb,
  true
);

-- About: Governance & Compliance (Custom Section)
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'custom',
  6,
  '{
    "type": "governance",
    "heading": "Governance & Regulatory Framework",
    "subheading": "Arkline Trust operates under a robust institutional governance structure regulated by the Australian Securities and Investments Commission.",
    "items": [
      {
        "icon": "FileCheck",
        "title": "AFSL Licence",
        "description": "Australian Financial Services Licence 548921, authorising the management of wholesale client funds and provision of financial product advice."
      },
      {
        "icon": "Shield",
        "title": "ASIC Regulation",
        "description": "Fully regulated by the Australian Securities and Investments Commission. Annual compliance reviews and ongoing regulatory reporting obligations are met without exception."
      },
      {
        "icon": "Building",
        "title": "Independent Custody",
        "description": "All client assets are held with an independent, APRA-regulated custodian. No co-mingling of firm and client assets."
      },
      {
        "icon": "BarChart2",
        "title": "Annual Audit",
        "description": "Financial statements and compliance frameworks are audited annually by a Big-4 accounting firm. Results are provided to clients in full."
      }
    ]
  }'::jsonb,
  true
);

-- ============================================================
-- STRATEGIES PAGE
-- ============================================================

-- Strategies: Strategy Pillars
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'strategies',
  'features',
  2,
  '{
    "heading": "Our Investment Strategies",
    "subheading": "Three distinct strategies, each with a defined objective, risk budget, and liquidity profile — constructed to complement each other within a broader portfolio allocation.",
    "columns": 3,
    "features": [
      {
        "icon": "Globe",
        "title": "Global Macro",
        "description": "A discretionary global macro strategy targeting absolute returns across interest rates, currencies, and commodities. Objective: CPI + 6% net. Risk budget: 8–12% annualised volatility. Liquidity: monthly with 30-day notice. Minimum commitment: AUD $2M.",
        "badge": "Absolute Return"
      },
      {
        "icon": "Layers",
        "title": "Multi-Strategy Diversified",
        "description": "A multi-asset allocation strategy combining systematic and discretionary signals across equities, fixed income, alternatives, and private credit. Objective: CPI + 4% net. Risk budget: 5–8% annualised volatility. Liquidity: quarterly with 45-day notice. Minimum commitment: AUD $1M.",
        "badge": "Core Allocation"
      },
      {
        "icon": "TrendingUp",
        "title": "Long-Short Equity",
        "description": "A fundamental long-short equity strategy focused on Australian and New Zealand listed securities. Net exposure range: 20–70% long. Objective: ASX 200 + 4% net over rolling 3-year periods. Liquidity: monthly with 30-day notice. Minimum commitment: AUD $1.5M.",
        "badge": "Active Equity"
      }
    ]
  }'::jsonb,
  true
);

-- Strategies: Investment Process (Custom)
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'strategies',
  'custom',
  3,
  '{
    "type": "process",
    "heading": "Investment Process",
    "subheading": "A four-stage process that converts research conviction into risk-appropriate portfolio positioning.",
    "steps": [
      {
        "number": "01",
        "title": "Research & Idea Generation",
        "description": "Bottom-up fundamental research combined with top-down macro analysis. Each investment thesis is documented with explicit return expectations, risk assumptions, and invalidation criteria before consideration by the investment committee."
      },
      {
        "number": "02",
        "title": "Portfolio Construction",
        "description": "Position sizing is determined by conviction strength, correlation to existing holdings, and contribution to total portfolio volatility. No single position may represent more than 8% of portfolio NAV at initiation."
      },
      {
        "number": "03",
        "title": "Execution & Monitoring",
        "description": "Trades are executed to minimise market impact. All positions are monitored daily against their original thesis. Material deviations trigger mandatory investment committee review within 24 hours."
      },
      {
        "number": "04",
        "title": "Risk Review & Reporting",
        "description": "Monthly risk reviews assess portfolio-level VaR, stress test outcomes, liquidity coverage ratios, and factor exposures. Full results are reported to clients in the monthly investor letter."
      }
    ]
  }'::jsonb,
  true
);

-- Strategies: Risk Framework (Custom)
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'strategies',
  'custom',
  4,
  '{
    "type": "risk",
    "heading": "Risk Management Framework",
    "subheading": "Risk management is not a constraint on our investment process — it is the foundation of it.",
    "items": [
      {
        "icon": "BarChart2",
        "title": "Position Sizing Controls",
        "description": "Hard position limits enforced at initiation (8% NAV) and ongoing (12% NAV). Automatic review triggered at 10% NAV."
      },
      {
        "icon": "TrendingDown",
        "title": "Drawdown Protocols",
        "description": "Strategy-level drawdown thresholds trigger automatic position de-risking at -8% from high-water mark and full investment halt at -15%."
      },
      {
        "icon": "Droplets",
        "title": "Liquidity Management",
        "description": "Portfolio liquidity is tiered across five buckets. Minimum 60% of portfolio maintained in T+2 or better liquidity at all times."
      },
      {
        "icon": "Zap",
        "title": "Stress Testing",
        "description": "Monthly stress tests apply twelve historical and hypothetical scenarios including GFC, COVID-19 drawdown, RBA rate shock, and AUD devaluation events."
      }
    ]
  }'::jsonb,
  true
);

-- Strategies: CTA
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'strategies',
  'cta',
  5,
  '{
    "heading": "Request Strategy Documentation",
    "subheading": "Detailed strategy memoranda, historical performance data, and fee schedules are available to qualified wholesale investors under non-disclosure agreement.",
    "cta_text": "Contact Our Team",
    "cta_href": "/contact",
    "background_style": "dark"
  }'::jsonb,
  true
);

-- ============================================================
-- CONTACT PAGE
-- ============================================================

-- Contact: Contact Details
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'contact',
  'contact',
  2,
  '{
    "heading": "Get in Touch",
    "subheading": "Our team typically responds to qualified enquiries within one business day.",
    "email": "contact@arklinetrust.com",
    "phone": "+61 2 8000 0000",
    "address": "Level 25, Aurora Place\n88 Phillip Street\nSydney NSW 2000\nAustralia"
  }'::jsonb,
  true
);

-- Contact: Compliance Notice (Custom)
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'contact',
  'custom',
  3,
  '{
    "type": "compliance",
    "heading": "Important Information",
    "items": [
      {
        "title": "Wholesale Investors Only",
        "description": "Arkline Trust only accepts investments from wholesale clients as defined under section 761G of the Corporations Act 2001 (Cth). Prospective investors must satisfy the wholesale client test before any investment can be accepted."
      },
      {
        "title": "Financial Services Licence",
        "description": "Arkline Trust Pty Ltd holds Australian Financial Services Licence 548921 issued by the Australian Securities and Investments Commission (ASIC). This licence authorises Arkline Trust to manage wholesale client funds and provide financial product advice."
      },
      {
        "title": "General Advice Warning",
        "description": "Nothing on this website constitutes personal financial product advice. Any information provided is general in nature and does not take into account your personal objectives, financial situation, or needs. You should seek independent advice before making any investment decision."
      }
    ]
  }'::jsonb,
  true
);
