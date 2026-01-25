import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database as DB } from '../../types/database';

type BillingRecord = DB['public']['Tables']['billing_records']['Row'];
type Tenant = DB['public']['Tables']['platform_tenants']['Row'];

interface BillingWithTenant extends BillingRecord {
  tenant?: Tenant;
}

export default function BillingOverview() {
  const [billingRecords, setBillingRecords] = useState<BillingWithTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    activeSubscriptions: 0,
  });

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      const { data: records, error } = await supabase
        .from('billing_records')
        .select('*, platform_tenants(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const recordsWithTenants = records?.map((record: any) => ({
        ...record,
        tenant: record.platform_tenants,
      })) || [];

      setBillingRecords(recordsWithTenants);

      const totalRevenue = recordsWithTenants
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + r.amount, 0);

      const pendingAmount = recordsWithTenants
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + r.amount, 0);

      const { count } = await supabase
        .from('tenant_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats({
        totalRevenue,
        pendingAmount,
        activeSubscriptions: count || 0,
      });
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Billing Overview</h2>
        <p className="text-slate-600 mt-1">Track revenue and subscription billing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">
            ${(stats.totalRevenue / 100).toLocaleString()}
          </div>
          <div className="text-green-100">Total Revenue</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8" />
            <Calendar className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">
            ${(stats.pendingAmount / 100).toLocaleString()}
          </div>
          <div className="text-yellow-100">Pending Payments</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.activeSubscriptions}</div>
          <div className="text-blue-100">Active Subscriptions</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Billing Records</h3>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
            <p className="text-slate-600 mt-4">Loading billing records...</p>
          </div>
        ) : billingRecords.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No billing records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {billingRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {record.tenant?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-slate-500">{record.tenant?.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(record.period_start).toLocaleDateString()} -{' '}
                      {new Date(record.period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {record.user_count}
                      {record.overage_users > 0 && (
                        <span className="text-orange-600"> (+{record.overage_users})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        ${(record.amount / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
