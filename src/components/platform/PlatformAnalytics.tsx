import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Database, Activity, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function PlatformAnalytics() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    managedDatabases: 0,
    byodDatabases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data: platformStats, error } = await supabase.rpc('get_platform_statistics');

      if (error) {
        console.error('Error with RPC, falling back to manual queries:', error);

        const { count: totalTenants } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true });

        const { count: activeTenants } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { count: trialTenants } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'trial');

        const { count: totalUsers } = await supabase
          .from('tenant_users')
          .select('*', { count: 'exact', head: true });

        const { count: managedDatabases } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('database_type', 'managed');

        const { count: byodDatabases } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('database_type', 'byod');

        setStats({
          totalTenants: totalTenants || 0,
          activeTenants: activeTenants || 0,
          trialTenants: trialTenants || 0,
          totalUsers: totalUsers || 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          managedDatabases: managedDatabases || 0,
          byodDatabases: byodDatabases || 0,
        });
      } else {
        const { count: managedDatabases } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('database_type', 'managed');

        const { count: byodDatabases } = await supabase
          .from('platform_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('database_type', 'byod');

        setStats({
          totalTenants: platformStats.total_tenants || 0,
          activeTenants: platformStats.active_tenants || 0,
          trialTenants: (platformStats.total_tenants - platformStats.active_tenants) || 0,
          totalUsers: platformStats.total_users || 0,
          totalRevenue: platformStats.total_revenue || 0,
          monthlyRevenue: platformStats.monthly_revenue || 0,
          managedDatabases: managedDatabases || 0,
          byodDatabases: byodDatabases || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Platform Analytics</h2>
        <p className="text-slate-600 mt-1">Monitor platform-wide metrics and trends</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading analytics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalTenants}</div>
            <div className="text-slate-600">Total Tenants</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.activeTenants}</div>
            <div className="text-slate-600">Active Tenants</div>
            <div className="mt-2 text-sm text-slate-500">
              {stats.totalTenants > 0
                ? Math.round((stats.activeTenants / stats.totalTenants) * 100)
                : 0}
              % of total
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.trialTenants}</div>
            <div className="text-slate-600">Trial Tenants</div>
            <div className="mt-2 text-sm text-slate-500">
              {stats.totalTenants > 0
                ? Math.round((stats.trialTenants / stats.totalTenants) * 100)
                : 0}
              % of total
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.totalUsers}</div>
            <div className="text-slate-600">Total Users</div>
            <div className="mt-2 text-sm text-slate-500">
              Avg {stats.totalTenants > 0 ? (stats.totalUsers / stats.totalTenants).toFixed(1) : 0}{' '}
              per tenant
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.managedDatabases}</div>
            <div className="text-slate-600">Managed Databases</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stats.byodDatabases}</div>
            <div className="text-slate-600">BYOD Databases</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="text-slate-600">Total Revenue</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <div className="text-slate-600">This Month</div>
          </div>
        </div>
      )}
    </div>
  );
}
