import { useState, useEffect } from 'react';
import { Lock, Unlock, FileText, Download, ExternalLink, AlertCircle, Loader2, MapPin, Mail, ChevronLeft, BookOpen, ClipboardList } from 'lucide-react';

interface VaultDocument {
  id: string;
  document_name: string;
  document_type: string;
  description: string;
  sort_order: number;
  signed_url: string | null;
  internal_path?: string | null;
}

interface InvestorVaultProps {
  onBack: () => void;
  onOpenReport: (passphrase: string) => void;
  onApply: (passphrase: string) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const DOC_TYPE_LABELS: Record<string, string> = {
  pitch_deck:       'Pitch Deck',
  term_sheet:       'Term Sheet',
  one_pager:        'One-Pager',
  trade_history:    'Trade History',
  strategy_report:  'Strategy Report',
  application_form: 'Application Form',
  other:            'Document',
};

const DOC_TYPE_ICONS: Record<string, string> = {
  pitch_deck:       '📊',
  term_sheet:       '📋',
  one_pager:        '📄',
  trade_history:    '📈',
  strategy_report:  '🔬',
  application_form: '📝',
  other:            '📎',
};

export default function InvestorVault({ onBack, onOpenReport, onApply }: InvestorVaultProps) {
  const [phase, setPhase] = useState<'gate' | 'loading' | 'documents' | 'error'>('gate');
  const [passphrase, setPassphrase] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [generalError, setGeneralError] = useState('');

  // Inject Google Fonts for Arkline brand typography
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Nunito+Sans:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setSubmitting(true);
    setAuthError('');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-vault-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: passphrase.trim(), tenant_slug: 'arkline' }),
      });

      if (res.status === 401) {
        setAuthError('Incorrect passphrase. Please try again.');
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();
      setDocuments(data.documents ?? []);
      setPhase('documents');
    } catch {
      setGeneralError('Unable to connect. Please try again shortly.');
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#0E2219',
        fontFamily: '"Nunito Sans", system-ui, sans-serif',
        color: '#F5F2EE',
      }}
    >
      {/* Subtle header */}
      <header className="flex-shrink-0 px-6 py-5 flex items-center justify-between border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: '#F5F2EE' }}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
          >
            A
          </div>
          <span
            className="text-base tracking-widest uppercase"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500, letterSpacing: '0.18em' }}
          >
            Arkline Trust
          </span>
        </div>
        <div className="w-20" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">

        {/* PASSWORD GATE */}
        {phase === 'gate' && (
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: 'rgba(184,147,74,0.15)', border: '1px solid rgba(184,147,74,0.3)' }}
              >
                <Lock size={28} style={{ color: '#B8934A' }} />
              </div>
              <h1
                className="text-3xl md:text-4xl font-semibold mb-3 tracking-tight"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
              >
                Investor Documents
              </h1>
              <div
                className="w-10 h-px mx-auto my-4"
                style={{ backgroundColor: '#B8934A' }}
              />
              <p className="text-sm leading-relaxed opacity-60 max-w-xs mx-auto">
                This area contains confidential materials prepared exclusively for prospective wholesale investors. Enter your access passphrase to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-widest mb-2 opacity-50"
                >
                  Access Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setAuthError(''); }}
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 rounded-sm text-sm focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: authError ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.12)',
                    color: '#F5F2EE',
                  }}
                  placeholder="Enter passphrase"
                  disabled={submitting}
                />
                {authError && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                    <AlertCircle size={13} />
                    <span>{authError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !passphrase.trim()}
                className="w-full py-3.5 rounded-sm text-sm font-semibold tracking-wide transition-all hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                ) : (
                  <><Unlock size={16} /> Access Documents</>
                )}
              </button>
            </form>

            <p className="text-center text-xs opacity-30 mt-8">
              Don't have a passphrase? Contact{' '}
              <a href="mailto:enquiries@arklinetrust.com" className="underline opacity-70 hover:opacity-100">
                enquiries@arklinetrust.com
              </a>
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {phase === 'error' && (
          <div className="text-center max-w-sm">
            <AlertCircle size={40} className="mx-auto mb-4 opacity-40" />
            <p className="text-sm opacity-60 mb-6">{generalError}</p>
            <button
              onClick={() => { setPhase('gate'); setGeneralError(''); }}
              className="px-6 py-2.5 rounded-sm text-sm font-semibold"
              style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* DOCUMENTS VIEW */}
        {phase === 'documents' && (
          <div className="w-full max-w-5xl">
            <div className="text-center mb-12">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: 'rgba(184,147,74,0.15)', border: '1px solid rgba(184,147,74,0.3)' }}
              >
                <Unlock size={24} style={{ color: '#B8934A' }} />
              </div>
              <h1
                className="text-3xl md:text-4xl font-semibold mb-2 tracking-tight"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
              >
                Investor Documents
              </h1>
              <div
                className="w-10 h-px mx-auto my-4"
                style={{ backgroundColor: '#B8934A' }}
              />
              <p className="text-sm opacity-50">
                Confidential — For Prospective Wholesale Investors Only
              </p>
            </div>

            {documents.length === 0 ? (
              <div
                className="text-center py-16 rounded-sm border"
                style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                <FileText size={36} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm opacity-40">Documents are being prepared and will appear here shortly.</p>
                <p className="text-xs opacity-25 mt-2">
                  Contact{' '}
                  <a href="mailto:enquiries@arklinetrust.com" className="underline">
                    enquiries@arklinetrust.com
                  </a>{' '}
                  for immediate assistance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col rounded-sm border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-opacity-30"
                    style={{
                      borderColor: 'rgba(184,147,74,0.2)',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ backgroundColor: 'rgba(184,147,74,0.12)' }}
                      >
                        {DOC_TYPE_ICONS[doc.document_type] ?? '📎'}
                      </div>
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                          style={{ color: '#B8934A' }}
                        >
                          {DOC_TYPE_LABELS[doc.document_type] ?? 'Document'}
                        </p>
                        <h3
                          className="text-base font-semibold leading-tight"
                          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                        >
                          {doc.document_name}
                        </h3>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-xs leading-relaxed opacity-50 mb-5 flex-1">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex gap-2 mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      {doc.internal_path ? (
                        doc.internal_path.endsWith('.pdf') ? (
                          <>
                            <a
                              href={doc.internal_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-xs font-semibold transition-all hover:brightness-110"
                              style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
                            >
                              <ExternalLink size={13} />
                              View PDF
                            </a>
                            <a
                              href={doc.internal_path}
                              download
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-semibold transition-all"
                              style={{ backgroundColor: 'rgba(184,147,74,0.12)', color: '#B8934A', border: '1px solid rgba(184,147,74,0.25)' }}
                            >
                              <Download size={13} />
                            </a>
                          </>
                        ) : (
                          <button
                            onClick={() => onOpenReport(passphrase)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-xs font-semibold transition-all hover:brightness-110"
                            style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
                          >
                            <BookOpen size={13} />
                            Read Report
                          </button>
                        )
                      ) : doc.signed_url ? (
                        <>
                          <a
                            href={doc.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-xs font-semibold transition-all hover:brightness-110"
                            style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
                          >
                            <ExternalLink size={13} />
                            View
                          </a>
                          <a
                            href={doc.signed_url}
                            download
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm text-xs font-semibold transition-all"
                            style={{ backgroundColor: 'rgba(184,147,74,0.12)', color: '#B8934A', border: '1px solid rgba(184,147,74,0.25)' }}
                          >
                            <Download size={13} />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs opacity-30 py-2.5">Link unavailable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-10">
              <p className="text-xs opacity-25">
                Document links expire after 2 hours. Refresh this page and re-enter your passphrase to regenerate them.
              </p>
            </div>

            {/* Apply Online CTA */}
            <div
              className="mt-14 rounded-sm border p-8 flex flex-col md:flex-row items-center gap-6"
              style={{ borderColor: 'rgba(184,147,74,0.25)', backgroundColor: 'rgba(184,147,74,0.05)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(184,147,74,0.15)', border: '1px solid rgba(184,147,74,0.3)' }}
              >
                <ClipboardList size={24} style={{ color: '#B8934A' }} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2
                  className="text-xl font-semibold mb-1"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                >
                  Ready to Invest?
                </h2>
                <p className="text-sm opacity-55 leading-relaxed max-w-lg">
                  Complete your application online. The form guides you through each section based on your investor type — individual, joint, company, or trust.
                </p>
              </div>
              <button
                onClick={() => onApply(passphrase)}
                className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-sm text-sm font-semibold tracking-wide transition-all hover:brightness-110"
                style={{ backgroundColor: '#B8934A', color: '#0E2219' }}
              >
                <ClipboardList size={15} />
                Apply Online
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t px-6 py-8" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-6 text-xs opacity-40">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-0.5" style={{ color: '#B8934A', opacity: 1 }}>Australia</p>
                  <p>Level 6, 111 Cecil Street</p>
                  <p>South Melbourne VIC 3205</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-40">
              <Mail size={13} />
              <a href="mailto:enquiries@arklinetrust.com" className="hover:opacity-70 transition-opacity">
                enquiries@arklinetrust.com
              </a>
            </div>
          </div>
          <p className="text-center text-xs opacity-20 mt-6 max-w-3xl mx-auto leading-relaxed">
            This document contains confidential information prepared exclusively for prospective wholesale investors as defined under the Corporations Act 2001 (Cth). It does not constitute an offer to sell or a solicitation to acquire any financial product. Past performance is not indicative of future results.
          </p>
        </div>
      </footer>
    </div>
  );
}
