/*
  # Update Home Page "Who We Are" Section

  Rewrites the about section on the home page to match the real founding story:
  - Founded by Noah (Melbourne) and Nisan (Jerusalem)
  - Operator background, not theoretical finance
  - Family office roots with genuine skin in the game
  - Removes the placeholder "Sydney 2023, 12 families" narrative
*/

UPDATE website_content
SET content = content
  || jsonb_build_object(
      'heading', 'Who We Are',
      'body',
      'Arkline Trust was founded by Noah and Nisan — two experienced operators who built and ran large-scale businesses before turning their full attention to investing.' || chr(10) || chr(10) ||
      'Noah has spent decades at the helm of a major retail chain and oversees a $200M+ family office from Melbourne, Australia. Nisan brings decades of multi-industry small business management experience and operates from Jerusalem, Israel. Both founders invest their own capital under the same framework they apply to client mandates.' || chr(10) || chr(10) ||
      'This is not a firm built by career financiers. It is built by operators who understand what it means to have capital genuinely at risk — and who demand the same rigour of their investment process that they applied to their businesses.',
      'cta_href', '/about',
      'cta_text', 'Our Story',
      'image', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'image_side', 'right'
    )
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'about';
