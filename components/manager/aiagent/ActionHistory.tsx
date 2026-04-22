import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/lib/hooks';

interface ActionRecord {
  id: string;
  action_type: string;
  action_description: string;
  approval_status: string;
  approval_priority: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  approval_notes?: string;
  contact?: {
    name: string;
    email: string;
  };
  approver?: {
    email: string;
  };
}

interface Analytics {
  totalActions: number;
  approved: number;
  rejected: number;
  autoApproved: number;
  avgApprovalTimeMinutes: number;
}

export default function ActionHistory() {
  const { tenant } = useTenant();
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    if (!tenant?.id) return;
    loadHistory();
    loadAnalytics();
  }, [tenant?.id, dateRange]);

  const loadHistory = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data, error } = await supabase
        .from('ai_agent_actions')
        .select(`
          *,
          contact:crm_contacts(name, email),
          approver:auth.users!approved_by(email)
        `)
        .eq('tenant_id', tenant.id)
        .eq('requires_approval', true)
        .neq('approval_status', 'pending')
        .gte('created_at', startDate.toISOString())
        .order('approved_at', { ascending: false });

      if (error) throw error;
      setActions((data || []) as unknown as ActionRecord[]);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!tenant?.id) return;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data, error } = await supabase
        .from('ai_agent_actions')
        .select('approval_status, created_at, approved_at')
        .eq('tenant_id', tenant.id)
        .eq('requires_approval', true)
        .neq('approval_status', 'pending')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalActions = data?.length || 0;
      const approved = data?.filter(a => a.approval_status === 'approved').length || 0;
      const rejected = data?.filter(a => a.approval_status === 'rejected').length || 0;
      const autoApproved = data?.filter(a => a.approval_status === 'auto_approved').length || 0;

      const approvalTimes = data
        ?.filter(a => a.approved_at && a.approval_status === 'approved')
        .map(a => {
          const created = new Date(a.created_at).getTime();
          const approved = new Date(a.approved_at!).getTime();
          return (approved - created) / 1000 / 60;
        }) || [];

      const avgApprovalTimeMinutes = approvalTimes.length > 0
        ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
        : 0;

      setAnalytics({
        totalActions,
        approved,
        rejected,
        autoApproved,
        avgApprovalTimeMinutes,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Type', 'Description', 'Status', 'Priority', 'Contact', 'Approved By', 'Time to Approval', 'Notes'].join(','),
      ...actions.map(action => [
        new Date(action.created_at).toLocaleString(),
        action.action_type,
        `"${action.action_description.replace(/"/g, '""')}"`,
        action.approval_status,
        action.approval_priority,
        action.contact?.name || '',
        action.approver?.email || 'Auto',
        action.approved_at
          ? `${Math.round((new Date(action.approved_at).getTime() - new Date(action.created_at).getTime()) / 60000)} min`
          : '',
        action.approval_notes ? `"${action.approval_notes.replace(/"/g, '""')}"` : '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredActions = actions.filter(action => {
    if (filterStatus !== 'all' && action.approval_status !== filterStatus) return false;
    if (filterType !== 'all' && action.action_type !== filterType) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      approved: { color: 'green', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'red', icon: XCircle, label: 'Rejected' },
      auto_approved: { color: 'blue', icon: CheckCircle, label: 'Auto-Approved' },
      timeout: { color: 'orange', icon: Clock, label: 'Timeout' },
    };

    const config = configs[status as keyof typeof configs] || { color: 'gray', icon: Clock, label: status };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {analytics && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Total Actions</span>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{analytics.totalActions}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Approved</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{analytics.approved}</div>
            <div className="text-xs text-gray-500">
              {analytics.totalActions > 0 ? Math.round((analytics.approved / analytics.totalActions) * 100) : 0}%
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Rejected</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{analytics.rejected}</div>
            <div className="text-xs text-gray-500">
              {analytics.totalActions > 0 ? Math.round((analytics.rejected / analytics.totalActions) * 100) : 0}%
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Auto-Approved</span>
              <CheckCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{analytics.autoApproved}</div>
            <div className="text-xs text-gray-500">
              {analytics.totalActions > 0 ? Math.round((analytics.autoApproved / analytics.totalActions) * 100) : 0}%
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Avg Time</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analytics.avgApprovalTimeMinutes)}m
            </div>
            <div className="text-xs text-gray-500">to approval</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="auto_approved">Auto-Approved</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          >
            <option value="all">All Types</option>
            <option value="custom_pricing">Custom Pricing</option>
            <option value="support_escalation">Support Escalation</option>
            <option value="email_sequence_enrollment">Email Sequence</option>
          </select>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handled By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time to Resolution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredActions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No actions found for the selected filters
                </td>
              </tr>
            ) : (
              filteredActions.map((action) => {
                const timeToResolution = action.approved_at
                  ? Math.round((new Date(action.approved_at).getTime() - new Date(action.created_at).getTime()) / 60000)
                  : null;

                return (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(action.created_at).toLocaleDateString()}
                      <div className="text-xs text-gray-500">
                        {new Date(action.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {action.action_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {action.contact?.name || 'Unknown'}
                      <div className="text-xs text-gray-500">{action.contact?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(action.approval_status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="capitalize">{action.approval_priority}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {action.approval_status === 'auto_approved' ? 'System' : action.approver?.email || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {timeToResolution !== null ? `${timeToResolution} min` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
