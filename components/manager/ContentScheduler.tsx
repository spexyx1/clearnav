import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';

interface Schedule {
  id: string;
  content_type: string;
  content_id: string;
  scheduled_for: string;
  action: string;
  status: string;
  error_message: string;
  executed_at: string;
}

interface BlogPost {
  id: string;
  title: string;
}

export function ContentScheduler() {
  const { tenantId, user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState('');
  const [selectedAction, setSelectedAction] = useState<'publish' | 'unpublish'>('publish');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadSchedules();
      loadBlogPosts();
    }
  }, [tenantId]);

  async function loadSchedules() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_schedule')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadBlogPosts() {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, status')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogPosts(data || []);
    } catch (err: any) {
      console.error('Error loading posts:', err);
    }
  }

  async function createSchedule() {
    try {
      if (!selectedPost || !scheduledDate || !scheduledTime) {
        setError('Please fill all fields');
        return;
      }

      setError(null);

      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      const { error } = await supabase.from('content_schedule').insert([
        {
          tenant_id: tenantId,
          content_type: 'blog_post',
          content_id: selectedPost,
          scheduled_for: scheduledFor,
          action: selectedAction,
          created_by: user?.id,
        },
      ]);

      if (error) throw error;

      setSuccess('Schedule created successfully!');
      setShowModal(false);
      setSelectedPost('');
      setScheduledDate('');
      setScheduledTime('');
      loadSchedules();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Delete this schedule?')) return;

    try {
      const { error } = await supabase.from('content_schedule').delete().eq('id', id);

      if (error) throw error;

      setSuccess('Schedule deleted!');
      loadSchedules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Content Scheduler</h3>
            <p className="text-sm text-gray-600">Schedule posts to publish automatically</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Schedule Content
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Post</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Action</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Scheduled For</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schedules.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No scheduled content yet</td></tr>
            ) : (
              schedules.map((schedule) => {
                const post = blogPosts.find((p) => p.id === schedule.content_id);
                return (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{post?.title || 'Unknown Post'}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded ${schedule.action === 'publish' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{schedule.action}</span></td>
                    <td className="px-6 py-4 text-gray-600">{new Date(schedule.scheduled_for).toLocaleString()}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2">{getStatusIcon(schedule.status)}<span className="text-sm text-gray-700 capitalize">{schedule.status}</span></div>{schedule.error_message && <div className="text-xs text-red-600 mt-1">{schedule.error_message}</div>}</td>
                    <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">{schedule.status === 'pending' && <button onClick={() => deleteSchedule(schedule.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>}</div></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Content</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Post</label>
                <select value={selectedPost} onChange={(e) => setSelectedPost(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a post...</option>
                  {blogPosts.map((post) => (
                    <option key={post.id} value={post.id}>{post.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value as 'publish' | 'unpublish')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="publish">Publish</option>
                  <option value="unpublish">Unpublish</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={createSchedule} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Schedule</button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900"><strong>Note:</strong> Scheduled content is processed automatically every few minutes. Pending schedules will execute at the scheduled time. You can delete pending schedules before they execute.</p>
      </div>
    </div>
  );
}
