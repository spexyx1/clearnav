import { isLocalHost } from './hostUtils';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  [key: string]: unknown;
}

export interface ResolvedTenant {
  tenant: Tenant | null;
  isPlatformAdmin: boolean;
  subdomain: string | null;
}

export async function resolveTenantFromRequest(
  hostname: string,
  tenantParam: string | null,
  supabase: SupabaseClient
): Promise<ResolvedTenant> {
  const parts = hostname.split('.');
  let tenant: Tenant | null = null;
  let subdomain: string | null = null;
  const isLocalhost = isLocalHost(hostname);

  if (isLocalhost && tenantParam) {
    subdomain = tenantParam;
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .in('status', ['active', 'trial'])
      .maybeSingle();
    tenant = data as Tenant | null;
  } else if (!isLocalhost) {
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
        tenant = tenantData as Tenant;
        subdomain = tenantData.slug;
      }
    }

    if (!tenant && parts.length >= 3 && parts[0] !== 'www') {
      subdomain = parts[0];
      const { data: subdomainData } = await supabase
        .from('platform_tenants')
        .select('*')
        .eq('slug', subdomain)
        .in('status', ['active', 'trial'])
        .maybeSingle();
      tenant = subdomainData as Tenant | null;
    }
  }

  return { tenant, isPlatformAdmin: false, subdomain };
}

// Client-safe URL helpers (browser only)
export function resolveTenantFromDomain(hostname: string): Promise<ResolvedTenant> {
  throw new Error('resolveTenantFromDomain is not available server-side. Use resolveTenantFromRequest.');
}

export function getTenantSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');
  if (tenantParam && isLocalHost(hostname)) return tenantParam;
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

export function getTenantUrl(slug: string): string {
  if (typeof window === 'undefined') return `/?tenant=${slug}`;
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (isLocalHost(hostname)) {
    return `${window.location.protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}?tenant=${slug}`;
  }
  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.');
    return `https://${slug}.${baseDomain}`;
  }
  return `https://${slug}.example.com`;
}

export function getPlatformAdminUrl(): string {
  if (typeof window === 'undefined') return '/';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (isLocalHost(hostname)) {
    return `${window.location.protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}`;
  }
  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.');
    return `https://${baseDomain}`;
  }
  return 'https://clearnav.cv';
}

export function isPlatformAdminDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  return isLocalHost(hostname) && !params.get('tenant');
}
