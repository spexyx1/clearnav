/*
  # Arkline Trust — About Page & Team Photo Updates

  1. About Page — "Who We Are" (about section, order 2)
     - Rewritten to reflect the real founding story: Noah (Melbourne) + Nisan (Jerusalem),
       dual-city operation, retail & small-business operator background, family office roots,
       and the quantitative strategy angle Aryeh brings.

  2. About Page — Remove Leadership section (custom section, order 5)
     - The team now has a dedicated /team page; the old placeholder leadership
       block on the About page is removed.

  3. Team Page — Updated portrait photos for Noah and Nisan
     - Noah: mature, warm, authoritative — matches "family man, pilot, paramedic, operator"
     - Nisan: Middle-Eastern/Mediterranean professional — matches "Jerusalem, small business"
     - Aryeh photo unchanged.
*/

-- ============================================================
-- 1. UPDATE "Who We Are" about section
-- ============================================================
UPDATE website_content
SET content = content
  || '{"heading": "Who We Are"}'::jsonb
  || jsonb_build_object(
      'body',
      'Arkline Trust was founded by Noah and Nisan — two experienced operators who built and ran large-scale businesses before turning their full attention to investing. Noah has spent decades at the helm of a major retail chain and oversees a $200M+ family office from Melbourne, Australia. Nisan brings decades of multi-industry small business management experience and operates from Jerusalem, Israel.' || chr(10) || chr(10) ||
      'This dual-city founding team is deliberate. The partnership combines an Australian market presence and regulatory footing with a global perspective grounded in real operating experience — not financial theory. Both founders have skin in the game: they invest alongside clients, and they manage their own family capital under the same framework.' || chr(10) || chr(10) ||
      'Aryeh rounds out the investment team as Senior Portfolio Manager and Quantitative Analyst, applying statistical rigour and systematic strategy development to complement the founders'' fundamental judgement.' || chr(10) || chr(10) ||
      'Arkline Trust exists because its founders could not find a manager that met their own standard. We built the firm we wished existed — and we now offer it to a small number of like-minded wholesale investors and family offices.'
    )
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'about';

-- ============================================================
-- 2. REMOVE Leadership section (custom, order 5)
-- ============================================================
DELETE FROM website_content
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'custom'
  AND section_order = 5;

-- Renumber governance section to fill the gap
UPDATE website_content
SET section_order = 5
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'custom'
  AND section_order = 6;

-- ============================================================
-- 3. UPDATE team member photos on /team page
-- ============================================================
UPDATE website_content
SET content = jsonb_set(
  content,
  '{members}',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Noah',
      'title', 'Chief Executive Officer & Co-Chief Investment Officer',
      'bio', 'Noah is a retail-industry veteran with decades of experience operating a large chain. He has established and is closely involved in the operation of a large family office overseeing a $200M+ portfolio. A dedicated family man, licensed pilot, and volunteer paramedic, Noah brings an operator''s discipline and an investor''s rigour to everything Arkline Trust does.',
      'image', 'https://images.pexels.com/photos/5792641/pexels-photo-5792641.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Nisan',
      'title', 'Co-Chief Investment Officer',
      'bio', 'Nisan brings decades of small business management experience spanning multiple industries. His cross-sector expertise lends a uniquely grounded perspective on markets, capital allocation, and the underlying economics of the businesses Arkline Trust evaluates. He lives with his family in Jerusalem.',
      'image', 'https://images.pexels.com/photos/6801642/pexels-photo-6801642.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Aryeh',
      'title', 'Senior Portfolio Manager & Quantitative Analyst',
      'bio', 'Aryeh is an analytical and sharp-minded professional who applies time-tested statistical principles to develop and manage the fund''s quantitative strategies. He studies medicine for intellectual curiosity and is currently pursuing his second degree in the field — when he''s not refining the fund''s algorithms.',
      'image', 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400'
    )
  )
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';
