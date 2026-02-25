import { useState, useEffect } from 'react';
import {
  UserPlus, Mail, X, Search, Shield, User, Clock, Check,
  Ban, Edit2, Trash2, DollarSign, Copy, Link, AlertCircle, RefreshCw
} from 'lucide-react';
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
  metadata: any;
  token: string;
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

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export default function UserManagement() {
  const { staffAccount, currentTenant, isTenantAdmin, user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string; inviteUrl?: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

  useEffect(() => {
    if (toast && !toast.inviteUrl) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      ...(staffRes.data || []).map((s: any) => ({ ...s, user_type: 'staff' })),
      ...(clientsRes.data || []).map((c: any) => ({ ...c, user_type: 'client' })),
    ];
    setUsers(combinedUsers);
    setLoading(false);
  };

  const sendInvitationEmail = async (email: string, token: string, role: string, userType: string) => {
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
          userType,
          tenantName: currentTenant?.company_name || currentTenant?.name || 'ClearNav',
        }),
      });

      return await response.json();
    } catch {
      return { success: false, inviteUrl: '' };
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    setSaving(true);

    const existingUser = users.find(u => u.email?.toLowerCase() === inviteForm.email.toLowerCase());
    if (existingUser) {
      setToast({ type: 'error', message: 'A user with this email already exists.' });
      setSaving(false);
      return;
    }

    const existingInvite = invitations.find(i =>
      i.email?.toLowerCase() === inviteForm.email.toLowerCase() && i.status === 'pending'
    );
    if (existingInvite) {
      setToast({ type: 'error', message: 'A pending invitation already exists for this email.' });
      setSaving(false);
      return;
    }

    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
      .from('user_invitations')
      .insert({
        email: inviteForm.email,
        role: inviteForm.role,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: staffAccount?.id || user?.id,
        tenant_id: currentTenant.id,
        metadata: { user_type: inviteForm.userType },
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
      inviteForm.userType
    );

    if (emailResult?.sent) {
      await supabase.from('user_invitations').update({ status: 'sent' }).eq('token', token);
    }

    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'client', userType: 'client' });
    loadData();

    const inviteUrl = emailResult?.inviteUrl || `${window.location.origin}/accept-invite?token=${token}`;

    if (emailResult?.sent) {
      setToast({ type: 'success', message: `Invitation email sent to ${inviteForm.email}` });
    } else {
      setToast({
        type: 'success',
        message: `Invitation created. Share this link:`,
        inviteUrl,
      });
    }
    setSaving(false);
  };

  const cancelInvitation = async (id: string) => {
    await supabase.from('user_invitations').update({ status: 'cancelled' }).eq('id', id);
    loadData();
    setToast({ type: 'success', message: 'Invitation cancelled' });
  };

  const resendInvitation = async (invitation: Invitation) => {
    const emailResult = await sendInvitationEmail(
      invitation.email,
      invitation.token,
      invitation.role,
      invitation.metadata?.user_type || 'client'
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await supabase
      .from('user_invitations')
      .update({ status: emailResult?.sent ? 'sent' : 'pending', expires_at: expiresAt.toISOString() })
      .eq('id', invitation.id);

    loadData();

    if (emailResult?.sent) {
      setToast({ type: 'success', message: `Invitation resent to ${invitation.email}` });
    } else {
      const inviteUrl = emailResult?.inviteUrl || `${window.location.origin}/accept-invite?token=${invitation.token}`;
      setToast({ type: 'success', message: 'Share this link:', inviteUrl });
    }
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    setSaving(true);

    const tempPassword = crypto.getRandomValues(new Uint8Array(16));
    const password = btoa(String.fromCharCode(...tempPassword)).replace(/[^a-zA-Z0-9]/g, '') + 'Aa1!';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: clientForm.email,
      password,
      options: {
        data: { full_name: clientForm.full_name },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      setToast({ type: 'error', message: 'Error creating user account: ' + authError.message });
      setSaving(false);
      return;
    }

    if (!authData.user) {
      setToast({ type: 'error', message: 'Failed to create user' });
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase.from('client_profiles').insert({
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
      setToast({ type: 'error', message: 'Error creating client profile: ' + profileError.message });
      setSaving(false);
      return;
    }

    await supabase.from('tenant_users').insert({
      user_id: authData.user.id,
      tenant_id: currentTenant.id,
      role: 'client',
    });

    await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      email: clientForm.email,
      role_category: 'client',
      tenant_id: currentTenant.id,
      status: 'active',
      metadata: { created_via: 'direct_creation', full_name: clientForm.full_name },
    });

    setShowClientModal(false);
    setClientForm({
      full_name: '', email: '', account_number: '',
      total_invested: '0', current_value: '0',
      inception_date: new Date().toISOString().split('T')[0],
    });
    loadData();
    setToast({ type: 'success', message: `Client "${clientForm.full_name}" created successfully` });
    setSaving(false);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setSaving(true);

    const { error } = await supabase
      .from('client_profiles')
      .update({
        full_name: clientForm.full_name,
        account_number: clientForm.account_number,
        total_invested: clientForm.total_invested,
        current_value: clientForm.current_value,
        inception_date: clientForm.inception_date,
      })
      .eq('id', editingClient.id);

    if (error) {
      setToast({ type: 'error', message: 'Error updating client: ' + error.message });
      setSaving(false);
      return;
    }

    setShowClientModal(false);
    setEditingClient(null);
    setClientForm({
      full_name: '', email: '', account_number: '',
      total_invested: '0', current_value: '0',
      inception_date: new Date().toISOString().split('T')[0],
    });
    loadData();
    setToast({ type: 'success', message: 'Client updated successfully' });
    setSaving(false);
  };

  const handleDeleteClient = async (client: any) => {
    if (!confirm(`Are you sure you want to delete "${client.full_name}"? This action cannot be undone.`)) return;

    const { error } = await supabase.from('client_profiles').delete().eq('id', client.id);
    if (error) {
      setToast({ type: 'error', message: 'Error deleting client: ' + error.message });
      return;
    }
    loadData();
    setToast({ type: 'success', message: `${client.full_name} deleted` });
  };

  const handleDeleteStaff = async (member: any) => {
    if (!confirm(`Are you sure you want to remove "${member.full_name}"? This action cannot be undone.`)) return;

    const { error } = await supabase.from('staff_accounts').delete().eq('id', member.id);
    if (error) {
      setToast({ type: 'error', message: 'Error removing staff member: ' + error.message });
      return;
    }
    loadData();
    setToast({ type: 'success', message: `${member.full_name} removed` });
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

  const pendingInvitations = invitations.filter(i => i.status === 'pending' || i.status === 'sent');
  const filteredInvitations = pendingInvitations.filter(inv =>
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      accepted: 'bg-green-500/20 text-green-300 border-green-500/30',
      expired: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[status] || colors.pending;
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
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
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            User <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Manage clients, staff, and invitations</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageUsers && (
            <button
              onClick={() => {
                setEditingClient(null);
                setClientForm({
                  full_name: '', email: '', account_number: '',
                  total_invested: '0', current_value: '0',
                  inception_date: new Date().toISOString().split('T')[0],
                });
                setShowClientModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <User className="w-4 h-4" />
              Add Client
            </button>
          )}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </button>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{users.length}</div>
          <div className="text-sm text-slate-400">Total Users</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{users.filter(u => u.user_type === 'staff').length}</div>
          <div className="text-sm text-slate-400">Staff Members</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{users.filter(u => u.user_type === 'client').length}</div>
          <div className="text-sm text-slate-400">Clients</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="text-2xl font-bold text-white">{pendingInvitations.length}</div>
          <div className="text-sm text-slate-400">Pending Invitations</div>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search users and invitations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      {filteredInvitations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="border-b border-slate-700/50 px-5 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Pending Invitations</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {filteredInvitations.map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-sm text-white">{inv.email}</div>
                    <div className="text-xs text-slate-500">
                      {inv.metadata?.user_type === 'staff' ? 'Staff' : 'Client'} - Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusBadge(inv.status)}`}>{inv.status}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadge(inv.role)}`}>
                    {inv.role.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Copy invite link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => resendInvitation(inv)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Resend"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => cancelInvitation(inv.id)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Cancel"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="border-b border-slate-700/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Active Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/30 border-b border-slate-700/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role/Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                {canManageUsers && (
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={canManageUsers ? 6 : 5} className="px-5 py-16 text-center">
                    <User className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          u.user_type === 'staff'
                            ? 'bg-gradient-to-br from-orange-500/30 to-amber-500/30'
                            : 'bg-gradient-to-br from-cyan-500/30 to-teal-500/30'
                        }`}>
                          <span className={`text-xs font-semibold ${u.user_type === 'staff' ? 'text-orange-300' : 'text-cyan-300'}`}>
                            {(u.full_name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {u.user_type === 'staff' ? (
                          <Shield className="w-3.5 h-3.5 text-orange-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span className="text-sm text-slate-300 capitalize">{u.user_type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.user_type === 'staff' ? (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRoleBadge(u.role)}`}>
                          {(u.role || '').replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-slate-300">
                          <DollarSign className="w-3 h-3" />
                          <span>{Number(u.current_value || 0).toLocaleString()}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    {canManageUsers && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {u.user_type === 'client' && (
                            <>
                              <button
                                onClick={() => openEditClientModal(u)}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"
                                title="Edit client"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(u)}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                                title="Delete client"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {u.user_type === 'staff' && u.id !== staffAccount?.id && (
                            <button
                              onClick={() => handleDeleteStaff(u)}
                              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Invite User</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">User Type</label>
                <select
                  value={inviteForm.userType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setInviteForm({
                      ...inviteForm,
                      userType: type,
                      role: type === 'staff' ? 'admin' : 'client',
                    });
                  }}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="client">Investor Client</option>
                  <option value="staff">Staff Member</option>
                </select>
              </div>

              {inviteForm.userType === 'staff' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Staff Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {saving ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 flex items-center justify-between p-5 border-b border-slate-800 z-10">
              <h3 className="text-lg font-semibold text-white">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button
                onClick={() => { setShowClientModal(false); setEditingClient(null); }}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingClient ? handleUpdateClient : handleCreateClient} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={clientForm.full_name}
                    onChange={(e) => setClientForm({ ...clientForm, full_name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    disabled={!!editingClient}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="john@example.com"
                  />
                  {editingClient && (
                    <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Number</label>
                  <input
                    type="text"
                    required
                    value={clientForm.account_number}
                    onChange={(e) => setClientForm({ ...clientForm, account_number: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="ACC001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Inception Date</label>
                  <input
                    type="date"
                    required
                    value={clientForm.inception_date}
                    onChange={(e) => setClientForm({ ...clientForm, inception_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Total Invested</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={clientForm.total_invested}
                      onChange={(e) => setClientForm({ ...clientForm, total_invested: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="100000.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={clientForm.current_value}
                      onChange={(e) => setClientForm({ ...clientForm, current_value: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="110000.00"
                    />
                  </div>
                </div>
              </div>

              {!editingClient && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300">
                    A temporary password will be generated automatically. The client should reset their password upon first login.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowClientModal(false); setEditingClient(null); }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                  {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
