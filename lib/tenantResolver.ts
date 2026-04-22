// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isLocalHost } from './hostUtils';

type Tenant = Database['public']['Tables']['platform_tenants']['Row'];

export interface ResolvedTenant {
  tenant: Tenant | null;
  subdomain: string | null;
}

export async function resolveTenantFromRequest(
  hostname: string,
  tenantParam: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<ResolvedTenant> {
  const parts = hostname.split('.');

  // localhost dev: use ?tenant= query param
  if (isLocalHost(hostname) && tenantParam) {
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .in('status', ['active', 'trial'])
      .maybeSingle();
    return { tenant: data, subdomain: tenantParam };
  }

  // Try custom domain lookup first
  const lookupDomains = [hostname];
  if (hostname.startsWith('www.')) {
    lookupDomains.push(hostname.slice(4));
  } else {
    lookupDomains.push(`www.${hostname}`);
  }

  const { data: domainData } = await supabase
    .from('tenant_domains')
    .select('tenant_id')
    .in('domain', lookupDomains)
    .eq('is_verified', true)
    .maybeSingle();

  if (domainData?.tenant_id) {
    const { data: tenantData } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('id', domainData.tenant_id)
      .in('status', ['active', 'trial'])
      .maybeSingle();
    if (tenantData) {
      return { tenant: tenantData, subdomain: tenantData.slug };
    }
  }

  // Subdomain: tenant.clearnav.com
  if (parts.length >= 3 && parts[0] !== 'www') {
    const subdomain = parts[0];
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', subdomain)
      .in('status', ['active', 'trial'])
      .maybeSingle();
    return { tenant: data, subdomain };
  }

  return { tenant: null, subdomain: null };
}

// Client-safe helpers for use inside browser components
export function getTenantSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const tenantParam = new URLSearchParams(window.location.search).get('tenant');
  if (tenantParam && isLocalHost(hostname)) return tenantParam;
  const parts = hostname.split('.');
  return parts.length >= 3 && parts[0] !== 'www' ? parts[0] : null;
}

export function getTenantUrl(slug: string): string {
  if (typeof window === 'undefined') return `https://${slug}.clearnav.cv`;
  const { protocol, hostname, port } = window.location;
  if (isLocalHost(hostname)) return `${protocol}//${hostname}${port ? ':' + port : ''}?tenant=${slug}`;
  const parts = hostname.split('.');
  const base = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
  return `https://${slug}.${base}`;
}

export function getPlatformAdminUrl(): string {
  if (typeof window === 'undefined') return 'https://clearnav.cv';
  const { protocol, hostname, port } = window.location;
  if (isLocalHost(hostname)) return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  const parts = hostname.split('.');
  return parts.length >= 2 ? `https://${parts.slice(-2).join('.')}` : 'https://clearnav.cv';
}
