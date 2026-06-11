import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle, Loader2, AlertCircle,
  PenLine, Type, Download, Send, Plus, Trash2, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  ApplicationFormData, INITIAL_FORM, BLANK_DIRECTOR, BLANK_TRUSTEE,
  BLANK_BENEFICIAL_OWNER, BLANK_SIGNATURE, WEALTH_SOURCE_LABELS,
  WealthSource, Director, Trustee, BeneficialOwner, Signature,
} from './applicationFormTypes';

// ─── Arkline brand tokens ──────────────────────────────────────────────────────
const GREEN  = '#0E2219';
const GOLD   = '#B8934A';
const CREAM  = '#F5F2EE';
const SERIF  = '"Cormorant Garamond", Georgia, serif';
const SANS   = '"Nunito Sans", system-ui, sans-serif';

// ─── Shared field styles ───────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2.5 rounded-sm text-sm focus:outline-none transition-all';
const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: CREAM,
};
const labelCls = 'block text-xs font-semibold uppercase tracking-widest mb-1.5';
const labelStyle = { color: 'rgba(245,242,238,0.55)' };

// ─── Helpers ───────────────────────────────────────────────────────────────────
function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>
        {label}{required && <span style={{ color: GOLD }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
      style={inputStyle}
    />
  );
}

function Select({
  value, onChange, children, disabled,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={inputCls}
      style={{ ...inputStyle, backgroundImage: 'none' }}
    >
      {children}
    </select>
  );
}

function Textarea({
  value, onChange, rows = 3, placeholder,
}: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={inputCls}
      style={inputStyle}
    />
  );
}

function RadioGroup({
  label, name, value, options, onChange,
}: {
  label: string; name: string; value: string | boolean | null;
  options: { value: string | boolean; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className={labelCls} style={labelStyle}>{label}</p>
      <div className="flex flex-wrap gap-4">
        {options.map(opt => (
          <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange(String(opt.value))}
              style={{ accentColor: GOLD }}
            />
            <span style={{ color: CREAM }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxGroup({
  label, options, selected, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    selected.includes(v) ? onChange(selected.filter(s => s !== v)) : onChange([...selected, v]);
  return (
    <div>
      <p className={labelCls} style={labelStyle}>{label}</p>
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ color: CREAM }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ letter, title }: { letter: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: GOLD, color: GREEN, fontFamily: SERIF, fontSize: 16 }}
      >
        {letter}
      </div>
      <h3 className="text-xl font-semibold" style={{ fontFamily: SERIF, color: CREAM }}>
        {title}
      </h3>
    </div>
  );
}

function Divider() {
  return <div className="my-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />;
}

// ─── TIN block ─────────────────────────────────────────────────────────────────
function TinBlock({
  hasTin, tinCountries, noTinReason, onHasTin, onTinCountries, onNoTinReason, prefix,
}: {
  hasTin: boolean | null;
  tinCountries: { country: string; tin: string }[];
  noTinReason: string;
  onHasTin: (v: boolean | null) => void;
  onTinCountries: (v: { country: string; tin: string }[]) => void;
  onNoTinReason: (v: string) => void;
  prefix: string;
}) {
  return (
    <div className="space-y-4">
      <RadioGroup
        label="Do you have a Tax Identification Number (TIN)?"
        name={`${prefix}_has_tin`}
        value={hasTin}
        options={[
          { value: 'true', label: 'Yes — please provide TIN for each country' },
          { value: 'false', label: 'No' },
        ]}
        onChange={v => onHasTin(v === 'true')}
      />
      {hasTin === true && (
        <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: `${GOLD}55` }}>
          {tinCountries.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Field label="Country"><Input value={e.country} onChange={v => {
                const updated = [...tinCountries]; updated[i] = { ...e, country: v };
                onTinCountries(updated);
              }} /></Field>
              <Field label="TIN"><Input value={e.tin} onChange={v => {
                const updated = [...tinCountries]; updated[i] = { ...e, tin: v };
                onTinCountries(updated);
              }} /></Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onTinCountries([...tinCountries, { country: '', tin: '' }])}
            className="text-xs flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ color: GOLD }}
          >
            <Plus size={12} /> Add country
          </button>
        </div>
      )}
      {hasTin === false && (
        <div className="pl-4 border-l-2 space-y-2" style={{ borderColor: `${GOLD}55` }}>
          <p className={labelCls} style={labelStyle}>Reason</p>
          {[
            ['not_issued', 'The country of tax residency does not issue TINs'],
            ['no_tin', 'I have not been issued with a TIN'],
            ['not_required', 'The country of tax residency does not require the TIN to be disclosed'],
          ].map(([val, lbl]) => (
            <label key={val} className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input
                type="radio"
                name={`${prefix}_no_tin_reason`}
                checked={noTinReason === val}
                onChange={() => onNoTinReason(val)}
                style={{ accentColor: GOLD }}
              />
              <span style={{ color: CREAM }}>{lbl}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wealth sources ─────────────────────────────────────────────────────────────
function WealthSources({
  selected, otherText, onSelected, onOther, prefix,
}: {
  selected: WealthSource[]; otherText: string;
  onSelected: (v: WealthSource[]) => void;
  onOther: (v: string) => void;
  prefix: string;
}) {
  const toggle = (v: WealthSource) =>
    selected.includes(v)
      ? onSelected(selected.filter(s => s !== v))
      : onSelected([...selected, v]);

  return (
    <div>
      <p className={labelCls} style={labelStyle}>Source of Assets / Wealth Used for Investment</p>
      <div className="flex flex-col gap-2">
        {(Object.keys(WEALTH_SOURCE_LABELS) as WealthSource[]).map(k => (
          <label key={k} className="flex items-center gap-2.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selected.includes(k)}
              onChange={() => toggle(k)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ color: CREAM }}>{WEALTH_SOURCE_LABELS[k]}</span>
          </label>
        ))}
      </div>
      {selected.includes('other') && (
        <div className="mt-3">
          <Field label="Please specify">
            <Input value={otherText} onChange={onOther} placeholder="Describe your source of wealth" />
          </Field>
        </div>
      )}
    </div>
  );
}

// ─── Address block ──────────────────────────────────────────────────────────────
function AddressBlock({
  address, suburb, state, postcode, country,
  onAddress, onSuburb, onState, onPostcode, onCountry,
  label = 'Address',
}: {
  address: string; suburb: string; state: string; postcode: string; country: string;
  onAddress: (v: string) => void; onSuburb: (v: string) => void;
  onState: (v: string) => void; onPostcode: (v: string) => void;
  onCountry: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-3">
      <Field label={label}><Input value={address} onChange={onAddress} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Suburb / City"><Input value={suburb} onChange={onSuburb} /></Field>
        <Field label="State / Province"><Input value={state} onChange={onState} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Postcode / ZIP"><Input value={postcode} onChange={onPostcode} /></Field>
        <Field label="Country"><Input value={country} onChange={onCountry} /></Field>
      </div>
    </div>
  );
}

// ─── Signature pad ──────────────────────────────────────────────────────────────
function SignaturePad({
  sig, onChange, index,
}: { sig: Signature; onChange: (s: Signature) => void; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y); ctx.strokeStyle = CREAM; ctx.lineWidth = 2; ctx.stroke();
  }
  function endDraw() {
    drawing.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    onChange({ ...sig, data: canvas.toDataURL() });
  }
  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange({ ...sig, data: '' });
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-sm overflow-hidden relative"
        style={{ border: `1px solid ${GOLD}44`, backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <canvas
          ref={canvasRef}
          width={500} height={130}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        <p className="absolute bottom-2 right-3 text-xs opacity-20" style={{ color: CREAM, pointerEvents: 'none' }}>
          Sign here
        </p>
      </div>
      <button
        type="button"
        onClick={clearCanvas}
        className="text-xs transition-opacity hover:opacity-80"
        style={{ color: GOLD }}
      >
        Clear signature
      </button>
    </div>
  );
}

// ─── Step definitions ──────────────────────────────────────────────────────────
const ALL_STEPS = [
  'contact', 'investment', 'investor_type',
  'section_a', 'section_b', 'section_c', 'section_d', 'section_e',
  'bank', 'payment_info', 'fatca_crs', 'declaration', 'execution',
] as const;
type StepId = (typeof ALL_STEPS)[number];

function getSteps(form: ApplicationFormData): StepId[] {
  const t = form.investor_type;
  const needsA = ['individual', 'joint', 'regulated_trust_individual_trustee',
                  'unregulated_trust_individual_trustee'].includes(t);
  const needsB = t === 'joint';
  const needsC = ['aus_proprietary_company', 'aus_public_company',
                  'regulated_trust_corporate_trustee', 'unregulated_trust_corporate_trustee'].includes(t);
  const needsD = t.includes('trust');
  const needsE = needsC || needsD;

  return ALL_STEPS.filter(s => {
    if (s === 'section_a') return needsA;
    if (s === 'section_b') return needsB;
    if (s === 'section_c') return needsC;
    if (s === 'section_d') return needsD;
    if (s === 'section_e') return needsE;
    return true;
  });
}

const STEP_LABELS: Record<StepId, string> = {
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
  declaration:   'Declaration',
  execution:     'Signature',
};

// ─── Main component ─────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  passphrase: string;
}

const ARKLINE_TENANT_SLUG = 'arkline';

export default function InvestorApplicationForm({ onBack, passphrase }: Props) {
  const [form, setForm] = useState<ApplicationFormData>(INITIAL_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const steps = getSteps(form);
  const currentStep = steps[stepIndex];

  // Inject fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const set = useCallback(<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  async function getTenantId() {
    const { data } = await supabase
      .from('platform_tenants')
      .select('id')
      .eq('slug', ARKLINE_TENANT_SLUG)
      .maybeSingle();
    return data?.id ?? null;
  }

  async function saveDraft() {
    setSaving(true);
    setError('');
    try {
      const tenantId = await getTenantId();
      if (!tenantId) throw new Error('Unable to resolve tenant');

      const payload = buildPayload(form, tenantId, 'draft');
      if (applicationId) {
        await supabase.from('investor_applications').update(payload).eq('id', applicationId);
      } else {
        const { data, error: err } = await supabase
          .from('investor_applications')
          .insert(payload)
          .select('id')
          .single();
        if (err) throw err;
        setApplicationId(data.id);
      }
    } catch {
      // silent on draft save
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const tenantId = await getTenantId();
      if (!tenantId) throw new Error('Unable to resolve tenant');

      const payload = buildPayload(form, tenantId, 'submitted');
      let id = applicationId;

      if (id) {
        await supabase.from('investor_applications').update(payload).eq('id', id);
      } else {
        const { data, error: err } = await supabase
          .from('investor_applications')
          .insert(payload)
          .select('id')
          .single();
        if (err) throw err;
        id = data.id;
        setApplicationId(id);
      }

      // Trigger notification email
      await supabase.functions.invoke('send-application-notification', {
        body: { application_id: id },
      });

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (stepIndex < steps.length - 1) {
      saveDraft();
      setStepIndex(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  function goPrev() {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (submitted) return <SuccessScreen onBack={onBack} />;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: GREEN, fontFamily: SANS, color: CREAM }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 px-6 py-5 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-50 hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={16} /> Back to Documents
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: GOLD, color: GREEN }}
          >A</div>
          <span
            className="text-base tracking-widest uppercase"
            style={{ fontFamily: SERIF, fontWeight: 500, letterSpacing: '0.18em' }}
          >Arkline Trust</span>
        </div>
        <a
          href="/documents/Arkline_Trust_Application_Form_cleaned.pdf"
          download="Arkline_Trust_Application_Form.pdf"
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-sm transition-all hover:brightness-110"
          style={{ backgroundColor: 'rgba(184,147,74,0.15)', color: GOLD, border: `1px solid ${GOLD}44` }}
        >
          <Download size={13} /> Download PDF
        </a>
      </header>

      {/* Progress bar */}
      <div className="px-6 pt-6 pb-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: GOLD, opacity: 0.8 }}>
              Step {stepIndex + 1} of {steps.length}
            </p>
            <p className="text-xs opacity-40">{STEP_LABELS[currentStep]}</p>
          </div>
          <div className="w-full rounded-full h-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ backgroundColor: GOLD, width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex items-center justify-between mt-3 overflow-x-auto gap-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className="flex flex-col items-center gap-1 min-w-0"
                style={{ flex: '0 0 auto' }}
              >
                <div
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: i < stepIndex ? GOLD : i === stepIndex ? GOLD : 'rgba(255,255,255,0.2)',
                    transform: i === stepIndex ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page title */}
      <div className="px-6 pt-8 pb-2">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2" style={{ fontFamily: SERIF }}>
            {STEP_LABELS[currentStep]}
          </h1>
          <div className="w-10 h-px" style={{ backgroundColor: GOLD }} />
        </div>
      </div>

      {/* Step content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <StepContent
            step={currentStep}
            form={form}
            set={set}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        </div>
      </main>

      {/* Nav */}
      {currentStep !== 'execution' && (
        <div
          className="sticky bottom-0 px-6 py-4 border-t flex items-center justify-between gap-4"
          style={{ backgroundColor: GREEN, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <button
            onClick={goPrev}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-semibold transition-all disabled:opacity-30"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: CREAM, border: '1px solid rgba(255,255,255,0.14)' }}
          >
            <ChevronLeft size={15} /> Previous
          </button>

          <div className="flex items-center gap-2 text-xs opacity-30">
            {saving && <><Loader2 size={12} className="animate-spin" /> Saving...</>}
          </div>

          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: GOLD, color: GREEN }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step content router ───────────────────────────────────────────────────────
function StepContent({
  step, form, set, onSubmit, submitting, error,
}: {
  step: StepId;
  form: ApplicationFormData;
  set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  switch (step) {
    case 'contact':        return <StepContact form={form} set={set} />;
    case 'investment':     return <StepInvestment form={form} set={set} />;
    case 'investor_type':  return <StepInvestorType form={form} set={set} />;
    case 'section_a':      return <StepSectionA form={form} set={set} />;
    case 'section_b':      return <StepSectionB form={form} set={set} />;
    case 'section_c':      return <StepSectionC form={form} set={set} />;
    case 'section_d':      return <StepSectionD form={form} set={set} />;
    case 'section_e':      return <StepSectionE form={form} set={set} />;
    case 'bank':           return <StepBank form={form} set={set} />;
    case 'payment_info':   return <StepPaymentInfo />;
    case 'fatca_crs':      return <StepFatcaCrs form={form} set={set} />;
    case 'declaration':    return <StepDeclaration form={form} set={set} />;
    case 'execution':      return <StepExecution form={form} set={set} onSubmit={onSubmit} submitting={submitting} error={error} />;
    default:               return null;
  }
}

// ─── Step: Contact ─────────────────────────────────────────────────────────────
function StepContact({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm opacity-60 leading-relaxed">
        Please provide your primary contact details. We will use this address to send important
        notices, disclosure documents, and fund reports unless you opt out of electronic delivery.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Title">
          <Select value={form.contact_title} onChange={v => set('contact_title', v)}>
            <option value="">Select</option>
            {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Other'].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Given Name(s)" required>
          <Input value={form.contact_given_names} onChange={v => set('contact_given_names', v)} />
        </Field>
        <Field label="Surname" required>
          <Input value={form.contact_surname} onChange={v => set('contact_surname', v)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" required>
          <Input value={form.contact_phone} onChange={v => set('contact_phone', v)} type="tel" placeholder="+61 4XX XXX XXX" />
        </Field>
        <Field label="Email Address" required>
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
function StepInvestment({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
  const total =
    (parseFloat(form.amount_class_a) || 0) +
    (parseFloat(form.amount_class_b) || 0) +
    (parseFloat(form.amount_class_c) || 0);

  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60 leading-relaxed">
        Select one or more classes of Units in the Arkline Investment Trust to which you wish to
        apply. You must select at least one class for your application to be processed.
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
                <p className="text-sm font-semibold" style={{ color: CREAM }}>{label}</p>
                <p className="text-xs opacity-50 mt-0.5 leading-relaxed">{desc}</p>
                {form[boolKey] && (
                  <div className="mt-3">
                    <Field label="Committed Capital (AUD $)">
                      <Input
                        value={form[amtKey] as string}
                        onChange={v => set(amtKey, v)}
                        type="number"
                        placeholder="0.00"
                      />
                    </Field>
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
function StepInvestorType({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
  const options = [
    { value: 'individual',                              label: 'Individual / Joint Holding',                       sections: 'Section A (+ B for joint)' },
    { value: 'aus_proprietary_company',                 label: 'Australian Proprietary Company',                  sections: 'Sections C + E' },
    { value: 'aus_public_company',                      label: 'Australian Public Company',                       sections: 'Section C' },
    { value: 'regulated_trust_individual_trustee',      label: 'Regulated Trust — Individual Trustee',            sections: 'Sections C + D + E' },
    { value: 'unregulated_trust_corporate_trustee',     label: 'Unregulated Trust — Corporate Trustee',           sections: 'Sections A + D + E' },
    { value: 'unregulated_trust_individual_trustee',    label: 'Unregulated Trust — Individual Trustee',          sections: 'Sections C + D' },
    { value: 'regulated_trust_corporate_trustee',       label: 'Regulated Trust — Corporate Trustee',             sections: 'Sections A + D' },
  ];

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
function StepSectionA({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
function StepSectionB({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
function StepSectionC({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
function StepSectionD({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
function StepSectionE({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
            options={[{ value: 'corporate', label: 'Corporate' }, { value: 'trust', label: 'Trust' }]}
            onChange={v => updateOwner(i, { ...o, entity_type: v as 'corporate' | 'trust' })} />
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
function StepBank({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
function StepPaymentInfo() {
  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60 leading-relaxed">
        To finalise your application, please transfer your committed capital to the following
        account. Include your full name as the payment reference so we can match your payment
        to your application. If we are unable to match your application to a payment, processing
        may be delayed.
      </p>
      <div
        className="rounded-sm p-6 space-y-4"
        style={{ backgroundColor: 'rgba(184,147,74,0.08)', border: `1px solid ${GOLD}44` }}
      >
        <p className="text-base font-semibold" style={{ fontFamily: SERIF, color: GOLD }}>Electronic Funds Transfer Details</p>
        {[
          ['Bank', 'National Australia Bank (NAB)'],
          ['Account Name', 'Alara Funds Management Pty Ltd ATF Arkline Investment Trust'],
          ['BSB', '083-817'],
          ['Account Number', '57-644-5635'],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="text-xs uppercase tracking-widest opacity-50 sm:w-36 flex-shrink-0">{label}</span>
            <span className="text-sm font-semibold" style={{ color: CREAM }}>{value}</span>
          </div>
        ))}
        <div className="pt-2 border-t" style={{ borderColor: `${GOLD}33` }}>
          <span className="text-xs uppercase tracking-widest opacity-50">Reference</span>
          <p className="text-sm mt-1 opacity-70">Your full legal name — this is mandatory for matching.</p>
        </div>
      </div>
      <div
        className="rounded-sm p-4 text-xs leading-relaxed opacity-60"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        All relevant sections of this Application Form must be completed. If you have any queries,
        please contact the Administrator at{' '}
        <strong>info@arklineinvestments.com</strong> or phone{' '}
        <strong>+972 58 690 8899</strong>.
      </div>
    </div>
  );
}

// ─── Step: FATCA & CRS ─────────────────────────────────────────────────────────
function StepFatcaCrs({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
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
            ['other', 'Other (entities not previously listed)'],
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

// ─── Step: Declaration ─────────────────────────────────────────────────────────
const DECLARATION_POINTS = [
  'I/we have received and read the Information Memorandum (IM) dated 21 May 2026 for units in the classes of the Arkline Investment Trust (Fund) known as Class A — Opportunistic Strategy Portfolio, Class B — Quant Value Portfolio, and Class C — High Conviction Portfolio.',
  'My/our application is true and correct.',
  'I/we am/are a Wholesale Client as defined by the Corporations Act 2001 (Cth).',
  'I/we agree to be bound by the provisions of the Trust Deed as amended from time to time and this Application Form.',
  'I/we have legal power to invest.',
  'I/we am/are acting in accordance with my/our designated powers and authority under the relevant constituent documents, and the execution, delivery, and performance under this application has been authorised by all necessary action and persons.',
  'I/we have all regulatory approvals required in Australia and any other relevant jurisdiction to hold Units and become a Unitholder of the Fund.',
  'I/we acknowledge that by executing this Application Form, I/we make a legally binding commitment to invest the committed capital in the Fund on the terms set out in the IM and the Trust Deed.',
  'I/we acknowledge that investments in the Fund are subject to risks including but not limited to those outlined in the IM, including the possible loss of income or capital invested.',
  'I/we have relied on my/our own independent investigation, enquiries, and appraisals, and have obtained or had the opportunity to obtain legal, accounting, tax, and financial advice in connection with the Fund before deciding to subscribe for Units.',
  'I/we acknowledge that an investment in the Fund does not represent an investment in, or a deposit or other liability of, the Trustee, the Investment Manager, or their related entities, and none of them guarantee the performance of the Fund or any return of capital.',
  'I/we acknowledge that my/our personal information will be stored in an online registry system known as ClearNAV, maintained by Grey Alpha LLC, and that Grey Alpha LLC is not responsible for the terms of this offer and is not liable for any loss incurred from investing in this offer.',
  'I/we agree and consent to the electronic delivery of Investor Communications.',
  'This application is not the result of an unsolicited meeting with, or telephone call from, another person.',
];

function StepDeclaration({ form, set }: { form: ApplicationFormData; set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60 leading-relaxed">
        Please read the Information Memorandum and the Trust Deed carefully before signing this
        Application Form. Note that company applicants usually require two signatories.
      </p>
      <div
        className="rounded-sm border p-5 space-y-3 max-h-96 overflow-y-auto"
        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        {DECLARATION_POINTS.map((pt, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: GOLD }}>{i + 1}.</span>
            <p className="text-xs leading-relaxed opacity-70">{pt}</p>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.declaration_agreed}
          onChange={e => set('declaration_agreed', e.target.checked)}
          style={{ accentColor: GOLD, marginTop: 3, flexShrink: 0, width: 18, height: 18 }}
        />
        <span className="text-sm leading-relaxed" style={{ color: CREAM }}>
          I/we have read and understood all of the above declarations, representations, and
          warranties, and agree to be legally bound by them as at the date of this Application Form.
        </span>
      </label>
      {!form.declaration_agreed && (
        <p className="text-xs opacity-40">You must accept the declaration before proceeding to the signature step.</p>
      )}
    </div>
  );
}

// ─── Step: Execution / Signature ───────────────────────────────────────────────
function StepExecution({ form, set, onSubmit, submitting, error }: {
  form: ApplicationFormData;
  set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  const updateSig = (i: number, s: Signature) => {
    const sigs = [...form.signatures]; sigs[i] = s; set('signatures', sigs);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60 leading-relaxed">
        Please sign below as a deed poll. By signing you confirm all information provided is
        accurate and that you agree to be bound by the Trust Deed and this Application Form.
        Company applicants should provide two signatures where required.
      </p>

      <RadioGroup label="If signed by more than one person, who may operate the account?"
        name="multi_sig" value={form.multi_signatory}
        options={[{ value: 'false', label: 'Any one signatory may sign' }, { value: 'true', label: 'All signatories must sign together' }]}
        onChange={v => set('multi_signatory', v === 'true')} />

      <Divider />

      {form.signatures.map((sig, i) => (
        <div key={i} className="rounded-sm border p-5 space-y-5" style={{ borderColor: `${GOLD}33` }}>
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold" style={{ fontFamily: SERIF, color: GOLD }}>
              Signature {i + 1}
            </p>
            {form.signatures.length > 1 && (
              <button type="button"
                onClick={() => set('signatures', form.signatures.filter((_, j) => j !== i))}
                className="text-xs opacity-40 hover:opacity-70 flex items-center gap-1" style={{ color: CREAM }}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name"><Input value={sig.name} onChange={v => updateSig(i, { ...sig, name: v })} /></Field>
            <Field label="Date"><Input value={sig.date} onChange={v => updateSig(i, { ...sig, date: v })} type="date" /></Field>
          </div>

          <Field label="Title / Role">
            <Select value={sig.role} onChange={v => updateSig(i, { ...sig, role: v as Signature['role'] })}>
              <option value="">Select role</option>
              <option value="director">Director</option>
              <option value="sole_director_secretary">Sole Director and Sole Company Secretary</option>
              <option value="director_secretary">Director and Company Secretary</option>
              <option value="trustee">Trustee</option>
              <option value="individual">Individual</option>
              <option value="attorney">Attorney</option>
            </Select>
          </Field>

          <div>
            <p className={labelCls} style={labelStyle}>Signature Method</p>
            <div className="flex gap-3 mb-4">
              {([['draw', <PenLine size={14} />, 'Draw Signature'], ['type', <Type size={14} />, 'Type Signature']] as [string, React.ReactNode, string][]).map(([val, icon, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateSig(i, { ...sig, type: val as 'draw' | 'type' })}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: sig.type === val ? GOLD : 'rgba(255,255,255,0.07)',
                    color: sig.type === val ? GREEN : CREAM,
                    border: `1px solid ${sig.type === val ? GOLD : 'rgba(255,255,255,0.14)'}`,
                  }}
                >
                  {icon} {lbl}
                </button>
              ))}
            </div>

            {sig.type === 'draw' ? (
              <SignaturePad sig={sig} onChange={s => updateSig(i, s)} index={i} />
            ) : (
              <div>
                <Field label="Type your full name to create your signature">
                  <Input value={sig.data} onChange={v => updateSig(i, { ...sig, data: v })} placeholder="Your full legal name" />
                </Field>
                {sig.data && (
                  <div
                    className="mt-3 px-4 py-6 rounded-sm flex items-center justify-center"
                    style={{ borderBottom: `2px solid ${GOLD}99`, backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <span style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 28,
                      fontStyle: 'italic',
                      color: CREAM,
                      letterSpacing: 2,
                    }}>
                      {sig.data}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs">
            <input type="checkbox" checked={sig.is_electronic}
              onChange={e => updateSig(i, { ...sig, is_electronic: e.target.checked })}
              style={{ accentColor: GOLD }} />
            <span className="opacity-70">
              I confirm that I am signing this document electronically and consent to the use
              of an electronic signature.
            </span>
          </label>

          <Divider />
          <p className={labelCls} style={labelStyle}>Witness (if signing as an individual or attorney)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Witness Full Name">
              <Input value={sig.witness_name} onChange={v => updateSig(i, { ...sig, witness_name: v })} />
            </Field>
            <Field label="Witness Date">
              <Input value={sig.witness_date} onChange={v => updateSig(i, { ...sig, witness_date: v })} type="date" />
            </Field>
          </div>
          <Field label="Witness Address">
            <Input value={sig.witness_address} onChange={v => updateSig(i, { ...sig, witness_address: v })} />
          </Field>
        </div>
      ))}

      {form.signatures.length < 2 && (
        <button type="button"
          onClick={() => set('signatures', [...form.signatures, { ...BLANK_SIGNATURE }])}
          className="flex items-center gap-2 text-sm py-2.5 px-4 rounded-sm"
          style={{ backgroundColor: 'rgba(184,147,74,0.1)', color: GOLD, border: `1px solid ${GOLD}33` }}>
          <Plus size={14} /> Add Second Signatory
        </button>
      )}

      <Divider />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-sm text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!form.declaration_agreed && (
        <div className="flex items-center gap-2 p-4 rounded-sm text-xs opacity-70"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <AlertCircle size={14} style={{ color: GOLD }} />
          Please return to the Declaration step and accept the terms before submitting.
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !form.declaration_agreed}
        className="w-full py-4 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-40"
        style={{ backgroundColor: GOLD, color: GREEN }}
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" /> Submitting Application...</>
        ) : (
          <><Send size={16} /> Submit Application</>
        )}
      </button>

      <p className="text-xs text-center opacity-30 leading-relaxed">
        By submitting, you confirm this Application Form is executed as a Deed Poll in favour
        of the Trustee, the Investment Manager, and other Unitholders of the Fund.
      </p>
    </div>
  );
}

// ─── Success screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Nunito+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: GREEN, fontFamily: SANS, color: CREAM }}
    >
      <div className="text-center max-w-lg">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ backgroundColor: 'rgba(184,147,74,0.15)', border: `1px solid ${GOLD}55` }}
        >
          <CheckCircle size={40} style={{ color: GOLD }} />
        </div>
        <h1 className="text-4xl font-semibold mb-4" style={{ fontFamily: SERIF }}>Application Submitted</h1>
        <div className="w-10 h-px mx-auto my-4" style={{ backgroundColor: GOLD }} />
        <p className="text-sm leading-relaxed opacity-60 mb-8">
          Thank you for your application to invest in the Arkline Investment Trust. We have
          received your completed Application Form and our team will review it shortly.
          A confirmation has been sent to our team. You will receive correspondence at the
          email address you provided once your application has been assessed.
        </p>
        <div
          className="rounded-sm p-4 text-xs leading-relaxed opacity-60 mb-8"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="font-semibold mb-2" style={{ color: GOLD, opacity: 1 }}>Next Steps</p>
          Please ensure you have transferred your committed capital to the NAB account provided in
          your application (BSB: 083-817, Account: 57-644-5635), using your full legal name as the
          payment reference. Forward certified identification documents to{' '}
          <strong>info@arklineinvestments.com</strong>.
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/documents/Arkline_Trust_Application_Form_cleaned.pdf"
            download="Arkline_Trust_Application_Form.pdf"
            className="flex items-center gap-2 px-5 py-3 rounded-sm text-sm font-semibold transition-all"
            style={{ backgroundColor: 'rgba(184,147,74,0.12)', color: GOLD, border: `1px solid ${GOLD}44` }}
          >
            <FileText size={15} /> Download PDF Form
          </a>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: GOLD, color: GREEN }}
          >
            Return to Documents
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Build Supabase payload ─────────────────────────────────────────────────────
function buildPayload(form: ApplicationFormData, tenantId: string, status: string) {
  const totalCapital =
    (parseFloat(form.amount_class_a) || 0) +
    (parseFloat(form.amount_class_b) || 0) +
    (parseFloat(form.amount_class_c) || 0);

  return {
    tenant_id: tenantId,
    status,
    submitted_at: status === 'submitted' ? new Date().toISOString() : null,
    declaration_agreed: form.declaration_agreed,
    declaration_agreed_at: form.declaration_agreed ? new Date().toISOString() : null,

    contact_title: form.contact_title || null,
    contact_given_names: form.contact_given_names || null,
    contact_surname: form.contact_surname || null,
    contact_phone: form.contact_phone || null,
    contact_email: form.contact_email || null,
    postal_address: form.postal_address || null,
    postal_suburb: form.postal_suburb || null,
    postal_state: form.postal_state || null,
    postal_postcode: form.postal_postcode || null,
    postal_country: form.postal_country || null,

    invest_class_a: form.invest_class_a,
    invest_class_b: form.invest_class_b,
    invest_class_c: form.invest_class_c,
    amount_class_a: parseFloat(form.amount_class_a) || null,
    amount_class_b: parseFloat(form.amount_class_b) || null,
    amount_class_c: parseFloat(form.amount_class_c) || null,
    total_committed_capital: totalCapital || null,

    investor_type: form.investor_type || null,

    a_title: form.a_title || null,
    a_given_names: form.a_given_names || null,
    a_surname: form.a_surname || null,
    a_dob: form.a_dob || null,
    a_email: form.a_email || null,
    a_residential_address: form.a_residential_address || null,
    a_suburb: form.a_suburb || null,
    a_state: form.a_state || null,
    a_postcode: form.a_postcode || null,
    a_country: form.a_country || null,
    a_aus_tax_resident: form.a_aus_tax_resident,
    a_tfn: form.a_tfn || null,
    a_has_tin: form.a_has_tin,
    a_tin_countries: form.a_tin_countries,
    a_no_tin_reason: form.a_no_tin_reason || null,
    a_pep: form.a_pep,
    a_sole_trader: form.a_sole_trader,
    a_business_name: form.a_business_name || null,
    a_abn: form.a_abn || null,
    a_business_address: form.a_business_address || null,
    a_business_suburb: form.a_business_suburb || null,
    a_business_state: form.a_business_state || null,
    a_business_postcode: form.a_business_postcode || null,
    a_business_country: form.a_business_country || null,
    a_wealth_sources: form.a_wealth_sources,

    b_title: form.b_title || null,
    b_given_names: form.b_given_names || null,
    b_surname: form.b_surname || null,
    b_dob: form.b_dob || null,
    b_email: form.b_email || null,
    b_same_address_as_a: form.b_same_address_as_a,
    b_address: form.b_address || null,
    b_suburb: form.b_suburb || null,
    b_state: form.b_state || null,
    b_postcode: form.b_postcode || null,
    b_country: form.b_country || null,
    b_aus_tax_resident: form.b_aus_tax_resident,
    b_tfn: form.b_tfn || null,
    b_has_tin: form.b_has_tin,
    b_tin_countries: form.b_tin_countries,
    b_no_tin_reason: form.b_no_tin_reason || null,
    b_pep: form.b_pep,
    b_wealth_sources: form.b_wealth_sources,

    c_company_name: form.c_company_name || null,
    c_abn_tfn: form.c_abn_tfn || null,
    c_acn: form.c_acn || null,
    c_aus_tax_resident: form.c_aus_tax_resident,
    c_has_tin: form.c_has_tin,
    c_tin_countries: form.c_tin_countries,
    c_no_tin_reason: form.c_no_tin_reason || null,
    c_registered_address: form.c_registered_address || null,
    c_suburb: form.c_suburb || null,
    c_state: form.c_state || null,
    c_postcode: form.c_postcode || null,
    c_country: form.c_country || null,
    c_company_type: form.c_company_type || null,
    c_directors: form.c_directors,
    c_wealth_sources: form.c_wealth_sources,

    d_trustees: form.d_trustees,
    d_trust_name: form.d_trust_name || null,
    d_business_name: form.d_business_name || null,
    d_abn_tfn: form.d_abn_tfn || null,
    d_settlor: form.d_settlor || null,
    d_trust_type: form.d_trust_type || null,
    d_country_established: form.d_country_established || null,
    d_beneficiary_by_class: form.d_beneficiary_by_class,
    d_beneficiary_class_terms: form.d_beneficiary_class_terms || null,
    d_beneficiaries: form.d_beneficiaries,
    d_aus_tax_resident: form.d_aus_tax_resident,
    d_has_tin: form.d_has_tin,
    d_tin_countries: form.d_tin_countries,
    d_no_tin_reason: form.d_no_tin_reason || null,
    d_wealth_sources: form.d_wealth_sources,

    e_beneficial_owners: form.e_beneficial_owners,
    e_decision_makers: form.e_decision_makers,

    bank_reinvest: form.bank_reinvest,
    bank_institution_name: form.bank_institution_name || null,
    bank_account_name: form.bank_account_name || null,
    bank_bsb: form.bank_bsb || null,
    bank_account_number: form.bank_account_number || null,
    bank_swift: form.bank_swift || null,

    fatca_entity_type: form.fatca_entity_type || null,
    fatca_giin: form.fatca_giin || null,
    fatca_status: form.fatca_status || null,
    fatca_foreign_owners: form.fatca_foreign_owners,
    fatca_trust_status: form.fatca_trust_status || null,
    fatca_controlling_persons: form.fatca_controlling_persons,

    crs_foreign_tax_resident: form.crs_foreign_tax_resident,
    crs_countries: form.crs_countries,

    multi_signatory: form.multi_signatory,
    signatures: form.signatures,
  };
}
