import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, X, Settings, Clock, RefreshCw, Mail, Check, Copy, Link, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const STAFF_ROLES = [
  { value: 'general_manager', label: 'General Manager' },
  { value: 'compliance_manager', label: 'Compliance Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'cfo', label: 'CFO' },
  { value: 'legal_counsel', label: 'Legal Counsel' },
  { value: 'admin', label: 'Admin' },
];

const PERMISSION_GROUPS = [
  {
    label: 'Financial Operations',
    permissions: [
      { key: 'can_manage_funds', label: 'Manage Funds' },
      { key: 'can_manage_nav', label: 'Manage NAV' },
      { key: 'can_process_redemptions', label: 'Process Redemptions' },
      { key: 'can_manage_exchange', label: 'Manage Exchange' },
    ],
  },
  {
    label: 'Client Management',
    permissions: [
      { key: 'can_manage_clients', label: 'Manage Clients' },
      { key: 'can_view_reports', label: 'View Reports' },
    ],
  },
  {
    label: 'Communications',
    permissions: [
      { key: 'can_send_communications', label: 'Send Communications' },
      { key: 'can_manage_newsletters', label: 'Manage Newsletters' },
    ],
  },
  {
    label: 'Administrative',
    permissions: [
      { key: 'can_view_compliance', label: 'View Compliance' },
      { key: 'can_access_analytics', label: 'Access Analytics' },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export default function StaffManagement() {
  const { staffAccount, userRole, currentTenant, isTenantAdmin, user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    role: 'admin',
    custom_message: '',
    permissions: {} as Record<string, boolean>,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string; inviteUrl?: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (userRole === 'general_manager' || isTenantAdmin) {
      loadStaff();
      loadInvitations();
    }
  }, [userRole, isTenantAdmin]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        if (!toast.inviteUrl) setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadStaff = async () => {
    if (!currentTenant) return;
    const { data } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false });
    setStaff(data || []);
    setLoading(false);
  };

  const loadInvitations = async () => {
    if (!currentTenant) return;
    const { data } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false });
    setInvitations(data || []);
  };

  const openInviteModal = () => {
    setInviteForm({
      full_name: '',
      email: '',
      role: 'admin',
      custom_message: '',
      permissions: ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<string, boolean>),
    });
    setShowInviteModal(true);
  };

  const sendInvitationEmail = async (email: string, token: string, role: string, customMessage?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, inviteUrl: '' };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-invitation-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          role,
          userType: 'staff',
          tenantName: currentTenant?.company_name || currentTenant?.name || 'ClearNav',
          customMessage,
        }),
      });

      const result = await response.json();
      return result;
    } catch {
      return { success: false, inviteUrl: '' };
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteForm.email || !inviteForm.full_name || !currentTenant) return;
    setSaving(true);

    const existing = staff.find(s => s.email?.toLowerCase() === inviteForm.email.toLowerCase());
    if (existing) {
      setToast({ type: 'error', message: 'A staff member with this email already exists.' });
      setSaving(false);
      return;
    }

    const existingInvite = invitations.find(i => i.email?.toLowerCase() === inviteForm.email.toLowerCase());
    if (existingInvite) {
      setToast({ type: 'error', message: 'An invitation has already been sent to this email.' });
      setSaving(false);
      return;
    }

    const token = generateToken();
    const { error } = await supabase
      .from('staff_invitations')
      .insert({
        tenant_id: currentTenant.id,
        email: inviteForm.email,
        full_name: inviteForm.full_name,
        role: inviteForm.role,
        permissions: inviteForm.permissions,
        token,
        invited_by: user?.id,
        status: 'pending',
        custom_message: inviteForm.custom_message || null,
      });

    if (error) {
      setToast({ type: 'error', message: 'Failed to create invitation: ' + error.message });
      setSaving(false);
      return;
    }

    const emailResult = await sendInvitationEmail(
      inviteForm.email,
      token,
      inviteForm.role,
      inviteForm.custom_message
    );

    if (emailResult?.sent) {
      await supabase
        .from('staff_invitations')
        .update({ status: 'sent' })
        .eq('token', token);
    }

    setShowInviteModal(false);
    loadInvitations();

    const inviteUrl = emailResult?.inviteUrl || `${window.location.origin}/accept-invite?token=${token}`;

    if (emailResult?.sent) {
      setToast({ type: 'success', message: `Invitation email sent to ${inviteForm.email}` });
    } else {
      setToast({
        type: 'success',
        message: `Invitation created. Share the link below with ${inviteForm.full_name}:`,
        inviteUrl,
      });
    }

    setSaving(false);
  };

  const handleResendInvitation = async (invitation: any) => {
    const emailResult = await sendInvitationEmail(
      invitation.email,
      invitation.token,
      invitation.role,
      invitation.custom_message
    );

    await supabase
      .from('staff_invitations')
      .update({
        status: emailResult?.sent ? 'sent' : 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', invitation.id);

    loadInvitations();

    if (emailResult?.sent) {
      setToast({ type: 'success', message: `Invitation resent to ${invitation.email}` });
    } else {
      const inviteUrl = emailResult?.inviteUrl || `${window.location.origin}/accept-invite?token=${invitation.token}`;
      setToast({
        type: 'success',
        message: `Share this link with ${invitation.full_name}:`,
        inviteUrl,
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);
    loadInvitations();
    setToast({ type: 'success', message: 'Invitation cancelled' });
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openPermissionsModal = (member: any) => {
    setSelectedStaff(member);
    const perms = member.permissions || {};
    setPermissions(ALL_PERMISSION_KEYS.reduce((acc, key) => ({ ...acc, [key]: perms[key] || false }), {} as Record<string, boolean>));
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff || !currentTenant) return;
    if (selectedStaff.role === 'owner' || selectedStaff.role === 'admin') {
      setShowPermissionsModal(false);
      return;
    }

    const { error } = await supabase
      .from('staff_accounts')
      .update({ permissions })
      .eq('id', selectedStaff.id);

    if (error) {
      setToast({ type: 'error', message: 'Error updating permissions: ' + error.message });
    } else {
      setToast({ type: 'success', message: `Permissions updated for ${selectedStaff.full_name}` });
    }
    setShowPermissionsModal(false);
    setSelectedStaff(null);
    loadStaff();
  };

  const handleDeactivate = async (member: any) => {
    if (!confirm(`Are you sure you want to deactivate ${member.full_name}?`)) return;
    await supabase.from('staff_accounts').update({ status: 'inactive' }).eq('id', member.id);
    loadStaff();
    setToast({ type: 'success', message: `${member.full_name} has been deactivated` });
  };

  const handleReactivate = async (member: any) => {
    await supabase.from('staff_accounts').update({ status: 'active' }).eq('id', member.id);
    loadStaff();
    setToast({ type: 'success', message: `${member.full_name} has been reactivated` });
  };

  if (userRole !== 'general_manager' && !isTenantAdmin) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
        <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Access restricted to General Managers and Tenant Owners only</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      general_manager: 'bg-red-500/20 text-red-300 border-red-500/30',
      compliance_manager: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      cfo: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      accountant: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      legal_counsel: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      admin: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return colors[role] || colors.admin;
  };

  const activeStaff = staff.filter(s => s.status === 'active');
  const inactiveStaff = staff.filter(s => s.status !== 'active');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Team <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Manage team members, invitations, and permissions</p>
        </div>
        <button
          onClick={openInviteModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Invite Staff
        </button>
      </div>

      {toast && (
        <div className={`px-4 py-3 rounded-lg flex items-start gap-3 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <span className="text-sm">{toast.message}</span>
            {toast.inviteUrl && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={toast.inviteUrl}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-xs text-white font-mono truncate"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(toast.inviteUrl!);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs whitespace-nowrap"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{activeStaff.length}</div>
          <div className="text-sm text-slate-400">Active Staff</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{invitations.length}</div>
          <div className="text-sm text-slate-400">Pending Invitations</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{staff.length}</div>
          <div className="text-sm text-slate-400">Total Staff</div>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Pending Invitations</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {invitations.map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white font-medium">{inv.full_name}</div>
                  <div className="text-xs text-slate-400">
                    {inv.email} - <span className="capitalize">{inv.role.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{inv.status}</span>
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Copy invite link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleResendInvitation(inv)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-teal-400 transition-colors"
                    title="Resend invitation"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Cancel invitation"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-white">Active Team Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/30 border-b border-slate-700/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {activeStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <UserPlus className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">No active staff members</p>
                    <p className="text-slate-500 text-sm mt-1">Click "Invite Staff" to add your first team member</p>
                  </td>
                </tr>
              ) : (
                activeStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/30 to-cyan-500/30 flex items-center justify-center">
                          <span className="text-xs font-semibold text-teal-300">{(member.full_name || '?')[0].toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-white">{member.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{member.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleColor(member.role)}`}>
                        {member.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{member.phone || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-300">
                        active
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPermissionsModal(member)}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-teal-400 transition-colors"
                          title="Manage permissions"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {member.id !== staffAccount?.id && (
                          <button
                            onClick={() => handleDeactivate(member)}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inactiveStaff.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-400">Inactive Members</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {inactiveStaff.map((member) => (
              <div key={member.id} className="px-5 py-3 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-xs font-semibold text-slate-400">{(member.full_name || '?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="text-sm text-white">{member.full_name}</div>
                    <div className="text-xs text-slate-500">{member.email} - {member.role.replace(/_/g, ' ')}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleReactivate(member)}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 flex items-center justify-between p-5 border-b border-slate-800 z-10">
              <h3 className="text-lg font-semibold text-white">Invite Staff Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                >
                  {STAFF_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Permissions</label>
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.label}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.label}</div>
                      <div className="space-y-2">
                        {group.permissions.map(perm => (
                          <label key={perm.key} className="flex items-center justify-between cursor-pointer bg-slate-800/50 rounded-lg px-3 py-2">
                            <span className="text-sm text-slate-300">{perm.label}</span>
                            <input
                              type="checkbox"
                              checked={inviteForm.permissions[perm.key] || false}
                              onChange={(e) => setInviteForm({
                                ...inviteForm,
                                permissions: { ...inviteForm.permissions, [perm.key]: e.target.checked },
                              })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Custom Message (optional)</label>
                <textarea
                  value={inviteForm.custom_message}
                  onChange={(e) => setInviteForm({ ...inviteForm, custom_message: e.target.value })}
                  rows={3}
                  placeholder="Add a personal message to the invitation..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-900 flex justify-end gap-3 p-5 border-t border-slate-800">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={saving || !inviteForm.full_name || !inviteForm.email}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {saving ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionsModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 flex items-center justify-between p-5 border-b border-slate-800 z-10">
              <div>
                <h3 className="text-lg font-semibold text-white">Staff Permissions</h3>
                <p className="text-sm text-slate-400 mt-0.5">{selectedStaff.full_name}</p>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Role</span>
                <span className="text-sm font-medium text-white capitalize">{selectedStaff.role.replace(/_/g, ' ')}</span>
              </div>

              {selectedStaff.role === 'owner' || selectedStaff.role === 'admin' ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-300">Admin roles have full permissions by default.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.label}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.label}</div>
                      <div className="space-y-2">
                        {group.permissions.map(perm => (
                          <label key={perm.key} className="flex items-center justify-between cursor-pointer bg-slate-800/50 rounded-lg px-3 py-2">
                            <span className="text-sm text-slate-300">{perm.label}</span>
                            <input
                              type="checkbox"
                              checked={permissions[perm.key] || false}
                              onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-slate-900 flex justify-end gap-3 p-5 border-t border-slate-800">
              <button onClick={() => setShowPermissionsModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm">
                {selectedStaff.role === 'owner' || selectedStaff.role === 'admin' ? 'Close' : 'Cancel'}
              </button>
              {selectedStaff.role !== 'owner' && selectedStaff.role !== 'admin' && (
                <button onClick={handleSavePermissions} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors text-sm font-medium">
                  Save Permissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
