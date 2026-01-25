import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { Database } from '../types/database';
import { resolveTenantFromDomain, isPlatformAdminDomain, ResolvedTenant } from './tenantResolver';

type Tenant = Database['public']['Tables']['platform_tenants']['Row'];
type PlatformAdminUser = Database['public']['Tables']['platform_admin_users']['Row'];
type TenantUser = Database['public']['Tables']['tenant_users']['Row'];

interface PlatformContextType {
  currentTenant: Tenant | null;
  isPlatformAdmin: boolean;
  platformAdminUser: PlatformAdminUser | null;
  tenantUser: TenantUser | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformAdminUser, setPlatformAdminUser] = useState<PlatformAdminUser | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlatformData = async () => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCurrentTenant(null);
        setIsPlatformAdmin(false);
        setPlatformAdminUser(null);
        setTenantUser(null);
        setIsLoading(false);
        return;
      }

      const resolved: ResolvedTenant = await resolveTenantFromDomain(window.location.hostname);
      setCurrentTenant(resolved.tenant);
      setIsPlatformAdmin(resolved.isPlatformAdmin);

      if (resolved.isPlatformAdmin || isPlatformAdminDomain()) {
        const { data: adminData } = await supabase
          .from('platform_admin_users')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setPlatformAdminUser(adminData);
        setIsPlatformAdmin(!!adminData);
      }

      if (resolved.tenant) {
        const { data: tenantUserData } = await supabase
          .from('tenant_users')
          .select('*')
          .eq('user_id', user.id)
          .eq('tenant_id', resolved.tenant.id)
          .maybeSingle();

        setTenantUser(tenantUserData);
      }
    } catch (error) {
      console.error('Error fetching platform data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchPlatformData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <PlatformContext.Provider
      value={{
        currentTenant,
        isPlatformAdmin,
        platformAdminUser,
        tenantUser,
        isLoading,
        refetch: fetchPlatformData,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
