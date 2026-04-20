import { supabase } from './supabase';
import { Database } from '../types/database';
import { isLocalHost, extractSubdomain } from './hostUtils';

type Tenant = Database['public']['Tables']['platform_tenants']['Row'];

export interface ResolvedTenant {
  tenant: Tenant | null;
  isPlatformAdmin: boolean;
  subdomain: string | null;
}

export async function resolveTenantFromDomain(hostname: string): Promise<ResolvedTenant> {
  const parts = hostname.split('.');

  let tenant: Tenant | null = null;
  let subdomain: string | null = null;

  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  const isLocalhost = isLocalHost(hostname);

  if (isLocalhost && tenantParam) {
    subdomain = tenantParam;
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .in('status', ['active', 'trial'])
      .maybeSingle();

    tenant = data;
  } else {
    const { data: domainData } = await supabase
      .from('tenant_domains')
      .select('tenant_id')
      .eq('domain', hostname)
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
        tenant = tenantData;
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

      tenant = subdomainData;
    }
  }

  return {
    tenant,
    isPlatformAdmin: false,
    subdomain,
  };
}

export function getTenantSlugFromUrl(): string | null {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  if (tenantParam && isLocalHost(hostname)) {
    return tenantParam;
  }

  const parts = hostname.split('.');

  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  }

  return null;
}

export function isPlatformAdminDomain(): boolean {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  if (isLocalHost(hostname)) {
    return !tenantParam;
  }

  return false;
}

export function getTenantUrl(slug: string): string {
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
