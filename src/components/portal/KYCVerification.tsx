import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, RefreshCw, ChevronRight, FileText, User, Search, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  'Not Started': {
    label: 'Not Started',
    color: 'text-slate-400',
    bg: 'bg-slate-800/50',
    border: 'border-slate-700',
    icon: <Clock className="w-5 h-5" />,
  },
  'In Progress': {
    label: 'In Progress',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: <RefreshCw className="w-5 h-5 animate-spin" />,
  },
  'Approved': {
    label: 'Verified',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  'Declined': {
    label: 'Declined',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <XCircle className="w-5 h-5" />,
  },
  'In Review': {
    label: 'Under Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <Eye className="w-5 h-5" />,
  },
  'Abandoned': {
    label: 'Not Completed',
    color: 'text-slate-400',
    bg: 'bg-slate-800/50',
    border: 'border-slate-700',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
};

function getStatusConfig(status: string | null) {
  if (!status) return STATUS_CONFIG['Not Started'];
  return STATUS_CONFIG[status] || STATUS_CONFIG['Not Started'];
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
    const { data } = await supabase
      .from('kyc_aml_records')
      .select('id, didit_session_id, didit_session_url, didit_session_status, id_verification_status, aml_screening_status, verification_initiated_at, verification_completed_at, didit_id_data, didit_aml_hits, full_legal_name')
      .eq('client_user_id', user.id)
      .maybeSingle();
    setKycRecord(data as KYCRecord | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadKYCRecord();
  }, [loadKYCRecord]);

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
        setKycRecord(payload.new as KYCRecord);
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
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
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

      if (!response.ok) {
        setError(result.error || 'Failed to start verification. Please try again.');
        return;
      }

      await loadKYCRecord();
      window.open(result.verification_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setInitiating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const sessionStatus = kycRecord?.didit_session_status || null;
  const statusCfg = getStatusConfig(sessionStatus);
  const isVerified = sessionStatus === 'Approved';
  const isDeclined = sessionStatus === 'Declined';
  const isInProgress = sessionStatus === 'In Progress';
  const isInReview = sessionStatus === 'In Review';
  const hasSession = !!kycRecord?.didit_session_id;
  const canResume = hasSession && (isInProgress || sessionStatus === 'Abandoned' || sessionStatus === 'Not Started');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
        <p className="text-slate-400 mt-1">
          Complete your KYC/AML verification to access all platform features and comply with regulatory requirements.
        </p>
      </div>

      {/* Status Banner */}
      {hasSession && (
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${statusCfg.bg} ${statusCfg.border}`}>
          <span className={statusCfg.color}>{statusCfg.icon}</span>
          <div className="flex-1">
            <p className={`font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
            <p className="text-sm text-slate-400 mt-0.5">
              {isVerified && 'Your identity has been successfully verified.'}
              {isDeclined && 'Your verification was not approved. Please contact support or restart the process.'}
              {isInReview && 'Your submission is being reviewed by our compliance team. This typically takes 1-2 business days.'}
              {isInProgress && 'Your verification session is open. Continue where you left off.'}
              {!isVerified && !isDeclined && !isInReview && !isInProgress && 'Your verification is not yet complete.'}
            </p>
            {kycRecord?.verification_completed_at && (
              <p className="text-xs text-slate-500 mt-1">
                Completed: {new Date(kycRecord.verification_completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
          {canResume && kycRecord?.didit_session_url && (
            <a
              href={kycRecord.didit_session_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              Resume <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Verified Details */}
      {isVerified && kycRecord?.didit_id_data && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Verified Identity</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {kycRecord.didit_id_data.first_name && (
              <div>
                <p className="text-slate-500">First Name</p>
                <p className="text-white font-medium mt-0.5">{String(kycRecord.didit_id_data.first_name)}</p>
              </div>
            )}
            {kycRecord.didit_id_data.last_name && (
              <div>
                <p className="text-slate-500">Last Name</p>
                <p className="text-white font-medium mt-0.5">{String(kycRecord.didit_id_data.last_name)}</p>
              </div>
            )}
            {kycRecord.didit_id_data.nationality && (
              <div>
                <p className="text-slate-500">Nationality</p>
                <p className="text-white font-medium mt-0.5">{String(kycRecord.didit_id_data.nationality)}</p>
              </div>
            )}
            {kycRecord.didit_id_data.date_of_birth && (
              <div>
                <p className="text-slate-500">Date of Birth</p>
                <p className="text-white font-medium mt-0.5">{String(kycRecord.didit_id_data.date_of_birth)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* What to Expect / Start Verification */}
      {!isVerified && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-white text-lg">What to Expect</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: <FileText className="w-5 h-5 text-cyan-400" />, title: 'Government-Issued ID', desc: 'Passport, national ID, or driver\'s license' },
              { icon: <User className="w-5 h-5 text-cyan-400" />, title: 'Selfie / Liveness Check', desc: 'A quick face scan to confirm your identity' },
              { icon: <Search className="w-5 h-5 text-cyan-400" />, title: 'AML Screening', desc: 'Automated check against global sanctions and PEP lists' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <div className="mt-0.5">{step.icon}</div>
                <div>
                  <p className="text-white font-medium text-sm">{step.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Your identity verification is powered by{' '}
              <a href="https://didit.me" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Didit</a>,
              a secure third-party identity verification provider. By proceeding, you consent to your personal data being
              processed for identity verification purposes in accordance with{' '}
              <a href="https://didit.me/terms/verification-privacy-notice" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Didit's Privacy Notice</a>{' '}
              and{' '}
              <a href="https://didit.me/terms/identity-verification" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">End User Terms</a>.
            </p>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={e => setConsentGiven(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${consentGiven ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
                  {consentGiven && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
              <span className="text-sm text-slate-300">
                I have read and agree to the above terms. I consent to the processing of my biometric and identity data for verification purposes.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleStartVerification}
              disabled={!consentGiven || initiating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors"
            >
              {initiating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Starting Verification...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {hasSession ? 'Restart Verification' : 'Start Verification'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 text-center">
              Verification opens in a new tab. Return here when complete to see your status.
            </p>
          </div>
        </div>
      )}

      {/* AML Hits Review (In Review state) */}
      {isInReview && kycRecord?.didit_aml_hits && Array.isArray(kycRecord.didit_aml_hits) && kycRecord.didit_aml_hits.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-300">Additional Review Required</h3>
          </div>
          <p className="text-sm text-slate-300">
            Your verification has been flagged for additional compliance review. Our team will contact you within 1-2 business days.
          </p>
        </div>
      )}

      {/* Declined: restart option */}
      {isDeclined && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-4">
            If you believe this is an error, please contact your fund manager or restart the verification process with different documents.
          </p>
          <button
            onClick={() => { setKycRecord(null); setConsentGiven(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Restart Process
          </button>
        </div>
      )}
    </div>
  );
}
