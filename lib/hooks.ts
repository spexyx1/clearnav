'use client';

import { useAuth } from './auth';

interface TenantBranding {
  logo_url: string | null;
  company_name: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

export function useTenantBranding() {
  const { currentTenant } = useAuth();

  const branding: TenantBranding = {
    logo_url: null,
    company_name: (currentTenant as unknown as Record<string, unknown>)?.name as string || 'ClearNav',
    colors: {
      primary: '#06b6d4',
      secondary: '#3b82f6',
    },
  };

  return { branding };
}

export function useTenant() {
  const { currentTenant } = useAuth();
  return { tenant: currentTenant };
}

export function useTenantInfo() {
  const { currentTenant } = useAuth();
  return { tenantInfo: currentTenant };
}
