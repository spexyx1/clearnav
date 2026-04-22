import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from './supabase';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  domain: string | null;
  is_verified: boolean;
}

export interface SitePage {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  is_published: boolean;
  template_type: string | null;
}

export interface WebsiteContent {
  id: string;
  tenant_id: string;
  page_slug: string;
  section_type: string;
  section_order: number;
  content: Record<string, unknown>;
  is_published: boolean;
}

export interface SiteTheme {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  colors: Record<string, string> | null;
  typography: Record<string, string> | null;
  logo_url: string | null;
  favicon_url: string | null;
  custom_css: string | null;
}

export const getTenantByDomain = unstable_cache(
  async (identifier: string): Promise<Tenant | null> => {
    // Single join: look up domain record + tenant in one query
    const { data } = await supabaseAdmin
      .from('tenant_domains')
      .select(`
        domain,
        is_verified,
        platform_tenants!inner(
          id,
          slug,
          name,
          status
        )
      `)
      .eq('domain', identifier)
      .eq('is_verified', true)
      .maybeSingle();

    if (!data) return null;

    const tenant = data.platform_tenants as unknown as {
      id: string;
      slug: string;
      name: string;
      status: string;
    };

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      domain: data.domain,
      is_verified: data.is_verified,
    };
  },
  ['tenant-by-domain'],
  { revalidate: 60, tags: ['tenants'] }
);

export const getTenantPage = unstable_cache(
  async (
    tenantId: string,
    slug: string
  ): Promise<{ page: SitePage; sections: WebsiteContent[]; theme: SiteTheme | null } | null> => {
    const normalizedSlug = slug === '' ? '/' : slug;

    // Fetch page + sections + active theme in parallel
    const [pageResult, sectionsResult, themeResult] = await Promise.all([
      supabaseAdmin
        .from('site_pages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('slug', normalizedSlug)
        .eq('is_published', true)
        .maybeSingle(),

      supabaseAdmin
        .from('website_content')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('page_slug', normalizedSlug)
        .eq('is_published', true)
        .order('section_order', { ascending: true }),

      supabaseAdmin
        .from('site_themes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (!pageResult.data) return null;

    return {
      page: pageResult.data as SitePage,
      sections: (sectionsResult.data ?? []) as WebsiteContent[],
      theme: themeResult.data as SiteTheme | null,
    };
  },
  ['tenant-page'],
  { revalidate: 60, tags: ['tenant-pages'] }
);
