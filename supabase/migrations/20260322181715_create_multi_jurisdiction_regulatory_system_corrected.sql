/*
  # Multi-Jurisdiction Regulatory Framework and Tax System

  ## Overview
  Creates a comprehensive system for managing multi-framework regulatory compliance
  (SEC, ASIC, FCA, EU/AIFMD, member states) and multi-jurisdiction tax optimization.

  ## Tables Created
  1. regulatory_frameworks - Master list of regulatory frameworks
  2. regulatory_framework_fund_mappings - Fund-framework relationships
  3. regulatory_rules_library - Framework-specific compliance rules
  4. eu_member_state_rules - EU member state specific rules
  5. compliance_monitoring - Real-time compliance tracking
  6. tax_jurisdictions - Master list of tax jurisdictions
  7. fund_tax_profiles - Fund tax configuration
  8. investor_tax_profiles - Investor tax information
  9. tax_lot_methods - Tax lot method configuration
  10. cross_border_tax_tracking - Cross-border tax tracking
  11. regulatory_reporting_calendar - Reporting calendar

  ## Security
  - RLS enabled with proper tenant isolation
  - Investors can view their own tax information
*/

-- ============================================================================
-- REGULATORY FRAMEWORK TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code text UNIQUE NOT NULL,
  framework_name text NOT NULL,
  jurisdiction text NOT NULL,
  regulatory_body text NOT NULL,
  description text,
  framework_type text NOT NULL CHECK (framework_type IN (
    'securities_regulation', 'fund_regulation', 'tax_regulation',
    'aml_regulation', 'investor_protection'
  )),
  is_active boolean DEFAULT true,
  effective_date date DEFAULT CURRENT_DATE,
  website_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regulatory_framework_fund_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  framework_id uuid REFERENCES regulatory_frameworks(id) ON DELETE RESTRICT NOT NULL,
  priority text NOT NULL DEFAULT 'primary' CHECK (priority IN ('primary', 'secondary', 'tertiary')),
  registration_status text NOT NULL DEFAULT 'planning' CHECK (registration_status IN (
    'planning', 'in_progress', 'registered', 'exempt', 'suspended', 'withdrawn'
  )),
  registration_number text,
  exemption_type text,
  exemption_details jsonb DEFAULT '{}',
  marketing_jurisdictions text[] DEFAULT '{}',
  registration_date date,
  renewal_date date,
  compliance_start_date date DEFAULT CURRENT_DATE,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fund_id, framework_id)
);

CREATE TABLE IF NOT EXISTS regulatory_rules_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid REFERENCES regulatory_frameworks(id) ON DELETE CASCADE NOT NULL,
  rule_code text NOT NULL,
  rule_name text NOT NULL,
  rule_category text NOT NULL CHECK (rule_category IN (
    'diversification', 'leverage', 'liquidity', 'investor_qualification',
    'concentration', 'investment_restrictions', 'reporting', 'disclosure',
    'valuation', 'custody', 'governance'
  )),
  rule_description text,
  calculation_formula text,
  parameters jsonb DEFAULT '{}',
  thresholds jsonb DEFAULT '{}',
  validation_logic text,
  legal_reference text,
  breach_severity text DEFAULT 'medium' CHECK (breach_severity IN ('low', 'medium', 'high', 'critical')),
  remediation_guidance text,
  is_active boolean DEFAULT true,
  effective_date date DEFAULT CURRENT_DATE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(framework_id, rule_code)
);

CREATE TABLE IF NOT EXISTS eu_member_state_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text UNIQUE NOT NULL,
  country_name text NOT NULL,
  regulatory_authority text NOT NULL,
  aifmd_home_state boolean DEFAULT false,
  ucits_eligible boolean DEFAULT false,
  national_private_placement boolean DEFAULT false,
  local_requirements jsonb DEFAULT '{}',
  marketing_requirements jsonb DEFAULT '{}',
  tax_treaty_countries text[] DEFAULT '{}',
  withholding_tax_rates jsonb DEFAULT '{}',
  local_reporting_requirements text,
  language_requirements text[] DEFAULT '{}',
  notification_procedures text,
  website_url text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  framework_id uuid REFERENCES regulatory_frameworks(id) ON DELETE RESTRICT NOT NULL,
  monitoring_date date DEFAULT CURRENT_DATE,
  overall_status text NOT NULL DEFAULT 'compliant' CHECK (overall_status IN (
    'compliant', 'warning', 'breach', 'under_review'
  )),
  diversification_status text DEFAULT 'compliant',
  diversification_metrics jsonb DEFAULT '{}',
  leverage_status text DEFAULT 'compliant',
  leverage_metrics jsonb DEFAULT '{}',
  concentration_status text DEFAULT 'compliant',
  concentration_metrics jsonb DEFAULT '{}',
  investor_qualification_status text DEFAULT 'compliant',
  restriction_violations jsonb DEFAULT '[]',
  breach_details jsonb DEFAULT '[]',
  remediation_actions jsonb DEFAULT '[]',
  last_checked_at timestamptz DEFAULT now(),
  next_check_date date,
  checked_by uuid REFERENCES auth.users(id),
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TAX JURISDICTION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code text UNIQUE NOT NULL,
  jurisdiction_name text NOT NULL,
  country_code text NOT NULL,
  tax_system_type text NOT NULL CHECK (tax_system_type IN (
    'territorial', 'worldwide', 'hybrid', 'remittance_basis'
  )),
  has_tax_treaty_network boolean DEFAULT false,
  treaty_countries text[] DEFAULT '{}',
  default_withholding_rates jsonb DEFAULT '{}',
  tax_year_end text DEFAULT '12-31',
  tax_authority_name text,
  tax_authority_website text,
  crs_participating boolean DEFAULT false,
  fatca_participating boolean DEFAULT false,
  allowed_tax_lot_methods text[] DEFAULT '{}',
  capital_gains_tax_rates jsonb DEFAULT '{}',
  dividend_tax_rates jsonb DEFAULT '{}',
  interest_tax_rates jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fund_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  primary_tax_jurisdiction_id uuid REFERENCES tax_jurisdictions(id) NOT NULL,
  additional_tax_jurisdictions uuid[] DEFAULT '{}',
  tax_residence_countries text[] DEFAULT '{}',
  tax_classification_by_jurisdiction jsonb DEFAULT '{}',
  tax_transparency_status text DEFAULT 'pass_through' CHECK (tax_transparency_status IN (
    'pass_through', 'corporate', 'hybrid', 'transparent'
  )),
  fatca_status text,
  fatca_giin text,
  crs_reporting_status text,
  permanent_establishments jsonb DEFAULT '[]',
  tax_optimization_enabled boolean DEFAULT true,
  default_tax_lot_method text DEFAULT 'FIFO',
  loss_harvesting_enabled boolean DEFAULT true,
  wash_sale_tracking_enabled boolean DEFAULT true,
  treaty_benefit_optimization boolean DEFAULT true,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fund_id)
);

CREATE TABLE IF NOT EXISTS investor_tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  investor_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE NOT NULL,
  primary_tax_residence_id uuid REFERENCES tax_jurisdictions(id) NOT NULL,
  additional_tax_residences uuid[] DEFAULT '{}',
  tax_residence_countries text[] DEFAULT '{}',
  tax_identification_numbers jsonb DEFAULT '{}',
  us_tax_status text CHECK (us_tax_status IN (
    'us_citizen', 'us_resident', 'non_resident_alien', 'foreign_entity', 'exempt'
  )),
  w8_ben_status text,
  w8_ben_expiry_date date,
  w9_on_file boolean DEFAULT false,
  fatca_classification text,
  crs_classification text,
  treaty_country text,
  treaty_benefits_claimed boolean DEFAULT false,
  treaty_article_references text[] DEFAULT '{}',
  withholding_certificate_status text DEFAULT 'pending' CHECK (withholding_certificate_status IN (
    'pending', 'valid', 'expired', 'invalid', 'not_required'
  )),
  preferred_tax_lot_method text,
  tax_optimization_preferences jsonb DEFAULT '{}',
  backup_withholding_applies boolean DEFAULT false,
  qualified_investor_certifications jsonb DEFAULT '{}',
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(investor_id)
);

CREATE TABLE IF NOT EXISTS tax_lot_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  jurisdiction_id uuid REFERENCES tax_jurisdictions(id) NOT NULL,
  allowed_methods text[] DEFAULT ARRAY['FIFO', 'LIFO', 'HIFO', 'SPECIFIC_ID', 'AVERAGE_COST'],
  default_method text NOT NULL DEFAULT 'FIFO',
  method_description text,
  wash_sale_period_days integer DEFAULT 30,
  loss_harvesting_enabled boolean DEFAULT true,
  gain_deferral_enabled boolean DEFAULT false,
  investor_can_override boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fund_id, jurisdiction_id)
);

CREATE TABLE IF NOT EXISTS cross_border_tax_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  investor_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE NOT NULL,
  tax_year integer NOT NULL,
  source_jurisdiction_id uuid REFERENCES tax_jurisdictions(id) NOT NULL,
  home_jurisdiction_id uuid REFERENCES tax_jurisdictions(id) NOT NULL,
  income_type text NOT NULL CHECK (income_type IN ('dividends', 'interest', 'capital_gains', 'other_income')),
  gross_income numeric(20,2) NOT NULL,
  source_country_withholding numeric(20,2) DEFAULT 0,
  treaty_withholding_rate numeric(5,2),
  actual_withholding_rate numeric(5,2),
  foreign_tax_credit_available numeric(20,2) DEFAULT 0,
  foreign_tax_credit_used numeric(20,2) DEFAULT 0,
  home_country_tax_liability numeric(20,2) DEFAULT 0,
  treaty_benefit_amount numeric(20,2) DEFAULT 0,
  permanent_establishment_allocation numeric(20,2) DEFAULT 0,
  optimization_strategy_applied text,
  tax_saved numeric(20,2) DEFAULT 0,
  calculation_details jsonb DEFAULT '{}',
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regulatory_reporting_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform_tenants(id) ON DELETE CASCADE NOT NULL,
  fund_id uuid REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  framework_id uuid REFERENCES regulatory_frameworks(id) ON DELETE RESTRICT NOT NULL,
  report_type text NOT NULL,
  report_name text NOT NULL,
  reporting_frequency text NOT NULL CHECK (reporting_frequency IN (
    'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'ad_hoc'
  )),
  due_date date NOT NULL,
  submission_deadline_time time,
  report_period_start date,
  report_period_end date,
  filing_status text DEFAULT 'pending' CHECK (filing_status IN (
    'pending', 'in_progress', 'submitted', 'accepted', 'rejected', 'amended'
  )),
  submission_date timestamptz,
  submission_reference text,
  submitted_by uuid REFERENCES auth.users(id),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  automated boolean DEFAULT false,
  template_used text,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_jurisdiction ON regulatory_frameworks(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_type ON regulatory_frameworks(framework_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_active ON regulatory_frameworks(is_active);

CREATE INDEX IF NOT EXISTS idx_framework_mappings_tenant ON regulatory_framework_fund_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_framework_mappings_fund ON regulatory_framework_fund_mappings(fund_id);
CREATE INDEX IF NOT EXISTS idx_framework_mappings_framework ON regulatory_framework_fund_mappings(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_mappings_priority ON regulatory_framework_fund_mappings(priority);

CREATE INDEX IF NOT EXISTS idx_rules_library_framework ON regulatory_rules_library(framework_id);
CREATE INDEX IF NOT EXISTS idx_rules_library_category ON regulatory_rules_library(rule_category);
CREATE INDEX IF NOT EXISTS idx_rules_library_active ON regulatory_rules_library(is_active);

CREATE INDEX IF NOT EXISTS idx_eu_rules_country ON eu_member_state_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_eu_rules_home_state ON eu_member_state_rules(aifmd_home_state);

CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_tenant ON compliance_monitoring(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_fund ON compliance_monitoring(fund_id);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_framework ON compliance_monitoring(framework_id);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_status ON compliance_monitoring(overall_status);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_date ON compliance_monitoring(monitoring_date);

CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_country ON tax_jurisdictions(country_code);
CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_system ON tax_jurisdictions(tax_system_type);

CREATE INDEX IF NOT EXISTS idx_fund_tax_profiles_tenant ON fund_tax_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fund_tax_profiles_fund ON fund_tax_profiles(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_tax_profiles_jurisdiction ON fund_tax_profiles(primary_tax_jurisdiction_id);

CREATE INDEX IF NOT EXISTS idx_investor_tax_profiles_tenant ON investor_tax_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investor_tax_profiles_investor ON investor_tax_profiles(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_tax_profiles_jurisdiction ON investor_tax_profiles(primary_tax_residence_id);

CREATE INDEX IF NOT EXISTS idx_tax_lot_methods_tenant ON tax_lot_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tax_lot_methods_fund ON tax_lot_methods(fund_id);
CREATE INDEX IF NOT EXISTS idx_tax_lot_methods_jurisdiction ON tax_lot_methods(jurisdiction_id);

CREATE INDEX IF NOT EXISTS idx_cross_border_tax_tenant ON cross_border_tax_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cross_border_tax_fund ON cross_border_tax_tracking(fund_id);
CREATE INDEX IF NOT EXISTS idx_cross_border_tax_investor ON cross_border_tax_tracking(investor_id);
CREATE INDEX IF NOT EXISTS idx_cross_border_tax_year ON cross_border_tax_tracking(tax_year);

CREATE INDEX IF NOT EXISTS idx_reporting_calendar_tenant ON regulatory_reporting_calendar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reporting_calendar_fund ON regulatory_reporting_calendar(fund_id);
CREATE INDEX IF NOT EXISTS idx_reporting_calendar_framework ON regulatory_reporting_calendar(framework_id);
CREATE INDEX IF NOT EXISTS idx_reporting_calendar_due_date ON regulatory_reporting_calendar(due_date);
CREATE INDEX IF NOT EXISTS idx_reporting_calendar_status ON regulatory_reporting_calendar(filing_status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_framework_fund_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_rules_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE eu_member_state_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_lot_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_tax_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_reporting_calendar ENABLE ROW LEVEL SECURITY;

-- Regulatory Frameworks (Public Read)
CREATE POLICY "Authenticated users can view regulatory frameworks"
  ON regulatory_frameworks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can insert regulatory frameworks"
  ON regulatory_frameworks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can update regulatory frameworks"
  ON regulatory_frameworks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can delete regulatory frameworks"
  ON regulatory_frameworks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

-- Framework Fund Mappings (Tenant Isolated)
CREATE POLICY "Users can view own tenant framework mappings"
  ON regulatory_framework_fund_mappings FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can insert framework mappings"
  ON regulatory_framework_fund_mappings FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update framework mappings"
  ON regulatory_framework_fund_mappings FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete framework mappings"
  ON regulatory_framework_fund_mappings FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Regulatory Rules Library (Public Read)
CREATE POLICY "Authenticated users can view regulatory rules"
  ON regulatory_rules_library FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can insert regulatory rules"
  ON regulatory_rules_library FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can update regulatory rules"
  ON regulatory_rules_library FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can delete regulatory rules"
  ON regulatory_rules_library FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

-- EU Member State Rules (Public Read)
CREATE POLICY "Authenticated users can view EU member state rules"
  ON eu_member_state_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can insert EU rules"
  ON eu_member_state_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can update EU rules"
  ON eu_member_state_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can delete EU rules"
  ON eu_member_state_rules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

-- Compliance Monitoring (Tenant Isolated)
CREATE POLICY "Users can view own tenant compliance monitoring"
  ON compliance_monitoring FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can insert compliance monitoring"
  ON compliance_monitoring FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update compliance monitoring"
  ON compliance_monitoring FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete compliance monitoring"
  ON compliance_monitoring FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Tax Jurisdictions (Public Read)
CREATE POLICY "Authenticated users can view tax jurisdictions"
  ON tax_jurisdictions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins can insert tax jurisdictions"
  ON tax_jurisdictions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can update tax jurisdictions"
  ON tax_jurisdictions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

CREATE POLICY "Platform admins can delete tax jurisdictions"
  ON tax_jurisdictions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_category = 'superadmin'));

-- Fund Tax Profiles (Tenant Isolated)
CREATE POLICY "Users can view own tenant fund tax profiles"
  ON fund_tax_profiles FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can insert fund tax profiles"
  ON fund_tax_profiles FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update fund tax profiles"
  ON fund_tax_profiles FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete fund tax profiles"
  ON fund_tax_profiles FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Investor Tax Profiles (Tenant Isolated + Investor Self-View)
CREATE POLICY "Users can view own tenant or own investor tax profiles"
  ON investor_tax_profiles FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid())
    OR investor_id = auth.uid()
  );

CREATE POLICY "Tenant users can insert investor tax profiles"
  ON investor_tax_profiles FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update investor tax profiles"
  ON investor_tax_profiles FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete investor tax profiles"
  ON investor_tax_profiles FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Tax Lot Methods (Tenant Isolated)
CREATE POLICY "Users can view own tenant tax lot methods"
  ON tax_lot_methods FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can insert tax lot methods"
  ON tax_lot_methods FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update tax lot methods"
  ON tax_lot_methods FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete tax lot methods"
  ON tax_lot_methods FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Cross-Border Tax Tracking (Tenant Isolated + Investor Self-View)
CREATE POLICY "Users can view own tenant or own investor cross-border tax"
  ON cross_border_tax_tracking FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid())
    OR investor_id = auth.uid()
  );

CREATE POLICY "Tenant users can insert cross-border tax tracking"
  ON cross_border_tax_tracking FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update cross-border tax tracking"
  ON cross_border_tax_tracking FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete cross-border tax tracking"
  ON cross_border_tax_tracking FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Regulatory Reporting Calendar (Tenant Isolated)
CREATE POLICY "Users can view own tenant reporting calendar"
  ON regulatory_reporting_calendar FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can insert reporting calendar"
  ON regulatory_reporting_calendar FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can update reporting calendar"
  ON regulatory_reporting_calendar FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Tenant users can delete reporting calendar"
  ON regulatory_reporting_calendar FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT ur.tenant_id FROM user_roles ur WHERE ur.user_id = auth.uid()));