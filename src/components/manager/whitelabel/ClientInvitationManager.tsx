import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Upload, Download, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface Invitation {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'canceled';
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  reminder_count: number;
  custom_message: string | null;
  created_at: string;
}

export default function ClientInvitationManager() {
  const { tenantId, user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddInvite, setShowAddInvite] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    first_name: '',
    last_name: '',
    custom_message: '',
  });
  const [bulkEmails, setBulkEmails] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadInvitations();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async () => {
    if (!newInvite.email) {
      setError('Email is required');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: insertError } = await supabase.from('client_invitations').insert({
        tenant_id: tenantId,
        email: newInvite.email,
        first_name: newInvite.first_name || null,
        last_name: newInvite.last_name || null,
        custom_message: newInvite.custom_message || null,
        invitation_token: token,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        invited_by: user?.id,
      });

      if (insertError) throw insertError;

      setSuccess('Invitation sent successfully!');
      setNewInvite({ email: '', first_name: '', last_name: '', custom_message: '' });
      setShowAddInvite(false);
      loadInvitations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const sendBulkInvitations = async () => {
    const emails = bulkEmails
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line.includes('@'));

    if (emails.length === 0) {
      setError('No valid email addresses found');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invites = emails.map((email) => ({
        tenant_id: tenantId,
        email,
        invitation_token: Math.random().toString(36).substring(2) + Date.now().toString(36),
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        invited_by: user?.id,
      }));

      const { error: insertError } = await supabase.from('client_invitations').insert(invites);

      if (insertError) throw insertError;

      setSuccess(`${emails.length} invitations sent successfully!`);
      setBulkEmails('');
      setShowBulkImport(false);
      loadInvitations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resendInvitation = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('client_invitations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          reminder_count: supabase.sql`reminder_count + 1`,
          last_reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      setSuccess('Invitation resent successfully!');
      loadInvitations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const cancelInvitation = async (id: string) => {
    if (!confirm('Cancel this invitation?')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('client_invitations')
        .update({ status: 'canceled' })
        .eq('id', id);

      if (error) throw error;
      loadInvitations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteInvitation = async (id: string) => {
    if (!confirm('Delete this invitation permanently?')) return;

    try {
      setError(null);
      const { error } = await supabase.from('client_invitations').delete().eq('id', id);

      if (error) throw error;
      loadInvitations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const exportInvitations = () => {
    const csv = [
      ['Email', 'First Name', 'Last Name', 'Status', 'Sent At', 'Accepted At'].join(','),
      ...filteredInvitations.map((inv) =>
        [
          inv.email,
          inv.first_name || '',
          inv.last_name || '',
          inv.status,
          inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : '',
          inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredInvitations =
    filter === 'all' ? invitations : invitations.filter((inv) => inv.status === filter);

  const stats = {
    total: invitations.length,
    sent: invitations.filter((i) => i.status === 'sent').length,
    accepted: invitations.filter((i) => i.status === 'accepted').length,
    pending: invitations.filter((i) => i.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">No Tenant Context</h3>
          <p className="text-slate-300">
            A tenant context is required to manage client invitations. Please ensure you're accessing this from a valid tenant subdomain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Client Invitations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Invite clients to access their portal on your white label platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportInvitations}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowAddInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Send Invitation
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Invitations</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{stats.sent}</div>
          <div className="text-sm text-blue-700">Sent</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{stats.accepted}</div>
          <div className="text-sm text-green-700">Accepted</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
      </div>

      {showAddInvite && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Send New Invitation</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                placeholder="client@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newInvite.first_name}
                  onChange={(e) => setNewInvite({ ...newInvite, first_name: e.target.value })}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newInvite.last_name}
                  onChange={(e) => setNewInvite({ ...newInvite, last_name: e.target.value })}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                value={newInvite.custom_message}
                onChange={(e) => setNewInvite({ ...newInvite, custom_message: e.target.value })}
                rows={3}
                placeholder="Add a personal message to the invitation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={sendInvitation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Invitation
              </button>
              <button
                onClick={() => {
                  setShowAddInvite(false);
                  setNewInvite({ email: '', first_name: '', last_name: '', custom_message: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkImport && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Bulk Import Invitations</h3>
          <p className="text-sm text-gray-600 mb-3">
            Enter one email address per line. Invitations will be sent to all valid email addresses.
          </p>
          <textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            rows={8}
            placeholder="client1@example.com&#10;client2@example.com&#10;client3@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={sendBulkInvitations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send All Invitations
            </button>
            <button
              onClick={() => {
                setShowBulkImport(false);
                setBulkEmails('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {['all', 'sent', 'accepted', 'pending', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`text-sm ${
                  filter === status
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accepted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invitation.first_name || invitation.last_name
                            ? `${invitation.first_name || ''} ${invitation.last_name || ''}`
                            : invitation.email}
                        </div>
                        {(invitation.first_name || invitation.last_name) && (
                          <div className="text-sm text-gray-500">{invitation.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invitation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invitation.sent_at
                      ? new Date(invitation.sent_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invitation.accepted_at
                      ? new Date(invitation.accepted_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {invitation.status === 'sent' && (
                        <button
                          onClick={() => resendInvitation(invitation.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Resend"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {invitation.status !== 'accepted' && invitation.status !== 'canceled' && (
                        <button
                          onClick={() => cancelInvitation(invitation.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteInvitation(invitation.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvitations.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No invitations found</h3>
              <p className="text-gray-600">Start inviting clients to your platform</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
