import { useState } from 'react';
import { PenLine, Printer, Loader2, AlertCircle, Clock, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { ApplicationFormData } from './applicationFormTypes';
import { Field, Input, RadioGroup } from './applicationFormFields';
import { GOLD, GREEN, CREAM, SERIF, primaryBtn, panelStyle, errorStyle } from './applicationTheme';
import { signingCall } from '../../lib/publicSigning';

interface SignerInput { name: string; email: string; title: string }

interface Props {
  form: ApplicationFormData;
  set: <K extends keyof ApplicationFormData>(k: K, v: ApplicationFormData[K]) => void;
  pendingChanges: number;
  persist: () => Promise<string>;
  onElectronic: (signerToken: string) => void;
  onPaper: (resumeToken: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplicationSigningStep({ form, set, pendingChanges, persist, onElectronic, onPaper }: Props) {
  const isJoint = form.investor_type === 'joint';
  const isIndividual = form.investor_type === 'individual';
  const [method, setMethod] = useState<'electronic' | 'paper'>('electronic');
  const [signers, setSigners] = useState<SignerInput[]>(() => {
    const first = {
      name: [form.contact_given_names, form.contact_surname].filter(Boolean).join(' '),
      email: form.contact_email,
      title: isIndividual || isJoint ? '' : 'Director',
    };
    if (!isJoint) return [first];
    return [first, { name: [form.b_given_names, form.b_surname].filter(Boolean).join(' '), email: form.b_email, title: '' }];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const two = signers.length === 2;
  const updateSigner = (i: number, patch: Partial<SignerInput>) =>
    setSigners(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function problem(): string | null {
    if (pendingChanges > 0) return 'Arkline needs to review your requested changes before you can sign.';
    if (form.declaration_ticks.some(t => !t) || !form.declaration_agreed) return 'Please go back and tick all 14 declarations and the final agreement.';
    if (signers.some(s => !s.name.trim() || !EMAIL_RE.test(s.email.trim()))) return 'Enter a full name and a valid email address for each signatory.';
    if (two && signers[0].email.trim().toLowerCase() === signers[1].email.trim().toLowerCase()) return 'Each signatory needs their own email address.';
    if (isJoint && !two) return 'Joint applications must be signed by both investors.';
    if (two && form.multi_signatory === null) return 'Please choose how the signatories may operate the account.';
    return null;
  }

  async function start() {
    const p = problem();
    if (p) { setError(p); return; }
    setBusy(true);
    setError('');
    try {
      const token = await persist();
      const res = await signingCall<{ ok?: boolean; method?: string; signer_token?: string }>('start_signing', {
        resume_token: token,
        method,
        signers: signers.map(s => ({ name: s.name.trim(), email: s.email.trim(), title: s.title.trim() })),
        authority: form.multi_signatory ? 'all' : 'any',
      });
      if (method === 'electronic') {
        if (!res.signer_token) throw new Error('Signing could not be started. Please try again.');
        onElectronic(res.signer_token);
      } else {
        onPaper(token);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signing could not be started. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <p className="text-sm opacity-70 leading-relaxed">
        The Applicant(s) must sign this form. For companies, sign in accordance with section 127 of
        the Corporations Act or by an authorised signatory. For trusts, all trustees must sign. All
        signatures must be witnessed by a person not related to the applicant.
      </p>

      {pendingChanges > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm" style={{ backgroundColor: 'rgba(184,147,74,0.1)', border: `1px solid ${GOLD}55`, color: CREAM }}>
          <Clock size={15} className="mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
          <span>
            You asked to change {pendingChanges === 1 ? 'a detail' : `${pendingChanges} details`} that Arkline prepared.
            Arkline will review {pendingChanges === 1 ? 'it' : 'them'} and you will be able to sign once that is done.
            Use your private link to come back.
          </span>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245,242,238,0.55)' }}>How would you like to sign?</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            ['electronic', PenLine, 'Sign online', 'Confirm your email with a one-time code, then draw or type your signature. Your witness signs through their own private link.'],
            ['paper', Printer, 'Print and sign', 'Download your pre-filled form, sign it in front of your witness, then upload a scan or photo of the signed pages.'],
          ] as const).map(([value, Icon, title, desc]) => {
            const on = method === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className="text-left rounded-sm p-5 transition-all hover:brightness-125"
                style={{ border: `1px solid ${on ? `${GOLD}99` : 'rgba(255,255,255,0.12)'}`, backgroundColor: on ? 'rgba(184,147,74,0.1)' : 'rgba(255,255,255,0.03)' }}
              >
                <Icon size={18} style={{ color: on ? GOLD : 'rgba(245,242,238,0.5)' }} />
                <p className="mt-3 text-base font-semibold" style={{ fontFamily: SERIF, color: CREAM }}>{title}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-60">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {signers.map((s, i) => (
        <div key={i} className="rounded-sm p-5 space-y-4" style={panelStyle}>
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold" style={{ fontFamily: SERIF, color: GOLD }}>Signatory {i + 1}</p>
            {i === 1 && !isJoint && (
              <button type="button" onClick={() => setSigners(prev => prev.slice(0, 1))} className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100" style={{ color: '#fca5a5' }}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          {i === 1 && <p className="text-xs opacity-50 -mt-2">Required for joint applications and company applications with 2 directors.</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" required><Input value={s.name} onChange={v => updateSigner(i, { name: v })} /></Field>
            <Field label="Email address" required><Input type="email" value={s.email} onChange={v => updateSigner(i, { email: v })} /></Field>
          </div>
          {!isIndividual && !isJoint && (
            <Field label="Title / capacity"><Input value={s.title} onChange={v => updateSigner(i, { title: v })} placeholder="e.g. Director, Trustee, Company Secretary" /></Field>
          )}
          {method === 'electronic' && (
            <p className="text-xs opacity-50">
              {i === 0 ? 'You will sign next, straight after this step.' : 'We will email this person a private link to sign.'}
              {' '}Each signatory nominates their own witness when they sign.
            </p>
          )}
        </div>
      ))}

      {!two && !isIndividual && (
        <button type="button" onClick={() => setSigners(prev => [...prev, { name: '', email: '', title: 'Director' }])} className="flex items-center gap-1.5 text-sm" style={{ color: GOLD }}>
          <Plus size={14} /> Add a second signatory
        </button>
      )}

      {two && (
        <RadioGroup
          label="Signatory authority"
          name="signatory_authority"
          value={form.multi_signatory === null ? null : form.multi_signatory ? 'all' : 'any'}
          options={[
            { value: 'any', label: 'Any one signatory may operate the account' },
            { value: 'all', label: 'All signatories must act together' },
          ]}
          onChange={v => set('multi_signatory', v === 'all')}
        />
      )}

      <div className="flex items-start gap-2 text-xs leading-relaxed opacity-60">
        <ShieldCheck size={14} className="mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
        <span>
          Starting the signing step locks your answers so everyone signs the same document. You can
          unlock it to make changes until the first signature is added. Once everyone has signed, you
          will receive a locked PDF copy with a signing record.
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm" style={errorStyle}>
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <button onClick={start} disabled={busy || pendingChanges > 0} className={`${primaryBtn} w-full sm:w-auto`} style={{ backgroundColor: GOLD, color: GREEN }}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : method === 'electronic' ? <PenLine size={15} /> : <Printer size={15} />}
        {method === 'electronic' ? 'Save and continue to signing' : 'Save and prepare my printable form'}
      </button>
    </div>
  );
}
