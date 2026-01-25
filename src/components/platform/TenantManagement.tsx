import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Building2,
  Calendar,
  Users,
  Database,
  Globe,
  CheckCircle,
  AlertCircle,
  XCircle,
  Settings,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database as DB } from '../../types/database';
import CreateTenantModal from './CreateTenantModal';
import TenantDetailsModal from './TenantDetailsModal';

type Tenant = DB['public']['Tables']['platform_tenants']['Row'];
type TenantSubscription = DB['public']['Tables']['tenant_subscriptions']['Row'];

interface TenantWithSubscription extends Tenant {
  subscription?: TenantSubscription | null;
  user_count?: number;
}

export default function TenantManagement() {
  const [tenants, setTenants] = useState<TenantWithSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const { data: tenantsData, error } = await supabase
        .from('platform_tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tenantsWithData = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { data: subscription } = await supabase
            .from('tenant_subscriptions')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('status', 'active')
            .maybeSingle();

          const { count } = await supabase
            .from('tenant_users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return {
            ...tenant,
            subscription,
            user_count: count || 0,
          };
        })
      );

      setTenants(tenantsWithData);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'trial':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'suspended':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenant Management</h2>
          <p className="text-slate-600 mt-1">Manage all hedge fund tenants on the platform</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Tenant</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading tenants...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No tenants found</h3>
          <p className="text-slate-600 mb-6">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first tenant'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add First Tenant</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTenant(tenant)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{tenant.name}</h3>
                    <p className="text-sm text-slate-600">{tenant.slug}</p>
                  </div>
                </div>
                {getStatusIcon(tenant.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                    {tenant.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Database</span>
                  <span className="flex items-center space-x-1 text-slate-900">
                    <Database className="w-4 h-4" />
                    <span>{tenant.database_type === 'managed' ? 'Managed' : 'BYOD'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Users</span>
                  <span className="flex items-center space-x-1 text-slate-900">
                    <Users className="w-4 h-4" />
                    <span>{tenant.user_count}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Created</span>
                  <span className="text-slate-900">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {tenant.status === 'trial' && tenant.trial_ends_at && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Trial ends {new Date(tenant.trial_ends_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTenant(tenant);
                }}
                className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Manage</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateTenantModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchTenants();
          }}
        />
      )}

      {selectedTenant && (
        <TenantDetailsModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onUpdate={() => {
            setSelectedTenant(null);
            fetchTenants();
          }}
        />
      )}
    </div>
  );
}
