import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  ApplicationFormData, BLANK_DIRECTOR, BLANK_TRUSTEE, BLANK_BENEFICIAL_OWNER,
  Director, Trustee, BeneficialOwner,
} from './applicationFormTypes';
import {
  Field, Input, Select, Textarea, RadioGroup, SectionHeading, Divider, TinBlock,
  WealthSources, AddressBlock, PreparedBadge, ChangeNote,
} from './applicationFormFields';
import { GOLD, CREAM, SERIF, labelCls, labelStyle } from './applicationTheme';

type SetFn = <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void;
type StepProps = { form: ApplicationFormData; set: SetFn };

export const MIN_PER_CLASS = 500_000;

export const ALL_STEPS = [
  'contact', 'investment', 'investor_type',
  'section_a', 'section_b', 'section_c', 'section_d', 'section_e',
  'bank', 'payment_info', 'fatca_crs', 'declaration', 'execution',
] as const;
export type StepId = (typeof ALL_STEPS)[number];

function sectionsFor(t: string) {
  const a = ['individual', 'joint', 'regulated_trust_individual_trustee', 'unregulated_trust_individual_trustee'].includes(t);
  const c = ['aus_proprietary_company', 'aus_public_company', 'regulated_trust_corporate_trustee', 'unregulated_trust_corporate_trustee'].includes(t);
  const d = t.includes('trust');
  return { a, b: t === 'joint', c, d, e: c || d };
}

export function getSteps(form: ApplicationFormData): StepId[] {
  const s = sectionsFor(form.investor_type);
  return ALL_STEPS.filter(step => {
    if (step === 'section_a') return s.a;
    if (step === 'section_b') return s.b;
    if (step === 'section_c') return s.c;
    if (step === 'section_d') return s.d;
    if (step === 'section_e') return s.e;
    return true;
  });
}

export const STEP_LABELS: Record<StepId, string> = {
  contact:       'Contact',
  investment:    'Investment',
  investor_type: 'Investor Type',
  section_a:     'Individual Details',
  section_b:     'Joint Investor',
  section_c:     'Company Details',
  section_d:     'Trust Details',
  section_e:     'Beneficial Ownership',
  bank:          'Bank Details',
  payment_info:  'Payment',
  fatca_crs:     'FATCA & CRS',
  declaration:   'Declarations',
  execution:     'Signing',
};

export function stepProblem(step: StepId, form: ApplicationFormData): string | null {
  if (step === 'investment') {
    const picked = (['a', 'b', 'c'] as const).filter(k => form[`invest_class_${k}`]);
    if (picked.length === 0) return 'Please choose at least one class of units.';
    const missing = picked.find(k => !(parseFloat(form[`amount_class_${k}`]) > 0));
    if (missing) return `Please enter an amount for Class ${missing.toUpperCase()}.`;
  }
  if (step === 'investor_type' && !form.investor_type) return 'Please choose how you are investing.';
  if (step === 'declaration' && (form.declaration_ticks.some(t => !t) || !form.declaration_agreed)) {
    return 'Please tick each declaration and the final agreement to continue.';
  }
  return null;
}

// ─── Step: Contact ─────────────────────────────────────────────────────────────
export function StepContact({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm opacity-60 leading-relaxed">
        Please provide your primary contact details. We will use this address to send important
        notices, disclosure documents, and fund reports unless you opt out of electronic delivery.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Title" name="contact_title">
          <Select value={form.contact_title} onChange={v => set('contact_title', v)}>
            <option value="">Select</option>
            {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Given Name(s)" required name="contact_given_names">
          <Input value={form.contact_given_names} onChange={v => set('contact_given_names', v)} />
        </Field>
        <Field label="Surname" required name="contact_surname">
          <Input value={form.contact_surname} onChange={v => set('contact_surname', v)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" required name="contact_phone">
          <Input value={form.contact_phone} onChange={v => set('contact_phone', v)} type="tel" placeholder="+61 4XX XXX XXX" />
        </Field>
        <Field label="Email Address" required name="contact_email">
          <Input value={form.contact_email} onChange={v => set('contact_email', v)} type="email" placeholder="your@email.com" />
        </Field>
      </div>
      <Divider />
      <p className={labelCls} style={{ ...labelStyle, marginBottom: 12 }}>Postal Address</p>
      <AddressBlock
        address={form.postal_address} suburb={form.postal_suburb}
        state={form.postal_state} postcode={form.postal_postcode} country={form.postal_country}
        onAddress={v => set('postal_address', v)} onSuburb={v => set('postal_suburb', v)}
        onState={v => set('postal_state', v)} onPostcode={v => set('postal_postcode', v)}
        onCountry={v => set('postal_country', v)}
      />
      <div
        className="rounded-sm p-4 text-xs leading-relaxed opacity-60 mt-4"
        style={{ backgroundColor: 'rgba(184,147,74,0.08)', border: `1px solid ${GOLD}33` }}
      >
        We will upload relevant information, updates, disclosure documents, forms, and reports to{' '}
        <strong>arklinetrust.com/vault</strong> and/or send them to your nominated email address.
        Should you wish to opt out of electronic disclosure, please contact us at{' '}
        <strong>enquiries@arklinetrust.com</strong>.
      </div>
    </div>
  );
}

// ─── Step: Investment ──────────────────────────────────────────────────────────
export function StepInvestment({ form, set }: StepProps) {
  const total =
    (parseFloat(form.amount_class_a) || 0) +
    (parseFloat(form.amount_class_b) || 0) +
    (parseFloat(form.amount_class_c) || 0);

  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60 leading-relaxed">
        Select one or more classes of Units in the Arkline Investment Trust to which you wish to
        apply. You must select at least one class for your application to be processed. The
        minimum investment is A${MIN_PER_CLASS.toLocaleString('en-AU')} for each class.
      </p>

      <div className="space-y-3">
        {([
          ['invest_class_a', 'amount_class_a', 'Class A — Opportunistic Strategy Portfolio', 'Actively managed, opportunistic allocation across global equity and credit markets.'],
          ['invest_class_b', 'amount_class_b', 'Class B — Quant Value Portfolio', 'Systematic, factor-driven strategy targeting undervalued securities globally.'],
          ['invest_class_c', 'amount_class_c', 'Class C — High Conviction Portfolio', 'Concentrated portfolio of high-conviction long-term equity positions.'],
        ] as [keyof ApplicationFormData, keyof ApplicationFormData, string, string][]).map(([boolKey, amtKey, label, desc]) => (
          <div
            key={boolKey}
            className="rounded-sm border p-4 transition-all"
            style={{
              borderColor: form[boolKey] ? `${GOLD}66` : 'rgba(255,255,255,0.1)',
              backgroundColor: form[boolKey] ? 'rgba(184,147,74,0.07)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[boolKey] as boolean}
                onChange={e => set(boolKey, e.target.checked)}
                style={{ accentColor: GOLD, marginTop: 2, flexShrink: 0 }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: CREAM }}>{label}<PreparedBadge name={boolKey} /></p>
                <p className="text-xs opacity-50 mt-0.5 leading-relaxed">{desc}</p>
                <ChangeNote name={boolKey} />
                {form[boolKey] && (
                  <div className="mt-3">
                    <Field label="Committed Capital (AUD $)" name={amtKey}>
                      <Input
                        value={form[amtKey] as string}
                        onChange={v => set(amtKey, v)}
                        type="number"
                        placeholder="500000"
                      />
                    </Field>
                    {(parseFloat(form[amtKey] as string) || 0) > 0 && (parseFloat(form[amtKey] as string) || 0) < MIN_PER_CLASS && (
                      <p className="flex items-start gap-1.5 text-xs mt-1.5" style={{ color: '#fcd34d' }}>
                        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                        The minimum investment is A${MIN_PER_CLASS.toLocaleString('en-AU')} per class. Arkline may not accept a smaller amount.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div
          className="rounded-sm p-4 flex items-center justify-between"
          style={{ backgroundColor: 'rgba(184,147,74,0.1)', border: `1px solid ${GOLD}44` }}
        >
          <span className="text-sm font-semibold" style={{ color: GOLD }}>Total Committed Capital</span>
          <span className="text-lg font-bold" style={{ fontFamily: SERIF, color: GOLD }}>
            ${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div
        className="rounded-sm p-4 text-xs leading-relaxed opacity-60"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        The committed capital will be called by the Trustee (in whole or in part) as notified to
        you, with a minimum three (3) Business Day notice period. The offer of Units is made
        under the Information Memorandum dated 21 May 2026.
      </div>
    </div>
  );
}

// ─── Step: Investor Type ───────────────────────────────────────────────────────
export function StepInvestorType({ form, set }: StepProps) {
  const options = [
    { value: 'individual',                           label: 'Individual' },
    { value: 'joint',                                label: 'Joint Holding (two individuals)' },
    { value: 'aus_proprietary_company',              label: 'Australian Proprietary Company' },
    { value: 'aus_public_company',                   label: 'Australian Public Company' },
    { value: 'regulated_trust_individual_trustee',   label: 'Regulated Trust — Individual Trustee' },
    { value: 'regulated_trust_corporate_trustee',    label: 'Regulated Trust — Corporate Trustee' },
    { value: 'unregulated_trust_individual_trustee', label: 'Unregulated Trust — Individual Trustee' },
    { value: 'unregulated_trust_corporate_trustee',  label: 'Unregulated Trust — Corporate Trustee' },
  ].map(o => {
    const s = sectionsFor(o.value);
    const letters = (['a', 'b', 'c', 'd', 'e'] as const).filter(k => s[k]).map(k => k.toUpperCase());
    return { ...o, sections: `${letters.length > 1 ? 'Sections' : 'Section'} ${letters.join(' + ')}` };
  });

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-60 leading-relaxed">
        Select the entity type under which you are investing. This determines which identification
        and verification sections you will need to complete. If you are an association, foreign
        company, or government body, please contact{' '}
        <a href="mailto:enquiries@arklinetrust.com" className="underline" style={{ color: GOLD }}>
          enquiries@arklinetrust.com
        </a>.
      </p>
      <PreparedBadge name="investor_type" />
      <ChangeNote name="investor_type" />

      <div className="space-y-2">
        {options.map(opt => (
          <label
            key={opt.value}
            className="flex items-start gap-3 cursor-pointer rounded-sm border p-4 transition-all"
            style={{
              borderColor: form.investor_type === opt.value ? `${GOLD}66` : 'rgba(255,255,255,0.1)',
              backgroundColor: form.investor_type === opt.value ? 'rgba(184,147,74,0.07)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <input
              type="radio"
              name="investor_type"
              value={opt.value}
              checked={form.investor_type === opt.value}
              onChange={() => set('investor_type', opt.value as ApplicationFormData['investor_type'])}
              style={{ accentColor: GOLD, marginTop: 3, flexShrink: 0 }}
            />
            <div>
              <p className="text-sm font-semibold" style={{ color: CREAM }}>{opt.label}</p>
              <p className="text-xs opacity-40 mt-0.5">{opt.sections}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Step: Section A ───────────────────────────────────────────────────────────
export function StepSectionA({ form, set }: StepProps) {
  const isJoint = form.investor_type === 'joint';
  return (
    <div className="space-y-5">
      <SectionHeading letter="A" title={isJoint ? 'Primary Individual Investor' : 'Individual Investor / Individual Trustee'} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Title">
          <Select value={form.a_title} onChange={v => set('a_title', v)}>
            <option value="">Select</option>
            {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Given Name(s)" required>
          <Input value={form.a_given_names} onChange={v => set('a_given_names', v)} />
        </Field>
        <Field label="Surname" required>
          <Input value={form.a_surname} onChange={v => set('a_surname', v)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date of Birth" required>
          <Input value={form.a_dob} onChange={v => set('a_dob', v)} type="date" />
        </Field>
        <Field label="Email Address">
          <Input value={form.a_email} onChange={v => set('a_email', v)} type="email" />
        </Field>
      </div>

      <Divider />
      <AddressBlock
        label="Residential Address"
        address={form.a_residential_address} suburb={form.a_suburb}
        state={form.a_state} postcode={form.a_postcode} country={form.a_country}
        onAddress={v => set('a_residential_address', v)} onSuburb={v => set('a_suburb', v)}
        onState={v => set('a_state', v)} onPostcode={v => set('a_postcode', v)}
        onCountry={v => set('a_country', v)}
      />

      <Divider />
      <RadioGroup
        label="Are you an Australian resident for tax purposes?"
        name="a_aus_tax_resident"
        value={form.a_aus_tax_resident}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('a_aus_tax_resident', v === 'true')}
      />
      {form.a_aus_tax_resident === true && (
        <Field label="Tax File Number (TFN)">
          <Input value={form.a_tfn} onChange={v => set('a_tfn', v)} placeholder="XXX XXX XXX" />
        </Field>
      )}
      {form.a_aus_tax_resident === false && (
        <TinBlock
          hasTin={form.a_has_tin} tinCountries={form.a_tin_countries}
          noTinReason={form.a_no_tin_reason}
          onHasTin={v => set('a_has_tin', v)}
          onTinCountries={v => set('a_tin_countries', v)}
          onNoTinReason={v => set('a_no_tin_reason', v)}
          prefix="a"
        />
      )}

      <Divider />
      <RadioGroup
        label="Are you a Politically Exposed Person (PEP)?"
        name="a_pep"
        value={form.a_pep}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('a_pep', v === 'true')}
      />

      <Divider />
      <RadioGroup
        label="Are you applying as a sole trader?"
        name="a_sole_trader"
        value={form.a_sole_trader}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('a_sole_trader', v === 'true')}
      />
      {form.a_sole_trader === true && (
        <div className="space-y-4 pl-4 border-l-2" style={{ borderColor: `${GOLD}44` }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name">
              <Input value={form.a_business_name} onChange={v => set('a_business_name', v)} />
            </Field>
            <Field label="ABN">
              <Input value={form.a_abn} onChange={v => set('a_abn', v)} />
            </Field>
          </div>
          <AddressBlock
            label="Business Address"
            address={form.a_business_address} suburb={form.a_business_suburb}
            state={form.a_business_state} postcode={form.a_business_postcode} country={form.a_business_country}
            onAddress={v => set('a_business_address', v)} onSuburb={v => set('a_business_suburb', v)}
            onState={v => set('a_business_state', v)} onPostcode={v => set('a_business_postcode', v)}
            onCountry={v => set('a_business_country', v)}
          />
        </div>
      )}

      <Divider />
      <WealthSources
        selected={form.a_wealth_sources} otherText={form.a_wealth_other}
        onSelected={v => set('a_wealth_sources', v)} onOther={v => set('a_wealth_other', v)}
        prefix="a"
      />
    </div>
  );
}

// ─── Step: Section B ───────────────────────────────────────────────────────────
export function StepSectionB({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <SectionHeading letter="B" title="Joint Investor" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Title">
          <Select value={form.b_title} onChange={v => set('b_title', v)}>
            <option value="">Select</option>
            {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Given Name(s)" required>
          <Input value={form.b_given_names} onChange={v => set('b_given_names', v)} />
        </Field>
        <Field label="Surname" required>
          <Input value={form.b_surname} onChange={v => set('b_surname', v)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date of Birth"><Input value={form.b_dob} onChange={v => set('b_dob', v)} type="date" /></Field>
        <Field label="Email Address"><Input value={form.b_email} onChange={v => set('b_email', v)} type="email" /></Field>
      </div>
      <Divider />
      <label className="flex items-center gap-2.5 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={form.b_same_address_as_a}
          onChange={e => set('b_same_address_as_a', e.target.checked)}
          style={{ accentColor: GOLD }}
        />
        <span>Residential address is the same as Investor A</span>
      </label>
      {!form.b_same_address_as_a && (
        <AddressBlock
          label="Residential Address"
          address={form.b_address} suburb={form.b_suburb}
          state={form.b_state} postcode={form.b_postcode} country={form.b_country}
          onAddress={v => set('b_address', v)} onSuburb={v => set('b_suburb', v)}
          onState={v => set('b_state', v)} onPostcode={v => set('b_postcode', v)}
          onCountry={v => set('b_country', v)}
        />
      )}
      <Divider />
      <RadioGroup label="Australian tax resident?" name="b_aus" value={form.b_aus_tax_resident}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('b_aus_tax_resident', v === 'true')} />
      {form.b_aus_tax_resident === true && (
        <Field label="Tax File Number (TFN)"><Input value={form.b_tfn} onChange={v => set('b_tfn', v)} /></Field>
      )}
      {form.b_aus_tax_resident === false && (
        <TinBlock hasTin={form.b_has_tin} tinCountries={form.b_tin_countries}
          noTinReason={form.b_no_tin_reason}
          onHasTin={v => set('b_has_tin', v)} onTinCountries={v => set('b_tin_countries', v)}
          onNoTinReason={v => set('b_no_tin_reason', v)} prefix="b" />
      )}
      <Divider />
      <RadioGroup label="Are you a Politically Exposed Person (PEP)?" name="b_pep" value={form.b_pep}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('b_pep', v === 'true')} />
      <Divider />
      <WealthSources selected={form.b_wealth_sources} otherText={form.b_wealth_other}
        onSelected={v => set('b_wealth_sources', v)} onOther={v => set('b_wealth_other', v)} prefix="b" />
    </div>
  );
}

// ─── Step: Section C ───────────────────────────────────────────────────────────
export function StepSectionC({ form, set }: StepProps) {
  const updateDirector = (i: number, d: Director) => {
    const dirs = [...form.c_directors]; dirs[i] = d; set('c_directors', dirs);
  };
  return (
    <div className="space-y-5">
      <SectionHeading letter="C" title="Australian Company / Corporate Trustee" />
      <Field label="Full Company / Corporate Trustee / Business Name" required>
        <Input value={form.c_company_name} onChange={v => set('c_company_name', v)} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="ABN / TFN / TFN Exemption"><Input value={form.c_abn_tfn} onChange={v => set('c_abn_tfn', v)} /></Field>
        <Field label="ACN"><Input value={form.c_acn} onChange={v => set('c_acn', v)} /></Field>
        <Field label="ARBN (if applicable)"><Input value={form.c_arbn} onChange={v => set('c_arbn', v)} /></Field>
        <Field label="AFSL (if applicable)"><Input value={form.c_afsl} onChange={v => set('c_afsl', v)} /></Field>
      </div>
      <RadioGroup label="Australian tax resident?" name="c_aus" value={form.c_aus_tax_resident}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('c_aus_tax_resident', v === 'true')} />
      {form.c_aus_tax_resident === false && (
        <TinBlock hasTin={form.c_has_tin} tinCountries={form.c_tin_countries}
          noTinReason={form.c_no_tin_reason}
          onHasTin={v => set('c_has_tin', v)} onTinCountries={v => set('c_tin_countries', v)}
          onNoTinReason={v => set('c_no_tin_reason', v)} prefix="c" />
      )}
      <Divider />
      <AddressBlock label="Registered Address"
        address={form.c_registered_address} suburb={form.c_suburb}
        state={form.c_state} postcode={form.c_postcode} country={form.c_country}
        onAddress={v => set('c_registered_address', v)} onSuburb={v => set('c_suburb', v)}
        onState={v => set('c_state', v)} onPostcode={v => set('c_postcode', v)}
        onCountry={v => set('c_country', v)} />
      <Divider />
      <RadioGroup label="Company type" name="c_type" value={form.c_company_type}
        options={[{ value: 'proprietary', label: 'Proprietary' }, { value: 'public', label: 'Public' }]}
        onChange={v => set('c_company_type', v as 'proprietary' | 'public')} />
      <Divider />
      <p className={labelCls} style={labelStyle}>Directors</p>
      {form.c_directors.map((d, i) => (
        <div key={i} className="rounded-sm border p-4 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: GOLD }}>Director {i + 1}</p>
            {form.c_directors.length > 1 && (
              <button type="button" onClick={() => set('c_directors', form.c_directors.filter((_, j) => j !== i))}
                className="text-xs opacity-40 hover:opacity-70 flex items-center gap-1" style={{ color: CREAM }}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Given Name(s)"><Input value={d.given_names} onChange={v => updateDirector(i, { ...d, given_names: v })} /></Field>
            <Field label="Surname"><Input value={d.surname} onChange={v => updateDirector(i, { ...d, surname: v })} /></Field>
          </div>
          <Field label="Date of Birth"><Input value={d.dob} onChange={v => updateDirector(i, { ...d, dob: v })} type="date" /></Field>
          <AddressBlock label="Address"
            address={d.address} suburb={d.suburb} state={d.state} postcode={d.postcode} country={d.country}
            onAddress={v => updateDirector(i, { ...d, address: v })}
            onSuburb={v => updateDirector(i, { ...d, suburb: v })}
            onState={v => updateDirector(i, { ...d, state: v })}
            onPostcode={v => updateDirector(i, { ...d, postcode: v })}
            onCountry={v => updateDirector(i, { ...d, country: v })} />
          <RadioGroup label="Politically Exposed Person?" name={`d_pep_${i}`} value={d.pep}
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            onChange={v => updateDirector(i, { ...d, pep: v === 'true' })} />
        </div>
      ))}
      <button type="button"
        onClick={() => set('c_directors', [...form.c_directors, { ...BLANK_DIRECTOR }])}
        className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-sm transition-all hover:brightness-110"
        style={{ backgroundColor: 'rgba(184,147,74,0.1)', color: GOLD, border: `1px solid ${GOLD}33` }}>
        <Plus size={14} /> Add Director
      </button>
      <Divider />
      <WealthSources selected={form.c_wealth_sources} otherText={form.c_wealth_other}
        onSelected={v => set('c_wealth_sources', v)} onOther={v => set('c_wealth_other', v)} prefix="c" />
    </div>
  );
}

// ─── Step: Section D ───────────────────────────────────────────────────────────
export function StepSectionD({ form, set }: StepProps) {
  const updateTrustee = (i: number, t: Trustee) => {
    const ts = [...form.d_trustees]; ts[i] = t; set('d_trustees', ts);
  };
  return (
    <div className="space-y-5">
      <SectionHeading letter="D" title="Trust Details" />
      {form.d_trustees.map((t, i) => (
        <div key={i} className="rounded-sm border p-4 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: GOLD }}>Trustee {i + 1}</p>
          <Field label="Full Name of Trustee">
            <Input value={t.name} onChange={v => updateTrustee(i, { ...t, name: v })} />
          </Field>
          <AddressBlock label="Address"
            address={t.address} suburb={t.suburb} state={t.state} postcode={t.postcode} country={t.country}
            onAddress={v => updateTrustee(i, { ...t, address: v })}
            onSuburb={v => updateTrustee(i, { ...t, suburb: v })}
            onState={v => updateTrustee(i, { ...t, state: v })}
            onPostcode={v => updateTrustee(i, { ...t, postcode: v })}
            onCountry={v => updateTrustee(i, { ...t, country: v })} />
        </div>
      ))}
      <button type="button"
        onClick={() => set('d_trustees', [...form.d_trustees, { ...BLANK_TRUSTEE }])}
        className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-sm"
        style={{ backgroundColor: 'rgba(184,147,74,0.1)', color: GOLD, border: `1px solid ${GOLD}33` }}>
        <Plus size={14} /> Add Trustee
      </button>
      <Divider />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Trust Name"><Input value={form.d_trust_name} onChange={v => set('d_trust_name', v)} /></Field>
        <Field label="Business Name of Trust"><Input value={form.d_business_name} onChange={v => set('d_business_name', v)} /></Field>
        <Field label="ABN / TFN / TFN Exemption"><Input value={form.d_abn_tfn} onChange={v => set('d_abn_tfn', v)} /></Field>
        <Field label="Settlor of the Trust"><Input value={form.d_settlor} onChange={v => set('d_settlor', v)} /></Field>
        <Field label="Type of Trust (e.g. Family Trust, SMSF)"><Input value={form.d_trust_type} onChange={v => set('d_trust_type', v)} /></Field>
        <Field label="Country in which Trust was Established"><Input value={form.d_country_established} onChange={v => set('d_country_established', v)} /></Field>
      </div>
      <Divider />
      <RadioGroup label="Do the terms of the trust identify beneficiaries by reference to membership of a class?"
        name="d_benef_class" value={form.d_beneficiary_by_class}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('d_beneficiary_by_class', v === 'true')} />
      {form.d_beneficiary_by_class === true && (
        <Field label="What are the terms?">
          <Textarea value={form.d_beneficiary_class_terms} onChange={v => set('d_beneficiary_class_terms', v)} />
        </Field>
      )}
      {form.d_beneficiary_by_class === false && (
        <div className="space-y-2">
          <p className={labelCls} style={labelStyle}>Full Name of Each Beneficiary</p>
          {form.d_beneficiaries.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input value={b.name} onChange={v => {
                const bs = [...form.d_beneficiaries]; bs[i] = { name: v }; set('d_beneficiaries', bs);
              }} placeholder={`Beneficiary ${i + 1}`} />
              {form.d_beneficiaries.length > 1 && (
                <button type="button" onClick={() => set('d_beneficiaries', form.d_beneficiaries.filter((_, j) => j !== i))}
                  className="opacity-40 hover:opacity-70 p-2" style={{ color: CREAM }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
          <button type="button"
            onClick={() => set('d_beneficiaries', [...form.d_beneficiaries, { name: '' }])}
            className="flex items-center gap-1.5 text-xs" style={{ color: GOLD }}>
            <Plus size={12} /> Add beneficiary
          </button>
        </div>
      )}
      <Divider />
      <RadioGroup label="Is the trust an Australian resident for tax purposes?" name="d_aus" value={form.d_aus_tax_resident}
        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
        onChange={v => set('d_aus_tax_resident', v === 'true')} />
      {form.d_aus_tax_resident === false && (
        <TinBlock hasTin={form.d_has_tin} tinCountries={form.d_tin_countries}
          noTinReason={form.d_no_tin_reason}
          onHasTin={v => set('d_has_tin', v)} onTinCountries={v => set('d_tin_countries', v)}
          onNoTinReason={v => set('d_no_tin_reason', v)} prefix="d" />
      )}
      <Divider />
      <WealthSources selected={form.d_wealth_sources} otherText={form.d_wealth_other}
        onSelected={v => set('d_wealth_sources', v)} onOther={v => set('d_wealth_other', v)} prefix="d" />
    </div>
  );
}

// ─── Step: Section E ───────────────────────────────────────────────────────────
export function StepSectionE({ form, set }: StepProps) {
  const updateOwner = (i: number, o: BeneficialOwner) => {
    const owners = [...form.e_beneficial_owners]; owners[i] = o; set('e_beneficial_owners', owners);
  };
  return (
    <div className="space-y-5">
      <SectionHeading letter="E" title="Beneficial Ownership" />
      <p className="text-sm opacity-60 leading-relaxed">
        Complete this section for each individual who, directly or indirectly, owns or controls
        25% or more of the entity. If you cannot ascertain the beneficial owners, complete the
        Decision Maker section below instead.
      </p>
      {form.e_beneficial_owners.map((o, i) => (
        <div key={i} className="rounded-sm border p-4 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: GOLD }}>Beneficial Owner {i + 1}</p>
            {form.e_beneficial_owners.length > 1 && (
              <button type="button" onClick={() => set('e_beneficial_owners', form.e_beneficial_owners.filter((_, j) => j !== i))}
                className="text-xs opacity-40 hover:opacity-70 flex items-center gap-1" style={{ color: CREAM }}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <RadioGroup label="Entity type" name={`e_type_${i}`} value={o.entity_type}
            options={[{ value: 'individual', label: 'Individual' }, { value: 'corporate', label: 'Corporate' }, { value: 'trust', label: 'Trust' }]}
            onChange={v => updateOwner(i, { ...o, entity_type: v as BeneficialOwner['entity_type'] })} />
          <Field label="Full Name" required>
            <Input value={o.name} onChange={v => updateOwner(i, { ...o, name: v })} />
          </Field>
          <Field label="Date of Birth">
            <Input value={o.dob} onChange={v => updateOwner(i, { ...o, dob: v })} type="date" />
          </Field>
          <AddressBlock label="Residential Address"
            address={o.address} suburb={o.suburb} state={o.state} postcode={o.postcode} country={o.country}
            onAddress={v => updateOwner(i, { ...o, address: v })}
            onSuburb={v => updateOwner(i, { ...o, suburb: v })}
            onState={v => updateOwner(i, { ...o, state: v })}
            onPostcode={v => updateOwner(i, { ...o, postcode: v })}
            onCountry={v => updateOwner(i, { ...o, country: v })} />
          <RadioGroup label="PEP?" name={`e_pep_${i}`} value={o.pep}
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            onChange={v => updateOwner(i, { ...o, pep: v === 'true' })} />
          <RadioGroup label="Australian tax resident?" name={`e_aus_${i}`} value={o.aus_tax_resident}
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            onChange={v => updateOwner(i, { ...o, aus_tax_resident: v === 'true' })} />
          {o.aus_tax_resident === false && (
            <TinBlock hasTin={o.tin_countries.length > 0 ? true : null}
              tinCountries={o.tin_countries} noTinReason={o.no_tin_reason}
              onHasTin={() => {}} onTinCountries={v => updateOwner(i, { ...o, tin_countries: v })}
              onNoTinReason={v => updateOwner(i, { ...o, no_tin_reason: v })} prefix={`e_${i}`} />
          )}
        </div>
      ))}
      {form.e_beneficial_owners.length < 4 && (
        <button type="button"
          onClick={() => set('e_beneficial_owners', [...form.e_beneficial_owners, { ...BLANK_BENEFICIAL_OWNER }])}
          className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-sm"
          style={{ backgroundColor: 'rgba(184,147,74,0.1)', color: GOLD, border: `1px solid ${GOLD}33` }}>
          <Plus size={14} /> Add Beneficial Owner
        </button>
      )}
    </div>
  );
}

// ─── Step: Bank ────────────────────────────────────────────────────────────────
export function StepBank({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm opacity-60 leading-relaxed">
        Please provide the bank account details from which your investment funds will be transferred.
        Distribution payments will be deposited into this account. The account must be held in the
        name of the Applicant.
      </p>
      <RadioGroup label="Do you wish to reinvest your income distributions back into the Fund?"
        name="bank_reinvest" value={form.bank_reinvest}
        options={[{ value: 'true', label: 'Yes — reinvest distributions' }, { value: 'false', label: 'No — pay to bank account below' }]}
        onChange={v => set('bank_reinvest', v === 'true')} />
      <PreparedBadge name="bank_reinvest" />
      <ChangeNote name="bank_reinvest" />
      <Divider />
      <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-1">All payments are calculated and paid in Australian dollars.</p>
      <Field label="Name of Financial Institution">
        <Input value={form.bank_institution_name} onChange={v => set('bank_institution_name', v)} />
      </Field>
      <Field label="Account Name">
        <Input value={form.bank_account_name} onChange={v => set('bank_account_name', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="BSB">
          <Input value={form.bank_bsb} onChange={v => set('bank_bsb', v)} placeholder="XXX-XXX" />
        </Field>
        <Field label="Account Number">
          <Input value={form.bank_account_number} onChange={v => set('bank_account_number', v)} />
        </Field>
      </div>
      <Field label="SWIFT Code (international transfers only)">
        <Input value={form.bank_swift} onChange={v => set('bank_swift', v)} placeholder="XXXXXXXX" />
      </Field>
      <div
        className="rounded-sm p-4 text-xs leading-relaxed opacity-60"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        If the bank account name does not match the Applicant name, documentary evidence must be
        provided explaining the reason for the third-party payment. The Administrator and Trustee
        reserve the right to request any information necessary to verify the Applicant's identity
        and the source of funds.
      </div>
    </div>
  );
}

// ─── Step: Payment Info ────────────────────────────────────────────────────────
export function StepPaymentInfo() {
  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60 leading-relaxed">
        Please do not transfer any money yet. Once Arkline has reviewed your application, you will
        receive written confirmation that it has been accepted, together with the Fund's bank
        account details and your payment reference.
      </p>
      <div className="rounded-sm p-6 space-y-3" style={{ backgroundColor: 'rgba(184,147,74,0.08)', border: `1px solid ${GOLD}44` }}>
        <p className="text-base font-semibold" style={{ fontFamily: SERIF, color: GOLD }}>Electronic Funds Transfer</p>
        <p className="text-sm leading-relaxed" style={{ color: CREAM }}>
          The Fund's account number is provided upon application acceptance. Please only transfer
          your investment after you have received confirmation from the Investment Manager that
          your application has been accepted.
        </p>
        <p className="text-sm leading-relaxed opacity-70">
          Units are issued at the next monthly dealing date, at the unit price confirmed for that month.
        </p>
      </div>
      <div className="rounded-sm p-4 text-xs leading-relaxed opacity-60" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        All relevant sections of this Application Form must be completed. If you have any queries,
        please contact{' '}
        <a href="mailto:applications@arklinetrust.com" className="underline" style={{ color: GOLD }}>applications@arklinetrust.com</a>.
      </div>
    </div>
  );
}

// ─── Step: FATCA & CRS ─────────────────────────────────────────────────────────
export function StepFatcaCrs({ form, set }: StepProps) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-sm p-4 text-xs leading-relaxed opacity-70"
        style={{ backgroundColor: 'rgba(184,147,74,0.08)', border: `1px solid ${GOLD}33` }}
      >
        <p className="font-semibold mb-2" style={{ color: GOLD, opacity: 1 }}>Foreign Account Tax Compliance Act (FATCA) &amp; Common Reporting Standards (CRS)</p>
        Australia has enacted legislation implementing global standards for the automatic exchange
        of financial account information. The Trustee is required to identify the tax residency of
        all investors and their controlling persons and report foreign tax residents to the
        Australian Taxation Office (ATO), which may share this information with other participating
        countries. For further information, refer to{' '}
        <a href="http://www.ato.gov.au" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: GOLD }}>ato.gov.au</a>{' '}
        or{' '}
        <a href="https://www.oecd.org/tax/automatic-exchange/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: GOLD }}>oecd.org</a>.
      </div>

      <div>
        <p className={labelCls} style={labelStyle}>Entity / Company Tax Status (Section 6.1)</p>
        <div className="space-y-2">
          {[
            ['financial_institution', 'Financial Institution'],
            ['aus_listed', 'Australian Public Listed Company / Majority Owned Subsidiary / Australian Registered Charity'],
            ['active_nfe', 'Active Non-Financial Entity (NFE)'],
            ['passive_nfe', 'Passive Non-Financial Entity (NFE)'],
            ['other', 'Other entity not previously listed'],
          ].map(([val, lbl]) => (
            <label key={val} className="flex items-start gap-2.5 cursor-pointer text-sm">
              <input type="radio" name="fatca_entity" value={val}
                checked={form.fatca_entity_type === val}
                onChange={() => set('fatca_entity_type', val)}
                style={{ accentColor: GOLD, marginTop: 2 }} />
              <span style={{ color: CREAM }}>{lbl}</span>
            </label>
          ))}
        </div>
      </div>

      {form.fatca_entity_type === 'financial_institution' && (
        <Field label="Global Intermediary Identification Number (GIIN), if applicable">
          <Input value={form.fatca_giin} onChange={v => set('fatca_giin', v)} placeholder="XXXXXXXXX.XXXXX.XX.XXX" />
        </Field>
      )}

      <Divider />

      <div>
        <p className={labelCls} style={labelStyle}>CRS — Are you a tax resident of any country other than Australia? (Section 7)</p>
        <RadioGroup label="" name="crs_foreign" value={form.crs_foreign_tax_resident}
          options={[{ value: 'true', label: 'Yes — complete details below' }, { value: 'false', label: 'No — proceed to next step' }]}
          onChange={v => set('crs_foreign_tax_resident', v === 'true')} />
      </div>

      {form.crs_foreign_tax_resident === true && (
        <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: `${GOLD}55` }}>
          {form.crs_countries.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Field label="Country">
                <Input value={c.country} onChange={v => {
                  const cs = [...form.crs_countries]; cs[i] = { ...c, country: v }; set('crs_countries', cs);
                }} />
              </Field>
              <Field label="TIN">
                <Input value={c.tin} onChange={v => {
                  const cs = [...form.crs_countries]; cs[i] = { ...c, tin: v }; set('crs_countries', cs);
                }} />
              </Field>
            </div>
          ))}
          <button type="button"
            onClick={() => set('crs_countries', [...form.crs_countries, { country: '', tin: '', no_tin_reason: '' }])}
            className="text-xs flex items-center gap-1.5" style={{ color: GOLD }}>
            <Plus size={12} /> Add country
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step: Declarations (Section 8, Version 2026.1) ───────────────────────────
const DECLARATION_POINTS = [
  'I/we have received and read the Information Memorandum (IM) dated 21 May 2026 and agree to be bound by its terms.',
  'All information and statements in this Application Form are true and correct. I/we will notify the Investment Manager immediately of any change.',
  'I/we am/are a Wholesale Client as defined in section 761G of the Corporations Act 2001 (Cth) and satisfy one or more wholesale client tests.',
  'I/we agree to be bound by the provisions of the Trust Deed as amended from time to time and acknowledge receipt of the Trust Deed or its summary.',
  'I/we have legal power to invest in the Fund and this application has been duly authorised by all necessary parties.',
  'I/we am/are acting in accordance with all designated powers and authorities under applicable law, and nothing prevents me/us from making this investment.',
  'I/we have all regulatory approvals required under the laws of Australia and any other relevant jurisdiction to enter into this investment.',
  'I/we acknowledge that by executing this form I/we make a legally binding commitment to invest the stated amount, subject to acceptance by the Investment Manager.',
  'I/we acknowledge that investments in the Fund are subject to risk, including possible loss of income and principal, and that past performance is not indicative of future performance.',
  'I/we have relied solely on my/our own independent investigation and professional advice in deciding to apply and have not relied on any representations outside the IM.',
  'I/we acknowledge that an investment in the Fund does not represent a deposit with any bank and is not guaranteed by any government or government agency.',
  'I/we consent to the collection and use of my/our personal information by the Investment Manager and its service providers for the purpose of managing my/our investment.',
  'I/we agree and consent to the electronic delivery of all Investor Communications, notices and reports relating to my/our investment.',
  'This application is not the result of any unsolicited meeting or telephone call, and I/we was/were not approached unsolicited in connection with this investment.',
];

export function StepDeclaration({ form, set }: StepProps) {
  const ticks = DECLARATION_POINTS.map((_, i) => form.declaration_ticks[i] === true);
  const allTicked = ticks.every(Boolean);
  const tick = (i: number, on: boolean) => {
    const next = ticks.slice();
    next[i] = on;
    set('declaration_ticks', next);
    if (!on) set('declaration_agreed', false);
  };


  return (
    <div className="space-y-5">
      <p className="text-sm opacity-60 leading-relaxed">
        By submitting this Application Form, I/we acknowledge and agree to each of the following
        declarations. Please mark each checkbox to confirm you have read and agreed to each point.
      </p>
      <div className="rounded-sm border divide-y" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        {DECLARATION_POINTS.map((pt, i) => (
          <label
            key={i}
            className="flex gap-3 p-4 cursor-pointer transition-colors hover:bg-white/[0.03]"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <input
              type="checkbox"
              checked={ticks[i]}
              onChange={e => tick(i, e.target.checked)}
              style={{ accentColor: GOLD, marginTop: 2, flexShrink: 0, width: 16, height: 16 }}
            />
            <span className="text-xs flex-shrink-0 mt-0.5 w-5" style={{ color: GOLD }}>{i + 1}.</span>
            <span className="text-sm leading-relaxed" style={{ color: ticks[i] ? CREAM : 'rgba(245,242,238,0.75)' }}>{pt}</span>
          </label>
        ))}
      </div>
      <label
        className={`flex items-start gap-3 rounded-sm p-4 transition-all ${allTicked ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
        style={{
          border: `1px solid ${form.declaration_agreed ? `${GOLD}88` : `${GOLD}44`}`,
          backgroundColor: form.declaration_agreed ? 'rgba(184,147,74,0.12)' : 'rgba(184,147,74,0.05)',
        }}
      >
        <input
          type="checkbox"
          checked={form.declaration_agreed && allTicked}
          disabled={!allTicked}
          onChange={e => set('declaration_agreed', e.target.checked)}
          style={{ accentColor: GOLD, marginTop: 3, flexShrink: 0, width: 18, height: 18 }}
        />
        <span className="text-sm font-semibold leading-relaxed" style={{ color: CREAM }}>
          I/We have read, understood and agree to ALL of the above declarations.
        </span>
      </label>
      <p className="text-xs opacity-50">
        {ticks.filter(Boolean).length} of {DECLARATION_POINTS.length} declarations ticked.
        Tick each declaration individually, then confirm the final agreement.
      </p>
    </div>
  );
}
