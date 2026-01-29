import { supabase } from './supabase';
import { Database } from '../types/database';

type Tenant = Database['public']['Tables']['platform_tenants']['Row'];
type TenantDomain = Database['public']['Tables']['tenant_domains']['Row'];

export interface ResolvedTenant {
  tenant: Tenant | null;
  isPlatformAdmin: boolean;
  subdomain: string | null;
  error?: 'not_found' | 'inactive' | 'invalid_subdomain' | null;
}

interface TenantCacheEntry {
  tenant: Tenant | null;
  timestamp: number;
  error?: 'not_found' | 'inactive' | 'invalid_subdomain' | null;
}

const tenantCache = new Map<string, TenantCacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000;

export async function resolveTenantFromDomain(hostname: string): Promise<ResolvedTenant> {
  const parts = hostname.split('.');
  const host = window.location.host;

  if (parts.length >= 3 && parts[0] === 'admin') {
    return {
      tenant: null,
      isPlatformAdmin: true,
      subdomain: null,
      error: null,
    };
  }

  let tenant: Tenant | null = null;
  let subdomain: string | null = null;
  let error: 'not_found' | 'inactive' | 'invalid_subdomain' | null = null;

  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');

  if (isLocalhost && tenantParam) {
    subdomain = tenantParam;

    if (!isValidSubdomain(subdomain)) {
      error = 'invalid_subdomain';
      return {
        tenant: null,
        isPlatformAdmin: false,
        subdomain,
        error,
      };
    }

    const cacheKey = `tenant:${subdomain}`;
    const cached = getCachedTenant(cacheKey);

    if (cached !== null) {
      return {
        tenant: cached.tenant,
        isPlatformAdmin: false,
        subdomain,
        error: cached.error || null,
      };
    }

    const { data, error: dbError } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .maybeSingle();

    if (dbError) {
      console.error('Error fetching tenant:', dbError);
      error = 'not_found';
    } else if (!data) {
      error = 'not_found';
    } else if (data.status !== 'active') {
      error = 'inactive';
    } else {
      tenant = data;
    }

    setCachedTenant(cacheKey, tenant, error);
  } else {
    const cacheKey = `domain:${host}`;
    const cached = getCachedTenant(cacheKey);

    if (cached !== null) {
      return {
        tenant: cached.tenant,
        isPlatformAdmin: false,
        subdomain: cached.tenant?.slug || null,
        error: cached.error || null,
      };
    }

    const { data, error: dbError } = await supabase
      .from('tenant_domains')
      .select('*, platform_tenants(*)')
      .eq('domain', host)
      .eq('is_verified', true)
      .maybeSingle();

    if (data && data.platform_tenants) {
      tenant = data.platform_tenants as Tenant;
      subdomain = (tenant as Tenant).slug;

      if (tenant.status !== 'active') {
        error = 'inactive';
        tenant = null;
      }
    } else if (parts.length >= 3 && parts[0] !== 'www') {
      subdomain = parts[0];

      if (!isValidSubdomain(subdomain)) {
        error = 'invalid_subdomain';
        return {
          tenant: null,
          isPlatformAdmin: false,
          subdomain,
          error,
        };
      }

      const subdomainCacheKey = `tenant:${subdomain}`;
      const subdomainCached = getCachedTenant(subdomainCacheKey);

      if (subdomainCached !== null) {
        return {
          tenant: subdomainCached.tenant,
          isPlatformAdmin: false,
          subdomain,
          error: subdomainCached.error || null,
        };
      }

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('platform_tenants')
        .select('*')
        .eq('slug', subdomain)
        .maybeSingle();

      if (subdomainError) {
        console.error('Error fetching tenant by subdomain:', subdomainError);
        error = 'not_found';
      } else if (!subdomainData) {
        error = 'not_found';
      } else if (subdomainData.status !== 'active') {
        error = 'inactive';
      } else {
        tenant = subdomainData;
      }

      setCachedTenant(subdomainCacheKey, tenant, error);
    }

    setCachedTenant(cacheKey, tenant, error);
  }

  return {
    tenant,
    isPlatformAdmin: false,
    subdomain,
    error,
  };
}

export function getTenantSlugFromUrl(): string | null {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  if (tenantParam && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.'))) {
    return tenantParam;
  }

  const parts = hostname.split('.');

  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'admin') {
    return parts[0];
  }

  return null;
}

export function isPlatformAdminDomain(): boolean {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return !tenantParam;
  }

  return hostname.split('.')[0] === 'admin';
}

export function getTenantUrl(slug: string): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
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

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return `${window.location.protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}`;
  }

  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.');
    return `https://admin.${baseDomain}`;
  }

  return 'https://admin.example.com';
}

function getCachedTenant(key: string): TenantCacheEntry | null {
  const cached = tenantCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    tenantCache.delete(key);
    return null;
  }

  return cached;
}

function setCachedTenant(key: string, tenant: Tenant | null, error?: 'not_found' | 'inactive' | 'invalid_subdomain' | null): void {
  tenantCache.set(key, {
    tenant,
    timestamp: Date.now(),
    error: error || undefined,
  });
}

export function clearTenantCache(): void {
  tenantCache.clear();
}

export function isValidSubdomain(subdomain: string): boolean {
  if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
    return false;
  }

  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return validPattern.test(subdomain);
}
