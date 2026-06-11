// Types and initial state for the Arkline Trust Application Form

export type InvestorType =
  | 'individual'
  | 'joint'
  | 'aus_proprietary_company'
  | 'aus_public_company'
  | 'regulated_trust_individual_trustee'
  | 'regulated_trust_corporate_trustee'
  | 'unregulated_trust_individual_trustee'
  | 'unregulated_trust_corporate_trustee'
  | 'other';

export type WealthSource =
  | 'gainful_employment'
  | 'business_activity'
  | 'inheritance_gift'
  | 'superannuation'
  | 'financial_investments'
  | 'other';

export interface TinEntry { country: string; tin: string; }
export interface Director {
  given_names: string; surname: string; dob: string;
  address: string; suburb: string; state: string; postcode: string; country: string;
  pep: boolean | null;
}
export interface Trustee { name: string; address: string; suburb: string; state: string; postcode: string; country: string; }
export interface Beneficiary { name: string; }
export interface BeneficialOwner {
  entity_type: 'corporate' | 'trust' | '';
  name: string; dob: string;
  address: string; suburb: string; state: string; postcode: string; country: string;
  pep: boolean | null;
  aus_tax_resident: boolean | null;
  tin_countries: TinEntry[];
  no_tin_reason: string;
}
export interface ControllingPerson {
  name: string; address: string; suburb: string; state: string; postcode: string; country: string;
  foreign_tax_resident: boolean | null; foreign_country: string;
  position: string;
}
export interface FatcaIndividual {
  given_names: string; surname: string; tin: string; role: string;
  address: string; suburb: string; state: string; postcode: string; country: string;
}
export interface CrsEntry { country: string; tin: string; no_tin_reason: string; }
export interface Signature {
  role: 'director' | 'sole_director_secretary' | 'director_secretary' | 'trustee' | 'individual' | 'attorney' | '';
  name: string; date: string; title: string;
  type: 'draw' | 'type'; data: string;
  is_electronic: boolean;
  witness_name: string; witness_address: string; witness_date: string; witness_electronic: boolean;
}

export interface ApplicationFormData {
  // Section 1
  contact_title: string; contact_given_names: string; contact_surname: string;
  contact_phone: string; contact_email: string;
  postal_address: string; postal_suburb: string; postal_state: string;
  postal_postcode: string; postal_country: string;

  // Section 2
  invest_class_a: boolean; invest_class_b: boolean; invest_class_c: boolean;
  amount_class_a: string; amount_class_b: string; amount_class_c: string;

  // Section 3
  investor_type: InvestorType | '';

  // Section A
  a_title: string; a_given_names: string; a_surname: string; a_dob: string; a_email: string;
  a_residential_address: string; a_suburb: string; a_state: string; a_postcode: string; a_country: string;
  a_aus_tax_resident: boolean | null;
  a_tfn: string; a_has_tin: boolean | null;
  a_tin_countries: TinEntry[];
  a_no_tin_reason: string;
  a_pep: boolean | null;
  a_sole_trader: boolean | null;
  a_business_name: string; a_abn: string;
  a_business_address: string; a_business_suburb: string; a_business_state: string;
  a_business_postcode: string; a_business_country: string;
  a_wealth_sources: WealthSource[];
  a_wealth_other: string;

  // Section B
  b_title: string; b_given_names: string; b_surname: string; b_dob: string; b_email: string;
  b_same_address_as_a: boolean;
  b_address: string; b_suburb: string; b_state: string; b_postcode: string; b_country: string;
  b_aus_tax_resident: boolean | null;
  b_tfn: string; b_has_tin: boolean | null;
  b_tin_countries: TinEntry[];
  b_no_tin_reason: string;
  b_pep: boolean | null;
  b_wealth_sources: WealthSource[];
  b_wealth_other: string;

  // Section C
  c_company_name: string; c_abn_tfn: string; c_acn: string;
  c_aus_tax_resident: boolean | null;
  c_has_tin: boolean | null;
  c_tin_countries: TinEntry[];
  c_no_tin_reason: string;
  c_registered_address: string; c_suburb: string; c_state: string; c_postcode: string; c_country: string;
  c_company_type: 'proprietary' | 'public' | '';
  c_directors: Director[];
  c_wealth_sources: WealthSource[];
  c_wealth_other: string;

  // Section D
  d_trustees: Trustee[];
  d_trust_name: string; d_business_name: string; d_abn_tfn: string;
  d_settlor: string; d_trust_type: string; d_country_established: string;
  d_beneficiary_by_class: boolean | null;
  d_beneficiary_class_terms: string;
  d_beneficiaries: Beneficiary[];
  d_aus_tax_resident: boolean | null;
  d_has_tin: boolean | null;
  d_tin_countries: TinEntry[];
  d_no_tin_reason: string;
  d_wealth_sources: WealthSource[];
  d_wealth_other: string;

  // Section E
  e_beneficial_owners: BeneficialOwner[];
  e_decision_makers: ControllingPerson[];

  // Section 4: Bank
  bank_reinvest: boolean | null;
  bank_institution_name: string; bank_account_name: string;
  bank_bsb: string; bank_account_number: string; bank_swift: string;

  // Section 6: FATCA
  fatca_entity_type: string;
  fatca_giin: string;
  fatca_status: string;
  fatca_foreign_owners: FatcaIndividual[];
  fatca_trust_status: string;
  fatca_controlling_persons: ControllingPerson[];

  // Section 7: CRS
  crs_foreign_tax_resident: boolean | null;
  crs_countries: CrsEntry[];

  // Section 8: Declaration
  declaration_agreed: boolean;

  // Execution
  multi_signatory: boolean | null;
  signatures: Signature[];
}

export const BLANK_DIRECTOR: Director = {
  given_names: '', surname: '', dob: '',
  address: '', suburb: '', state: '', postcode: '', country: 'Australia', pep: null,
};

export const BLANK_TRUSTEE: Trustee = { name: '', address: '', suburb: '', state: '', postcode: '', country: 'Australia' };

export const BLANK_BENEFICIAL_OWNER: BeneficialOwner = {
  entity_type: '', name: '', dob: '',
  address: '', suburb: '', state: '', postcode: '', country: 'Australia',
  pep: null, aus_tax_resident: null, tin_countries: [{ country: '', tin: '' }], no_tin_reason: '',
};

export const BLANK_SIGNATURE: Signature = {
  role: '', name: '', date: '', title: '',
  type: 'type', data: '',
  is_electronic: true,
  witness_name: '', witness_address: '', witness_date: '', witness_electronic: false,
};

export const INITIAL_FORM: ApplicationFormData = {
  contact_title: '', contact_given_names: '', contact_surname: '',
  contact_phone: '', contact_email: '',
  postal_address: '', postal_suburb: '', postal_state: '', postal_postcode: '', postal_country: 'Australia',

  invest_class_a: false, invest_class_b: false, invest_class_c: false,
  amount_class_a: '', amount_class_b: '', amount_class_c: '',

  investor_type: '',

  a_title: '', a_given_names: '', a_surname: '', a_dob: '', a_email: '',
  a_residential_address: '', a_suburb: '', a_state: '', a_postcode: '', a_country: 'Australia',
  a_aus_tax_resident: null, a_tfn: '', a_has_tin: null,
  a_tin_countries: [{ country: '', tin: '' }], a_no_tin_reason: '',
  a_pep: null, a_sole_trader: null,
  a_business_name: '', a_abn: '',
  a_business_address: '', a_business_suburb: '', a_business_state: '', a_business_postcode: '', a_business_country: 'Australia',
  a_wealth_sources: [], a_wealth_other: '',

  b_title: '', b_given_names: '', b_surname: '', b_dob: '', b_email: '',
  b_same_address_as_a: false,
  b_address: '', b_suburb: '', b_state: '', b_postcode: '', b_country: 'Australia',
  b_aus_tax_resident: null, b_tfn: '', b_has_tin: null,
  b_tin_countries: [{ country: '', tin: '' }], b_no_tin_reason: '',
  b_pep: null, b_wealth_sources: [], b_wealth_other: '',

  c_company_name: '', c_abn_tfn: '', c_acn: '',
  c_aus_tax_resident: null, c_has_tin: null,
  c_tin_countries: [{ country: '', tin: '' }], c_no_tin_reason: '',
  c_registered_address: '', c_suburb: '', c_state: '', c_postcode: '', c_country: 'Australia',
  c_company_type: '',
  c_directors: [{ ...BLANK_DIRECTOR }],
  c_wealth_sources: [], c_wealth_other: '',

  d_trustees: [{ ...BLANK_TRUSTEE }, { ...BLANK_TRUSTEE }],
  d_trust_name: '', d_business_name: '', d_abn_tfn: '',
  d_settlor: '', d_trust_type: '', d_country_established: 'Australia',
  d_beneficiary_by_class: null, d_beneficiary_class_terms: '',
  d_beneficiaries: [{ name: '' }],
  d_aus_tax_resident: null, d_has_tin: null,
  d_tin_countries: [{ country: '', tin: '' }], d_no_tin_reason: '',
  d_wealth_sources: [], d_wealth_other: '',

  e_beneficial_owners: [{ ...BLANK_BENEFICIAL_OWNER }],
  e_decision_makers: [],

  bank_reinvest: null,
  bank_institution_name: '', bank_account_name: '',
  bank_bsb: '', bank_account_number: '', bank_swift: '',

  fatca_entity_type: '', fatca_giin: '', fatca_status: '',
  fatca_foreign_owners: [],
  fatca_trust_status: '',
  fatca_controlling_persons: [],

  crs_foreign_tax_resident: null,
  crs_countries: [{ country: '', tin: '', no_tin_reason: '' }],

  declaration_agreed: false,

  multi_signatory: null,
  signatures: [{ ...BLANK_SIGNATURE }],
};

export const WEALTH_SOURCE_LABELS: Record<WealthSource, string> = {
  gainful_employment: 'Gainful employment',
  business_activity: 'Business activity',
  inheritance_gift: 'Inheritance / gift',
  superannuation: 'Superannuation savings',
  financial_investments: 'Financial investments',
  other: 'Other',
};
