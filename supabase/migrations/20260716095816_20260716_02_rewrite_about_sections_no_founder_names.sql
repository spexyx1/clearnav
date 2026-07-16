/*
  # Arkline Trust — Rewrite About sections: remove founder names, general institutional language

  1. Home "Who We Are" — rewrite without Noah/Nisan names
  2. About page "Who We Are" — rewrite full narrative without founder names
  3. About page hero subheadline — third person
*/

-- ============================================================
-- 1. HOME / about — "Who We Are" (no founder names)
-- ============================================================
UPDATE website_content
SET content = content || jsonb_build_object(
  'heading', 'Who We Are',
  'body',
  'Arkline Trust was established by experienced operators who have built and run substantial businesses across multiple industries before directing their focus to investment management. The founding team brings institutional-scale operating experience and a combined track record encompassing board-level governance of multi-billion dollar enterprises and the establishment of significant private investment offices.' || chr(10) || chr(10) ||
  'The team invests its own capital under the same framework applied to client mandates. This is not a firm built by career financiers — it is built by operators who understand what it means to have capital genuinely at risk.',
  'image', 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'image_side', 'right',
  'cta_href', '/about',
  'cta_text', 'Our Story'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'about';

-- ============================================================
-- 2. ABOUT / about — full "Who We Are" narrative (no founder names)
-- ============================================================
UPDATE website_content
SET content = content || jsonb_build_object(
  'heading', 'Who We Are',
  'body',
  'Arkline Trust was founded by operators with decades of real-world business experience spanning board-level governance, enterprise management, and private capital stewardship. Before turning their focus to investment management, the founding team built and ran substantial enterprises — experience that directly informs how the firm evaluates risk, management quality, and the underlying economics of businesses.' || chr(10) || chr(10) ||
  'The principals bring institutional-scale experience including board membership at a multi-billion dollar enterprise and the establishment of a significant private investment office, which continues to operate alongside Arkline Trust. They invest their own capital under the identical framework applied to client mandates — genuine alignment, not a contractual gesture.' || chr(10) || chr(10) ||
  'The investment team is rounded out by a Senior Portfolio Manager and Quantitative Analyst who applies statistical rigour and systematic strategy development to complement the principals'' fundamental judgement.' || chr(10) || chr(10) ||
  'Arkline Trust exists because its founders could not find a manager that met their own standard. We built the firm we wished existed — and we now offer it to a select number of qualified investors, family offices, and investment firms.',
  'image', 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'image_side', 'left',
  'background', 'alt'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'about';

-- ============================================================
-- 3. ABOUT / hero — third person subheadline
-- ============================================================
UPDATE website_content
SET content = content || jsonb_build_object(
  'subheadline',
  'Arkline Trust was founded on a single conviction: that the best investment outcomes result from patient, disciplined stewardship — not short-term optimisation.'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'hero';
