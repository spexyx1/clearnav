/*
  # Apply sailing yacht hero background image across all public pages

  Sets the background_image field on every hero section to the provided
  yacht-at-sunset photograph. The HeroSection component already reads this
  field and applies it behind an overlay, so no code change is required
  beyond the data update.
*/

UPDATE website_content
SET content = content || jsonb_build_object(
  'background_image',
  'https://img.magnific.com/free-photo/sailing-yacht-glides-into-sunset-s-silhouette-generated-by-ai_188544-30851.jpg?semt=ais_hybrid&w=740&q=80'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND section_type = 'hero';
