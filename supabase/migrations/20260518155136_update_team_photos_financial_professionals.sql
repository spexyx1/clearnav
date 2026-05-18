/*
  # Update Team Photos — Financial Professionals

  Replaces Noah and Nisan portrait photos with well-known Pexels
  images of suited financial/business professionals.

  - Noah  (CEO): photo 3184611 — confident businessman in dark suit, office setting
  - Nisan (CIO): photo 3182812 — professional man in suit, neutral background
  - Aryeh: unchanged
*/

UPDATE website_content
SET content = jsonb_set(
  content,
  '{members}',
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Noah',
      'title', 'Chief Executive Officer & Co-Chief Investment Officer',
      'bio', 'Noah is a retail-industry veteran with decades of experience operating a large chain. He has established and is closely involved in the operation of a large family office overseeing a $200M+ portfolio. A dedicated family man, licensed pilot, and volunteer paramedic, Noah brings an operator''s discipline and an investor''s rigour to everything Arkline Trust does.',
      'image', 'https://images.pexels.com/photos/3184611/pexels-photo-3184611.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Nisan',
      'title', 'Co-Chief Investment Officer',
      'bio', 'Nisan brings decades of small business management experience spanning multiple industries. His cross-sector expertise lends a uniquely grounded perspective on markets, capital allocation, and the underlying economics of the businesses Arkline Trust evaluates. He lives with his family in Jerusalem.',
      'image', 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=400'
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
