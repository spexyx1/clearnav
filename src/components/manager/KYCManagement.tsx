import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink,
  RefreshCw, Send, Search, Filter, Eye, ChevronDown, ChevronUp,
  User, FileText, X, Copy, Check
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

const DIDIT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Not Started': { label: 'Not Started', color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700' },
  'In Progress': { label: 'In Progress', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  'Approved': { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  'Declined': { label: 'Declined', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  'In Review': { label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  'Abandoned': { label: 'Abandoned', color: 'text-slate-500', bg: 'bg-slate-800/30', border: 'border-slate-700/50' },
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
            <Shield className={`w-5 h-5 ${sc.color}`} />
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

export default function KYCManagement() {
  const { currentTenant } = useAuth();
  const [records, setRecords] = useState<KYCRecord[]>([]);
  const [unverifiedContacts, setUnverifiedContacts] = useState<ContactWithoutKYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<KYCRecord | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleSendVerification = async (contactId: string, contactName: string, contactEmail: string) => {
    if (!currentTenant) return;
    setSendingTo(contactId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
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
          }),
        }
      );
      await loadData();
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
      {/* Stats */}
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

      {/* Contacts without KYC */}
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
                <button
                  onClick={() => handleSendVerification(contact.id, contact.full_name, contact.email)}
                  disabled={sendingTo === contact.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors"
                >
                  {sendingTo === contact.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Create Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KYC Records Table */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-3">
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
                    <div className="flex items-center gap-2">
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
                      {record.contact_id && record.crm_contacts && (
                        <button
                          onClick={() => handleSendVerification(record.contact_id!, name, email)}
                          disabled={sendingTo === record.contact_id}
                          className="p-1.5 hover:bg-slate-700 disabled:opacity-50 rounded transition-colors"
                          title="Re-send verification"
                        >
                          {sendingTo === record.contact_id
                            ? <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                            : <Send className="w-4 h-4 text-slate-400" />
                          }
                        </button>
                      )}
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
    </div>
  );
}
