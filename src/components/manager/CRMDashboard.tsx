import { useState, useEffect } from 'react';
import { TrendingUp, Users, UserPlus, DollarSign, ArrowRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CRMDashboardProps {
  onNavigate: (tab: string) => void;
}

export default function CRMDashboard({ onNavigate }: CRMDashboardProps) {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    activeProspects: 0,
    onboardingInProgress: 0,
    totalClients: 0,
    conversionRate: 0,
    avgDealSize: 0,
    pipelineValue: 0,
    monthlyGrowth: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const [
      leadsRes,
      prospectsRes,
      onboardingRes,
      clientsRes,
      contactsRes,
      pipelineRes,
      recentInteractions,
    ] = await Promise.all([
      supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('lifecycle_stage', 'lead'),
      supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).in('lifecycle_stage', ['prospect', 'qualified']),
      supabase.from('onboarding_workflows').select('id', { count: 'exact', head: true }).in('status', ['started', 'in_progress', 'pending_approval']),
      supabase.from('client_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('crm_contacts').select('estimated_investment_amount, lifecycle_stage, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('lead_pipeline').select('stage, value').order('entered_stage_at', { ascending: false }),
      supabase.from('contact_interactions').select('*, crm_contacts(full_name, email)').order('interaction_date', { ascending: false }).limit(10),
    ]);

    const stageCounts = pipelineRes.data?.reduce((acc: any, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + 1;
      return acc;
    }, {}) || {};

    const stageValues = pipelineRes.data?.reduce((acc: any, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + (item.value || 0);
      return acc;
    }, {}) || {};

    const pipelineTotal = Object.values(stageValues).reduce((sum: number, val: any) => sum + val, 0);

    const totalContacts = contactsRes.data?.length || 0;
    const clients = clientsRes.count || 0;
    const conversionRate = totalContacts > 0 ? (clients / totalContacts) * 100 : 0;

    const avgInvestment = contactsRes.data?.filter(c => c.estimated_investment_amount).reduce((sum, c) => sum + c.estimated_investment_amount, 0) / (contactsRes.data?.filter(c => c.estimated_investment_amount).length || 1);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = contactsRes.data?.filter(c => new Date(c.created_at) >= thisMonth).length || 0;
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const newLastMonth = contactsRes.data?.filter(c => {
      const created = new Date(c.created_at);
      return created >= lastMonth && created < thisMonth;
    }).length || 0;
    const growth = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

    setMetrics({
      totalLeads: leadsRes.count || 0,
      activeProspects: prospectsRes.count || 0,
      onboardingInProgress: onboardingRes.count || 0,
      totalClients: clients,
      conversionRate,
      avgDealSize: avgInvestment || 0,
      pipelineValue: pipelineTotal,
      monthlyGrowth: growth,
    });

    setPipelineStages([
      { name: 'New Lead', count: stageCounts.new_lead || 0, value: stageValues.new_lead || 0 },
      { name: 'Contacted', count: stageCounts.contacted || 0, value: stageValues.contacted || 0 },
      { name: 'Qualified', count: stageCounts.qualified || 0, value: stageValues.qualified || 0 },
      { name: 'Proposal', count: stageCounts.proposal_sent || 0, value: stageValues.proposal_sent || 0 },
      { name: 'Negotiation', count: stageCounts.negotiation || 0, value: stageValues.negotiation || 0 },
      { name: 'Onboarding', count: stageCounts.onboarding || 0, value: stageValues.onboarding || 0 },
    ]);

    setRecentActivities(recentInteractions.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          CRM <span className="font-semibold">Overview</span>
        </h2>
        <p className="text-slate-400">Comprehensive view of your sales pipeline and client relationships</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6 cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => onNavigate('contacts')}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Total Leads</div>
            <UserPlus className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.totalLeads}</div>
          <div className="flex items-center text-sm text-green-400">
            <TrendingUp className="w-4 h-4 mr-1" />
            {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}% this month
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6 cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => onNavigate('contacts')}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Active Prospects</div>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.activeProspects}</div>
          <div className="text-sm text-slate-500">In qualification phase</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6 cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => onNavigate('onboarding')}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Onboarding</div>
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.onboardingInProgress}</div>
          <div className="text-sm text-slate-500">In progress</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6 cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => onNavigate('clients')}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Active Clients</div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.totalClients}</div>
          <div className="text-sm text-slate-500">{metrics.conversionRate.toFixed(1)}% conversion</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sales Pipeline</h3>
          <div className="space-y-4">
            {pipelineStages.map((stage, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{stage.name}</span>
                  <span className="text-slate-400">{stage.count} leads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (stage.count / Math.max(1, metrics.totalLeads)) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">
                    ${(stage.value / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Pipeline Value</span>
              <span className="text-2xl font-bold text-white">
                ${(metrics.pipelineValue / 1000000).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-400">Avg Deal Size</div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    ${(metrics.avgDealSize / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-400">Conversion Rate</div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {metrics.conversionRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="text-slate-400">Monthly Growth</div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${metrics.monthlyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <button
              onClick={() => onNavigate('contacts')}
              className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                No recent activities
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {activity.crm_contacts?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {activity.interaction_type === 'email' && '📧 '}
                        {activity.interaction_type === 'sms' && '💬 '}
                        {activity.interaction_type === 'call' && '📞 '}
                        {activity.interaction_type === 'meeting' && '🤝 '}
                        {activity.interaction_type === 'note' && '📝 '}
                        {activity.subject || activity.interaction_type}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(activity.interaction_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('contacts')}
          className="p-6 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg text-left hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
        >
          <Contact className="w-8 h-8 text-white mb-3" />
          <div className="text-white font-semibold text-lg">Manage Contacts</div>
          <div className="text-cyan-100 text-sm mt-1">View and manage all CRM contacts</div>
        </button>

        <button
          onClick={() => onNavigate('onboarding')}
          className="p-6 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg text-left hover:shadow-lg hover:shadow-orange-500/20 transition-all"
        >
          <UserPlus className="w-8 h-8 text-white mb-3" />
          <div className="text-white font-semibold text-lg">Onboarding Workflows</div>
          <div className="text-orange-100 text-sm mt-1">Track KYC/AML and compliance</div>
        </button>

        <button
          onClick={() => onNavigate('communications')}
          className="p-6 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg text-left hover:shadow-lg hover:shadow-green-500/20 transition-all"
        >
          <DollarSign className="w-8 h-8 text-white mb-3" />
          <div className="text-white font-semibold text-lg">Communications</div>
          <div className="text-green-100 text-sm mt-1">Email and SMS campaigns</div>
        </button>
      </div>
    </div>
  );
}
