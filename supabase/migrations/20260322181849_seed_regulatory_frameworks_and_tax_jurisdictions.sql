/*
  # Seed Regulatory Frameworks and Tax Jurisdictions

  ## Overview
  Populates the database with comprehensive regulatory frameworks and tax jurisdictions
  covering SEC (US), ASIC (Australia), FCA (UK), AIFMD (EU), and major global jurisdictions.

  ## Data Seeded

  ### Regulatory Frameworks
  - SEC (US) - Multiple frameworks (40 Act, 3c1, 3c7, Reg D, RIC, BDC)
  - ASIC (Australia) - Fund registration frameworks
  - FCA (UK) - UK AIF, UCITS, QIAIF frameworks
  - AIFMD (EU) - EU-wide fund frameworks
  - MAS (Singapore), HKMA (Hong Kong), Other jurisdictions

  ### Tax Jurisdictions
  - Major developed markets (US, UK, Germany, France, Australia, etc.)
  - Tax treaty networks
  - Withholding rates
  - Tax lot methods

  ### EU Member State Rules
  - Germany (BaFin)
  - France (AMF)
  - Ireland (Central Bank)
  - Luxembourg (CSSF)
  - Netherlands (AFM)
  - Italy (CONSOB)
*/

-- ============================================================================
-- REGULATORY FRAMEWORKS
-- ============================================================================

-- United States - SEC Frameworks
INSERT INTO regulatory_frameworks (framework_code, framework_name, jurisdiction, regulatory_body, description, framework_type, website_url) VALUES
('SEC_40ACT', 'Investment Company Act of 1940', 'United States', 'Securities and Exchange Commission', 'Registered investment companies under the 1940 Act', 'fund_regulation', 'https://www.sec.gov'),
('SEC_3C1', 'Section 3(c)(1) Exemption', 'United States', 'Securities and Exchange Commission', 'Private fund exemption limited to 100 beneficial owners', 'fund_regulation', 'https://www.sec.gov'),
('SEC_3C7', 'Section 3(c)(7) Exemption', 'United States', 'Securities and Exchange Commission', 'Private fund exemption for qualified purchasers', 'fund_regulation', 'https://www.sec.gov'),
('SEC_REGD', 'Regulation D', 'United States', 'Securities and Exchange Commission', 'Private placement exemptions (Rule 504, 505, 506)', 'securities_regulation', 'https://www.sec.gov'),
('SEC_RIC', 'Regulated Investment Company', 'United States', 'Internal Revenue Service', 'RIC tax status under IRC Subchapter M', 'tax_regulation', 'https://www.irs.gov'),
('SEC_BDC', 'Business Development Company', 'United States', 'Securities and Exchange Commission', 'BDC under Section 54 of the 1940 Act', 'fund_regulation', 'https://www.sec.gov')
ON CONFLICT (framework_code) DO NOTHING;

-- Australia - ASIC Frameworks
INSERT INTO regulatory_frameworks (framework_code, framework_name, jurisdiction, regulatory_body, description, framework_type, website_url) VALUES
('ASIC_WHOLESALE', 'Wholesale Investor Regime', 'Australia', 'Australian Securities and Investments Commission', 'Funds for wholesale/sophisticated investors', 'fund_regulation', 'https://www.asic.gov.au'),
('ASIC_RETAIL', 'Retail Fund Registration', 'Australia', 'Australian Securities and Investments Commission', 'Registered managed investment schemes for retail', 'fund_regulation', 'https://www.asic.gov.au'),
('ASIC_AMIT', 'Attribution Managed Investment Trust', 'Australia', 'Australian Taxation Office', 'AMIT tax regime for managed funds', 'tax_regulation', 'https://www.ato.gov.au')
ON CONFLICT (framework_code) DO NOTHING;

-- United Kingdom - FCA Frameworks
INSERT INTO regulatory_frameworks (framework_code, framework_name, jurisdiction, regulatory_body, description, framework_type, website_url) VALUES
('FCA_UKAIF', 'UK Alternative Investment Fund', 'United Kingdom', 'Financial Conduct Authority', 'UK AIF under FCA regulations', 'fund_regulation', 'https://www.fca.org.uk'),
('FCA_UCITS', 'UK UCITS', 'United Kingdom', 'Financial Conduct Authority', 'UCITS funds authorized in the UK', 'fund_regulation', 'https://www.fca.org.uk'),
('FCA_QIAIF', 'Qualifying Investor Alternative Investment Fund', 'United Kingdom', 'Financial Conduct Authority', 'QIAIF regime for sophisticated investors', 'fund_regulation', 'https://www.fca.org.uk')
ON CONFLICT (framework_code) DO NOTHING;

-- European Union - AIFMD Frameworks
INSERT INTO regulatory_frameworks (framework_code, framework_name, jurisdiction, regulatory_body, description, framework_type, website_url) VALUES
('AIFMD_AIF', 'Alternative Investment Fund Managers Directive', 'European Union', 'European Securities and Markets Authority', 'EU-wide AIF framework under AIFMD', 'fund_regulation', 'https://www.esma.europa.eu'),
('AIFMD_UCITS', 'Undertakings for Collective Investment in Transferable Securities', 'European Union', 'European Securities and Markets Authority', 'EU UCITS Directive for retail funds', 'fund_regulation', 'https://www.esma.europa.eu'),
('AIFMD_EUVECA', 'European Venture Capital Funds', 'European Union', 'European Securities and Markets Authority', 'EU venture capital fund regulation', 'fund_regulation', 'https://www.esma.europa.eu'),
('AIFMD_EUSEF', 'European Social Entrepreneurship Funds', 'European Union', 'European Securities and Markets Authority', 'EU social entrepreneurship fund regulation', 'fund_regulation', 'https://www.esma.europa.eu')
ON CONFLICT (framework_code) DO NOTHING;

-- Other Major Jurisdictions
INSERT INTO regulatory_frameworks (framework_code, framework_name, jurisdiction, regulatory_body, description, framework_type, website_url) VALUES
('MAS_SINGAPORE', 'Singapore Fund Regulations', 'Singapore', 'Monetary Authority of Singapore', 'Singapore fund licensing and regulation', 'fund_regulation', 'https://www.mas.gov.sg'),
('HKMA_HONGKONG', 'Hong Kong SFC Regulations', 'Hong Kong', 'Securities and Futures Commission', 'Hong Kong fund authorization', 'fund_regulation', 'https://www.sfc.hk'),
('JFSA_JAPAN', 'Japan Financial Instruments Act', 'Japan', 'Financial Services Agency', 'Japanese fund regulations', 'fund_regulation', 'https://www.fsa.go.jp')
ON CONFLICT (framework_code) DO NOTHING;

-- ============================================================================
-- EU MEMBER STATE RULES
-- ============================================================================

INSERT INTO eu_member_state_rules (
  country_code, country_name, regulatory_authority,
  aifmd_home_state, ucits_eligible, national_private_placement,
  local_requirements, marketing_requirements, tax_treaty_countries,
  withholding_tax_rates, language_requirements
) VALUES
('DE', 'Germany', 'Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)', true, true, true,
  '{"requires_local_agent": true, "minimum_capital": "125000 EUR", "local_custodian_required": true}'::jsonb,
  '{"prior_notification": true, "notification_period_days": 20, "local_representative": false}'::jsonb,
  ARRAY['US', 'UK', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 26.375, "interest": 26.375, "capital_gains": 0}'::jsonb,
  ARRAY['German', 'English']),

('FR', 'France', 'Autorité des marchés financiers (AMF)', true, true, true,
  '{"requires_local_agent": false, "minimum_capital": "125000 EUR", "local_custodian_required": false}'::jsonb,
  '{"prior_notification": true, "notification_period_days": 20, "local_representative": false}'::jsonb,
  ARRAY['US', 'UK', 'DE', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 30, "interest": 0, "capital_gains": 0}'::jsonb,
  ARRAY['French', 'English']),

('IE', 'Ireland', 'Central Bank of Ireland', true, true, true,
  '{"requires_local_agent": true, "minimum_capital": "125000 EUR", "local_custodian_required": true}'::jsonb,
  '{"prior_notification": true, "notification_period_days": 20, "local_representative": false}'::jsonb,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 25, "interest": 20, "capital_gains": 0}'::jsonb,
  ARRAY['English']),

('LU', 'Luxembourg', 'Commission de Surveillance du Secteur Financier (CSSF)', true, true, true,
  '{"requires_local_agent": true, "minimum_capital": "125000 EUR", "local_custodian_required": true}'::jsonb,
  '{"prior_notification": true, "notification_period_days": 20, "local_representative": false}'::jsonb,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 15, "interest": 0, "capital_gains": 0}'::jsonb,
  ARRAY['French', 'German', 'English']),

('NL', 'Netherlands', 'Autoriteit Financiële Markten (AFM)', true, true, true,
  '{"requires_local_agent": false, "minimum_capital": "125000 EUR", "local_custodian_required": false}'::jsonb,
  '{"prior_notification": true, "notification_period_days": 20, "local_representative": false}'::jsonb,
  ARRAY['US', 'UK', 'DE', 'FR', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 15, "interest": 0, "capital_gains": 0}'::jsonb,
  ARRAY['Dutch', 'English']),

('IT', 'Italy', 'Commissione Nazionale per le Società e la Borsa (CONSOB)', true, true, true,
  '{"requires_local_agent": true, "minimum_capital": "125000 EUR", "local_custodian_required": false}'::jsonb,
  '{"prior_notification": true, "notification_period_days": 20, "local_representative": true}'::jsonb,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU'],
  '{"dividends": 26, "interest": 26, "capital_gains": 26}'::jsonb,
  ARRAY['Italian', 'English'])
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- TAX JURISDICTIONS
-- ============================================================================

INSERT INTO tax_jurisdictions (
  jurisdiction_code, jurisdiction_name, country_code, tax_system_type,
  has_tax_treaty_network, treaty_countries, default_withholding_rates,
  tax_year_end, tax_authority_name, tax_authority_website,
  crs_participating, fatca_participating, allowed_tax_lot_methods,
  capital_gains_tax_rates, dividend_tax_rates, interest_tax_rates
) VALUES
('US', 'United States', 'US', 'worldwide', true,
  ARRAY['UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA', 'SG', 'HK'],
  '{"dividends": 30, "interest": 30, "royalties": 30, "other": 30}'::jsonb,
  '12-31', 'Internal Revenue Service', 'https://www.irs.gov',
  false, true, ARRAY['FIFO', 'LIFO', 'HIFO', 'SPECIFIC_ID', 'AVERAGE_COST'],
  '{"short_term": 37, "long_term": 20, "qualified": 20}'::jsonb,
  '{"qualified": 20, "ordinary": 37}'::jsonb,
  '{"ordinary": 37}'::jsonb),

('UK', 'United Kingdom', 'GB', 'worldwide', true,
  ARRAY['US', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA', 'SG', 'HK'],
  '{"dividends": 0, "interest": 20, "royalties": 20, "other": 20}'::jsonb,
  '04-05', 'HM Revenue & Customs', 'https://www.gov.uk/hmrc',
  true, true, ARRAY['SHARE_POOLING', 'SECTION_104', 'SAME_DAY', 'BED_AND_BREAKFAST'],
  '{"basic_rate": 10, "higher_rate": 20, "additional_rate": 28}'::jsonb,
  '{"basic_rate": 8.75, "higher_rate": 33.75, "additional_rate": 39.35}'::jsonb,
  '{"savings_allowance": 0, "starting_rate": 20}'::jsonb),

('DE', 'Germany', 'DE', 'worldwide', true,
  ARRAY['US', 'UK', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 26.375, "interest": 26.375, "royalties": 15, "other": 26.375}'::jsonb,
  '12-31', 'Bundeszentralamt für Steuern', 'https://www.bzst.de',
  true, true, ARRAY['FIFO', 'AVERAGE_COST'],
  '{"capital_gains": 26.375}'::jsonb,
  '{"investment_income": 26.375}'::jsonb,
  '{"investment_income": 26.375}'::jsonb),

('FR', 'France', 'FR', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 30, "interest": 0, "royalties": 33.33, "other": 33.33}'::jsonb,
  '12-31', 'Direction générale des Finances publiques', 'https://www.impots.gouv.fr',
  true, true, ARRAY['FIFO', 'AVERAGE_COST', 'SPECIFIC_ID'],
  '{"flat_tax": 30, "progressive": 45}'::jsonb,
  '{"flat_tax": 30, "progressive": 45}'::jsonb,
  '{"flat_tax": 30, "progressive": 45}'::jsonb),

('AU', 'Australia', 'AU', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'CA', 'SG', 'HK'],
  '{"dividends": 30, "interest": 10, "royalties": 30, "other": 47}'::jsonb,
  '06-30', 'Australian Taxation Office', 'https://www.ato.gov.au',
  true, true, ARRAY['CGT_INDEXATION', 'CGT_DISCOUNT', 'FIFO', 'AVERAGE_COST'],
  '{"discount_rate": 50, "full_rate": 47}'::jsonb,
  '{"franked": 0, "unfranked": 47}'::jsonb,
  '{"resident": 47}'::jsonb),

('IE', 'Ireland', 'IE', 'territorial', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 25, "interest": 20, "royalties": 20, "other": 20}'::jsonb,
  '12-31', 'Revenue Commissioners', 'https://www.revenue.ie',
  true, true, ARRAY['FIFO', 'AVERAGE_COST', 'SPECIFIC_ID'],
  '{"capital_gains": 33}'::jsonb,
  '{"dividend": 25}'::jsonb,
  '{"interest": 33}'::jsonb),

('LU', 'Luxembourg', 'LU', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 15, "interest": 0, "royalties": 0, "other": 0}'::jsonb,
  '12-31', 'Administration des contributions directes', 'https://impotsdirects.public.lu',
  true, true, ARRAY['FIFO', 'AVERAGE_COST'],
  '{"half_rate_relief": true, "standard_rate": 42}'::jsonb,
  '{"standard": 15}'::jsonb,
  '{"standard": 20}'::jsonb),

('NL', 'Netherlands', 'NL', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA'],
  '{"dividends": 15, "interest": 0, "royalties": 0, "other": 20}'::jsonb,
  '12-31', 'Belastingdienst', 'https://www.belastingdienst.nl',
  true, true, ARRAY['FIFO', 'AVERAGE_COST'],
  '{"box_3_deemed": 5.5}'::jsonb,
  '{"dividend_tax": 15}'::jsonb,
  '{"box_3_deemed": 5.5}'::jsonb),

('SG', 'Singapore', 'SG', 'territorial', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA', 'HK'],
  '{"dividends": 0, "interest": 15, "royalties": 10, "other": 17}'::jsonb,
  '12-31', 'Inland Revenue Authority of Singapore', 'https://www.iras.gov.sg',
  true, true, ARRAY['FIFO', 'AVERAGE_COST', 'SPECIFIC_ID'],
  '{"capital_gains": 0}'::jsonb,
  '{"exempt_one_tier": 0, "foreign_sourced": 0}'::jsonb,
  '{"corporate": 17, "individual": 22}'::jsonb),

('HK', 'Hong Kong', 'HK', 'territorial', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'CA', 'SG'],
  '{"dividends": 0, "interest": 0, "royalties": 4.95, "other": 0}'::jsonb,
  '03-31', 'Inland Revenue Department', 'https://www.ird.gov.hk',
  true, true, ARRAY['FIFO', 'AVERAGE_COST', 'SPECIFIC_ID'],
  '{"capital_gains": 0}'::jsonb,
  '{"dividends": 0}'::jsonb,
  '{"interest": 0}'::jsonb),

('CH', 'Switzerland', 'CH', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'JP', 'AU', 'CA', 'SG', 'HK'],
  '{"dividends": 35, "interest": 35, "royalties": 0, "other": 0}'::jsonb,
  '12-31', 'Swiss Federal Tax Administration', 'https://www.estv.admin.ch',
  true, true, ARRAY['FIFO', 'AVERAGE_COST', 'SPECIFIC_ID'],
  '{"participation_exemption": true, "standard": 25}'::jsonb,
  '{"withholding": 35, "reclaim_available": true}'::jsonb,
  '{"withholding": 35, "reclaim_available": true}'::jsonb),

('CA', 'Canada', 'CA', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'JP', 'AU', 'SG', 'HK'],
  '{"dividends": 25, "interest": 25, "royalties": 25, "other": 25}'::jsonb,
  '12-31', 'Canada Revenue Agency', 'https://www.canada.ca/en/revenue-agency.html',
  true, true, ARRAY['FIFO', 'AVERAGE_COST', 'SPECIFIC_ID', 'ACB'],
  '{"inclusion_rate": 50, "federal_rate": 33}'::jsonb,
  '{"eligible": 39, "non_eligible": 28, "foreign": 33}'::jsonb,
  '{"standard": 33}'::jsonb),

('JP', 'Japan', 'JP', 'worldwide', true,
  ARRAY['US', 'UK', 'DE', 'FR', 'NL', 'LU', 'IE', 'CH', 'AU', 'CA', 'SG', 'HK'],
  '{"dividends": 20.42, "interest": 20.42, "royalties": 20.42, "other": 20.42}'::jsonb,
  '03-31', 'National Tax Agency', 'https://www.nta.go.jp',
  true, true, ARRAY['FIFO', 'MOVING_AVERAGE'],
  '{"separate_taxation": 20.315, "aggregate_taxation": 55}'::jsonb,
  '{"separate_taxation": 20.315, "aggregate_taxation": 55}'::jsonb,
  '{"separate_taxation": 20.315, "aggregate_taxation": 55}'::jsonb)
ON CONFLICT (jurisdiction_code) DO NOTHING;

-- ============================================================================
-- SAMPLE REGULATORY RULES FOR KEY FRAMEWORKS
-- ============================================================================

-- Insert sample rules for SEC RIC diversification (50/25/5 rule)
INSERT INTO regulatory_rules_library (
  framework_id, rule_code, rule_name, rule_category, rule_description,
  calculation_formula, parameters, thresholds, legal_reference, breach_severity
) SELECT
  id, 'RIC_50_25_5', 'RIC Diversification Rule (50/25/5)',
  'diversification',
  'At least 50% of assets must be diversified: no more than 5% in any one issuer and no more than 25% combined in issuers where holdings exceed 5%',
  'Check that (sum of holdings > 5% of portfolio) <= 25% AND (individual holding) <= 5% for at least 50% of assets',
  '{"min_diversified_percentage": 50, "max_single_issuer_pct": 5, "max_concentrated_pct": 25}'::jsonb,
  '{"diversification_threshold": 50, "single_issuer_limit": 5, "concentration_limit": 25}'::jsonb,
  'IRC Section 851(b)(3)',
  'critical'
FROM regulatory_frameworks WHERE framework_code = 'SEC_RIC'
ON CONFLICT (framework_id, rule_code) DO NOTHING;

-- Insert UCITS 5/10/40 rule
INSERT INTO regulatory_rules_library (
  framework_id, rule_code, rule_name, rule_category, rule_description,
  calculation_formula, parameters, thresholds, legal_reference, breach_severity
) SELECT
  id, 'UCITS_5_10_40', 'UCITS Diversification Rule (5/10/40)',
  'diversification',
  'Maximum 10% in any single issuer, max 5% for >40% of assets, and top 5 holdings cannot exceed 40% of assets',
  'Single issuer <= 10%, and if single issuer > 5% then sum of all such holdings <= 40%',
  '{"max_single_issuer": 10, "concentration_threshold": 5, "max_concentrated_total": 40}'::jsonb,
  '{"single_issuer_limit": 10, "threshold": 5, "aggregate_limit": 40}'::jsonb,
  'UCITS Directive 2009/65/EC Article 52',
  'high'
FROM regulatory_frameworks WHERE framework_code = 'AIFMD_UCITS'
ON CONFLICT (framework_id, rule_code) DO NOTHING;