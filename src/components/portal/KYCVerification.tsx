import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle,
  ExternalLink, RefreshCw, ChevronRight, FileText, User, Search, Eye, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getKycMeta, isKycApproved, isKycDeclined, isKycInProgress, isKycInReview } from '../../lib/kycStatus';
import { must } from '../../lib/db';
import { Badge } from '../shared/Badge';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { PanelLoader } from '../shared/Spinner';
import { formatDateTime, formatDate } from '../../lib/format';
import type { BadgeTone } from '../shared/Badge';

interface KYCRecord {
  id: string;
  didit_session_id: string | null;
  didit_session_url: string | null;
  didit_session_status: string | null;
  id_verification_status: string | null;
  aml_screening_status: string | null;
  verification_initiated_at: string | null;
  verification_completed_at: string | null;
  didit_id_data: Record<string, unknown> | null;
  didit_aml_hits: unknown[] | null;
  full_legal_name: string | null;
}

const TONE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  neutral: { color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700' },
  info:    { color: 'text-brand-accent', bg: 'bg-status-info-bg', border: 'border-status-info-border' },
  success: { color: 'text-status-success', bg: 'bg-status-success-bg', border: 'border-status-success-border' },
  danger:  { color: 'text-status-danger',  bg: 'bg-status-danger-bg',  border: 'border-status-danger-border' },
  warn:    { color: 'text-status-warn',    bg: 'bg-status-warn-bg',    border: 'border-status-warn-border' },
};

const TONE_ICON: Record<string, React.ReactNode> = {
  neutral: <Clock className="w-5 h-5" aria-hidden />,
  info:    <RefreshCw className="w-5 h-5" aria-hidden />,
  success: <CheckCircle className="w-5 h-5" aria-hidden />,
  danger:  <XCircle className="w-5 h-5" aria-hidden />,
  warn:    <Eye className="w-5 h-5" aria-hidden />,
};

function getStatusConfig(status: string | null) {
  const meta = getKycMeta(status);
  return { label: meta.label, tone: meta.tone as BadgeTone, ...TONE_STYLE[meta.tone], icon: TONE_ICON[meta.tone] };
}

/** Generate a deterministic human-readable reference from the record id */
function makeReference(id: string) {
  const short = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const today = new Date();
  return `VER-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${short}`;
}

export default function KYCVerification() {
  const { user, currentTenant } = useAuth();
  const [kycRecord, setKycRecord] = useState<KYCRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);

  const loadKYCRecord = useCallback(async () => {
    if (!user) return;
    try {
      const data = await must(
        supabase
          .from('kyc_aml_records')
          .select('id, didit_session_id, didit_session_url, didit_session_status, id_verification_status, aml_screening_status, verification_initiated_at, verification_completed_at, didit_id_data, didit_aml_hits, full_legal_name')
          .eq('client_user_id', user.id)
          .maybeSingle()
      );
      setKycRecord(data as KYCRecord | null);
    } catch (err) {
      setError('Unable to load verification status. Please refresh and try again.');
      console.warn('KYC load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadKYCRecord(); }, [loadKYCRecord]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('kyc-status-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'kyc_aml_records',
        filter: `client_user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new?.id) setKycRecord(payload.new as KYCRecord);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleStartVerification = async () => {
    if (!user || !currentTenant || !consentGiven) return;
    setInitiating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/didit-create-session`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_user_id: user.id,
            client_email: user.email,
            client_name: user.user_metadata?.full_name || '',
            tenant_id: currentTenant.id,
            callback_url: window.location.href,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) { setError(result.error || 'Failed to start verification. Please try again.'); return; }
      await loadKYCRecord();
      window.open(result.verification_url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setInitiating(false);
    }
  };

  if (loading) return <PanelLoader />;

  const sessionStatus = kycRecord?.didit_session_status || null;
  const statusCfg = getStatusConfig(sessionStatus);
  const isVerified = isKycApproved(sessionStatus);
  const isDeclined = isKycDeclined(sessionStatus);
  const isInProgress = isKycInProgress(sessionStatus);
  const isInReview = isKycInReview(sessionStatus);
  const hasSession = !!kycRecord?.didit_session_id;
  const isAbandoned = sessionStatus === 'Abandoned';
  const canResume = hasSession && (isInProgress || isAbandoned);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-h1 text-white">Identity Verification</h1>
        <p className="text-body text-brand-text-secondary mt-1">
          Complete your KYC/AML verification to access all platform features and satisfy regulatory requirements.
        </p>
      </div>

      {/* Status banner — shown only when session exists */}
      {hasSession && (
        <div className={`rounded-card border p-5 ${statusCfg.bg} ${statusCfg.border}`} role="status" aria-live="polite">
          <div className="flex items-start gap-4">
            <span className={`mt-0.5 flex-shrink-0 ${statusCfg.color}`}>{statusCfg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-body font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                <Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
              </div>
              <p className="text-meta text-brand-text-secondary">
                {isVerified && 'Your identity has been successfully verified and your account is fully activated.'}
                {isDeclined && 'Your verification was not approved. Please contact support or restart with different documents.'}
                {isInReview && 'Your submission is being reviewed by our compliance team. This typically takes 1–2 business days.'}
                {isInProgress && 'Your verification session is open — continue where you left off.'}
                {isAbandoned && 'Your previous session was not completed. Resume it or start a new one.'}
                {!isVerified && !isDeclined && !isInReview && !isInProgress && !isAbandoned && 'Verification is pending.'}
              </p>
              {kycRecord?.verification_completed_at && (
                <p className="text-meta text-brand-text-muted mt-1">
                  Completed {formatDateTime(kycRecord.verification_completed_at)}
                </p>
              )}
            </div>
            {canResume && kycRecord?.didit_session_url && (
              <a
                href={kycRecord.didit_session_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Resume verification in new tab"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface-2 hover:bg-slate-700 text-brand-text-primary border border-brand-border rounded-input text-meta font-medium transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                Resume <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ✅ Verified identity card — with proof artifact */}
      {isVerified && kycRecord && (
        <Card>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-card bg-status-success-bg border border-status-success-border flex items-center justify-center">
                <Shield className="w-5 h-5 text-status-success" aria-hidden />
              </div>
              <div>
                <h2 className="text-h2 text-white">Identity Verified</h2>
                <p className="text-meta text-brand-text-muted">
                  {kycRecord.verification_completed_at
                    ? `Verified ${formatDate(kycRecord.verification_completed_at, 'long')}`
                    : 'Verification complete'}
                </p>
              </div>
            </div>
            <Badge tone="success">Verified</Badge>
          </div>

          {/* Reference number */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-surface-2 rounded-input border border-brand-border mb-4">
            <span className="text-meta text-brand-text-muted">Reference</span>
            <span className="text-meta font-mono text-white tracking-wide">{makeReference(kycRecord.id)}</span>
          </div>

          {/* Masked ID fields */}
          {kycRecord.didit_id_data && (
            <div className="grid grid-cols-2 gap-3">
              {kycRecord.didit_id_data.first_name && (
                <div>
                  <p className="text-meta text-brand-text-muted mb-0.5">First Name</p>
                  <p className="text-body text-white font-medium">{String(kycRecord.didit_id_data.first_name)}</p>
                </div>
              )}
              {kycRecord.didit_id_data.last_name && (
                <div>
                  <p className="text-meta text-brand-text-muted mb-0.5">Last Name</p>
                  <p className="text-body text-white font-medium">{String(kycRecord.didit_id_data.last_name)}</p>
                </div>
              )}
              {kycRecord.didit_id_data.nationality && (
                <div>
                  <p className="text-meta text-brand-text-muted mb-0.5">Nationality</p>
                  <p className="text-body text-white font-medium">{String(kycRecord.didit_id_data.nationality)}</p>
                </div>
              )}
              {kycRecord.didit_id_data.date_of_birth && (
                <div>
                  <p className="text-meta text-brand-text-muted mb-0.5">Year of Birth</p>
                  {/* Show year only — DOB masked for privacy */}
                  <p className="text-body text-white font-medium">
                    {String(kycRecord.didit_id_data.date_of_birth).slice(0, 4)}
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="text-meta text-brand-text-muted mt-4 pt-4 border-t border-brand-border">
            Your verification is on file. No further action is required.
          </p>
        </Card>
      )}

      {/* What to expect / consent / start */}
      {!isVerified && (
        <Card>
          <h2 className="text-h2 text-white mb-4">What to Expect</h2>
          <div className="space-y-2 mb-5">
            {[
              { icon: FileText, title: 'Government-Issued ID', desc: 'Passport, national ID, or driver\'s licence' },
              { icon: User,     title: 'Selfie / Liveness Check', desc: 'A quick face scan to confirm it\'s you' },
              { icon: Search,   title: 'AML Screening', desc: 'Automated check against global sanctions and PEP lists' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-3 bg-brand-surface-2 border border-brand-border rounded-input">
                <Icon className="w-4 h-4 text-brand-accent mt-0.5 flex-shrink-0" aria-hidden />
                <div>
                  <p className="text-body font-medium text-white">{title}</p>
                  <p className="text-meta text-brand-text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-brand-border pt-5 space-y-4">
            <p className="text-meta text-brand-text-secondary leading-relaxed">
              Verification is powered by{' '}
              <a href="https://didit.me" target="_blank" rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-accent rounded">
                Didit
              </a>.
              By proceeding you consent to your personal data being processed per{' '}
              <a href="https://didit.me/terms/verification-privacy-notice" target="_blank" rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2 hover:text-white inline-flex items-center gap-0.5">
                Didit's Privacy Notice <ExternalLink className="w-3 h-3" aria-label="(opens in new tab)" />
              </a>{' '}
              and{' '}
              <a href="https://didit.me/terms/identity-verification" target="_blank" rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2 hover:text-white inline-flex items-center gap-0.5">
                End User Terms <ExternalLink className="w-3 h-3" aria-label="(opens in new tab)" />
              </a>.
            </p>

            {/* Consent checkbox — required */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group" htmlFor="kyc-consent">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    id="kyc-consent"
                    type="checkbox"
                    checked={consentGiven}
                    onChange={e => setConsentGiven(e.target.checked)}
                    aria-required="true"
                    aria-describedby="kyc-consent-req"
                    className="sr-only peer"
                  />
                  {/* Custom indicator with peer-focus-visible ring */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-brand-surface ${consentGiven ? 'bg-brand-primary border-brand-primary' : 'border-slate-600 group-hover:border-slate-400'}`}>
                    {consentGiven && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-body text-slate-300 leading-relaxed">
                  I have read and agree to the above terms. I consent to the processing of my biometric and identity data for verification purposes.{' '}
                  <span className="text-status-danger" aria-hidden>*</span>
                  <span id="kyc-consent-req" className="sr-only">(required)</span>
                </span>
              </label>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-status-danger-bg border border-status-danger-border rounded-input text-meta text-status-danger">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleStartVerification}
              disabled={!consentGiven}
              loading={initiating}
              leftIcon={<Shield className="w-4 h-4" />}
              rightIcon={!initiating ? <ChevronRight className="w-4 h-4" /> : undefined}
              className="w-full"
            >
              {initiating ? 'Starting Verification…' : hasSession ? 'Restart Verification' : 'Start Verification'}
            </Button>

            {/* Contextual hint when button is disabled */}
            {!consentGiven && (
              <p className="text-meta text-brand-text-muted text-center" aria-live="polite">
                Accept the terms above to continue.
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 text-meta text-brand-text-muted">
              <Lock className="w-3.5 h-3.5" aria-hidden />
              Verification opens in a secure new tab. Return here when complete.
            </div>
          </div>
        </Card>
      )}

      {/* AML hits — in review */}
      {isInReview && kycRecord?.didit_aml_hits && Array.isArray(kycRecord.didit_aml_hits) && kycRecord.didit_aml_hits.length > 0 && (
        <div className="bg-status-warn-bg border border-status-warn-border rounded-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-status-warn flex-shrink-0" aria-hidden />
            <h3 className="text-body font-semibold text-status-warn">Additional Review Required</h3>
          </div>
          <p className="text-meta text-brand-text-secondary">
            Your verification has been flagged for additional compliance review. Our team will contact you within 1–2 business days with next steps.
          </p>
        </div>
      )}

      {/* Declined — restart */}
      {isDeclined && (
        <Card>
          <p className="text-meta text-brand-text-secondary mb-4">
            If you believe this decision is an error, please contact your fund manager. You may also restart the process with different documents.
          </p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => { setKycRecord(null); setConsentGiven(false); }}
          >
            Restart Process
          </Button>
        </Card>
      )}
    </div>
  );
}
