import React, { useState, useEffect } from 'react';
import { Mail, Users, Download, Trash2, Search } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';

interface Subscriber {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  source: string;
  subscribed_at: string;
  opens_count: number;
  clicks_count: number;
}

export function NewsletterSubscribers() {
  const { tenantId } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) loadSubscribers();
  }, [tenantId]);

  async function loadSubscribers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubscriber(id: string) {
    if (!confirm('Remove this subscriber?')) return;

    try {
      const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Subscriber removed!');
      loadSubscribers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function exportSubscribers() {
    const csv = [
      ['Email', 'First Name', 'Last Name', 'Status', 'Source', 'Subscribed Date'].join(','),
      ...filteredSubscribers.map((s) =>
        [s.email, s.first_name || '', s.last_name || '', s.status, s.source, new Date(s.subscribed_at).toLocaleDateString()].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const filteredSubscribers = subscribers.filter((s) => {
    const matchesSearch =
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscribers.length,
    subscribed: subscribers.filter((s) => s.status === 'subscribed').length,
    unsubscribed: subscribers.filter((s) => s.status === 'unsubscribed').length,
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Newsletter Subscribers</h3>
            <p className="text-sm text-gray-600">Manage your email list</p>
          </div>
        </div>
        <button onClick={exportSubscribers} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Download size={20} /> Export CSV
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">Total Subscribers</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-green-600">{stats.subscribed}</div>
          <div className="text-sm text-gray-600 mt-1">Active</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-gray-600">{stats.unsubscribed}</div>
          <div className="text-sm text-gray-600 mt-1">Unsubscribed</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search subscribers..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="all">All Status</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Email</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Name</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Source</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Engagement</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Subscribed</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSubscribers.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No subscribers found</td></tr>
            ) : (
              filteredSubscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{sub.email}</td>
                  <td className="px-6 py-4 text-gray-600">{sub.first_name || sub.last_name ? `${sub.first_name || ''} ${sub.last_name || ''}`.trim() : '-'}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded ${sub.status === 'subscribed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{sub.status}</span></td>
                  <td className="px-6 py-4 text-gray-600 capitalize">{sub.source}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sub.opens_count} opens · {sub.clicks_count} clicks</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4"><div className="flex items-center justify-end"><button onClick={() => deleteSubscriber(sub.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900"><strong>Privacy:</strong> Subscriber data is protected and used only for newsletters. Users can unsubscribe at any time via email links.</p>
      </div>
    </div>
  );
}
