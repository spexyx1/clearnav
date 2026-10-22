import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, AlertCircle, Download, Link2, BadgeCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ApplicationFormData, INITIAL_FORM } from './applicationFormTypes';
import { PreparedContext, PreparedInfo, FieldChange } from './applicationFormFields';
import { GREEN, GOLD, CREAM, SERIF, SANS, FONT_URL } from './applicationTheme';
import {
  getSteps, STEP_LABELS, StepId, stepProblem,
  StepContact, StepInvestment, StepInvestorType, StepSectionA, StepSectionB, StepSectionC,
  StepSectionD, StepSectionE, StepBank, StepPaymentInfo, StepFatcaCrs, StepDeclaration,
} from './applicationSteps';
import ApplicationSigningStep from './ApplicationSigningStep';
import ApplicationStatusScreen, { LoadedApplication, NoticeScreen, Notice } from './ApplicationStatusScreen';

interface Props {
  onBack: () => void;
  onSign: (signerToken: string) => void;
}

const ARKLINE_TENANT_SLUG = 'arkline';
const RESUME_STORAGE_KEY = 'arkline_application_resume';
const EDITABLE = ['draft', 'sent', 'opened', 'in_progress'];
const TOKEN_RE = /^[a-f0-9]{64}$/;

type Phase =
  | { kind: 'loading' }
  | { kind: 'editing' }
  | { kind: 'status'; app: LoadedApplication }
  | { kind: 'notice'; notice: Notice };

interface ChangeRow { field: string; requested_value: unknown; status: FieldChange['status']; decision_note?: string | null }

function urlToken(): string | null {
  const t = new URLSearchParams(window.location.search).get('resume');
  return t && TOKEN_RE.test(t) ? t : null;
}

function storedToken(): string | null {
  try {
    const t = localStorage.getItem(RESUME_STORAGE_KEY);
    return t && TOKEN_RE.test(t) ? t : null;
  } catch {
    return null;
  }
}

function rememberToken(token: string | null) {
  try {
    if (token) localStorage.setItem(RESUME_STORAGE_KEY, token);
    else localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode); the resume link still works
  }
}

function rowToForm(row: Record<string, unknown>): ApplicationFormData {
  const initial = INITIAL_FORM as unknown as Record<string, unknown>;
  const next = { ...initial };
  for (const key of Object.keys(initial)) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    next[key] = typeof initial[key] === 'string' && typeof value === 'number' ? String(value) : value;
  }
  const ticks = Array.isArray(next.declaration_ticks) ? next.declaration_ticks as unknown[] : [];
  next.declaration_ticks = INITIAL_FORM.declaration_ticks.map((_, i) => ticks[i] === true);
  return next as unknown as ApplicationFormData;
}

function latestChanges(rows: ChangeRow[]): Record<string, FieldChange> {
  const out: Record<string, FieldChange> = {};
  for (const r of rows) out[r.field] = { status: r.status, decision_note: r.decision_note ?? null };
  return out;
}

export default function InvestorApplicationForm({ onBack, onSign }: Props) {
  const [form, setForm] = useState<ApplicationFormData>(INITIAL_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [stepError, setStepError] = useState('');
  const [resumeToken, setResumeToken] = useState<string | null>(() => urlToken() ?? storedToken());
  const [phase, setPhase] = useState<Phase>(() => (urlToken() ?? storedToken()) ? { kind: 'loading' } : { kind: 'editing' });
  const [restored, setRestored] = useState(false);
  const [prepared, setPrepared] = useState<PreparedInfo>({ fields: new Set(), changes: {} });
  const [linkCopied, setLinkCopied] = useState(false);
  const savingRef = useRef<Promise<string> | null>(null);

  const steps = getSteps(form);
  const currentStep: StepId = steps[Math.min(stepIndex, steps.length - 1)];
  const pendingChanges = Object.values(prepared.changes).filter(c => c.status === 'pending').length;

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const load = useCallback(async (token: string, fromUrl: boolean) => {
    setPhase({ kind: 'loading' });
    const { data, error } = await supabase.rpc('load_investor_application', { p_token: token });
    if (error) {
      setPhase({ kind: 'notice', notice: 'unavailable' });
      return;
    }
    const row = data as Record<string, unknown> | null;
    if (!row || typeof row !== 'object') {
      rememberToken(null);
      setResumeToken(null);
      setPhase(fromUrl ? { kind: 'notice', notice: 'invalid' } : { kind: 'editing' });
      return;
    }
    if (row.cancelled) {
      rememberToken(null);
      setPhase({ kind: 'notice', notice: 'cancelled' });
      return;
    }
    if (row.expired) {
      setPhase({ kind: 'notice', notice: 'expired' });
      return;
    }
    rememberToken(token);
    setResumeToken(token);
    const status = String(row.status ?? '');
    if (EDITABLE.includes(status) && !row.locked_at) {
      const changes = Array.isArray(row.change_requests) ? row.change_requests as ChangeRow[] : [];
      const overlay: Record<string, unknown> = {};
      for (const c of changes) if (c.status === 'pending') overlay[c.field] = c.requested_value;
      const preparedFields = row.prepared_fields && typeof row.prepared_fields === 'object' ? Object.keys(row.prepared_fields) : [];
      setForm(rowToForm({ ...row, ...overlay }));
      setPrepared({ fields: new Set(preparedFields), changes: latestChanges(changes) });
      setRestored(true);
      setPhase({ kind: 'editing' });
    } else {
      setPhase({ kind: 'status', app: row as unknown as LoadedApplication });
    }
  }, []);

  useEffect(() => {
    const fromUrl = urlToken();
    const token = fromUrl ?? storedToken();
    if (token) load(token, fromUrl !== null);
  }, [load]);

  const set = useCallback(<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setStepError('');
  }, []);

  async function persist(): Promise<string> {
    const pending = savingRef.current;
    const priorToken = pending ? await pending.catch(() => resumeToken) : resumeToken;
    const run = (async () => {
      const { data, error: rpcErr } = await supabase.rpc('save_investor_application', {
        p_token: priorToken,
        p_tenant_slug: ARKLINE_TENANT_SLUG,
        p_payload: buildPayload(form),
      });
      if (rpcErr) throw new Error(rpcErr.message || 'Could not save your application.');
      const result = data as { token?: string; change_requests?: ChangeRow[] } | null;
      if (!result?.token) throw new Error('Could not save your application.');
      const pendingNow = new Set((result.change_requests ?? []).map(c => c.field));
      setPrepared(prev => {
        const changes = { ...prev.changes };
        for (const f of prev.fields) {
          if (pendingNow.has(f)) changes[f] = { status: 'pending', decision_note: null };
          else if (changes[f]?.status === 'pending') delete changes[f];
        }
        return { ...prev, changes };
      });
      setResumeToken(result.token);
      rememberToken(result.token);
      return result.token;
    })();
    savingRef.current = run;
    try {
      return await run;
    } finally {
      if (savingRef.current === run) savingRef.current = null;
    }
  }

  async function saveDraft() {
    setSaving(true);
    setSaveError(false);
    try {
      await persist();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function copyResumeLink() {
    if (!resumeToken) return;
    const url = `${window.location.origin}/vault/apply?resume=${resumeToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      window.prompt('Copy your private resume link:', url);
    }
  }

  function goNext() {
    const problem = stepProblem(currentStep, form);
    if (problem) {
      setStepError(problem);
      return;
    }
    if (stepIndex < steps.length - 1) {
      saveDraft();
      setStepIndex(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  function goPrev() {
    setStepError('');
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (phase.kind === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-sm" style={{ backgroundColor: GREEN, fontFamily: SANS, color: CREAM }}>
        <Loader2 size={16} className="animate-spin" style={{ color: GOLD }} /> Opening your application...
      </div>
    );
  }
  if (phase.kind === 'notice') {
    return (
      <NoticeScreen
        notice={phase.notice}
        onBack={onBack}
        onRetry={resumeToken ? () => load(resumeToken, true) : undefined}
        onStartNew={() => {
          rememberToken(null);
          setResumeToken(null);
          window.history.replaceState({}, '', '/vault/apply');
          setPhase({ kind: 'editing' });
        }}
      />
    );
  }
  if (phase.kind === 'status' && resumeToken) {
    return (
      <ApplicationStatusScreen
        app={phase.app}
        resumeToken={resumeToken}
        onBack={onBack}
        onSign={onSign}
        onReload={() => load(resumeToken, false)}
      />
    );
  }

  const isLast = stepIndex >= steps.length - 1;

  return (
    <PreparedContext.Provider value={prepared}>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: GREEN, fontFamily: SANS, color: CREAM }}>
        <header className="flex-shrink-0 px-4 sm:px-6 py-5 flex items-center justify-between gap-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button onClick={onBack} className="flex items-center gap-2 text-sm opacity-50 hover:opacity-80 transition-opacity">
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Back to Documents</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: GOLD, color: GREEN }}>A</div>
            <span className="text-base tracking-widest uppercase" style={{ fontFamily: SERIF, fontWeight: 500, letterSpacing: '0.18em' }}>Arkline Trust</span>
          </div>
          <a
            href="/documents/Arkline_Trust_Application_Form.pdf"
            download="Arkline_Trust_Application_Form_2026.1.pdf"
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-sm transition-all hover:brightness-110"
            style={{ backgroundColor: 'rgba(184,147,74,0.15)', color: GOLD, border: `1px solid ${GOLD}44` }}
            title="Download the blank application form (Version 2026.1)"
          >
            <Download size={13} /> <span className="hidden sm:inline">Blank form</span>
          </a>
        </header>

        <div className="px-4 sm:px-6 pt-6 pb-0">
          <div className="max-w-3xl mx-auto">
            {restored && prepared.fields.size > 0 && (
              <div className="mb-5 px-4 py-3 rounded-sm text-sm flex items-start gap-2" style={{ backgroundColor: 'rgba(184,147,74,0.1)', border: `1px solid ${GOLD}33` }}>
                <BadgeCheck size={15} className="mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <span>
                  Arkline has filled in some details for you, marked <strong style={{ color: GOLD }}>Prepared by Arkline</strong>.
                  Please check them. If anything is wrong you can change it, and Arkline will review the change before you sign.
                </span>
              </div>
            )}
            {restored && prepared.fields.size === 0 && (
              <div className="mb-5 px-4 py-3 rounded-sm text-sm flex items-start gap-2" style={{ backgroundColor: 'rgba(184,147,74,0.1)', border: `1px solid ${GOLD}33` }}>
                <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <span>Welcome back. Your saved answers have been restored. Keep your private link safe; anyone with it can view this application.</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: GOLD, opacity: 0.8 }}>Step {stepIndex + 1} of {steps.length}</p>
              <p className="text-xs opacity-40">Application Form, Version 2026.1</p>
            </div>
            <div className="w-full rounded-full h-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div className="h-1 rounded-full transition-all duration-500" style={{ backgroundColor: GOLD, width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-8 pb-2">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-semibold mb-2" style={{ fontFamily: SERIF }}>{STEP_LABELS[currentStep]}</h1>
            <div className="w-10 h-px" style={{ backgroundColor: GOLD }} />
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="max-w-3xl mx-auto">
            {currentStep === 'execution' ? (
              <ApplicationSigningStep
                form={form}
                set={set}
                pendingChanges={pendingChanges}
                persist={persist}
                onElectronic={onSign}
                onPaper={token => load(token, false)}
              />
            ) : (
              <StepBody step={currentStep} form={form} set={set} />
            )}
            {stepError && (
              <div className="mt-6 flex items-start gap-2 px-4 py-3 rounded-sm text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {stepError}
              </div>
            )}
          </div>
        </main>

        <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t flex items-center justify-between gap-3" style={{ backgroundColor: GREEN, borderColor: 'rgba(255,255,255,0.1)' }}>
          <button
            onClick={goPrev}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-sm text-sm font-semibold transition-all disabled:opacity-30"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: CREAM, border: '1px solid rgba(255,255,255,0.14)' }}
          >
            <ChevronLeft size={15} /> <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-3 text-xs min-w-0">
            {saving && <span className="flex items-center gap-1.5 opacity-50"><Loader2 size={12} className="animate-spin" /> Saving...</span>}
            {!saving && saveError && (
              <span className="flex items-center gap-1.5" style={{ color: '#F2A7A0' }}><AlertCircle size={12} /> Not saved</span>
            )}
            {!saving && !saveError && resumeToken && (
              <button
                onClick={copyResumeLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all hover:brightness-125"
                style={{ color: GOLD, border: `1px solid ${GOLD}44`, backgroundColor: 'rgba(184,147,74,0.08)' }}
                title="Copy a private link to continue this application later"
              >
                {linkCopied ? <><CheckCircle size={12} /> Link copied</> : <><Link2 size={12} /> Save &amp; resume later</>}
              </button>
            )}
          </div>

          {isLast ? <span className="w-24" /> : (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-sm text-sm font-semibold transition-all hover:brightness-110"
              style={{ backgroundColor: GOLD, color: GREEN }}
            >
              Continue <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </PreparedContext.Provider>
  );
}

function StepBody({ step, form, set }: {
  step: StepId;
  form: ApplicationFormData;
  set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void;
}) {
  switch (step) {
    case 'contact':       return <StepContact form={form} set={set} />;
    case 'investment':    return <StepInvestment form={form} set={set} />;
    case 'investor_type': return <StepInvestorType form={form} set={set} />;
    case 'section_a':     return <StepSectionA form={form} set={set} />;
    case 'section_b':     return <StepSectionB form={form} set={set} />;
    case 'section_c':     return <StepSectionC form={form} set={set} />;
    case 'section_d':     return <StepSectionD form={form} set={set} />;
    case 'section_e':     return <StepSectionE form={form} set={set} />;
    case 'bank':          return <StepBank form={form} set={set} />;
    case 'payment_info':  return <StepPaymentInfo />;
    case 'fatca_crs':     return <StepFatcaCrs form={form} set={set} />;
    case 'declaration':   return <StepDeclaration form={form} set={set} />;
    default:              return null;
  }
}

function buildPayload(form: ApplicationFormData) {
  return {
    declaration_agreed: form.declaration_agreed && form.declaration_ticks.every(Boolean),
    declaration_ticks: form.declaration_ticks,

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
    a_wealth_other: form.a_wealth_other || null,

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
    b_wealth_other: form.b_wealth_other || null,

    c_company_name: form.c_company_name || null,
    c_abn_tfn: form.c_abn_tfn || null,
    c_acn: form.c_acn || null,
    c_arbn: form.c_arbn || null,
    c_afsl: form.c_afsl || null,
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
    c_wealth_other: form.c_wealth_other || null,

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
    d_wealth_other: form.d_wealth_other || null,

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
  };
}
