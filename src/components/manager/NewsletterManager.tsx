import { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Eye, Send, Save, Trash2, Calendar, Users, BarChart3, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Newsletter {
  id: string;
  title: string;
  subject: string;
  content: string;
  summary: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  target_audience: string;
  scheduled_send_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  created_by: string;
}

interface Fund {
  id: string;
  name: string;
}

interface ShareClass {
  id: string;
  name: string;
  fund_id: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

export default function NewsletterManager() {
  const { currentTenant } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [viewingNewsletter, setViewingNewsletter] = useState<Newsletter | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'scheduled'>('all');

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    summary: '',
    target_audience: 'all_clients' as string,
    scheduled_send_at: '',
  });

  const [funds, setFunds] = useState<Fund[]>([]);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    loadNewsletters();
  }, [filter]);

  useEffect(() => {
    loadTargetOptions();
  }, []);

  const loadNewsletters = async () => {
    setLoading(true);

    let query = supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading newsletters:', error);
    } else {
      setNewsletters(data || []);
    }
    setLoading(false);
  };

  const loadTargetOptions = async () => {
    try {
      const [fundsRes, classesRes, clientsRes] = await Promise.all([
        supabase.from('hedge_funds').select('id, name'),
        supabase.from('share_classes').select('id, name, fund_id'),
        supabase.from('client_profiles').select('id, full_name, email'),
      ]);

      if (fundsRes.error) console.error('Error loading funds:', fundsRes.error);
      if (classesRes.error) console.error('Error loading share classes:', classesRes.error);
      if (clientsRes.error) console.error('Error loading clients:', clientsRes.error);

      if (fundsRes.data) setFunds(fundsRes.data);
      if (classesRes.data) setShareClasses(classesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
    } catch (err) {
      console.error('Error loading target options:', err);
    }
  };

  const handleCreate = () => {
    setEditingNewsletter(null);
    setFormData({
      title: '',
      subject: '',
      content: '',
      summary: '',
      target_audience: 'all_clients',
      scheduled_send_at: '',
    });
    setShowEditor(true);
  };

  const handleEdit = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData({
      title: newsletter.title,
      subject: newsletter.subject,
      content: newsletter.content,
      summary: newsletter.summary || '',
      target_audience: newsletter.target_audience,
      scheduled_send_at: newsletter.scheduled_send_at || '',
    });
    setShowEditor(true);
  };

  const handleSave = async (saveAs: 'draft' | 'scheduled' | 'sent') => {
    if (!formData.title || !formData.subject || !formData.content) {
      alert('Please fill in all required fields');
      return;
    }

    const newsletterData = {
      tenant_id: currentTenant!.id,
      title: formData.title,
      subject: formData.subject,
      content: formData.content,
      summary: formData.summary || null,
      status: saveAs,
      target_audience: formData.target_audience,
      scheduled_send_at: formData.scheduled_send_at || null,
    };

    let error;
    if (editingNewsletter) {
      const { error: updateError } = await supabase
        .from('newsletters')
        .update(newsletterData)
        .eq('id', editingNewsletter.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('newsletters')
        .insert([newsletterData]);
      error = insertError;
    }

    if (error) {
      console.error('Error saving newsletter:', error);
      alert('Failed to save newsletter');
    } else {
      setShowEditor(false);
      loadNewsletters();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this newsletter?')) return;

    const { error } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting newsletter:', error);
      alert('Failed to delete newsletter');
    } else {
      loadNewsletters();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-slate-400 bg-slate-800/50';
      case 'scheduled': return 'text-blue-400 bg-blue-900/20';
      case 'sending': return 'text-yellow-400 bg-yellow-900/20';
      case 'sent': return 'text-green-400 bg-green-900/20';
      case 'cancelled': return 'text-red-400 bg-red-900/20';
      default: return 'text-slate-400 bg-slate-800/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading newsletters...</div>
      </div>
    );
  }

  if (viewingNewsletter) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">{viewingNewsletter.title}</h2>
            </div>
            <button
              onClick={() => setViewingNewsletter(null)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-sm text-slate-400 mb-2">Subject</div>
              <div className="text-white text-lg">{viewingNewsletter.subject}</div>
            </div>

            {viewingNewsletter.summary && (
              <div>
                <div className="text-sm text-slate-400 mb-2">Summary</div>
                <div className="text-slate-300">{viewingNewsletter.summary}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-slate-400 mb-2">Content</div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 prose prose-invert max-w-none">
                <div className="text-slate-200 whitespace-pre-wrap">{viewingNewsletter.content}</div>
              </div>
            </div>

            {viewingNewsletter.status === 'sent' && (
              <div className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{viewingNewsletter.total_recipients}</div>
                  <div className="text-sm text-slate-400">Recipients</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{viewingNewsletter.delivered_count}</div>
                  <div className="text-sm text-slate-400">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{viewingNewsletter.opened_count}</div>
                  <div className="text-sm text-slate-400">Opened</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{viewingNewsletter.clicked_count}</div>
                  <div className="text-sm text-slate-400">Clicked</div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setViewingNewsletter(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
              {viewingNewsletter.status === 'draft' && (
                <button
                  onClick={() => {
                    setViewingNewsletter(null);
                    handleEdit(viewingNewsletter);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}
              </h2>
            </div>
            <button
              onClick={() => setShowEditor(false)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Internal title for this newsletter"
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
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Subject line that recipients will see"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Summary (Optional)
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Brief summary of this newsletter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Content <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                placeholder="Write your newsletter content here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Audience
              </label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all_clients">All Clients</option>
                <option value="specific_funds">Specific Funds</option>
                <option value="specific_share_classes">Specific Share Classes</option>
                <option value="custom_list">Custom List</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Schedule Send (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_send_at}
                onChange={(e) => setFormData({ ...formData, scheduled_send_at: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowEditor(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave('draft')}
                className="flex items-center space-x-2 px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save as Draft</span>
              </button>
              {formData.scheduled_send_at && (
                <button
                  onClick={() => handleSave('scheduled')}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Schedule</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Newsletter Management</h1>
          <p className="text-slate-400">Create and manage newsletters for your clients</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Create Newsletter</span>
        </button>
      </div>

      <div className="flex space-x-2 mb-6">
        {(['all', 'draft', 'sent', 'scheduled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {newsletters.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center">
          <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">No newsletters yet</h3>
          <p className="text-slate-500 mb-6">Create your first newsletter to communicate with clients</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Newsletter</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {newsletters.map((newsletter) => (
            <div
              key={newsletter.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{newsletter.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(newsletter.status)}`}>
                      {newsletter.status}
                    </span>
                  </div>
                  <p className="text-slate-400 mb-3">{newsletter.subject}</p>
                  {newsletter.summary && (
                    <p className="text-slate-500 text-sm mb-3">{newsletter.summary}</p>
                  )}
                  <div className="flex items-center space-x-6 text-sm text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(newsletter.created_at)}</span>
                    </div>
                    {newsletter.sent_at && (
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Sent {formatDate(newsletter.sent_at)}</span>
                      </div>
                    )}
                    {newsletter.status === 'sent' && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{newsletter.total_recipients} recipients</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-4 h-4" />
                          <span>{newsletter.opened_count} opens</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => setViewingNewsletter(newsletter)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {newsletter.status === 'draft' && (
                    <button
                      onClick={() => handleEdit(newsletter)}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(newsletter.id)}
                    className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
