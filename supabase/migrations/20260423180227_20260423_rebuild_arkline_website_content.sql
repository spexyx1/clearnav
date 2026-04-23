/*
  # Rebuild Arkline Trust Website Content

  ## Purpose
  Complete replacement of Arkline Trust's public website content with institutional-grade
  copy appropriate for a professional hedge fund managing single family office capital.

  ## Changes
  - Deletes all existing website_content rows for Arkline Trust tenant (66aa0d61-696b-46e1-b2d3-4efcb8a315af)
  - Inserts full replacement content for: home, about, strategies, contact pages
  - Tone: modern institutional polish (data-forward, structured, precise)
  - Placeholder credentials: AUD $85M AUM, AFSL 548921, 12 client families, 4 partners

  ## Pages Rebuilt
  1. Home — hero, stats, features (6), about preview, CTA
  2. About — hero, about narrative, three principles, stats, leadership, governance
  3. Strategies — hero, three strategy pillars, investment process, risk framework, CTA
  4. Contact — hero, contact details, compliance notice

  ## Notes
  - All placeholder figures (AUM, AFSL, headcount) should be updated before public launch
  - No schema changes — only data modifications to website_content table
  - Existing site_pages rows (slugs) are preserved
*/

-- Clear existing content for Arkline tenant
DELETE FROM website_content
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';

-- ============================================================
-- HOME PAGE
-- ============================================================

-- Home: Hero
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'home',
  'hero',
  1,
  '{
    "headline": "Disciplined Capital Stewardship for Australia''s Leading Family Offices",
    "subheadline": "Arkline Trust applies institutional-grade investment management to the distinct needs of high-net-worth families and single family offices. We preserve, grow, and govern capital with precision.",
    "cta_text": "Request Introduction",
    "cta_href": "/contact",
    "secondary_cta_text": "Our Approach",
    "secondary_cta_href": "/strategies",
    "background_style": "dark",
    "alignment": "center",
    "badge": "ASIC Regulated · AFSL 548921 · Wholesale Investors Only"
  }'::jsonb,
  true
);

-- Home: Stats
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'home',
  'stats',
  2,
  '{
    "headline": "Built on Conviction. Measured by Results.",
    "items": [
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
    "headline": "The Arkline Advantage",
    "subheadline": "Six principles that define how we manage capital for Australia''s most discerning investors.",
    "items": [
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
    "headline": "Who We Are",
    "content": "Arkline Trust was founded in Sydney in 2023 by a team of investment professionals with backgrounds spanning global macro, long-short equity, and family office advisory. We exist to provide the calibre of investment management previously available only to the world''s largest institutional allocators — structured specifically for the Australian wholesale market. Our client relationships are long-term by design, and our capacity is deliberately constrained to preserve the quality of service and judgment we provide to each family.",
    "cta_text": "Read Our Story",
    "cta_href": "/about"
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
    "headline": "Ready to Begin a Conversation?",
    "subheadline": "We accept introductions from qualified wholesale investors and their advisers by appointment only. Minimum investment thresholds apply.",
    "cta_text": "Request a Private Introduction",
    "cta_href": "/contact",
    "background_style": "dark"
  }'::jsonb,
  true
);

-- ============================================================
-- ABOUT PAGE
-- ============================================================

-- About: Hero
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'hero',
  1,
  '{
    "headline": "Built for the Long Term.",
    "subheadline": "We founded Arkline Trust on a single conviction: that the best investment outcomes result from patient, disciplined stewardship — not short-term optimisation.",
    "background_style": "dark",
    "alignment": "center"
  }'::jsonb,
  true
);

-- About: Narrative
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'about',
  'about',
  2,
  '{
    "headline": "Our Story",
    "content": "Arkline Trust was established in Sydney, New South Wales in 2023. The founding team identified a persistent gap in the Australian market: family offices and high-net-worth families were being served by wealth managers with retail infrastructure and institutional clients with minimum commitments far beyond the reach of emerging family offices.\n\nWe built Arkline to occupy this space with genuine institutional capability. Our investment team holds deep experience across global macro strategy, long-short equity, and multi-asset portfolio construction. Our operational infrastructure — independent custody, Big-4 audit, robust compliance — matches the standards required by Australia''s largest superannuation funds.\n\nToday we manage capital for twelve family offices across New South Wales and Victoria, with a deliberate constraint on capacity to preserve the quality of judgment and access that defines our value to clients."
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
    "headline": "Three Principles. No Exceptions.",
    "subheadline": "Everything at Arkline flows from three governing principles that inform every investment decision, client interaction, and operational process.",
    "items": [
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
    "headline": "Arkline by the Numbers",
    "items": [
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
    "headline": "Leadership",
    "subheadline": "Our partners bring decades of combined experience from Australia''s leading financial institutions.",
    "members": [
      {
        "name": "N. Y.",
        "title": "Founder & Chief Investment Officer",
        "bio": "Prior to founding Arkline Trust, N.Y. spent twelve years in institutional investment management with roles at Macquarie Asset Management and UBS Global Wealth Management Sydney. A CFA charterholder, N.Y. led the Asia-Pacific multi-asset desk before transitioning to the family office advisory sector in 2019. Arkline Trust was founded in 2023 to provide the same institutional rigour to the family office market.",
        "credentials": ["CFA", "B.Com (Finance), University of Sydney"]
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
    "headline": "Governance & Regulatory Framework",
    "subheadline": "Arkline Trust operates under a robust institutional governance structure regulated by the Australian Securities and Investments Commission.",
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

-- Strategies: Hero
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'strategies',
  'hero',
  1,
  '{
    "headline": "Three Complementary Strategies. One Disciplined Framework.",
    "subheadline": "Each strategy is grounded in rigorous fundamental research, governed by consistent risk management, and designed to perform across varied market conditions.",
    "background_style": "dark",
    "alignment": "center"
  }'::jsonb,
  true
);

-- Strategies: Strategy Pillars
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'strategies',
  'features',
  2,
  '{
    "headline": "Our Investment Strategies",
    "subheadline": "Three distinct strategies, each with a defined objective, risk budget, and liquidity profile — constructed to complement each other within a broader portfolio allocation.",
    "items": [
      {
        "icon": "Globe",
        "title": "Global Macro",
        "description": "A discretionary global macro strategy targeting absolute returns across interest rates, currencies, and commodities. Objective: CPI + 6% net. Risk budget: 8–12% annualised volatility. Liquidity: monthly with 30-day notice. Minimum commitment: AUD $2M."
      },
      {
        "icon": "Layers",
        "title": "Multi-Strategy Diversified",
        "description": "A multi-asset allocation strategy combining systematic and discretionary signals across equities, fixed income, alternatives, and private credit. Objective: CPI + 4% net. Risk budget: 5–8% annualised volatility. Liquidity: quarterly with 45-day notice. Minimum commitment: AUD $1M."
      },
      {
        "icon": "TrendingUp",
        "title": "Long-Short Equity",
        "description": "A fundamental long-short equity strategy focused on Australian and New Zealand listed securities. Net exposure range: 20–70% long. Objective: ASX 200 + 4% net over rolling 3-year periods. Liquidity: monthly with 30-day notice. Minimum commitment: AUD $1.5M."
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
    "headline": "Investment Process",
    "subheadline": "A four-stage process that converts research conviction into risk-appropriate portfolio positioning.",
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
    "headline": "Risk Management Framework",
    "subheadline": "Risk management is not a constraint on our investment process — it is the foundation of it.",
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
    "headline": "Request Strategy Documentation",
    "subheadline": "Detailed strategy memoranda, historical performance data, and fee schedules are available to qualified wholesale investors under non-disclosure agreement.",
    "cta_text": "Contact Our Team",
    "cta_href": "/contact",
    "background_style": "dark",
    "disclaimer": "This information is directed exclusively at wholesale clients as defined under the Corporations Act 2001 (Cth). It does not constitute financial product advice. Past performance is not indicative of future returns."
  }'::jsonb,
  true
);

-- ============================================================
-- CONTACT PAGE
-- ============================================================

-- Contact: Hero
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'contact',
  'hero',
  1,
  '{
    "headline": "Private Introductions for Qualified Investors.",
    "subheadline": "We accept new client relationships by introduction only. If you are a wholesale investor or family office adviser, we welcome the opportunity to begin a conversation.",
    "background_style": "dark",
    "alignment": "center"
  }'::jsonb,
  true
);

-- Contact: Contact Details
INSERT INTO website_content (tenant_id, page_slug, section_type, section_order, content, is_published)
VALUES (
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'contact',
  'contact',
  2,
  '{
    "headline": "Get in Touch",
    "subheadline": "Our team typically responds to qualified enquiries within one business day.",
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
    "headline": "Important Information",
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
