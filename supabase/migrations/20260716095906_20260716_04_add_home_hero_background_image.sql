/*
  # Arkline Trust — Add background image to home hero
*/
UPDATE website_content
SET content = content || jsonb_build_object(
  'background_image', 'https://images.pexels.com/photos/1864643/pexels-photo-1864643.jpeg?auto=compress&cs=tinysrgb&w=1920'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'hero';
