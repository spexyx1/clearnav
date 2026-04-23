/**
 * Stale-while-revalidate cache for public tenant site data.
 *
 * On first visit the preload bootstrap (window.__TENANT_BOOTSTRAP__) provides
 * data before React mounts. On subsequent visits the localStorage cache renders
 * the full site instantly while a background revalidation quietly updates it.
 *
 * Cache TTL: 5 minutes for background revalidation, 60 minutes hard expiry.
 */

const CACHE_VERSION = 1;
const STALE_MS = 5 * 60 * 1000;    // revalidate after 5 min
const HARD_TTL_MS = 60 * 60 * 1000; // purge after 60 min

export interface TenantSiteData {
  theme: {
    colors: Record<string, string>;
    typography: { headingFont: string; bodyFont: string };
    logo_url?: string;
    favicon_url?: string;
    custom_css?: string;
  } | null;
  branding: {
    company_name?: string;
    tagline?: string;
    address?: string;
    founded?: string;
    website?: string;
    legal_disclaimer?: string;
  };
  siteStatus: string;
  headerNav: Array<{ label: string; href: string; external?: boolean }>;
  footerNav: Array<{ label: string; href: string; external?: boolean }>;
}

export interface PageData {
  page: { id: string; slug: string; title: string; meta_description: string | null } | null;
  sections: Array<{ id: string; section_type: string; section_order: number; content: any }>;
}

interface CacheEntry<T> {
  v: number;
  ts: number;
  data: T;
}

function siteKey(tenantId: string): string {
  return `cn:site:${tenantId}`;
}

function pageKey(tenantId: string, slug: string): string {
  return `cn:page:${tenantId}:${slug}`;
}

function read<T>(key: string): { data: T; stale: boolean } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.v !== CACHE_VERSION) return null;
    const age = Date.now() - entry.ts;
    if (age > HARD_TTL_MS) { localStorage.removeItem(key); return null; }
    return { data: entry.data, stale: age > STALE_MS };
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { v: CACHE_VERSION, ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // storage quota — silently ignore
  }
}

export function readSiteCache(tenantId: string) {
  return read<TenantSiteData>(siteKey(tenantId));
}

export function writeSiteCache(tenantId: string, data: TenantSiteData): void {
  write(siteKey(tenantId), data);
}

export function readPageCache(tenantId: string, slug: string) {
  return read<PageData>(pageKey(tenantId, slug));
}

export function writePageCache(tenantId: string, slug: string, data: PageData): void {
  write(pageKey(tenantId, slug), data);
}

/**
 * Returns the bootstrap promise started in index.html (if present) and
 * removes it from window so subsequent calls skip the stale reference.
 */
export function consumeBootstrap(): Promise<{
  site: TenantSiteData;
  page: PageData;
  slug: string;
  tenantId: string;
} | null> | null {
  const w = window as any;
  const p = w.__TENANT_BOOTSTRAP__ ?? null;
  w.__TENANT_BOOTSTRAP__ = null;
  return p;
}
