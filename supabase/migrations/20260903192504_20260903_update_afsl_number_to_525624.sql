-- ============================================================
-- Update AFSL number from placeholder 548921 / 000000 to 525624
-- and add hyperlink to official AFSL registry for all visible
-- references on the Arkline Trust website.
-- ============================================================

-- 1. Update tenant metadata afsl_number
UPDATE tenant_settings
SET branding = branding || jsonb_build_object(
  'afsl_number', 'AFSL 525624'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';

-- 2. Update legal_disclaimer in branding to include AFSL number with hyperlink
UPDATE tenant_settings
SET branding = branding || jsonb_build_object(
  'legal_disclaimer',
  'Arkline Trust holds <a href="https://search-afsl.com/Alara%20Funds%20Management%20Pty%20ltd/afs-licensee/525624/" target="_blank" rel="noopener noreferrer">Australian Financial Services Licence (AFSL 525624)</a> issued by the Australian Securities and Investments Commission (ASIC). Access to Arkline Trust funds is restricted to wholesale investors as defined under section 761G of the Corporations Act 2001 (Cth). Investment in our funds involves risk, including potential loss of capital. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation to acquire any financial product and is intended only for wholesale investors located in Australia.'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af';

-- 3. Update home hero badge
UPDATE website_content
SET content = content || jsonb_build_object(
  'badge', 'ASIC Regulated · AFSL 525624 · Wholesale Investors Only'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'home'
  AND section_type = 'hero';

-- 4. Update about page governance section — AFSL Licence item description
UPDATE website_content
SET content = jsonb_set(
  content,
  '{items,0,description}',
  '"Australian Financial Services Licence <a href=\"https://search-afsl.com/Alara%20Funds%20Management%20Pty%20ltd/afs-licensee/525624/\" target=\"_blank\" rel=\"noopener noreferrer\">525624</a>, authorising the management of wholesale client funds and provision of financial product advice."'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'about'
  AND section_type = 'custom'
  AND content->>'type' = 'governance';

-- 5. Update contact page compliance section — Financial Services Licence item description
UPDATE website_content
SET content = jsonb_set(
  content,
  '{items,1,description}',
  '"Arkline Trust Pty Ltd holds <a href=\"https://search-afsl.com/Alara%20Funds%20Management%20Pty%20ltd/afs-licensee/525624/\" target=\"_blank\" rel=\"noopener noreferrer\">Australian Financial Services Licence 525624</a> issued by the Australian Securities and Investments Commission (ASIC). This licence authorises Arkline Trust to manage wholesale client funds and provide financial product advice."'
)
WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
  AND page_slug = 'contact'
  AND section_type = 'custom'
  AND content->>'type' = 'compliance';
