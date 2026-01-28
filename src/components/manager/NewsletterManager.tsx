import { useState, useEffect } from 'react';
import { Mail, Send, Users, Eye, MousePointer, Calendar, Plus, Edit2, Trash2, Check, X, FileText, Paperclip } from 'lucide-react';
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
  scheduled_send_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
}

export default function NewsletterManager() {
  const { currentTenant } = useAuth();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    summary: '',
    target_audience: 'all_clients' as const,
  });

  useEffect(() => {
    loadNewsletters();
  }, [currentTenant]);

  const loadNewsletters = async () => {
    if (!currentTenant) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading newsletters:', error);
    } else {
      setNewsletters(data || []);
    }
    setLoading(false);
  };

  const handleCreateNewsletter = async () => {
    if (!currentTenant) return;

    const { error } = await supabase
      .from('newsletters')
      .insert({
        tenant_id: currentTenant.id,
        title: formData.title,
        subject: formData.subject,
        content: formData.content,
        summary: formData.summary || null,
        target_audience: formData.target_audience,
        status: 'draft',
      });

    if (error) {
      console.error('Error creating newsletter:', error);
      alert('Failed to create newsletter: ' + error.message);
    } else {
      setShowCreateModal(false);
      resetForm();
      loadNewsletters();
    }
  };

  const handleUpdateNewsletter = async () => {
    if (!editingNewsletter) return;

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
    const confirmed = confirm('Are you sure you want to send this newsletter to all recipients?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('newsletters')
      .update({
        status: 'sending',
        sent_at: new Date().toISOString(),
      })
      .eq('id', newsletterId);

    if (error) {
      console.error('Error sending newsletter:', error);
      alert('Failed to send newsletter: ' + error.message);
    } else {
      loadNewsletters();
      alert('Newsletter is being sent to all recipients!');
    }
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
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading newsletters...</div>
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
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Newsletter</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {newsletters.map((newsletter) => (
          <div key={newsletter.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{newsletter.title}</h3>
                <p className="text-sm text-slate-400 mb-2">{newsletter.subject}</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(newsletter.status)}`}>
                  {newsletter.status}
                </span>
              </div>
              <div className="flex space-x-2">
                {newsletter.status === 'draft' && (
                  <>
                    <button
                      onClick={() => openEditModal(newsletter)}
                      className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNewsletter(newsletter.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send Now</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {newsletters.length === 0 && (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No newsletters yet</h3>
          <p className="text-slate-400 mb-6">Create your first newsletter to communicate with your clients</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Newsletter</span>
          </button>
        </div>
      )}

      {(showCreateModal || editingNewsletter) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white">
                {editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  placeholder="Monthly Performance Update"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  placeholder="Your January 2024 Performance Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Summary (optional)</label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  placeholder="Brief summary of the newsletter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white h-64"
                  placeholder="Write your newsletter content here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="all_clients">All Clients</option>
                  <option value="specific_funds">Specific Funds</option>
                  <option value="specific_share_classes">Specific Share Classes</option>
                  <option value="custom_list">Custom List</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end space-x-3">
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
      )}
    </div>
  );
}
