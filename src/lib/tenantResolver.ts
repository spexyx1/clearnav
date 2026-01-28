import { supabase } from './supabase';
import { Database } from '../types/database';

type Tenant = Database['public']['Tables']['platform_tenants']['Row'];
type TenantDomain = Database['public']['Tables']['tenant_domains']['Row'];

export interface ResolvedTenant {
  tenant: Tenant | null;
  isPlatformAdmin: boolean;
  subdomain: string | null;
}

export async function resolveTenantFromDomain(hostname: string): Promise<ResolvedTenant> {
  const parts = hostname.split('.');

  if (parts.length >= 3 && parts[0] === 'admin') {
    return {
      tenant: null,
      isPlatformAdmin: true,
      subdomain: null,
    };
  }

  let tenant: Tenant | null = null;
  let subdomain: string | null = null;

  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('tenant');

  if (tenantParam && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.'))) {
    subdomain = tenantParam;
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .eq('status', 'active')
      .maybeSingle();

    tenant = data;
  } else if (parts.length >= 3 && parts[0] !== 'www') {
    subdomain = parts[0];
    const { data } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', subdomain)
      .eq('status', 'active')
      .maybeSingle();

    tenant = data;
  }

  if (!tenant) {
    const { data } = await supabase
      .from('tenant_domains')
      .select('*, platform_tenants(*)')
      .eq('domain', hostname)
      .eq('is_verified', true)
      .maybeSingle();

    if (data && data.platform_tenants) {
      tenant = data.platform_tenants as Tenant;
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
