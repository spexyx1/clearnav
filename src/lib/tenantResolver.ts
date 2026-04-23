import { supabase } from './supabase';
import { Database } from '../types/database';
import { isLocalHost, extractSubdomain, getTenantDomainCookie } from './hostUtils';

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
    // Local dev: ?tenant=slug query param
    subdomain = tenantParam;
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .in('status', ['active', 'trial'])
      .maybeSingle();

    tenant = data;
  } else {
    // Production: prefer the domain set by Vercel Edge Middleware cookie,
    // then fall back to hostname-based detection.
    const cookieDomain = getTenantDomainCookie();
    const effectiveHostname = cookieDomain || hostname;

    const lookupDomains = [effectiveHostname];
    if (effectiveHostname.startsWith('www.')) {
      lookupDomains.push(effectiveHostname.slice(4));
    } else {
      lookupDomains.push(`www.${effectiveHostname}`);
    }

    const { data: domainRows, error: domainError } = await supabase
      .from('tenant_domains')
      .select('tenant_id')
      .in('domain', lookupDomains)
      .eq('is_verified', true)
      .limit(1);

    if (domainError) {
      console.error('[tenantResolver] domain lookup error:', domainError.message);
    }

    const domainData = domainRows?.[0] ?? null;

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

    // Subdomain fallback: e.g. arkline.clearnav.cv → slug = 'arkline'
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

  const cookieDomain = getTenantDomainCookie();
  if (cookieDomain) {
    const cookieParts = cookieDomain.split('.');
    if (cookieParts.length >= 3) return cookieParts[0];
    return cookieDomain;
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
