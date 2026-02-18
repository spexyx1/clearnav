import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Target, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Metrics {
  totalAUM: number;
  clientCount: number;
  avgClientValue: number;
  monthlyRevenue: number;
  conversionRate: number;
}

export default function Analytics() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalAUM: 0,
    clientCount: 0,
    avgClientValue: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clientsRes, trustRes, contactsRes] = await Promise.all([
        supabase.from('client_profiles').select('total_invested, current_value').limit(1000),
        supabase.from('trust_account').select('total_aum').maybeSingle(),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (trustRes.error) throw trustRes.error;
      if (contactsRes.error) throw contactsRes.error;

      const clients = clientsRes.data || [];
      const totalClients = clients.length;
      const totalInvested = clients.reduce((sum, c) => sum + (c.total_invested || 0), 0);
      const avgValue = totalClients > 0 ? totalInvested / totalClients : 0;
      const totalContacts = contactsRes.count || 0;
      const conversionRate = totalContacts > 0 ? (totalClients / totalContacts) * 100 : 0;

      setMetrics({
        totalAUM: trustRes.data?.total_aum || 0,
        clientCount: totalClients,
        avgClientValue: avgValue,
        monthlyRevenue: (trustRes.data?.total_aum || 0) * 0.02 / 12,
        conversionRate,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Failed to Load Analytics</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => loadAnalytics()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          Business <span className="font-semibold">Analytics</span>
        </h2>
        <p className="text-slate-400">Performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Total AUM</div>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${(metrics.totalAUM / 1000000).toFixed(2)}M
          </div>
          <div className="text-sm text-slate-500">Assets under management</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Total Clients</div>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.clientCount}</div>
          <div className="text-sm text-slate-500">Active investors</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Avg Client Value</div>
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${(metrics.avgClientValue / 1000).toFixed(0)}k
          </div>
          <div className="text-sm text-slate-500">Per client</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Conversion Rate</div>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-slate-500">Lead to client</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Estimated Monthly Revenue (2% AUM)</span>
              <span className="text-xl font-bold text-white">${(metrics.monthlyRevenue / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Estimated Annual Revenue</span>
              <span className="text-xl font-bold text-white">${(metrics.monthlyRevenue * 12 / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Growth Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Client Acquisition Cost</span>
              <span className="text-xl font-bold text-white">TBD</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Client Lifetime Value</span>
              <span className="text-xl font-bold text-white">TBD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
