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
  console.log('🌐 resolveTenantFromDomain called with hostname:', hostname);
  console.log('📍 Full URL:', window.location.href);

  const parts = hostname.split('.');
  const host = window.location.host;
  console.log('🔍 Hostname parts:', parts);
  console.log('🔍 Host:', host);

  if (parts.length >= 3 && parts[0] === 'admin') {
    console.log('🔒 Admin domain detected');
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
  console.log('🔍 Tenant param from URL:', tenantParam);

  if (tenantParam && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.'))) {
    console.log('✅ Using tenant param for localhost:', tenantParam);
    subdomain = tenantParam;
    const { data, error } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', tenantParam)
      .eq('status', 'active')
      .maybeSingle();

    console.log('📊 Tenant query result:', { data, error });
    tenant = data;
  } else if (parts.length >= 3 && parts[0] !== 'www') {
    console.log('✅ Using subdomain from hostname:', parts[0]);
    subdomain = parts[0];
    const { data, error } = await supabase
      .from('platform_tenants')
      .select('*')
      .eq('slug', subdomain)
      .eq('status', 'active')
      .maybeSingle();

    console.log('📊 Tenant query result:', { data, error });
    tenant = data;
  }

  if (!tenant) {
    console.log('⚠️ No tenant found via param/subdomain, trying custom domain');
    const { data, error } = await supabase
      .from('tenant_domains')
      .select('*, platform_tenants(*)')
      .eq('domain', host)
      .eq('is_verified', true)
      .maybeSingle();

    console.log('📊 Custom domain query result:', { data, error });

    if (data && data.platform_tenants) {
      tenant = data.platform_tenants as Tenant;
      subdomain = (tenant as Tenant).slug;
    }
  }

  console.log('🏁 Final resolved tenant:', { tenant: tenant?.slug, subdomain, isPlatformAdmin: false });

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
