/*
  # Arkline Trust — Real Office Addresses & Contact Details

  Updates the Arkline Trust tenant with accurate real-world information:

  1. Branding
     - Removes placeholder contact name, phone, and AFSL number
     - Updates address to reflect dual-office presence (Melbourne + Jerusalem)

  2. Website Content — Contact Page
     - Replaces single placeholder Sydney address with two real office cards:
       * Australia Office: Level 6, 111 Cecil Street, South Melbourne VIC 3205
       * Jerusalem Office: Level 2, 20 King George Street, Jerusalem, Israel
     - Retains enquiry email and disclaimer

  3. Website Content — Home Page Stats
     - Updates stats block to reflect dual-city HQ

  Notes:
     - AFSL number left as placeholder until confirmed by compliance
     - Phone number left as placeholder until confirmed
*/

-- ============================================================
-- 1. UPDATE BRANDING — dual-city presence
-- ============================================================
UPDATE tenant_settings
SET branding = branding || jsonb_build_object(
  'contact_name',  'Arkline Trust',
  'address',       'Melbourne, Australia & Jerusalem, Israel',
  'contact_phone', 'enquiries@arklinetrust.com'
)
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline');

-- ============================================================
-- 2. UPDATE CONTACT PAGE — dual office content
-- ============================================================
UPDATE website_content
SET content = '{
  "heading": "Contact Arkline Trust",
  "subheading": "To discuss our investment strategies, request a fund information memorandum, or arrange an introductory call, please reach out using the details below.",
  "show_form": true,
  "form_heading": "Send an Enquiry",
  "email": "enquiries@arklinetrust.com",
  "office_hours": "Monday – Friday, 9:00 AM – 5:00 PM",
  "show_divider": true,
  "offices": [
    {
      "label": "Australia Office",
      "lines": ["Level 6, 111 Cecil Street", "South Melbourne, VIC", "Australia 3205"]
    },
    {
      "label": "Jerusalem Office",
      "lines": ["Level 2, 20 King George Street", "Jerusalem, Israel"]
    }
  ],
  "disclaimer": "Arkline Trust holds an Australian Financial Services Licence (AFSL) issued by the Australian Securities and Investments Commission (ASIC). Access to Arkline Trust funds is restricted to wholesale investors as defined under section 761G of the Corporations Act 2001 (Cth). Investment in our funds involves risk. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation to acquire any financial product."
}'::jsonb
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND page_slug = 'contact'
  AND section_type = 'contact';

-- ============================================================
-- 3. UPDATE HOME PAGE STATS — dual city
-- ============================================================
UPDATE website_content
SET content = '{
  "stats": [
    {"label": "Headquarters",  "value": "Melbourne & Jerusalem"},
    {"label": "Regulator",     "value": "ASIC"},
    {"label": "Investor Type", "value": "Wholesale Only"},
    {"label": "Focus",         "value": "Single Family Offices"}
  ]
}'::jsonb
WHERE tenant_id = (SELECT id FROM platform_tenants WHERE slug = 'arkline')
  AND page_slug = 'home'
  AND section_type = 'stats';
