import { useState, useEffect } from 'react';
import { Mail, Send, Users, Eye, Calendar, Plus, Edit2, Trash2, Check, X, Search, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Newsletter {
  id: string;
  title: string;
  subject: string;
  content: string;
  summary: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  target_audience: 'all_clients' | 'specific_funds' | 'specific_share_classes' | 'custom_list';
  target_client_ids: string[] | null;
  scheduled_send_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  created_by: string | null;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

export default function NewsletterManager() {
  const { user, currentTenant, staffAccount, isTenantAdmin, loading: authLoading } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [previewNewsletter, setPreviewNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    summary: '',
    target_audience: 'all_clients' as const,
  });

  useEffect(() => {
    console.log('NewsletterManager useEffect:', { authLoading, currentTenant: currentTenant?.id, user: user?.id, staffAccount: staffAccount?.id, isTenantAdmin });

    const initializeComponent = async () => {
      if (!authLoading) {
        if (currentTenant && user) {
          console.log('Loading newsletters for tenant:', currentTenant.id);
          setLoading(true);
          try {
            await Promise.all([
              checkPermissions(),
              loadNewsletters(),
              loadClients()
            ]);
            console.log('All data loaded successfully');
          } catch (error) {
            console.error('Error initializing newsletter manager:', error);
          } finally {
            console.log('Setting loading to false after initialization');
            setLoading(false);
          }
        } else {
          console.log('Missing tenant or user, setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeComponent();
  }, [currentTenant, authLoading, user, isTenantAdmin, staffAccount]);

  const checkPermissions = async () => {
    try {
      console.log('checkPermissions called:', { isTenantAdmin, staffAccount: staffAccount?.role });

      if (isTenantAdmin) {
        console.log('User is tenant admin, granting create permission');
        setCanCreate(true);
        return;
      }

      if (!staffAccount) {
        console.log('No staff account, denying create permission');
        setCanCreate(false);
        return;
      }

      if (staffAccount.role === 'general_manager' || staffAccount.role === 'admin') {
        console.log('User is general_manager/admin, granting create permission');
        setCanCreate(true);
        return;
      }

      console.log('Checking staff_permissions table for staff_id:', staffAccount.id);
      const { data: permissions, error } = await supabase
        .from('staff_permissions')
        .select('can_create_newsletters')
        .eq('staff_id', staffAccount.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking permissions:', error);
        setCanCreate(false);
        return;
      }

      console.log('Permissions result:', permissions);
      setCanCreate(permissions?.can_create_newsletters || false);
    } catch (error) {
      console.error('Unexpected error in checkPermissions:', error);
      setCanCreate(false);
    }
  };

  const loadClients = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('id, full_name, email')
        .eq('tenant_id', currentTenant.id)
        .order('full_name');

      if (error) {
        console.error('Error loading clients:', error);
      } else {
        setClients(data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading clients:', error);
    }
  };

  const loadNewsletters = async () => {
    console.log('loadNewsletters called, tenant:', currentTenant?.id);
    if (!currentTenant) {
      console.log('No tenant, cannot load newsletters');
      return;
    }

    try {
      console.log('Querying newsletters for tenant:', currentTenant.id);
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      console.log('Newsletter query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error loading newsletters:', error);
        alert('Failed to load newsletters: ' + error.message);
      } else {
        console.log('Setting newsletters:', data?.length || 0, 'items');
        setNewsletters(data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading newsletters:', error);
    }
  };

  const handleCreateNewsletter = async () => {
    if (!currentTenant || !user) return;

    if (!formData.title || !formData.subject || !formData.content) {
      alert('Please fill in all required fields (Title, Subject, Content)');
      return;
    }

    if (formData.target_audience === 'custom_list' && selectedClients.length === 0) {
      alert('Please select at least one client for custom list');
      return;
    }

    const { error } = await supabase
      .from('newsletters')
      .insert({
        tenant_id: currentTenant.id,
        title: formData.title,
        subject: formData.subject,
        content: formData.content,
        summary: formData.summary || null,
        target_audience: formData.target_audience,
        target_client_ids: formData.target_audience === 'custom_list' ? selectedClients : null,
        status: 'draft',
        created_by: user.id,
        total_recipients: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
      });

    if (error) {
      console.error('Error creating newsletter:', error);
      alert('Failed to create newsletter: ' + error.message);
    } else {
      setShowCreateModal(false);
      resetForm();
      setSelectedClients([]);
      loadNewsletters();
    }
  };

  const handleUpdateNewsletter = async () => {
    if (!editingNewsletter) return;

    if (!formData.title || !formData.subject || !formData.content) {
      alert('Please fill in all required fields (Title, Subject, Content)');
      return;
    }

    const { error } = await supabase
      .from('newsletters')
      .update({
        title: formData.title,
        subject: formData.subject,
        content: formData.content,
        summary: formData.summary || null,
      })
      .eq('id', editingNewsletter.id);

    if (error) {
      console.error('Error updating newsletter:', error);
      alert('Failed to update newsletter: ' + error.message);
    } else {
      setEditingNewsletter(null);
      resetForm();
      loadNewsletters();
    }
  };

  const handleSendNewsletter = async (newsletterId: string) => {
    const newsletter = newsletters.find(n => n.id === newsletterId);
    if (!newsletter) return;

    const recipientCount = await getRecipientCount(newsletter);
    if (recipientCount === 0) {
      alert('No recipients found. Please add clients before sending.');
      return;
    }

    const confirmed = confirm(`Are you sure you want to send this newsletter to ${recipientCount} recipient(s)?`);
    if (!confirmed) return;

    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        alert('You must be logged in to send newsletters');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newsletter_id: newsletterId }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to send newsletter');
      }

      const result = await response.json();
      alert(`Newsletter sent successfully to ${result.delivered_count} recipients!`);
      loadNewsletters();
    } catch (error: any) {
      console.error('Error sending newsletter:', error);
      alert('Failed to send newsletter: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const getRecipientCount = async (newsletter: Newsletter): Promise<number> => {
    if (!currentTenant) return 0;

    if (newsletter.target_audience === 'all_clients') {
      const { count } = await supabase
        .from('client_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', currentTenant.id);
      return count || 0;
    } else if (newsletter.target_audience === 'custom_list' && newsletter.target_client_ids) {
      return newsletter.target_client_ids.length;
    }

    return 0;
  };

  const handleDeleteNewsletter = async (newsletterId: string) => {
    const confirmed = confirm('Are you sure you want to delete this newsletter?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', newsletterId);

    if (error) {
      console.error('Error deleting newsletter:', error);
      alert('Failed to delete newsletter: ' + error.message);
    } else {
      loadNewsletters();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      content: '',
      summary: '',
      target_audience: 'all_clients',
    });
    setSelectedClients([]);
    setClientSearch('');
  };

  const openEditModal = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData({
      title: newsletter.title,
      subject: newsletter.subject,
      content: newsletter.content,
      summary: newsletter.summary || '',
      target_audience: newsletter.target_audience,
    });
    if (newsletter.target_client_ids) {
      setSelectedClients(newsletter.target_client_ids);
    }
  };

  const openPreview = (newsletter: Newsletter) => {
    setPreviewNewsletter(newsletter);
    setShowPreviewModal(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-slate-400 bg-slate-800';
      case 'scheduled': return 'text-blue-400 bg-blue-900/30';
      case 'sending': return 'text-yellow-400 bg-yellow-900/30';
      case 'sent': return 'text-green-400 bg-green-900/30';
      case 'cancelled': return 'text-red-400 bg-red-900/30';
      default: return 'text-slate-400 bg-slate-800';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-slate-400">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Loading newsletters...</span>
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <div className="text-slate-400 mb-2">No tenant context available</div>
          <div className="text-sm text-slate-500">Please ensure you're accessing from a valid tenant subdomain</div>
        </div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 mb-2">Access Restricted</h3>
        <p className="text-slate-400">You don't have permission to manage newsletters. Please contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Newsletters</h1>
          <p className="text-slate-400">Create and send newsletters to your clients</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Newsletter</span>
        </button>
      </div>

      {newsletters.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No newsletters yet</h3>
          <p className="text-slate-400 mb-6">Create your first newsletter to communicate with your clients</p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Newsletter</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsletters.map((newsletter) => (
            <div key={newsletter.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate">{newsletter.title}</h3>
                  <p className="text-sm text-slate-400 mb-2 truncate">{newsletter.subject}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(newsletter.status)}`}>
                    {newsletter.status}
                  </span>
                </div>
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => openPreview(newsletter)}
                    className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {newsletter.status === 'draft' && (
                    <>
                      <button
                        onClick={() => openEditModal(newsletter)}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNewsletter(newsletter.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {newsletter.summary && (
                <p className="text-sm text-slate-300 mb-4 line-clamp-2">{newsletter.summary}</p>
              )}

              {newsletter.status === 'sent' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-900/50 rounded">
                    <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <div className="text-lg font-semibold text-white">{newsletter.total_recipients}</div>
                    <div className="text-xs text-slate-400">Recipients</div>
                  </div>
                  <div className="text-center p-3 bg-slate-900/50 rounded">
                    <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-semibold text-blue-400">
                      {newsletter.total_recipients > 0
                        ? Math.round((newsletter.opened_count / newsletter.total_recipients) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-slate-400">Open Rate</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(newsletter.created_at).toLocaleDateString()}</span>
                </div>
                {newsletter.sent_at && (
                  <div className="text-green-400">
                    Sent {new Date(newsletter.sent_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {newsletter.status === 'draft' && (
                <button
                  onClick={() => handleSendNewsletter(newsletter.id)}
                  disabled={sending}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingNewsletter) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                {editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingNewsletter(null);
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Monthly Performance Update"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Your January 2024 Performance Report"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Summary (optional)</label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Brief summary of the newsletter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Content <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none h-64 resize-none"
                  placeholder="Write your newsletter content here..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Audience <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => {
                    setFormData({ ...formData, target_audience: e.target.value as any });
                    if (e.target.value !== 'custom_list') {
                      setSelectedClients([]);
                    }
                  }}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  disabled={!!editingNewsletter}
                >
                  <option value="all_clients">All Clients</option>
                  <option value="custom_list">Custom List (Select Clients)</option>
                </select>
                {editingNewsletter && (
                  <p className="text-xs text-slate-500 mt-1">Cannot change audience after creation</p>
                )}
              </div>

              {formData.target_audience === 'custom_list' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Select Clients ({selectedClients.length} selected)
                      {selectedClients.length === 0 && <span className="text-red-400"> *</span>}
                    </label>
                    {filteredClients.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {selectedClients.length === filteredClients.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                    <div className="mb-3">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search clients by name or email..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {filteredClients.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          {clients.length === 0 ? 'No clients found in your tenant' : 'No matching clients'}
                        </p>
                      ) : (
                        filteredClients.map((client) => (
                          <label
                            key={client.id}
                            className="flex items-center space-x-3 p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedClients.includes(client.id)}
                              onChange={() => toggleClientSelection(client.id)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{client.full_name}</div>
                              <div className="text-xs text-slate-400 truncate">{client.email}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-800 p-6 border-t border-slate-700 flex justify-between items-center">
              <p className="text-xs text-slate-500">
                <span className="text-red-400">*</span> Required fields
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingNewsletter(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingNewsletter ? handleUpdateNewsletter : handleCreateNewsletter}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingNewsletter ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && previewNewsletter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Preview Newsletter</h2>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewNewsletter(null);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-white text-black p-8 rounded-lg shadow-2xl">
                <div className="border-b border-slate-300 pb-4 mb-6">
                  <div className="text-sm text-slate-600 mb-1">From: {currentTenant?.name || 'Your Company'}</div>
                  <div className="text-sm text-slate-600 mb-4">Subject: {previewNewsletter.subject}</div>
                  <h1 className="text-3xl font-bold text-slate-900">{previewNewsletter.title}</h1>
                </div>

                {previewNewsletter.summary && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="text-slate-700 font-medium">{previewNewsletter.summary}</p>
                  </div>
                )}

                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {previewNewsletter.content}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-300">
                  <p className="text-xs text-slate-500 text-center">
                    This is a preview. The actual email may appear slightly different depending on the email client.
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-800 p-6 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewNewsletter(null);
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
