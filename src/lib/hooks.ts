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
    logo_url: currentTenant?.branding?.logo_url || null,
    company_name: currentTenant?.company_name || 'ClearNav',
    colors: {
      primary: currentTenant?.branding?.primary_color || '#06b6d4',
      secondary: currentTenant?.branding?.secondary_color || '#3b82f6',
    },
  };

  return { branding };
}
