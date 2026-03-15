import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, Phone, Calendar, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantInfo } from '../../lib/hooks';

interface Lead {
  id: string;
  contact_email: string;
  contact_name: string;
  contact_company: string;
  contact_phone: string;
  queue_status: string;
  sales_stage: string;
  priority_score: number;
  lead_score: number;
  engagement_score: number;
  next_action_type: string;
  next_action_scheduled_at: string;
  last_action_taken_at: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  calls_attempted: number;
  entered_queue_at: string;
  assigned_campaign_id: string;
  tags: string[];
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  enriching: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-cyan-100 text-cyan-800',
  engaged: 'bg-emerald-100 text-emerald-800',
  qualified: 'bg-teal-100 text-teal-800',
  demo_scheduled: 'bg-indigo-100 text-indigo-800',
  trial_active: 'bg-violet-100 text-violet-800',
  payment_sent: 'bg-fuchsia-100 text-fuchsia-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  paused: 'bg-slate-100 text-slate-800',
};

const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-slate-100 text-slate-700',
  contact_made: 'bg-blue-100 text-blue-700',
  discovery: 'bg-cyan-100 text-cyan-700',
  demo: 'bg-purple-100 text-purple-700',
  trial: 'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
};

export default function LeadQueue() {
  const { tenantInfo } = useTenantInfo();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'recent' | 'engagement'>('priority');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    engaged: 0,
    qualified: 0,
    converted: 0,
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchLeads();
    }
  }, [tenantInfo?.id]);

  useEffect(() => {
    filterAndSortLeads();
  }, [leads, searchTerm, statusFilter, stageFilter, sortBy]);

  const fetchLeads = async () => {
    if (!tenantInfo?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_lead_queue')
        .select('*')
        .eq('tenant_id', tenantInfo.id)
        .order('priority_score', { ascending: false });

      if (error) throw error;

      setLeads(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leadsData: Lead[]) => {
    setStats({
      total: leadsData.length,
      new: leadsData.filter(l => l.queue_status === 'new').length,
      contacted: leadsData.filter(l => l.queue_status === 'contacted').length,
      engaged: leadsData.filter(l => l.queue_status === 'engaged').length,
      qualified: leadsData.filter(l => l.queue_status === 'qualified').length,
      converted: leadsData.filter(l => l.queue_status === 'converted').length,
    });
  };

  const filterAndSortLeads = () => {
    let filtered = [...leads];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.contact_email.toLowerCase().includes(term) ||
        lead.contact_name?.toLowerCase().includes(term) ||
        lead.contact_company?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.queue_status === statusFilter);
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(lead => lead.sales_stage === stageFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority_score - a.priority_score;
        case 'recent':
          return new Date(b.entered_queue_at).getTime() - new Date(a.entered_queue_at).getTime();
        case 'engagement':
          return b.engagement_score - a.engagement_score;
        default:
          return 0;
      }
    });

    setFilteredLeads(filtered);
  };

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const selectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedLeads.size === 0) {
      alert('Please select leads first');
      return;
    }

    try {
      const updates: any = {};

      switch (action) {
        case 'pause':
          updates.queue_status = 'paused';
          break;
        case 'resume':
          updates.queue_status = 'ready';
          break;
        case 'qualify':
          updates.queue_status = 'qualified';
          break;
        case 'disqualify':
          updates.is_disqualified = true;
          updates.disqualified_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('ai_lead_queue')
        .update(updates)
        .in('id', Array.from(selectedLeads));

      if (error) throw error;

      alert(`Successfully updated ${selectedLeads.size} leads`);
      setSelectedLeads(new Set());
      fetchLeads();
    } catch (error) {
      console.error('Error updating leads:', error);
      alert('Failed to update leads');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const getDaysSince = (dateString: string) => {
    if (!dateString) return null;
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days;
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Lead Queue</h2>
        <p className="text-slate-600">Manage and monitor AI agent lead processing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">New</p>
              <p className="text-2xl font-bold text-blue-900">{stats.new}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg border border-cyan-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-cyan-700">Contacted</p>
              <p className="text-2xl font-bold text-cyan-900">{stats.contacted}</p>
            </div>
            <Mail className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700">Engaged</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.engaged}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-teal-50 rounded-lg border border-teal-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-700">Qualified</p>
              <p className="text-2xl font-bold text-teal-900">{stats.qualified}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-teal-400" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Converted</p>
              <p className="text-2xl font-bold text-green-900">{stats.converted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by email, name, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="engaged">Engaged</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="priority">Priority Score</option>
                <option value="recent">Most Recent</option>
                <option value="engagement">Engagement Score</option>
              </select>
            </div>
          </div>

          {selectedLeads.size > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-slate-600">{selectedLeads.size} selected</span>
              <button
                onClick={() => handleBulkAction('pause')}
                className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
              >
                Pause
              </button>
              <button
                onClick={() => handleBulkAction('resume')}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Resume
              </button>
              <button
                onClick={() => handleBulkAction('qualify')}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Mark Qualified
              </button>
              <button
                onClick={() => handleBulkAction('disqualify')}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Disqualify
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={selectAll}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Stage</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Scores</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Engagement</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Next Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">In Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">{lead.contact_name || 'Unknown'}</div>
                      <div className="text-sm text-slate-600">{lead.contact_email}</div>
                      {lead.contact_company && (
                        <div className="text-xs text-slate-500">{lead.contact_company}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.queue_status] || 'bg-slate-100 text-slate-800'}`}>
                      {lead.queue_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[lead.sales_stage] || 'bg-slate-100 text-slate-700'}`}>
                      {lead.sales_stage.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Priority:</span>
                        <span className="font-semibold text-slate-900">{lead.priority_score}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Lead:</span>
                        <span className="font-semibold text-slate-900">{lead.lead_score}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Engagement:</span>
                        <span className="font-semibold text-slate-900">{lead.engagement_score}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{lead.emails_sent} sent, {lead.emails_opened} opened, {lead.emails_replied} replied</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{lead.calls_attempted} attempts</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.next_action_type ? (
                      <div className="text-xs">
                        <div className="font-medium text-slate-900 capitalize">{lead.next_action_type}</div>
                        {lead.next_action_scheduled_at && (
                          <div className="text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(lead.next_action_scheduled_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {getDaysSince(lead.entered_queue_at)} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No leads found matching your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}