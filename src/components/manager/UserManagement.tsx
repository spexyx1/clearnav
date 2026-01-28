import { useState, useEffect } from 'react';
import { UserPlus, Mail, X, Search, Shield, User, Clock, Check, Ban, Edit2, Trash2, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
}

interface ClientProfile {
  id?: string;
  full_name: string;
  email: string;
  account_number: string;
  total_invested: string;
  current_value: string;
  inception_date: string;
}

export default function UserManagement() {
  const { staffAccount, currentTenant, isTenantAdmin } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [canManageUsers, setCanManageUsers] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'client',
    userType: 'client',
  });

  const [clientForm, setClientForm] = useState<ClientProfile>({
    full_name: '',
    email: '',
    account_number: '',
    total_invested: '0',
    current_value: '0',
    inception_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
    checkPermissions();
  }, [staffAccount]);

  const checkPermissions = async () => {
    if (isTenantAdmin) {
      setCanManageUsers(true);
      return;
    }

    if (!staffAccount) return;

    const { data: permissions } = await supabase
      .from('staff_permissions')
      .select('can_manage_users, can_invite_clients')
      .eq('staff_id', staffAccount.id)
      .maybeSingle();

    setCanManageUsers(
      staffAccount.role === 'general_manager' ||
      staffAccount.role === 'admin' ||
      permissions?.can_manage_users ||
      permissions?.can_invite_clients
    );
  };

  const loadData = async () => {
    if (!currentTenant) return;

    const [invitationsRes, staffRes, clientsRes] = await Promise.all([
      supabase
        .from('user_invitations')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('staff_accounts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_profiles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false }),
    ]);

    setInvitations(invitationsRes.data || []);

    const combinedUsers = [
      ...(staffRes.data || []).map(s => ({ ...s, user_type: 'staff' })),
      ...(clientsRes.data || []).map(c => ({ ...c, user_type: 'client' }))
    ];
    setUsers(combinedUsers);
    setLoading(false);
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    const token = await generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
      .from('user_invitations')
      .insert({
        email: inviteForm.email,
        role: inviteForm.role,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: staffAccount?.id,
        tenant_id: currentTenant.id,
        metadata: { user_type: inviteForm.userType }
      });

    if (error) {
      console.error('Error sending invitation:', error);
      alert('Error sending invitation: ' + error.message);
      return;
    }

    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'client', userType: 'client' });
    loadData();
  };

  const generateToken = async () => {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\//g, '_')
      .replace(/\+/g, '-');
  };

  const cancelInvitation = async (id: string) => {
    await supabase
      .from('user_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id);
    loadData();
  };

  const resendInvitation = async (invitation: Invitation) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabase
      .from('user_invitations')
      .update({
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', invitation.id);

    loadData();
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: clientForm.email,
      password: generateTemporaryPassword(),
      options: {
        data: {
          full_name: clientForm.full_name,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      alert('Error creating user account: ' + authError.message);
      return;
    }

    if (!authData.user) {
      alert('Failed to create user');
      return;
    }

    const { error: profileError } = await supabase
      .from('client_profiles')
      .insert({
        id: authData.user.id,
        full_name: clientForm.full_name,
        email: clientForm.email,
        account_number: clientForm.account_number,
        total_invested: clientForm.total_invested,
        current_value: clientForm.current_value,
        inception_date: clientForm.inception_date,
        tenant_id: currentTenant.id,
      });

    if (profileError) {
      console.error('Error creating client profile:', profileError);
      alert('Error creating client profile: ' + profileError.message);
      return;
    }

    const { error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        user_id: authData.user.id,
        tenant_id: currentTenant.id,
        role: 'client',
      });

    if (tenantUserError) {
      console.error('Error creating tenant user:', tenantUserError);
    }

    setShowClientModal(false);
    setClientForm({
      full_name: '',
      email: '',
      account_number: '',
      total_invested: '0',
      current_value: '0',
      inception_date: new Date().toISOString().split('T')[0],
    });
    loadData();
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const { error } = await supabase
      .from('client_profiles')
      .update({
        full_name: clientForm.full_name,
        email: clientForm.email,
        account_number: clientForm.account_number,
        total_invested: clientForm.total_invested,
        current_value: clientForm.current_value,
        inception_date: clientForm.inception_date,
      })
      .eq('id', editingClient.id);

    if (error) {
      alert('Error updating client: ' + error.message);
      return;
    }

    setShowClientModal(false);
    setEditingClient(null);
    setClientForm({
      full_name: '',
      email: '',
      account_number: '',
      total_invested: '0',
      current_value: '0',
      inception_date: new Date().toISOString().split('T')[0],
    });
    loadData();
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('client_profiles')
      .delete()
      .eq('id', clientId);

    if (error) {
      alert('Error deleting client: ' + error.message);
      return;
    }

    loadData();
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('staff_accounts')
      .delete()
      .eq('id', staffId);

    if (error) {
      alert('Error removing staff member: ' + error.message);
      return;
    }

    loadData();
  };

  const openEditClientModal = (client: any) => {
    setEditingClient(client);
    setClientForm({
      full_name: client.full_name,
      email: client.email,
      account_number: client.account_number,
      total_invested: client.total_invested,
      current_value: client.current_value,
      inception_date: client.inception_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setShowClientModal(true);
  };

  const generateTemporaryPassword = () => {
    return Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase() + '!@#';
  };

  const filteredInvitations = invitations.filter(inv =>
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: any = {
      pending: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      accepted: 'bg-green-500/20 text-green-300 border-green-500/30',
      expired: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[status] || colors.pending;
  };

  const getRoleBadge = (role: string) => {
    const colors: any = {
      general_manager: 'bg-red-500/20 text-red-300 border-red-500/30',
      compliance_manager: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      accountant: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      client: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    };
    return colors[role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            User <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Manage clients, staff, and invitations</p>
        </div>
        <div className="flex items-center space-x-3">
          {canManageUsers && (
            <button
              onClick={() => {
                setEditingClient(null);
                setClientForm({
                  full_name: '',
                  email: '',
                  account_number: '',
                  total_invested: '0',
                  current_value: '0',
                  inception_date: new Date().toISOString().split('T')[0],
                });
                setShowClientModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Add Client</span>
            </button>
          )}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite User</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{users.length}</div>
          <div className="text-sm text-slate-400">Total Users</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{users.filter(u => u.user_type === 'staff').length}</div>
          <div className="text-sm text-slate-400">Staff Members</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{users.filter(u => u.user_type === 'client').length}</div>
          <div className="text-sm text-slate-400">Clients</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{invitations.filter(i => i.status === 'pending').length}</div>
          <div className="text-sm text-slate-400">Pending Invitations</div>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search users and invitations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-3 bg-slate-800/50">
          <h3 className="text-white font-medium">Pending Invitations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/30 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No invitations found
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-white">{invitation.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadge(invitation.role)}`}>
                        {invitation.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(invitation.status)}`}>
                        {invitation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm text-slate-300">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(invitation.expires_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => resendInvitation(invitation)}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400"
                              title="Resend invitation"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => cancelInvitation(invitation.id)}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                              title="Cancel invitation"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
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

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-3 bg-slate-800/50">
          <h3 className="text-white font-medium">Active Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/30 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role/Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                {canManageUsers && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{user.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {user.user_type === 'staff' ? (
                          <Shield className="w-4 h-4 text-orange-400" />
                        ) : (
                          <User className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="text-sm text-slate-300 capitalize">{user.user_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.user_type === 'staff' ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadge(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1 text-sm text-slate-300">
                          <DollarSign className="w-3 h-3" />
                          <span>{(user.current_value || 0).toLocaleString()}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    {canManageUsers && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {user.user_type === 'client' && (
                            <>
                              <button
                                onClick={() => openEditClientModal(user)}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400"
                                title="Edit client"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(user.id)}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                                title="Delete client"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {user.user_type === 'staff' && user.id !== staffAccount?.id && (
                            <button
                              onClick={() => handleDeleteStaff(user.id)}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                              title="Remove staff"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  User Type
                </label>
                <select
                  value={inviteForm.userType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setInviteForm({
                      ...inviteForm,
                      userType: type,
                      role: type === 'staff' ? 'admin' : 'client'
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="client">Investor Client</option>
                  <option value="staff">Staff Member</option>
                </select>
              </div>

              {inviteForm.userType === 'staff' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Staff Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="general_manager">General Manager</option>
                    <option value="compliance_manager">Compliance Manager</option>
                    <option value="accountant">Accountant</option>
                    <option value="cfo">CFO</option>
                    <option value="legal_counsel">Legal Counsel</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setEditingClient(null);
                }}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingClient ? handleUpdateClient : handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.full_name}
                    onChange={(e) => setClientForm({ ...clientForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    disabled={!!editingClient}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="john@example.com"
                  />
                  {editingClient && (
                    <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientForm.account_number}
                    onChange={(e) => setClientForm({ ...clientForm, account_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    placeholder="ACC001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Inception Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={clientForm.inception_date}
                    onChange={(e) => setClientForm({ ...clientForm, inception_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Total Invested *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={clientForm.total_invested}
                      onChange={(e) => setClientForm({ ...clientForm, total_invested: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      placeholder="100000.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Current Value *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={clientForm.current_value}
                      onChange={(e) => setClientForm({ ...clientForm, current_value: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      placeholder="110000.00"
                    />
                  </div>
                </div>
              </div>

              {!editingClient && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    A temporary password will be automatically generated. The client will receive an email to set up their account.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowClientModal(false);
                    setEditingClient(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex items-center justify-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>{editingClient ? 'Update Client' : 'Create Client'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
