import React, { useRef, useState } from 'react';
import {
  ChevronLeft, CheckCircle, Clock, Download, FileUp, Loader2, AlertCircle, PenLine,
  Unlock, XCircle, Link2Off, Hourglass, WifiOff, Printer, BadgeCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GREEN, GOLD, CREAM, SERIF, SANS, primaryBtn, quietBtn, quietStyle, panelStyle, errorStyle } from './applicationTheme';
import { signingCall, downloadSigningPdf, fileToBase64, SignerSummary, ROLE_NAMES } from '../../lib/publicSigning';

export interface LoadedApplication {
  status: string;
  locked_at: string | null;
  sign_method: 'electronic' | 'paper' | null;
  has_signed_pdf: boolean;
  has_paper_scan: boolean;
  signers: SignerSummary[];
  reviewer_notes: string | null;
  contact_given_names: string | null;
}

export type Notice = 'invalid' | 'cancelled' | 'expired' | 'unavailable';

function Shell({ icon: Icon, tone = GOLD, title, onBack, children }: {
  icon: React.ElementType; tone?: string; title: string; onBack: () => void; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: GREEN, fontFamily: SANS, color: CREAM }}>
      <header className="px-4 sm:px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm opacity-50 hover:opacity-80 transition-opacity">
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Back to Documents</span>
        </button>
        <span className="text-base tracking-widest uppercase" style={{ fontFamily: SERIF, fontWeight: 500, letterSpacing: '0.18em' }}>Arkline Trust</span>
        <span className="w-16" />
      </header>
      <main className="flex-1 px-4 sm:px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${tone}1f`, border: `1px solid ${tone}55` }}>
            <Icon size={24} style={{ color: tone }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-4" style={{ fontFamily: SERIF }}>{title}</h1>
          <div className="space-y-5 text-sm leading-relaxed">{children}</div>
          <p className="mt-10 text-xs opacity-40">
            Questions? Email <a className="underline" href="mailto:applications@arklinetrust.com">applications@arklinetrust.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-sm text-sm" style={errorStyle}>
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {text}
    </div>
  );
}

export function NoticeScreen({ notice, onBack, onRetry, onStartNew }: {
  notice: Notice; onBack: () => void; onRetry?: () => void; onStartNew: () => void;
}) {
  const view = {
    invalid: { icon: Link2Off, title: 'This link is not valid', text: 'We could not find an application for this link. It may have been replaced by a newer link. Please use the most recent email from Arkline, or start a new application.' },
    cancelled: { icon: XCircle, title: 'This application was withdrawn', text: 'Arkline has cancelled this application link. If you think this is a mistake, please contact us and we will send you a new one.' },
    expired: { icon: Hourglass, title: 'This link has expired', text: 'For your security, application links expire after a set time. Your answers are saved. Please ask Arkline to send you a new link to continue.' },
    unavailable: { icon: WifiOff, title: 'We could not open your application', text: 'Something went wrong while loading. Please check your connection and try again.' },
  }[notice];
  return (
    <Shell icon={view.icon} title={view.title} onBack={onBack} tone={notice === 'unavailable' ? GOLD : '#fca5a5'}>
      <p className="opacity-70">{view.text}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        {notice === 'unavailable' && onRetry && (
          <button onClick={onRetry} className={primaryBtn} style={{ backgroundColor: GOLD, color: GREEN }}>Try again</button>
        )}
        {notice === 'invalid' && (
          <button onClick={onStartNew} className={quietBtn} style={quietStyle}>Start a new application</button>
        )}
      </div>
    </Shell>
  );
}

function SignerList({ signers }: { signers: SignerSummary[] }) {
  if (signers.length === 0) return null;
  return (
    <div className="rounded-sm divide-y" style={{ ...panelStyle }}>
      {signers.map(s => (
        <div key={s.role} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{s.name}</p>
            <p className="text-xs opacity-50">{ROLE_NAMES[s.role]}</p>
          </div>
          {s.signed_at ? (
            <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: '#86efac' }}><CheckCircle size={13} /> Signed</span>
          ) : (
            <span className="flex items-center gap-1 text-xs flex-shrink-0 opacity-60"><Clock size={13} /> Waiting</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ApplicationStatusScreen({ app, resumeToken, onBack, onSign, onReload }: {
  app: LoadedApplication;
  resumeToken: string;
  onBack: () => void;
  onSign: (signerToken: string) => void;
  onReload: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const signers = app.signers ?? [];
  const nobodySigned = signers.every(s => !s.signed_at);

  async function act(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const unlock = () => act('unlock', async () => {
    const { error: err } = await supabase.rpc('unlock_investor_application', { p_token: resumeToken });
    if (err) throw new Error(err.message);
    onReload();
  });

  const downloadSigned = () => act('signed', () =>
    downloadSigningPdf('signed_pdf', { resume_token: resumeToken }, 'Arkline_Trust_Signed_Application.pdf'));

  const signedCopyButton = app.has_signed_pdf && (
    <button onClick={downloadSigned} disabled={busy !== null} className={quietBtn} style={quietStyle}>
      {busy === 'signed' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download your signed copy
    </button>
  );

  if (app.status === 'in_progress' && app.sign_method === 'paper') {
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      act('upload', async () => {
        if (file.size > 10 * 1024 * 1024) throw new Error('Please upload a file under 10 MB.');
        await signingCall('upload_paper', { resume_token: resumeToken, file_base64: await fileToBase64(file) });
        onReload();
      });
    };
    return (
      <Shell icon={Printer} title="Print, sign and upload" onBack={onBack}>
        <ol className="space-y-4">
          {[
            ['Download your pre-filled form', 'It contains every answer you gave, in the official Version 2026.1 layout.'],
            ['Sign in front of a witness', 'Each signatory signs and dates the execution page. Your witness must not be related to you and adds their name, address, occupation and the date.'],
            ['Upload the signed form', 'A PDF scan is best. Clear photos (JPG or PNG) of every page also work. Maximum 10 MB.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: GOLD, color: GREEN }}>{i + 1}</span>
              <div><p className="font-semibold">{t}</p><p className="opacity-60 text-xs mt-0.5">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => act('prefilled', () => downloadSigningPdf('prefilled_pdf', { resume_token: resumeToken }, 'Arkline_Trust_Application_Form_2026.1.pdf'))}
            disabled={busy !== null} className={quietBtn} style={quietStyle}
          >
            {busy === 'prefilled' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download pre-filled form
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy !== null} className={primaryBtn} style={{ backgroundColor: GOLD, color: GREEN }}>
            {busy === 'upload' ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />} Upload signed form
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={onFile} />
        </div>
        <ErrorLine text={error} />
        <button onClick={unlock} disabled={busy !== null} className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100">
          {busy === 'unlock' ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />} Unlock to change answers or choose online signing instead
        </button>
      </Shell>
    );
  }

  if (app.status === 'in_progress' && app.sign_method === 'electronic') {
    return (
      <Shell icon={PenLine} title="Ready for your signature" onBack={onBack}>
        <p className="opacity-70">Your answers are locked so everyone signs the same document. Continue to confirm your email and sign.</p>
        <SignerList signers={signers} />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => act('resume', async () => {
              const res = await signingCall<{ signer_token?: string }>('resume_signing', { resume_token: resumeToken });
              if (!res.signer_token) throw new Error('Signing could not be resumed. Please try again.');
              onSign(res.signer_token);
            })}
            disabled={busy !== null} className={primaryBtn} style={{ backgroundColor: GOLD, color: GREEN }}
          >
            {busy === 'resume' ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />} Continue to signing
          </button>
          {nobodySigned && (
            <button onClick={unlock} disabled={busy !== null} className={quietBtn} style={quietStyle}>
              {busy === 'unlock' ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />} Unlock to make changes
            </button>
          )}
        </div>
        <ErrorLine text={error} />
      </Shell>
    );
  }

  if (app.status === 'awaiting_witness' || app.status === 'awaiting_second_signer') {
    return (
      <Shell icon={Hourglass} title={app.status === 'awaiting_witness' ? 'Waiting for your witness' : 'Waiting for the second signatory'} onBack={onBack}>
        <p className="opacity-70">
          {app.status === 'awaiting_witness'
            ? 'We have emailed your witness a private link. They will confirm their email and sign. Once everyone has signed, you will receive the completed PDF by email.'
            : 'We have emailed the second signatory a private link to review and sign. Once everyone has signed, you will receive the completed PDF by email.'}
        </p>
        <SignerList signers={signers} />
        <button onClick={onReload} className={quietBtn} style={quietStyle}>Refresh progress</button>
      </Shell>
    );
  }

  if (app.status === 'paper_received') {
    return (
      <Shell icon={CheckCircle} tone="#86efac" title="Signed copy received" onBack={onBack}>
        <p className="opacity-70">Thank you. Arkline has your signed paper copy and will check it shortly. We will email you once your application has been reviewed.</p>
        <p className="opacity-50 text-xs">Please do not transfer any money until you receive written confirmation that your application has been accepted.</p>
      </Shell>
    );
  }

  if (app.status === 'approved') {
    return (
      <Shell icon={BadgeCheck} tone="#86efac" title="Application accepted" onBack={onBack}>
        <p className="opacity-70">
          Welcome to Arkline Trust. We have emailed you written confirmation together with payment details.
          Units are issued at the next monthly dealing date, at the unit price confirmed for that month.
        </p>
        <div className="flex flex-wrap gap-3">{signedCopyButton}</div>
        <ErrorLine text={error} />
      </Shell>
    );
  }

  if (app.status === 'rejected') {
    return (
      <Shell icon={XCircle} tone="#fca5a5" title="Application not accepted" onBack={onBack}>
        <p className="opacity-70">Arkline was unable to accept this application.</p>
        {app.reviewer_notes && (
          <div className="rounded-sm p-4" style={panelStyle}>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Reason</p>
            <p>{app.reviewer_notes}</p>
          </div>
        )}
      </Shell>
    );
  }

  return (
    <Shell icon={CheckCircle} tone="#86efac" title="Application signed" onBack={onBack}>
      <p className="opacity-70">
        Thank you{app.contact_given_names ? `, ${app.contact_given_names}` : ''}. Your application is signed and with Arkline for review.
        {app.has_signed_pdf ? ' A locked copy with its signing record has been emailed to you.' : ' Your locked signed copy is being prepared.'}
      </p>
      <p className="opacity-50 text-xs">Please do not transfer any money until you receive written confirmation that your application has been accepted.</p>
      <div className="flex flex-wrap gap-3">{signedCopyButton}</div>
      <ErrorLine text={error} />
    </Shell>
  );
}
