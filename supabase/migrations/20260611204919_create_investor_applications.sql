-- ─── Investor Applications ─────────────────────────────────────────────────────
-- Stores online investor application form submissions for the Arkline Investment Trust.

CREATE TABLE IF NOT EXISTS investor_applications (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,

  -- Status tracking
  status                      text NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_at                timestamptz,
  reviewed_at                 timestamptz,
  reviewer_id                 uuid REFERENCES auth.users(id),
  reviewer_notes              text,

  -- Section 1: Contact Details
  contact_title               text,
  contact_given_names         text,
  contact_surname             text,
  contact_phone               text,
  contact_email               text,
  postal_address              text,
  postal_suburb               text,
  postal_state                text,
  postal_postcode             text,
  postal_country              text,

  -- Section 2: Investment Details
  invest_class_a              boolean DEFAULT false,
  invest_class_b              boolean DEFAULT false,
  invest_class_c              boolean DEFAULT false,
  amount_class_a              numeric(20,2),
  amount_class_b              numeric(20,2),
  amount_class_c              numeric(20,2),
  total_committed_capital     numeric(20,2),

  -- Section 3: Investor Type
  investor_type               text CHECK (investor_type IN (
    'individual', 'joint', 'aus_proprietary_company', 'aus_public_company',
    'regulated_trust_individual_trustee', 'regulated_trust_corporate_trustee',
    'unregulated_trust_individual_trustee', 'unregulated_trust_corporate_trustee', 'other'
  )),

  -- Section A: Individual Investor / Individual Trustee
  a_title                     text,
  a_given_names               text,
  a_surname                   text,
  a_dob                       text,
  a_email                     text,
  a_residential_address       text,
  a_suburb                    text,
  a_state                     text,
  a_postcode                  text,
  a_country                   text,
  a_aus_tax_resident          boolean,
  a_tfn                       text,
  a_has_tin                   boolean,
  a_tin_countries             jsonb,   -- [{country, tin}]
  a_no_tin_reason             text,    -- 'not_issued' | 'not_required' | 'no_tin_country'
  a_pep                       boolean,
  a_sole_trader               boolean,
  a_business_name             text,
  a_abn                       text,
  a_business_address          text,
  a_business_suburb           text,
  a_business_state            text,
  a_business_postcode         text,
  a_business_country          text,
  a_wealth_sources            jsonb,   -- array of selected sources

  -- Section B: Joint Investor
  b_title                     text,
  b_given_names               text,
  b_surname                   text,
  b_dob                       text,
  b_email                     text,
  b_same_address_as_a         boolean DEFAULT false,
  b_address                   text,
  b_suburb                    text,
  b_state                     text,
  b_postcode                  text,
  b_country                   text,
  b_aus_tax_resident          boolean,
  b_tfn                       text,
  b_has_tin                   boolean,
  b_tin_countries             jsonb,
  b_no_tin_reason             text,
  b_pep                       boolean,
  b_wealth_sources            jsonb,

  -- Section C: Australian Company / Corporate Trustee
  c_company_name              text,
  c_abn_tfn                   text,
  c_acn                       text,
  c_aus_tax_resident          boolean,
  c_has_tin                   boolean,
  c_tin_countries             jsonb,
  c_no_tin_reason             text,
  c_registered_address        text,
  c_suburb                    text,
  c_state                     text,
  c_postcode                  text,
  c_country                   text,
  c_company_type              text CHECK (c_company_type IN ('proprietary', 'public')),
  c_directors                 jsonb,   -- [{given_names, surname, dob, address, suburb, state, postcode, country, pep}]
  c_wealth_sources            jsonb,

  -- Section D: Trusts
  d_trustees                  jsonb,   -- [{name, address, suburb, state, postcode, country}]
  d_trust_name                text,
  d_business_name             text,
  d_abn_tfn                   text,
  d_settlor                   text,
  d_trust_type                text,
  d_country_established       text,
  d_beneficiary_by_class      boolean,
  d_beneficiary_class_terms   text,
  d_beneficiaries             jsonb,   -- [{name}]
  d_aus_tax_resident          boolean,
  d_has_tin                   boolean,
  d_tin_countries             jsonb,
  d_no_tin_reason             text,
  d_wealth_sources            jsonb,

  -- Section E: Beneficial Ownership
  e_beneficial_owners         jsonb,   -- [{name, dob, address, suburb, state, postcode, country, pep, aus_tax_resident, tin_countries, entity_type}]

  -- Decision Makers (if beneficial owners cannot be ascertained)
  e_decision_makers           jsonb,   -- [{name, dob, address, suburb, state, postcode, country, pep, aus_tax_resident, tin_countries}]

  -- Section 4: Bank / Distribution Details
  bank_reinvest               boolean DEFAULT false,
  bank_institution_name       text,
  bank_account_name           text,
  bank_bsb                    text,
  bank_account_number         text,
  bank_swift                  text,

  -- Section 6: FATCA
  fatca_entity_type           text,   -- 'financial_institution' | 'aus_listed' | 'active_nfe' | 'other'
  fatca_giin                  text,
  fatca_status                text,
  fatca_foreign_owners        jsonb,  -- [{given_names, surname, tin, role, address}]
  fatca_trust_status          text,
  fatca_controlling_persons   jsonb,

  -- Section 7: CRS
  crs_foreign_tax_resident    boolean,
  crs_countries               jsonb,  -- [{country, tin, no_tin_reason}]

  -- Section 8: Declaration
  declaration_agreed          boolean DEFAULT false,
  declaration_agreed_at       timestamptz,

  -- Execution / Signatures
  multi_signatory             boolean DEFAULT false,   -- any vs all to sign
  signatures                  jsonb,   -- [{role, name, date, title, type: 'draw'|'type', data, is_electronic, witness_name, witness_address}]

  -- Timestamps
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION update_investor_applications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_investor_applications_updated_at
  BEFORE UPDATE ON investor_applications
  FOR EACH ROW EXECUTE FUNCTION update_investor_applications_updated_at();

-- Indexes
CREATE INDEX idx_investor_applications_tenant ON investor_applications(tenant_id);
CREATE INDEX idx_investor_applications_status ON investor_applications(status);
CREATE INDEX idx_investor_applications_email  ON investor_applications(contact_email);

-- RLS
ALTER TABLE investor_applications ENABLE ROW LEVEL SECURITY;

-- Anonymous users can INSERT (submit application without being logged in)
CREATE POLICY "anon_insert_investor_applications" ON investor_applications
  FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated users can read / update their own applications (matched by email)
CREATE POLICY "select_own_investor_applications" ON investor_applications
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "insert_own_investor_applications" ON investor_applications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "update_own_investor_applications" ON investor_applications
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role can do anything (used by edge functions)
CREATE POLICY "service_role_all_investor_applications" ON investor_applications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
