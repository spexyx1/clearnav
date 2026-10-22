import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Mail, Loader2, CheckCircle2, AlertCircle, FileDown, PenLine, Clock } from 'lucide-react';
import { signingCall, downloadSigningPdf, ROLE_NAMES, type SignerSummary } from '../../lib/publicSigning';
import SignatureCapture, { type SignatureValue } from './SignatureCapture';
import { GREEN, GOLD, CREAM, SERIF, SANS, FONT_URL, inputCls, inputStyle, labelCls, labelStyle, primaryBtn, quietBtn, quietStyle, panelStyle, errorStyle } from './applicationTheme';

interface SignerView {
  role: SignerSummary['role'];
  name: string;
  email: string;
  title: string | null;
  verified: boolean;
  signed_at: string | null;
  applicant: string;
  status: string;
  signer_name?: string;
  signer_signed_at?: string | null;
  signer_place?: string;
  investor_type?: string;
  classes?: string[];
  signers?: { role: SignerSummary['role']; name: string; signed_at: string | null }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_MESSAGES: Record<string, string> = {
  awaiting_witness: 'Your signature is recorded. Your witness has been emailed a link to sign as your witness.',
  awaiting_second_signer: 'Your signature is recorded. The other signatory has been emailed to sign.',
  signed: 'All signatures are complete. A locked copy of the signed application has been emailed and Arkline will now review it.',
};

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: GREEN, color: CREAM, fontFamily: SANS }}>
      <link rel="stylesheet" href={FONT_URL} />
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <ShieldCheck size={22} style={{ color: GOLD }} />
          <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600 }}>Arkline Trust</span>
          <span className="ml-auto text-xs uppercase tracking-widest" style={{ color: 'rgba(245,242,238,0.45)' }}>Secure signing</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

function Message({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm p-8 text-center" style={panelStyle}>
      <div className="flex justify-center mb-4">{icon}</div>
      <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, lineHeight: 1.2 }}>{title}</h1>
      <div className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(245,242,238,0.7)' }}>{children}</div>
    </div>
  );
}

export default function SignApplicationPage() {
  const token = new URLSearchParams(window.location.search).get('t') ?? '';
  const [view, setView] = useState<SignerView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [signature, setSignature] = useState<SignatureValue | null>(null);
  const [place, setPlace] = useState('');
  const [title, setTitle] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessEmail, setWitnessEmail] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [consent, setConsent] = useState(false);
  const [doneStatus, setDoneStatus] = useState<string | null>(null);

  const onSignatureChange = useCallback((v: SignatureValue | null) => setSignature(v), []);

  useEffect(() => {
    if (!token) { setLoadError('This signing link is incomplete. Please open the link from your email again.'); return; }
    signingCall<SignerView>('signer_view', { token })
      .then(v => { setView(v); setTitle(v.title ?? ''); })
      .catch((e: Error) => setLoadError(e.message));
  }, [token]);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const sendCode = () => act(async () => { await signingCall('request_code', { token }); setCodeSent(true); });

  const verify = () => act(async () => {
    await signingCall('verify_code', { token, code });
    setView(v => (v ? { ...v, verified: true } : v));
  });

  if (loadError) {
    return <Shell><Message icon={<AlertCircle size={36} style={{ color: '#fca5a5' }} />} title="This link can't be used">{loadError}<p className="mt-3">If you think this is a mistake, contact applications@arklinetrust.com.</p></Message></Shell>;
  }
  if (!view) {
    return <Shell><div className="flex justify-center py-24"><Loader2 className="animate-spin" size={28} style={{ color: GOLD }} /></div></Shell>;
  }

  const isWitness = view.role.startsWith('witness');

  if (doneStatus || view.signed_at) {
    const msg = doneStatus
      ? (isWitness ? 'Thank you. Your signature as witness has been recorded.' : STATUS_MESSAGES[doneStatus] ?? 'Your signature has been recorded.')
      : 'You have already signed this application. No further action is needed from you.';
    return <Shell><Message icon={<CheckCircle2 size={40} style={{ color: GOLD }} />} title="Signature recorded">{msg}<p className="mt-3">No money should be transferred until Arkline sends written confirmation that your application has been accepted.</p></Message></Shell>;
  }

  const witnessInvalid = !isWitness && (
    !witnessName.trim() || !EMAIL_RE.test(witnessEmail.trim())
    || witnessEmail.trim().toLowerCase() === view.email.toLowerCase()
  );
  const fieldsMissing = isWitness ? (!address.trim() || !occupation.trim()) : (!place.trim() || witnessInvalid);
  const canSign = !!signature && consent && !fieldsMissing && !busy;

  const submit = () => act(async () => {
    if (!signature) return;
    const extra = isWitness
      ? { address: address.trim(), occupation: occupation.trim(), place: place.trim() }
      : { place: place.trim(), title: title.trim(), witness_name: witnessName.trim(), witness_email: witnessEmail.trim() };
    const res = await signingCall<{ ok: boolean; status: string }>('sign', { token, signature_type: signature.type, signature_data: signature.data, ...extra });
    setDoneStatus(res.status || 'signed');
  });

  return (
    <Shell>
      <p className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>{ROLE_NAMES[view.role]}</p>
      <h1 className="mt-2" style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, lineHeight: 1.2 }}>
        {isWitness ? `Witness ${view.signer_name || 'the signatory'}'s signature` : 'Sign your application'}
      </h1>
      <p className="mt-2 text-sm" style={{ color: 'rgba(245,242,238,0.65)' }}>
        Arkline Trust Application Form, Version 2026.1, for <strong style={{ color: CREAM }}>{view.applicant}</strong>.
      </p>

      {error && <div className="mt-6 rounded-sm px-4 py-3 text-sm flex gap-2" style={errorStyle}><AlertCircle size={16} className="shrink-0 mt-0.5" />{error}</div>}

      {!isWitness && (
        <section className="mt-8 rounded-sm p-6" style={panelStyle}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245,242,238,0.55)' }}>What you are signing</h2>
          <ul className="space-y-1 text-sm">{(view.classes ?? []).map(c => <li key={c}>{c}</li>)}</ul>
          {view.signers && view.signers.length > 0 && (
            <div className="mt-4 space-y-1 text-sm">
              {view.signers.map(s => (
                <div key={s.role} className="flex items-center gap-2" style={{ color: 'rgba(245,242,238,0.7)' }}>
                  {s.signed_at ? <CheckCircle2 size={14} style={{ color: GOLD }} /> : <Clock size={14} />}
                  {ROLE_NAMES[s.role]}: {s.name}{s.signed_at ? ' (signed)' : ''}
                </div>
              ))}
            </div>
          )}
          <button type="button" className={`${quietBtn} mt-5`} style={quietStyle} disabled={busy}
            onClick={() => act(() => downloadSigningPdf('signer_preview_pdf', { token }, 'Arkline_Trust_Application_Preview.pdf'))}>
            <FileDown size={15} /> Review the full application (PDF)
          </button>
        </section>
      )}

      {isWitness && (
        <section className="mt-8 rounded-sm p-6 text-sm leading-relaxed" style={panelStyle}>
          You have been named as the witness to <strong>{view.signer_name}</strong>'s signature{view.signer_place ? `, signed at ${view.signer_place}` : ''}.
          {' '}By signing you confirm you saw them sign, or that they confirmed the signature to you, and that you are over 18 and not a party to this application.
        </section>
      )}

      {!view.verified ? (
        <section className="mt-6 rounded-sm p-6" style={panelStyle}>
          <div className="flex items-center gap-2 mb-2"><Mail size={16} style={{ color: GOLD }} /><h2 className="font-semibold">Confirm your email</h2></div>
          <p className="text-sm" style={{ color: 'rgba(245,242,238,0.65)' }}>
            We'll send a 6-digit code to {maskEmail(view.email)} to confirm it's you before you sign.
          </p>
          {!codeSent ? (
            <button type="button" className={`${primaryBtn} mt-5`} style={{ backgroundColor: GOLD, color: GREEN }} disabled={busy} onClick={sendCode}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Email me a code
            </button>
          ) : (
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code"
                placeholder="000000" className={`${inputCls} sm:w-40 text-center tracking-[0.4em] text-lg`} style={inputStyle} />
              <button type="button" className={primaryBtn} style={{ backgroundColor: GOLD, color: GREEN }} disabled={busy || code.length !== 6} onClick={verify}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Confirm code
              </button>
              <button type="button" className="text-xs hover:opacity-80 sm:ml-auto" style={{ color: GOLD }} disabled={busy} onClick={sendCode}>Send a new code</button>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6 rounded-sm p-6 space-y-5" style={panelStyle}>
          <div className="flex items-center gap-2 text-sm" style={{ color: GOLD }}><CheckCircle2 size={15} /> Email confirmed: {view.email}</div>

          {isWitness ? (
            <>
              <div><label className={labelCls} style={labelStyle}>Your residential address</label>
                <input value={address} onChange={e => setAddress(e.target.value.slice(0, 300))} className={inputCls} style={inputStyle} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelCls} style={labelStyle}>Occupation</label>
                  <input value={occupation} onChange={e => setOccupation(e.target.value.slice(0, 120))} className={inputCls} style={inputStyle} /></div>
                <div><label className={labelCls} style={labelStyle}>Place of signing (optional)</label>
                  <input value={place} onChange={e => setPlace(e.target.value.slice(0, 120))} placeholder="City, country" className={inputCls} style={inputStyle} /></div>
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelCls} style={labelStyle}>Place of signing</label>
                  <input value={place} onChange={e => setPlace(e.target.value.slice(0, 120))} placeholder="City, country" className={inputCls} style={inputStyle} /></div>
                {view.investor_type !== 'individual' && (
                  <div><label className={labelCls} style={labelStyle}>Title / capacity (optional)</label>
                    <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder="e.g. Director" className={inputCls} style={inputStyle} /></div>
                )}
              </div>
              <div className="rounded-sm p-4" style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
                <p className="text-sm font-semibold mb-1">Your witness</p>
                <p className="text-xs mb-3" style={{ color: 'rgba(245,242,238,0.6)' }}>
                  An adult who is not part of this application. They will receive their own secure link and confirm their email before signing.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className={labelCls} style={labelStyle}>Witness full name</label>
                    <input value={witnessName} onChange={e => setWitnessName(e.target.value.slice(0, 120))} className={inputCls} style={inputStyle} /></div>
                  <div><label className={labelCls} style={labelStyle}>Witness email</label>
                    <input type="email" value={witnessEmail} onChange={e => setWitnessEmail(e.target.value.slice(0, 254))} className={inputCls} style={inputStyle} /></div>
                </div>
                {witnessEmail.trim().toLowerCase() === view.email.toLowerCase() && witnessEmail && (
                  <p className="text-xs mt-2" style={{ color: '#fca5a5' }}>Your witness needs their own email address.</p>
                )}
              </div>
            </>
          )}

          <div>
            <label className={labelCls} style={labelStyle}>Your signature</label>
            <SignatureCapture defaultName={view.name} onChange={onSignatureChange} />
          </div>

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 accent-[#B8934A]" />
            <span style={{ color: 'rgba(245,242,238,0.8)' }}>
              I, {view.name}, agree that this electronic signature is my legally binding signature
              {isWitness ? ' as witness' : ' on this application, and that I have read and agree to its declarations'}.
            </span>
          </label>

          <button type="button" className={`${primaryBtn} w-full`} style={{ backgroundColor: GOLD, color: GREEN }} disabled={!canSign} onClick={submit}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />} {isWitness ? 'Sign as witness' : 'Sign application'}
          </button>
        </section>
      )}
    </Shell>
  );
}
