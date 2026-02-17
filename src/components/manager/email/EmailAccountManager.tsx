import { useState, useEffect } from 'react';
import { Mail, Plus, Edit2, Trash2, Users, Settings, X, RefreshCw, Check, AlertCircle, HardDrive, Key, Globe, UserPlus, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface EmailAccount {
  id: string;
  tenant_id: string;
  email_address: string;
  email_handle: string | null;
  display_name: string;
  account_type: 'personal' | 'shared' | 'department';
  signature: string | null;
  auto_reply_enabled: boolean;
  auto_reply_message: string | null;
  is_active: boolean;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  provider_type: string | null;
  created_at: string;
}

interface AccessGrant {
  id: string;
  account_id: string;
  user_id: string;
  access_level: 'full' | 'read_only' | 'send_only';
  staff?: {
    full_name: string;
    email: string;
  };
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  user_id: string | null;
}

interface EmailSettings {
  id: string;
  provider_type: string;
  from_domain: string | null;
  from_name: string;
  is_active: boolean;
}

interface CreateAccountForm {
  email_handle: string;
  display_name: string;
  account_type: 'personal' | 'shared' | 'department';
  storage_quota_gb: number;
}

const BYTES_PER_GB = 1073741824;

function formatStorage(bytes: number): string {
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function EmailAccountManager() {
  const { tenantId, currentTenant, user } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [accessGrants, setAccessGrants] = useState<Record<string, AccessGrant[]>>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'accounts' | 'settings'>('accounts');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<CreateAccountForm>({
    email_handle: '',
    display_name: '',
    account_type: 'personal',
    storage_quota_gb: 1,
  });

  const [settingsForm, setSettingsForm] = useState({
    provider_type: 'resend',
    api_key: '',
    from_name: '',
    is_active: false,
  });

  const [newAccessUserId, setNewAccessUserId] = useState('');
  const [newAccessLevel, setNewAccessLevel] = useState<'full' | 'read_only' | 'send_only'>('full');

  useEffect(() => {
    if (tenantId) {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadAccounts(),
        loadStaff(),
        loadEmailSettings(),
        loadVerifiedDomain(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setAccounts(data || []);

    if (data && data.length > 0) {
      await loadAccessGrants(data.map(a => a.id));
    }
  };

  const loadAccessGrants = async (accountIds: string[]) => {
    const { data } = await supabase
      .from('email_account_access')
      .select(`
        id,
        account_id,
        user_id,
        access_level,
        staff_accounts!inner (
          full_name,
          email
        )
      `)
      .in('account_id', accountIds);

    if (data) {
      const grouped: Record<string, AccessGrant[]> = {};
      data.forEach((grant: any) => {
        if (!grouped[grant.account_id]) grouped[grant.account_id] = [];
        grouped[grant.account_id].push({
          id: grant.id,
          account_id: grant.account_id,
          user_id: grant.user_id,
          access_level: grant.access_level,
          staff: grant.staff_accounts,
        });
      });
      setAccessGrants(grouped);
    }
  };

  const loadStaff = async () => {
    const { data } = await supabase
      .from('staff_accounts')
      .select('id, full_name, email, user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('full_name');

    setStaffMembers(data || []);
  };

  const loadEmailSettings = async () => {
    const { data } = await supabase
      .from('tenant_email_settings')
      .select('id, provider_type, from_domain, from_name, is_active')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    setEmailSettings(data || null);
    if (data) {
      setSettingsForm({
        provider_type: data.provider_type || 'resend',
        api_key: '',
        from_name: data.from_name || '',
        is_active: data.is_active || false,
      });
    }
  };

  const loadVerifiedDomain = async () => {
    const { data } = await supabase
      .from('tenant_domains')
      .select('domain')
      .eq('tenant_id', tenantId)
      .eq('is_verified', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      setVerifiedDomain(data[0].domain);
    } else {
      setVerifiedDomain(null);
    }
  };

  const getEmailDomain = () => {
    if (verifiedDomain) return verifiedDomain;
    return `${currentTenant?.slug || 'tenant'}.clearnav.cv`;
  };

  const handleCreateAccount = async () => {
    if (!createForm.email_handle || !createForm.display_name) return;
    setSaving(true);
    try {
      const emailAddress = `${createForm.email_handle.toLowerCase().replace(/[^a-z0-9._+-]/g, '')}@${getEmailDomain()}`;

      const { data: newAccount, error } = await supabase
        .from('email_accounts')
        .insert({
          tenant_id: tenantId,
          email_address: emailAddress,
          email_handle: createForm.email_handle.toLowerCase(),
          display_name: createForm.display_name,
          account_type: createForm.account_type,
          storage_quota_bytes: createForm.storage_quota_gb * BYTES_PER_GB,
          storage_used_bytes: 0,
          is_active: true,
          provider_type: emailSettings?.provider_type || 'internal',
        })
        .select()
        .single();

      if (error) throw error;

      if (newAccount && user) {
        await supabase.from('email_account_access').insert({
          account_id: newAccount.id,
          user_id: user.id,
          access_level: 'full',
          granted_by: user.id,
        });
      }

      setShowCreateModal(false);
      setCreateForm({ email_handle: '', display_name: '', account_type: 'personal', storage_quota_gb: 1 });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account: EmailAccount) => {
    await supabase
      .from('email_accounts')
      .update({ is_active: !account.is_active })
      .eq('id', account.id);

    setAccounts(accounts.map(a =>
      a.id === account.id ? { ...a, is_active: !a.is_active } : a
    ));
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Delete this email account? All messages will be permanently removed.')) return;

    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', accountId);

    if (!error) {
      setAccounts(accounts.filter(a => a.id !== accountId));
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedAccount || !newAccessUserId) return;

    const staffMember = staffMembers.find(s => s.id === newAccessUserId);
    if (!staffMember?.user_id) {
      setError('Selected staff member has no user account');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('email_account_access').insert({
        account_id: selectedAccount.id,
        user_id: staffMember.user_id,
        access_level: newAccessLevel,
        granted_by: user?.id,
      });

      if (error) throw error;
      setNewAccessUserId('');
      await loadAccessGrants([selectedAccount.id]);
    } catch (err: any) {
      setError(err.message || 'Failed to grant access');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAccess = async (grantId: string, accountId: string) => {
    await supabase.from('email_account_access').delete().eq('id', grantId);
    await loadAccessGrants([accountId]);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        provider_type: settingsForm.provider_type,
        from_name: settingsForm.from_name,
        from_domain: getEmailDomain(),
        is_active: settingsForm.is_active,
        updated_at: new Date().toISOString(),
        ...(settingsForm.api_key ? { api_key_encrypted: settingsForm.api_key } : {}),
      };

      if (emailSettings) {
        await supabase.from('tenant_email_settings').update(payload).eq('id', emailSettings.id);
      } else {
        await supabase.from('tenant_email_settings').insert(payload);
      }

      setShowSettingsModal(false);
      await loadEmailSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-100 mb-2">No Tenant Context</h3>
          <p className="text-slate-400">Email accounts can only be managed within a tenant context.</p>
        </div>
      </div>
    );
  }

  const emailDomain = getEmailDomain();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Email Accounts</h2>
          <p className="text-slate-400 mt-1">
            Manage mailboxes and staff access — addresses use <span className="text-cyan-400 font-mono">@{emailDomain}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Provider Settings
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Account
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {emailSettings && (
        <div className={`px-4 py-3 rounded-lg border flex items-center gap-3 ${
          emailSettings.is_active
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {emailSettings.is_active ? (
            <Check className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="text-sm">
            {emailSettings.is_active
              ? `Email provider active: ${emailSettings.provider_type === 'resend' ? 'Resend' : 'SendGrid'}`
              : 'Email provider not configured — emails will be stored locally only'}
          </span>
        </div>
      )}

      {!emailSettings && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">Configure an email provider (Resend or SendGrid) to enable sending and receiving emails.</span>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="ml-auto text-amber-200 hover:text-white underline text-sm whitespace-nowrap"
          >
            Configure now
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700">
          <Mail className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Email Accounts</h3>
          <p className="text-slate-500 mb-6">Create mailboxes for your team and grant staff access to them.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map(account => {
            const grants = accessGrants[account.id] || [];
            const storagePercent = Math.min(100, (account.storage_used_bytes / account.storage_quota_bytes) * 100);
            const storageColor = storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-cyan-500';

            return (
              <div key={account.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      account.is_active ? 'bg-cyan-500/20' : 'bg-slate-700'
                    }`}>
                      <Mail className={`h-5 w-5 ${account.is_active ? 'text-cyan-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white font-mono">{account.email_address}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          account.account_type === 'personal' ? 'bg-blue-500/20 text-blue-300' :
                          account.account_type === 'shared' ? 'bg-green-500/20 text-green-300' :
                          'bg-orange-500/20 text-orange-300'
                        }`}>
                          {account.account_type}
                        </span>
                        {!account.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-400">inactive</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 mt-0.5">{account.display_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAccount(account);
                        setShowAccessModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg border border-slate-600 transition-colors"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Access ({grants.length})
                    </button>
                    <button
                      onClick={() => handleToggleActive(account)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        account.is_active
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
                          : 'bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-600/30'
                      }`}
                    >
                      {account.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>Storage</span>
                    </div>
                    <span>{formatStorage(account.storage_used_bytes)} / {formatStorage(account.storage_quota_bytes)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${storageColor}`}
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                </div>

                {grants.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Access:</span>
                    {grants.slice(0, 4).map(grant => (
                      <span key={grant.id} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                        {grant.staff?.full_name || 'User'} ({grant.access_level})
                      </span>
                    ))}
                    {grants.length > 4 && (
                      <span className="text-xs text-slate-500">+{grants.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Create Email Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={createForm.email_handle}
                    onChange={(e) => setCreateForm({ ...createForm, email_handle: e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, '') })}
                    placeholder="john"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 border-r-0 text-white placeholder-slate-500 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="px-3 py-2 bg-slate-700 border border-slate-600 text-slate-400 rounded-r-lg text-sm">
                    @{emailDomain}
                  </span>
                </div>
                {createForm.email_handle && (
                  <p className="text-xs text-cyan-400 mt-1">
                    Full address: {createForm.email_handle}@{emailDomain}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Type</label>
                <select
                  value={createForm.account_type}
                  onChange={(e) => setCreateForm({ ...createForm, account_type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="personal">Personal — individual staff member</option>
                  <option value="shared">Shared — multiple staff members</option>
                  <option value="department">Department — team inbox</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Storage Quota
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={createForm.storage_quota_gb}
                    onChange={(e) => setCreateForm({ ...createForm, storage_quota_gb: parseInt(e.target.value) || 1 })}
                    className="w-24 px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-slate-400">GB</span>
                  <span className="text-xs text-slate-500 ml-2">Default: 1 GB. Higher storage available as addon.</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={saving || !createForm.email_handle || !createForm.display_name}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccessModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">Manage Access</h3>
                <p className="text-sm text-slate-400 font-mono mt-0.5">{selectedAccount.email_address}</p>
              </div>
              <button onClick={() => setShowAccessModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Grant Access to Staff Member</h4>
                <div className="flex gap-2">
                  <select
                    value={newAccessUserId}
                    onChange={(e) => setNewAccessUserId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select staff member...</option>
                    {staffMembers
                      .filter(s => s.user_id && !(accessGrants[selectedAccount.id] || []).some(g => g.user_id === s.user_id))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                      ))
                    }
                  </select>
                  <select
                    value={newAccessLevel}
                    onChange={(e) => setNewAccessLevel(e.target.value as any)}
                    className="px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="full">Full Access</option>
                    <option value="read_only">Read Only</option>
                    <option value="send_only">Send Only</option>
                  </select>
                  <button
                    onClick={handleGrantAccess}
                    disabled={!newAccessUserId || saving}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Current Access</h4>
                {(accessGrants[selectedAccount.id] || []).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No staff members have access to this account.</p>
                ) : (
                  <div className="space-y-2">
                    {(accessGrants[selectedAccount.id] || []).map(grant => (
                      <div key={grant.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-800 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-slate-200">{grant.staff?.full_name || 'Unknown'}</span>
                          <span className="text-xs text-slate-500 ml-2">{grant.staff?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            grant.access_level === 'full' ? 'bg-cyan-500/20 text-cyan-300' :
                            grant.access_level === 'read_only' ? 'bg-slate-600 text-slate-300' :
                            'bg-green-500/20 text-green-300'
                          }`}>
                            {grant.access_level.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => handleRevokeAccess(grant.id, selectedAccount.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Email Provider Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-start gap-3">
                <Globe className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-slate-300">
                  <span className="font-medium text-white">Sending domain: </span>
                  <span className="font-mono text-cyan-400">{emailDomain}</span>
                  {verifiedDomain ? (
                    <span className="ml-2 text-xs text-green-400">(custom domain)</span>
                  ) : (
                    <span className="ml-2 text-xs text-slate-500">(default subdomain)</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Provider</label>
                <select
                  value={settingsForm.provider_type}
                  onChange={(e) => setSettingsForm({ ...settingsForm, provider_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  API Key
                  {emailSettings?.is_active && <span className="ml-2 text-xs text-slate-500">(leave blank to keep existing)</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={settingsForm.api_key}
                    onChange={(e) => setSettingsForm({ ...settingsForm, api_key: e.target.value })}
                    placeholder={emailSettings?.is_active ? '••••••••••••••••' : 'Enter API key...'}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Default Sender Name</label>
                <input
                  type="text"
                  value={settingsForm.from_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, from_name: e.target.value })}
                  placeholder="Acme Capital"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSettingsForm({ ...settingsForm, is_active: !settingsForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settingsForm.is_active ? 'bg-cyan-600' : 'bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settingsForm.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-slate-300">
                  {settingsForm.is_active ? 'Provider active — emails will be sent via provider' : 'Provider inactive — emails stored locally only'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
