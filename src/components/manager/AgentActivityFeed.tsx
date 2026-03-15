import React, { useState, useEffect } from 'react';
import { Activity, Mail, Phone, Calendar, User, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantInfo } from '../../lib/hooks';

interface ActivityEvent {
  id: string;
  event_type: string;
  event_description: string;
  new_status: string;
  new_stage: string;
  triggered_by_type: string;
  created_at: string;
  lead_queue_id: string;
  contact_email: string;
}

const EVENT_ICONS: Record<string, any> = {
  email_sent: Mail,
  email_opened: Mail,
  email_clicked: Mail,
  email_replied: Mail,
  call_attempted: Phone,
  call_connected: Phone,
  meeting_scheduled: Calendar,
  qualified: CheckCircle,
  disqualified: XCircle,
  created: User,
  contacted: Mail,
  engaged: TrendingUp,
};

const EVENT_COLORS: Record<string, string> = {
  email_sent: 'bg-blue-100 text-blue-600',
  email_opened: 'bg-cyan-100 text-cyan-600',
  email_clicked: 'bg-purple-100 text-purple-600',
  email_replied: 'bg-green-100 text-green-600',
  call_attempted: 'bg-yellow-100 text-yellow-600',
  call_connected: 'bg-emerald-100 text-emerald-600',
  meeting_scheduled: 'bg-indigo-100 text-indigo-600',
  qualified: 'bg-teal-100 text-teal-600',
  disqualified: 'bg-red-100 text-red-600',
  created: 'bg-slate-100 text-slate-600',
  contacted: 'bg-blue-100 text-blue-600',
  engaged: 'bg-green-100 text-green-600',
};

export default function AgentActivityFeed() {
  const { tenantInfo } = useTenantInfo();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchActivities();
    }
  }, [tenantInfo?.id, filter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchActivities();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, tenantInfo?.id, filter]);

  const fetchActivities = async () => {
    if (!tenantInfo?.id) return;

    try {
      let query = supabase
        .from('ai_lead_lifecycle_events')
        .select(`
          id,
          event_type,
          event_description,
          new_status,
          new_stage,
          triggered_by_type,
          created_at,
          lead_queue_id,
          ai_lead_queue!inner(contact_email)
        `)
        .eq('tenant_id', tenantInfo.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('triggered_by_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        contact_email: item.ai_lead_queue?.contact_email || 'Unknown',
      }));

      setActivities(formattedData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (eventType: string) => {
    const Icon = EVENT_ICONS[eventType] || Activity;
    return Icon;
  };

  const getEventColor = (eventType: string) => {
    return EVENT_COLORS[eventType] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Agent Activity Feed</h2>
          <p className="text-slate-600">Real-time view of AI agent actions</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            Auto-refresh
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Activities</option>
            <option value="ai_agent">AI Agent</option>
            <option value="human">Human</option>
            <option value="automation">Automation</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="divide-y divide-slate-200">
          {activities.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No activities found
            </div>
          ) : (
            activities.map((activity) => {
              const Icon = getEventIcon(activity.event_type);
              const colorClass = getEventColor(activity.event_type);

              return (
                <div key={activity.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium">
                            {activity.event_description}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            {activity.contact_email}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {activity.new_status && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {activity.new_status}
                              </span>
                            )}
                            {activity.new_stage && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {activity.new_stage}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 capitalize">
                              by {activity.triggered_by_type?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="w-4 h-4" />
                          {formatTimestamp(activity.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}