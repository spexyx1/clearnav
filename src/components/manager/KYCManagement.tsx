import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink,
  RefreshCw, Send, Search, Filter, Eye, X, Copy, Check,
  User, Play, ChevronLeft, Loader2, Camera, FileCheck2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface KYCRecord {
  id: string;
  contact_id: string | null;
  client_user_id: string | null;
  full_legal_name: string | null;
  didit_session_id: string | null;
  didit_session_url: string | null;
  didit_session_status: string | null;
  id_verification_status: string | null;
  aml_screening_status: string | null;
  didit_decision_data: Record<string, unknown> | null;
  didit_aml_hits: unknown[] | null;
  didit_id_data: Record<string, unknown> | null;
  verification_initiated_at: string | null;
  verification_completed_at: string | null;
  crm_contacts: { full_name: string; email: string } | null;
}

interface ContactWithoutKYC {
  id: string;
  full_name: string;
  email: string;
}

const DIDIT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  'Not Started': { label: 'Not Started', color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700', icon: Clock },
  'In Progress': { label: 'In Progress', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: RefreshCw },
  'Approved': { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle },
  'Declined': { label: 'Declined', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
  'In Review': { label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Eye },
  'Abandoned': { label: 'Abandoned', color: 'text-slate-500', bg: 'bg-slate-800/30', border: 'border-slate-700/50', icon: XCircle },
};

function statusConfig(s: string | null) {
  if (!s) return DIDIT_STATUS_CONFIG['Not Started'];
  return DIDIT_STATUS_CONFIG[s] || DIDIT_STATUS_CONFIG['Not Started'];
}

interface DetailModalProps {
  record: KYCRecord;
  onClose: () => void;
}

function DetailModal({ record, onClose }: DetailModalProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!record.didit_session_url) return;
    await navigator.clipboard.writeText(record.didit_session_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sc = statusConfig(record.didit_session_status);
  const StatusIcon = sc.icon;
  const name = record.crm_contacts?.full_name || record.full_legal_name || 'Unknown';
  const amlHits = Array.isArray(record.didit_aml_hits) ? record.didit_aml_hits : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{name}</h2>
            <p className="text-sm text-slate-400">{record.crm_contacts?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${sc.bg} ${sc.border}`}>
            <StatusIcon className={`w-5 h-5 ${sc.color}`} />
            <div>
              <p className={`font-semibold ${sc.color}`}>{sc.label}</p>
              {record.verification_initiated_at && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Initiated: {new Date(record.verification_initiated_at).toLocaleString()}
                </p>
              )}
              {record.verification_completed_at && (
                <p className="text-xs text-slate-400">
                  Completed: {new Date(record.verification_completed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {record.didit_session_url && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Verification Link</p>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 truncate">
                  {record.didit_session_url}
                </div>
                <button onClick={copyLink} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
                <a href={record.didit_session_url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </a>
              </div>
            </div>
          )}

          {record.didit_id_data && Object.keys(record.didit_id_data).length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" /> Extracted Identity Data
              </p>
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                {Object.entries(record.didit_id_data).map(([key, value]) => value ? (
                  <div key={key}>
                    <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-white font-medium">{String(value)}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {amlHits.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> AML Screening Hits ({amlHits.length})
              </p>
              <div className="space-y-2">
                {amlHits.map((hit: unknown, i) => (
                  <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(hit, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface InlineVerificationPanelProps {
  contact: ContactWithoutKYC | { id: string; full_name: string; email: string };
  tenantId: string;
  onClose: () => void;
  onComplete: () => void;
}

function InlineVerificationPanel({ contact, tenantId, onClose, onComplete }: InlineVerificationPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<{ destroy?: () => void } | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'running' | 'done' | 'error'>('loading');
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<'Approved' | 'Declined' | 'Pending' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sdkState, setSdkState] = useState<string>('idle');

  useEffect(() => {
    let cancelled = false;

    const createSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/didit-create-session`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contact_id: contact.id,
              client_name: contact.full_name,
              client_email: contact.email,
              tenant_id: tenantId,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok || !data.verification_url) {
          throw new Error(data.error || 'Failed to create verification session');
        }

        if (!cancelled) {
          setSessionUrl(data.verification_url);
          setPhase('ready');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
          setPhase('error');
        }
      }
    };

    createSession();
    return () => { cancelled = true; };
  }, [contact.id, contact.full_name, contact.email, tenantId]);

  useEffect(() => {
    if (phase !== 'running' || !sessionUrl || !containerRef.current) return;

    type DiditSdkType = {
      shared: {
        destroy?: () => void;
        onComplete?: (result: unknown) => void;
        onStateChange?: (state: string) => void;
        startVerification: (opts: unknown) => void;
      };
    };

    let sdk: DiditSdkType['shared'] | null = null;

    const loadSdkScript = (): Promise<DiditSdkType> => {
      return new Promise((resolve, reject) => {
        const existing = document.getElementById('didit-sdk-script');
        const win = window as unknown as Record<string, unknown>;
        if (existing && win['DiditSDK']) {
          resolve(win['DiditSDK'] as DiditSdkType);
          return;
        }
        const script = document.createElement('script');
        script.id = 'didit-sdk-script';
        script.src = 'https://unpkg.com/@didit-protocol/sdk-web/dist/didit-sdk.umd.min.js';
        script.onload = () => {
          const loaded = win['DiditSDK'] as DiditSdkType | undefined;
          if (loaded) resolve(loaded);
          else reject(new Error('DiditSDK not found on window after load'));
        };
        script.onerror = () => reject(new Error('Failed to load Didit SDK script'));
        document.head.appendChild(script);
      });
    };

    const initSdk = async () => {
      try {
        const DiditSDK = await loadSdkScript();
        sdk = DiditSDK.DiditSdk.shared;
        sdkRef.current = sdk;

        sdk.onStateChange = (state: string) => {
          setSdkState(state);
        };

        sdk.onComplete = (result: unknown) => {
          const r = result as { type: string; session?: { status: string } };
          if (r.type === 'completed' && r.session) {
            setFinalStatus(r.session.status as 'Approved' | 'Declined' | 'Pending');
          } else if (r.type === 'cancelled') {
            setFinalStatus('Pending');
          }
          setPhase('done');
          onComplete();
        };

        sdk.startVerification({
          url: sessionUrl,
          configuration: {
            embedded: true,
            embeddedContainerId: 'didit-embed-container',
            loggingEnabled: false,
            showCloseButton: false,
            showExitConfirmation: false,
            closeModalOnComplete: true,
          },
        });
      } catch {
        setErrorMsg('Failed to load verification SDK');
        setPhase('error');
      }
    };

    initSdk();

    return () => {
      if (sdk?.destroy) sdk.destroy();
    };
  }, [phase, sessionUrl, onComplete]);

  const handleStart = () => setPhase('running');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-white">KYC / AML Verification</h2>
              <p className="text-xs text-slate-400">{contact.full_name} &middot; {contact.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {phase === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
              <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
              <p className="text-slate-400 text-sm">Creating secure verification session...</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Session Error</p>
                <p className="text-slate-400 text-sm max-w-xs">{errorMsg}</p>
              </div>
              <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">
                Close
              </button>
            </div>
          )}

          {phase === 'ready' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-white font-semibold text-lg mb-2">Ready to Verify</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The verification session has been created for <span className="text-white">{contact.full_name}</span>.
                  The investor will be guided through ID capture, liveness check, and AML screening directly in this window.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {[
                  { icon: FileCheck2, label: 'ID Document' },
                  { icon: Camera, label: 'Liveness Check' },
                  { icon: Shield, label: 'AML Screening' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Begin Verification
              </button>
            </div>
          )}

          {phase === 'running' && (
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              {sdkState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 rounded-b-xl">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              )}
              <div
                id="didit-embed-container"
                ref={containerRef}
                className="flex-1 rounded-b-xl overflow-hidden bg-white"
                style={{ minHeight: '500px' }}
              />
            </div>
          )}

          {phase === 'done' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
              {finalStatus === 'Approved' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-emerald-400 font-semibold text-lg mb-1">Verification Approved</h3>
                    <p className="text-slate-400 text-sm">Identity and AML checks passed successfully.</p>
                  </div>
                </>
              ) : finalStatus === 'Declined' ? (
                <>
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-red-400 font-semibold text-lg mb-1">Verification Declined</h3>
                    <p className="text-slate-400 text-sm">The verification could not be completed.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-amber-400 font-semibold text-lg mb-1">Under Review</h3>
                    <p className="text-slate-400 text-sm">The submission is being reviewed. Results will update automatically.</p>
                  </div>
                </>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Back to KYC Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KYCManagement() {
  const { currentTenant } = useAuth();
  const [records, setRecords] = useState<KYCRecord[]>([]);
  const [unverifiedContacts, setUnverifiedContacts] = useState<ContactWithoutKYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<KYCRecord | null>(null);
  const [verifyingContact, setVerifyingContact] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    if (!currentTenant) return;
    const [kycRes, contactsRes] = await Promise.all([
      supabase
        .from('kyc_aml_records')
        .select('*, crm_contacts(full_name, email)')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('crm_contacts')
        .select('id, full_name, email')
        .eq('tenant_id', currentTenant.id)
        .order('full_name'),
    ]);

    const existingContactIds = new Set((kycRes.data || []).map((r: KYCRecord) => r.contact_id).filter(Boolean));
    setRecords((kycRes.data as KYCRecord[]) || []);
    setUnverifiedContacts(
      ((contactsRes.data as ContactWithoutKYC[]) || []).filter(c => !existingContactIds.has(c.id))
    );
    setLoading(false);
  }, [currentTenant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!currentTenant) return;
    const channel = supabase
      .channel('kyc-manager-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kyc_aml_records',
        filter: `tenant_id=eq.${currentTenant.id}`,
      }, () => { loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentTenant, loadData]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendVerification = async (contactId: string, contactName: string, contactEmail: string) => {
    if (!currentTenant) return;
    setSendingTo(contactId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/didit-create-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contact_id: contactId,
            client_name: contactName,
            client_email: contactEmail,
            tenant_id: currentTenant.id,
            send_email: true,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSentTo(contactId);
        setTimeout(() => setSentTo(null), 3000);
        if (data.email_sent) {
          showToast(`Verification email sent to ${contactEmail}`, 'success');
        } else {
          showToast('Session created. No email provider configured — copy the link manually.', 'error');
        }
      } else {
        showToast(data.error || 'Failed to create verification session', 'error');
      }
      await loadData();
    } catch {
      showToast('Failed to send verification link', 'error');
    } finally {
      setSendingTo(null);
    }
  };

  const copyVerificationLink = async (record: KYCRecord) => {
    if (!record.didit_session_url) return;
    await navigator.clipboard.writeText(record.didit_session_url);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRecords = records.filter(r => {
    const name = r.crm_contacts?.full_name || r.full_legal_name || '';
    const email = r.crm_contacts?.email || '';
    const matchesSearch = !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.didit_session_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: records.length,
    approved: records.filter(r => r.didit_session_status === 'Approved').length,
    pending: records.filter(r => !r.didit_session_status || r.didit_session_status === 'Not Started' || r.didit_session_status === 'Abandoned').length,
    inReview: records.filter(r => r.didit_session_status === 'In Review').length,
    declined: records.filter(r => r.didit_session_status === 'Declined').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-400' },
          { label: 'Pending', value: stats.pending, color: 'text-slate-400' },
          { label: 'Under Review', value: stats.inReview, color: 'text-amber-400' },
          { label: 'Declined', value: stats.declined, color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {unverifiedContacts.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Contacts Without KYC ({unverifiedContacts.length})</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {unverifiedContacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-white">{contact.full_name}</p>
                  <p className="text-xs text-slate-400">{contact.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVerifyingContact(contact)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-500 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Run Verification
                  </button>
                  <button
                    onClick={() => handleSendVerification(contact.id, contact.full_name, contact.email)}
                    disabled={sendingTo === contact.id || sentTo === contact.id}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors disabled:opacity-70 ${
                      sentTo === contact.id
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border-slate-600'
                    }`}
                    title="Send verification link by email to investor"
                  >
                    {sendingTo === contact.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : sentTo === contact.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    {sentTo === contact.id ? 'Sent' : 'Send Email'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none"
              >
                <option value="all">All Statuses</option>
                {Object.keys(DIDIT_STATUS_CONFIG).map(s => (
                  <option key={s} value={s}>{DIDIT_STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No KYC records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredRecords.map(record => {
              const sc = statusConfig(record.didit_session_status);
              const name = record.crm_contacts?.full_name || record.full_legal_name || 'Unknown';
              const email = record.crm_contacts?.email || '';
              const amlHitCount = Array.isArray(record.didit_aml_hits) ? record.didit_aml_hits.length : 0;

              return (
                <div key={record.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      record.didit_session_status === 'Approved' ? 'bg-emerald-400' :
                      record.didit_session_status === 'Declined' ? 'bg-red-400' :
                      record.didit_session_status === 'In Review' ? 'bg-amber-400' :
                      record.didit_session_status === 'In Progress' ? 'bg-cyan-400' :
                      'bg-slate-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{email}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      {amlHitCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                          {amlHitCount} AML hit{amlHitCount > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 text-xs font-medium rounded border ${sc.bg} ${sc.border} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {record.contact_id && record.crm_contacts && (
                        <button
                          onClick={() => setVerifyingContact({
                            id: record.contact_id!,
                            full_name: name,
                            email,
                          })}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
                          title="Run verification in dashboard"
                        >
                          <Play className="w-3 h-3" />
                          Run
                        </button>
                      )}
                      {record.didit_session_url && (
                        <button
                          onClick={() => copyVerificationLink(record)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="Copy verification link"
                        >
                          {copiedId === record.id
                            ? <Check className="w-4 h-4 text-emerald-400" />
                            : <Copy className="w-4 h-4 text-slate-400" />
                          }
                        </button>
                      )}
                      {record.didit_session_url && (
                        <a
                          href={record.didit_session_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="Open verification URL"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  {record.verification_initiated_at && (
                    <p className="text-xs text-slate-600 mt-1 ml-6">
                      Started: {new Date(record.verification_initiated_at).toLocaleDateString()}
                      {record.verification_completed_at && ` · Completed: ${new Date(record.verification_completed_at).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRecord && (
        <DetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {verifyingContact && currentTenant && (
        <InlineVerificationPanel
          contact={verifyingContact}
          tenantId={currentTenant.id}
          onClose={() => setVerifyingContact(null)}
          onComplete={() => {
            loadData();
          }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-200'
            : 'bg-red-900/90 border-red-500/40 text-red-200'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          }
          <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
