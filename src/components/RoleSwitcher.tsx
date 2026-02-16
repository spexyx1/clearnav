import { useState } from 'react';
import { Building2, ChevronDown, Shield, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function RoleSwitcher() {
  const { allUserRoles, isPlatformAdmin, currentTenant, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!allUserRoles) return null;

  const totalAccessCount =
    (allUserRoles.isPlatformAdmin ? 1 : 0) +
    allUserRoles.tenantAccesses.length +
    allUserRoles.clientTenants.filter(
      ct => !allUserRoles.tenantAccesses.some(ta => ta.tenant.id === ct.id)
    ).length;

  if (totalAccessCount <= 1) return null;

  const handlePlatformAdmin = () => {
    const baseUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}`;
    window.location.href = baseUrl;
  };

  const getCurrentLabel = () => {
    if (isPlatformAdmin && !currentTenant) {
      return 'Platform Admin';
    }
    return currentTenant?.name || 'Select Organization';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all duration-200 group"
      >
        <Building2 className="w-4 h-4 text-slate-400 group-hover:text-white" />
        <span className="text-sm font-medium text-white max-w-[150px] truncate">
          {getCurrentLabel()}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 bg-slate-750 border-b border-slate-600">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Switch Organization
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {allUserRoles.isPlatformAdmin && (
                <button
                  onClick={() => {
                    handlePlatformAdmin();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700 transition-colors ${
                    isPlatformAdmin && !currentTenant ? 'bg-cyan-900/30 border-l-4 border-cyan-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">Platform Admin</p>
                    <p className="text-xs text-slate-400">Manage all organizations</p>
                  </div>
                </button>
              )}

              {allUserRoles.tenantAccesses.map((access) => {
                const isCurrent = currentTenant?.id === access.tenant.id;
                const roleLabel = access.isAdmin ? 'Admin' : access.isStaff ? 'Staff' : 'Member';

                return (
                  <button
                    key={access.tenant.id}
                    onClick={() => {
                      switchTenant(access.tenant.slug);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700 transition-colors ${
                      isCurrent ? 'bg-blue-900/30 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-white">{access.tenant.name}</p>
                      <p className="text-xs text-slate-400">{roleLabel}</p>
                    </div>
                  </button>
                );
              })}

              {allUserRoles.clientTenants
                .filter(ct => !allUserRoles.tenantAccesses.some(ta => ta.tenant.id === ct.id))
                .map((tenant) => {
                  const isCurrent = currentTenant?.id === tenant.id;

                  return (
                    <button
                      key={tenant.id}
                      onClick={() => {
                        switchTenant(tenant.slug);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700 transition-colors ${
                        isCurrent ? 'bg-blue-900/30 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">{tenant.name}</p>
                        <p className="text-xs text-slate-400">Client Portal</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
