import { useState } from 'react';
import { Building2, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Database } from '../types/database';

type Tenant = Database['public']['Tables']['platform_tenants']['Row'];

interface TenantSelectorProps {
  onClose?: () => void;
}

export default function TenantSelector({ onClose }: TenantSelectorProps) {
  const { availableTenants, allUserRoles, switchTenant, isPlatformAdmin } = useAuth();
  const [hoveredTenant, setHoveredTenant] = useState<string | null>(null);

  const handleTenantSelect = async (tenant: Tenant) => {
    await switchTenant(tenant.slug);
  };

  const handlePlatformAdmin = () => {
    const baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
    window.location.href = baseUrl;
  };

  const getTenantRole = (tenantId: string): string => {
    if (!allUserRoles) return 'Access';

    const access = allUserRoles.tenantAccesses.find(a => a.tenant.id === tenantId);
    if (access) {
      if (access.isAdmin) return 'Admin';
      if (access.isStaff) return 'Staff';
      return 'Member';
    }

    const isClient = allUserRoles.clientTenants.some(t => t.id === tenantId);
    if (isClient) return 'Client';

    return 'Access';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Select Organization</h2>
              <p className="text-blue-100 text-sm">Choose which organization you'd like to access</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto max-h-[calc(80vh-180px)]">
          {isPlatformAdmin && allUserRoles?.isPlatformAdmin && (
            <button
              onClick={handlePlatformAdmin}
              className="w-full group"
            >
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 hover:from-cyan-800/40 hover:to-blue-800/40 border border-cyan-700/50 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Platform Administration</h3>
                    <p className="text-sm text-cyan-300">Manage all tenants and platform settings</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleTenantSelect(tenant)}
              onMouseEnter={() => setHoveredTenant(tenant.id)}
              onMouseLeave={() => setHoveredTenant(null)}
              className="w-full group"
            >
              <div className={`flex items-center justify-between p-5 bg-slate-800/50 hover:bg-slate-800 border transition-all duration-200 rounded-xl hover:shadow-lg hover:-translate-y-0.5 ${
                hoveredTenant === tenant.id
                  ? 'border-blue-500 shadow-blue-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center border border-slate-600">
                    <Building2 className="w-7 h-7 text-slate-300" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">{tenant.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-slate-400">
                        {tenant.slug}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 font-medium">
                        {getTenantRole(tenant.id)}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-6 h-6 transition-all ${
                  hoveredTenant === tenant.id
                    ? 'text-blue-400 translate-x-1'
                    : 'text-slate-500 group-hover:text-slate-400'
                }`} />
              </div>
            </button>
          ))}

          {availableTenants.length === 0 && !isPlatformAdmin && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No organizations available</p>
              <p className="text-slate-500 text-sm mt-2">Contact support if you believe this is an error</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 p-6 bg-slate-900/50">
          <p className="text-sm text-slate-400 text-center">
            Your selection will determine which portal and data you can access
          </p>
        </div>
      </div>
    </div>
  );
}
