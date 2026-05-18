/*
  # Update Team Photos — Verified Financial Professional Portraits

  Replaces all three team member photos with verified Pexels images
  of suited financial/business professionals.

  - Noah  (CEO): 3778603 — "Man in Black Suit Jacket Smiling" — confident, warm
  - Nisan (CIO): 3785104 — "Man in Black Suit Holding a Calling Card" — professional studio portrait
  - Aryeh (PM):  8353804 — "Man Wearing Suit Smiling" — polished, professional
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
      'image', 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Nisan',
      'title', 'Co-Chief Investment Officer',
      'bio', 'Nisan brings decades of small business management experience spanning multiple industries. His cross-sector expertise lends a uniquely grounded perspective on markets, capital allocation, and the underlying economics of the businesses Arkline Trust evaluates. He lives with his family in Jerusalem.',
      'image', 'https://images.pexels.com/photos/3785104/pexels-photo-3785104.jpeg?auto=compress&cs=tinysrgb&w=400'
    ),
    jsonb_build_object(
      'name', 'Aryeh',
      'title', 'Senior Portfolio Manager & Quantitative Analyst',
      'bio', 'Aryeh is an analytical and sharp-minded professional who applies time-tested statistical principles to develop and manage the fund''s quantitative strategies. He studies medicine for intellectual curiosity and is currently pursuing his second degree in the field — when he''s not refining the fund''s algorithms.',
      'image', 'https://images.pexels.com/photos/8353804/pexels-photo-8353804.jpeg?auto=compress&cs=tinysrgb&w=400'
    )
  )
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'team'
  AND section_type = 'team';
