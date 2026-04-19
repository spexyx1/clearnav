import { useState, useEffect, useCallback } from 'react';
import { Shield, UserCheck, PenLine, AlertTriangle, CheckCircle, Loader2, X, Clock, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignatureCollectionModal from './SignatureCollectionModal';

interface ComplianceOfficerRecord {
  id: string;
  officer_user_id: string | null;
  officer_name: string;
  officer_title: string;
  signature_image_url: string | null;
  is_active: boolean;
  designated_at: string;
  created_at: string;
}

interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
}

export default function ComplianceOfficerManager() {
  const [records, setRecords] = useState<ComplianceOfficerRecord[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesignateModal, setShowDesignateModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedDesignee, setSelectedDesignee] = useState<PlatformUser | null>(null);
  const [customName, setCustomName] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [sigRes, usersRes] = await Promise.all([
      supabase
        .from('compliance_officer_signatures')
        .select('*')
        .order('designated_at', { ascending: false }),
      supabase
        .from('platform_admin_users')
        .select('id, email, full_name'),
    ]);
    setRecords((sigRes.data as ComplianceOfficerRecord[]) || []);
    setPlatformUsers((usersRes.data as PlatformUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeOfficer = records.find(r => r.is_active);

  const handleOpenDesignate = () => {
    setSelectedDesignee(null);
    setCustomName('');
    setUseCustomName(false);
    setShowDesignateModal(true);
  };

  const handleProceedToSignature = () => {
    if (!useCustomName && !selectedDesignee) return;
    if (useCustomName && !customName.trim()) return;
    setShowDesignateModal(false);
    setShowSignatureModal(true);
  };

  const getEffectiveName = () => {
    if (useCustomName) return customName.trim();
    return selectedDesignee?.full_name || selectedDesignee?.email || '';
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase
      .from('compliance_officer_signatures')
      .update({ is_active: false })
      .eq('id', id);
    if (error) {
      showToast('error', 'Failed to deactivate: ' + error.message);
    } else {
      showToast('success', 'Compliance officer signature deactivated');
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Compliance Officer</h2>
          <p className="text-sm text-slate-500 mt-1">
            Designate the platform compliance officer whose digital signature will be affixed to all KYC/AML verification letters.
          </p>
        </div>
        <button
          onClick={handleOpenDesignate}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserCheck className="w-4 h-4" />
          {activeOfficer ? 'Reassign Officer' : 'Designate Officer'}
        </button>
      </div>

      {activeOfficer ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              </div>
              <p className="text-base font-semibold text-slate-900">{activeOfficer.officer_name}</p>
              <p className="text-sm text-slate-500">{activeOfficer.officer_title}</p>
              {activeOfficer.signature_image_url && (
                <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-lg inline-block">
                  <p className="text-xs text-slate-400 mb-2">Signature on file:</p>
                  <img
                    src={activeOfficer.signature_image_url}
                    alt="Compliance officer signature"
                    className="max-h-16 max-w-48 object-contain"
                  />
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">
                <Clock className="inline w-3 h-3 mr-1" />
                Designated {new Date(activeOfficer.designated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => handleDeactivate(activeOfficer.id)}
              className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
              title="Remove designation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">No compliance officer designated</p>
            <p className="text-sm text-amber-700 mt-1">
              KYC verification letters will be issued without a digital signature until an officer is designated.
              The signature block will appear as a blank line for physical signing.
            </p>
          </div>
        </div>
      )}

      {records.filter(r => !r.is_active).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-600">Previous Officers</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {records.filter(r => !r.is_active).map(record => (
              <div key={record.id} className="px-5 py-3 flex items-center gap-4 opacity-60">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{record.officer_name}</p>
                  <p className="text-xs text-slate-400">{record.officer_title}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(record.designated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDesignateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-semibold text-gray-900">Designate Compliance Officer</h3>
              </div>
              <button onClick={() => setShowDesignateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Select a platform admin user to designate as Compliance Officer, or enter a custom name.
              </p>

              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setUseCustomName(false)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                    !useCustomName ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Select User
                </button>
                <button
                  onClick={() => setUseCustomName(true)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                    useCustomName ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Custom Name
                </button>
              </div>

              {!useCustomName ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Platform Admin User</label>
                  <select
                    value={selectedDesignee?.id || ''}
                    onChange={e => {
                      const u = platformUsers.find(u => u.id === e.target.value);
                      setSelectedDesignee(u || null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                  >
                    <option value="">Select a user...</option>
                    {platformUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <PenLine className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    The next step will collect their digital signature, which will be stored securely and applied to all
                    future verification letters.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowDesignateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToSignature}
                disabled={!useCustomName ? !selectedDesignee : !customName.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                <PenLine className="w-4 h-4" />
                Collect Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignatureModal && (
        <SignatureCollectionModal
          officerName={getEffectiveName()}
          officerUserId={!useCustomName ? selectedDesignee?.id : undefined}
          onClose={() => setShowSignatureModal(false)}
          onSaved={() => {
            setShowSignatureModal(false);
            showToast('success', `${getEffectiveName()} has been designated as Compliance Officer`);
            load();
          }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          }
          <p className="text-sm">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
