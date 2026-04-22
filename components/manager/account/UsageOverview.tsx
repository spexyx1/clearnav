import React, { useState, useEffect } from 'react';
import { Users, Building2, Database, TrendingUp, HardDrive } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;

interface UsageMetrics {
  user_count: number;
  client_count: number;
  storage_gb: number;
  active_funds: number;
  total_aum: number;
}

interface PlanLimits {
  max_clients: number;
  storage_gb: number;
}

export default function UsageOverview() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  async function fetchUsageData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!tenantUser) return;

      const { data: usageData } = await supabase.rpc('get_tenant_usage_metrics', {
        p_tenant_id: tenantUser.tenant_id,
      });

      if (usageData) {
        setMetrics(usageData);
      }

      const { data: tenant } = await supabase
        .from('platform_tenants')
        .select('subscription_plan_id')
        .eq('id', tenantUser.tenant_id)
        .single();

      if (tenant) {
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('features')
          .eq('id', tenant.subscription_plan_id)
          .single();

        if (plan?.features) {
          setPlanLimits({
            max_clients: plan.features.max_clients || -1,
            storage_gb: plan.features.storage_gb || -1,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-cyan-500';
  };

  const usageCards = [
    {
      title: 'Users',
      value: metrics?.user_count || 0,
      limit: -1,
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500 bg-opacity-10',
    },
    {
      title: 'Clients',
      value: metrics?.client_count || 0,
      limit: planLimits?.max_clients || -1,
      icon: Building2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500 bg-opacity-10',
    },
    {
      title: 'Storage',
      value: metrics?.storage_gb || 0,
      limit: planLimits?.storage_gb || -1,
      icon: HardDrive,
      color: 'text-green-400',
      bgColor: 'bg-green-500 bg-opacity-10',
      suffix: 'GB',
    },
    {
      title: 'Active Funds',
      value: metrics?.active_funds || 0,
      limit: -1,
      icon: Database,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500 bg-opacity-10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Usage Overview</h2>
        <p className="text-slate-400 text-sm">
          Monitor your platform usage and limits
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {usageCards.map((card) => {
          const Icon = card.icon;
          const percentage = getUsagePercentage(card.value, card.limit);
          const hasLimit = card.limit !== -1;

          return (
            <div key={card.title} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-slate-400 text-sm">{card.title}</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-white">
                    {card.value.toFixed(card.suffix ? 2 : 0)}
                  </span>
                  {card.suffix && <span className="text-slate-400 text-sm">{card.suffix}</span>}
                  {hasLimit && (
                    <span className="text-slate-400 text-sm">
                      / {card.limit}{card.suffix || ''}
                    </span>
                  )}
                </div>

                {hasLimit && (
                  <div className="pt-2">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getUsageColor(percentage)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {percentage.toFixed(0)}% used
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="w-6 h-6 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Assets Under Management</h3>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-slate-400 text-sm mb-2">Total AUM</p>
            <p className="text-4xl font-bold text-white">
              ${(metrics?.total_aum || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
            <div>
              <p className="text-slate-400 text-xs mb-1">Active Funds</p>
              <p className="text-xl font-semibold text-white">{metrics?.active_funds || 0}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Total Clients</p>
              <p className="text-xl font-semibold text-white">{metrics?.client_count || 0}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Avg per Client</p>
              <p className="text-xl font-semibold text-white">
                ${metrics?.client_count
                  ? ((metrics.total_aum || 0) / metrics.client_count).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {planLimits && (
        <div className="bg-cyan-500 bg-opacity-10 border border-cyan-500 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-cyan-300 mb-3">Usage Limits</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-cyan-200">Client Limit:</span>
              <span className="font-medium text-white">
                {planLimits.max_clients === -1 ? 'Unlimited' : planLimits.max_clients}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-200">Storage Limit:</span>
              <span className="font-medium text-white">
                {planLimits.storage_gb === -1 ? 'Unlimited' : `${planLimits.storage_gb} GB`}
              </span>
            </div>
          </div>
          {((planLimits.max_clients !== -1 && (metrics?.client_count || 0) >= planLimits.max_clients * 0.9) ||
            (planLimits.storage_gb !== -1 && (metrics?.storage_gb || 0) >= planLimits.storage_gb * 0.9)) && (
            <p className="text-cyan-300 text-sm mt-4">
              You're approaching your plan limits. Consider upgrading for more capacity.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
