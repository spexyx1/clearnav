import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Flag,
  Clock,
  User,
  Building2,
  Plus,
  Filter,
  Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TenantNote {
  id: string;
  tenant_id: string;
  note_type: 'general' | 'support' | 'billing' | 'compliance';
  content: string;
  is_flagged: boolean;
  created_at: string;
  created_by: string;
  tenant_name?: string;
  creator_email?: string;
}

interface AuditLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
  admin_email?: string;
}

export default function SupportTools() {
  const [activeView, setActiveView] = useState<'notes' | 'audit'>('notes');
  const [notes, setNotes] = useState<TenantNote[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeView === 'notes') {
      loadNotes();
    } else {
      loadAuditLogs();
    }
  }, [activeView]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_notes')
        .select(`
          *,
          platform_tenants(name),
          auth.users(email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const notesWithDetails = (data || []).map((note: any) => ({
        ...note,
        tenant_name: note.platform_tenants?.name || 'Unknown',
        creator_email: note['auth.users']?.email || 'Unknown',
      }));

      setNotes(notesWithDetails);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const logsWithEmail = await Promise.all(
        (data || []).map(async (log: any) => {
          const { data: userData } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', log.admin_user_id)
            .maybeSingle();

          return {
            ...log,
            admin_email: userData?.email || 'Unknown',
          };
        })
      );

      setAuditLogs(logsWithEmail);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (noteId: string, currentFlag: boolean) => {
    try {
      const { error } = await supabase
        .from('tenant_notes')
        .update({ is_flagged: !currentFlag })
        .eq('id', noteId);

      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === null || note.note_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'support':
        return 'bg-blue-100 text-blue-800';
      case 'billing':
        return 'bg-green-100 text-green-800';
      case 'compliance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Support Tools</h2>
            <p className="text-slate-600">
              Manage tenant notes and view platform audit logs
            </p>
          </div>
          {activeView === 'notes' && (
            <button
              onClick={() => setShowCreateNote(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Note</span>
            </button>
          )}
        </div>

        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveView('notes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'notes'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tenant Notes
          </button>
          <button
            onClick={() => setActiveView('audit')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'audit'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Audit Logs
          </button>
        </div>

        {activeView === 'notes' && (
          <>
            <div className="flex space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterType(null)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterType === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('support')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterType === 'support'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Support
                </button>
                <button
                  onClick={() => setFilterType('billing')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterType === 'billing'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Billing
                </button>
                <button
                  onClick={() => setFilterType('compliance')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterType === 'compliance'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Compliance
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`bg-white rounded-lg border-2 p-4 ${
                      note.is_flagged
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {note.tenant_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDate(note.created_at)} by {note.creator_email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getNoteTypeColor(
                            note.note_type
                          )}`}
                        >
                          {note.note_type}
                        </span>
                        <button
                          onClick={() => toggleFlag(note.id, note.is_flagged)}
                          className={`p-1.5 rounded hover:bg-slate-100 ${
                            note.is_flagged ? 'text-red-600' : 'text-slate-400'
                          }`}
                        >
                          <Flag className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                    No notes found
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeView === 'audit' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-900">
                              {log.admin_email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {log.resource_type}
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditLogs.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No audit logs found
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showCreateNote && (
        <CreateNoteModal
          onClose={() => setShowCreateNote(false)}
          onSuccess={() => {
            setShowCreateNote(false);
            loadNotes();
          }}
        />
      )}
    </div>
  );
}

interface CreateNoteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateNoteModal({ onClose, onSuccess }: CreateNoteModalProps) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tenant_id: '',
    note_type: 'general' as 'general' | 'support' | 'billing' | 'compliance',
    content: '',
    is_flagged: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    const { data } = await supabase
      .from('platform_tenants')
      .select('id, name')
      .order('name');
    setTenants(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('tenant_notes').insert({
        tenant_id: formData.tenant_id,
        note_type: formData.note_type,
        content: formData.content,
        is_flagged: formData.is_flagged,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      await supabase.from('platform_admin_audit_logs').insert({
        admin_user_id: userData.user?.id,
        action_type: 'create_tenant_note',
        resource_type: 'tenant_notes',
        resource_id: formData.tenant_id,
        details: { note_type: formData.note_type },
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Add Tenant Note</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tenant
            </label>
            <select
              value={formData.tenant_id}
              onChange={(e) =>
                setFormData({ ...formData, tenant_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note Type
            </label>
            <select
              value={formData.note_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  note_type: e.target.value as any,
                })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="support">Support</option>
              <option value="billing">Billing</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              placeholder="Enter your note..."
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_flagged"
              checked={formData.is_flagged}
              onChange={(e) =>
                setFormData({ ...formData, is_flagged: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="is_flagged"
              className="ml-2 text-sm text-slate-700"
            >
              Flag as important
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
