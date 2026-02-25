import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Shield, X, Settings, Clock, RefreshCw, Mail } from 'lucide-react';
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

  useEffect(() => {
    if (userRole === 'general_manager' || isTenantAdmin) {
      loadStaff();
      loadInvitations();
    }
  }, [userRole, isTenantAdmin]);

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

  const handleSendInvitation = async () => {
    if (!inviteForm.email || !inviteForm.full_name || !currentTenant) return;
    setSaving(true);

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
      alert('Error sending invitation: ' + error.message);
    } else {
      setShowInviteModal(false);
      loadInvitations();
    }
    setSaving(false);
  };

  const handleResendInvitation = async (invitationId: string) => {
    await supabase
      .from('staff_invitations')
      .update({ status: 'sent', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', invitationId);
    loadInvitations();
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);
    loadInvitations();
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

    if (error) { alert('Error updating permissions: ' + error.message); }
    setShowPermissionsModal(false);
    setSelectedStaff(null);
    loadStaff();
  };

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    await supabase.from('staff_accounts').update({ status: 'inactive' }).eq('id', memberId);
    loadStaff();
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{staff.filter(s => s.status === 'active').length}</div>
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
                  <div className="text-xs text-slate-400">{inv.email} - <span className="capitalize">{inv.role.replace('_', ' ')}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{inv.status}</span>
                  <button
                    onClick={() => handleResendInvitation(inv.id)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-teal-400"
                    title="Resend"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                    title="Cancel"
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
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <UserPlus className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">No staff members yet</p>
                    <p className="text-slate-500 text-sm mt-1">Click "Invite Staff" to add your first team member</p>
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-white">{member.full_name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{member.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleColor(member.role)}`}>
                        {member.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{member.phone || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${member.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPermissionsModal(member)}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-teal-400"
                          title="Manage permissions"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {member.id !== staffAccount?.id && member.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(member.id)}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
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
                <Mail className="w-4 h-4" />
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
