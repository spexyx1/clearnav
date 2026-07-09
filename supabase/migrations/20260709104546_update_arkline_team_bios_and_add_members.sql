/*
  # Arkline Trust — Corrected Bios, Team Photos & New Members

  Changes:
  1. Team page — rewritten bios for Noah, Nisan, Aryeh with accurate details
     - Noah: established the trust (prefers privacy), board member (not CEO) of multi-billion retail chain,
       established $200M+ investment office
     - Nisan: decades of business + operator experience
     - Aryeh: updated bio
     - New images selected to better match physical descriptions
  2. Team page — add Francois, Benjy, Chaim
  3. About page "Who We Are" — corrected narrative
  4. Home page "Who We Are" — corrected narrative
*/

-- ============================================================
-- 1. TEAM PAGE — Updated members + new members
-- ============================================================
UPDATE website_content
SET content = jsonb_set(
  content,
  '{members}',
  jsonb_build_array(
    -- Noah: established trust, prefers privacy, board member (not CEO), $200M+ investment office
    jsonb_build_object(
      'name', 'Noah',
      'title', 'Founder & Co-Chief Investment Officer',
      'bio', 'Noah established Arkline Trust and brings a rare combination of institutional-scale operating experience and private capital management. He previously served on the board of a multi-billion dollar retail chain and went on to establish a $200M+ investment office, which he continues to oversee. Noah and Nisan share operator experience across large-scale business environments, and that grounding directly shapes how Arkline Trust evaluates risk and allocates capital.',
      'image', 'https://images.pexels.com/photos/8500398/pexels-photo-8500398.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    -- Nisan: decades of business, operator experience
    jsonb_build_object(
      'name', 'Nisan',
      'title', 'Co-Chief Investment Officer',
      'bio', 'Nisan brings decades of business experience across multiple industries, with a strong background as an operator who has run and scaled real enterprises. His cross-sector perspective informs how Arkline Trust assesses the underlying economics of businesses, management quality, and capital allocation decisions. He lives and works with his family in Jerusalem.',
      'image', 'https://images.pexels.com/photos/8090137/pexels-photo-8090137.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    -- Aryeh: updated
    jsonb_build_object(
      'name', 'Aryeh',
      'title', 'Senior Portfolio Manager & Quantitative Analyst',
      'bio', 'Aryeh is an analytically rigorous professional who develops and manages the fund''s systematic strategies. Applying statistical methods to portfolio construction, he works at the intersection of quantitative research and fundamental analysis. He is also pursuing a second degree in medicine, driven by intellectual curiosity as much as discipline.',
      'image', 'https://images.pexels.com/photos/6476808/pexels-photo-6476808.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    -- Francois: CFO/PE advisor
    jsonb_build_object(
      'name', 'Francois',
      'title', 'Advisor — Finance & Governance',
      'bio', 'Francois brings decades of executive-level financial expertise, having served as CFO of a $100M+ private equity firm and held senior roles at leading accounting and audit firms in Australia. His institutional finance background and governance experience provide Arkline Trust with deep structural rigour in financial oversight and reporting.',
      'image', 'https://images.pexels.com/photos/8090287/pexels-photo-8090287.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    -- Benjy: bookkeeping
    jsonb_build_object(
      'name', 'Benjy',
      'title', 'Bookkeeping',
      'bio', 'Benjy manages the day-to-day financial records and bookkeeping for Arkline Trust, ensuring accurate and timely accounting across all fund operations.',
      'image', ''
    ),
    -- Chaim: associate
    jsonb_build_object(
      'name', 'Chaim',
      'title', 'Associate',
      'bio', 'Chaim is an associate working across related business activities at Arkline Trust, contributing to research, operations, and ongoing deal support.',
      'image', ''
    )
  )
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';

-- ============================================================
-- 2. ABOUT PAGE — "Who We Are" corrected narrative
-- ============================================================
UPDATE website_content
SET content = content
  || jsonb_build_object(
      'heading', 'Who We Are',
      'body',
      'Arkline Trust was established by Noah and Nisan — two experienced operators who have built and run substantial businesses before directing their focus to investment management.' || chr(10) || chr(10) ||
      'Noah previously served on the board of a multi-billion dollar retail chain and has established a $200M+ investment office, which he continues to oversee from Melbourne, Australia. Nisan brings decades of business and operator experience across multiple industries, and operates from Jerusalem, Israel. Both have genuine skin in the game — they invest alongside clients and apply the same framework to their own capital.' || chr(10) || chr(10) ||
      'Aryeh rounds out the investment team as Senior Portfolio Manager and Quantitative Analyst, applying statistical rigour and systematic strategy development to complement the founders'' fundamental judgement.' || chr(10) || chr(10) ||
      'Arkline Trust exists because its founders could not find a manager that met their own standard. We built the firm we wished existed — and we now offer it to a small number of like-minded wholesale investors and family offices.'
    )
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'about';

-- ============================================================
-- 3. HOME PAGE — "Who We Are" corrected narrative
-- ============================================================
UPDATE website_content
SET content = content
  || jsonb_build_object(
      'heading', 'Who We Are',
      'body',
      'Arkline Trust was established by Noah and Nisan — two operators who have run large-scale businesses and now apply that same discipline to capital management.' || chr(10) || chr(10) ||
      'Noah served on the board of a multi-billion dollar retail chain and established a $200M+ investment office from Melbourne, Australia. Nisan brings decades of business and operator experience across multiple industries, working from Jerusalem, Israel. Both invest their own capital under the same framework applied to client mandates.' || chr(10) || chr(10) ||
      'This is not a firm built by career financiers. It is built by operators who understand what it means to have capital genuinely at risk.',
      'cta_href', '/about',
      'cta_text', 'Our Story',
      'image', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'image_side', 'right'
    )
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'about';
