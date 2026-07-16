/*
  # Remove Aryeh reference from About page "Who We Are"

  Removes the sentence about the Senior Portfolio Manager / Quantitative Analyst
  from the about page narrative, leaving only the general institutional language.
*/

UPDATE website_content
SET content = content || jsonb_build_object(
  'heading', 'Who We Are',
  'body',
  'Arkline Trust was founded by operators with decades of real-world business experience spanning board-level governance, enterprise management, and private capital stewardship. Before turning their focus to investment management, the founding team built and ran substantial enterprises — experience that directly informs how the firm evaluates risk, management quality, and the underlying economics of businesses.' || chr(10) || chr(10) ||
  'The principals bring institutional-scale experience including board membership at a multi-billion dollar enterprise and the establishment of a significant private investment office, which continues to operate alongside Arkline Trust. They invest their own capital under the identical framework applied to client mandates — genuine alignment, not a contractual gesture.' || chr(10) || chr(10) ||
  'Arkline Trust exists because its founders could not find a manager that met their own standard. We built the firm we wished existed — and we now offer it to a select number of qualified investors, family offices, and investment firms.',
  'image', 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'image_side', 'left',
  'background', 'alt'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'about';
