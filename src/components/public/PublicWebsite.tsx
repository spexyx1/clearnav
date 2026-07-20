import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { PublicPageRouter } from './PublicPageRouter';
import { Menu, X, LogIn } from 'lucide-react';
import {
  TenantSiteData,
  readSiteCache,
  writeSiteCache,
  consumeBootstrap,
} from '../../lib/tenantCache';

interface PublicWebsiteProps {
  tenantId: string;
  tenantSlug: string;
  primedName?: string;
}

// Reads the bootstrap result (started in index.html before React loaded)
// or falls back to the localStorage cache, giving us synchronous initial data.
function getInitialSiteData(tenantId: string): TenantSiteData | null {
  const cached = readSiteCache(tenantId);
  return cached?.data ?? null;
}

export function PublicWebsite({ tenantId, tenantSlug, primedName }: PublicWebsiteProps) {
  const [siteData, setSiteData] = useState<TenantSiteData | null>(() =>
    getInitialSiteData(tenantId)
  );
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bootstrapConsumed = useRef(false);

  const theme = siteData?.theme ?? null;
  const branding = siteData?.branding ?? {};
  const headerNav = siteData?.headerNav ?? [];
  const footerNav = siteData?.footerNav ?? [];
  const siteStatus = siteData?.siteStatus ?? 'live';

  const displayName = branding.company_name || primedName || tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1);
  const accentColor = (theme?.colors as any)?.accent || '#C9A84C';
  const primaryColor = theme?.colors?.primary || '#0A1628';

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  // Update document title when branding arrives
  useEffect(() => {
    const name =
      branding.company_name ||
      primedName ||
      tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1);
    document.title = name;
  }, [branding, tenantSlug, primedName]);

  // Pop-state listener
  useEffect(() => {
    const handle = () => {
      setCurrentPath(window.location.pathname);
      setMobileMenuOpen(false);
    };
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);

  // On mount: consume the bootstrap promise (if it resolved) then revalidate
  useEffect(() => {
    if (bootstrapConsumed.current) return;
    bootstrapConsumed.current = true;

    const bootstrapPromise = consumeBootstrap();

    async function hydrate() {
      // 1. Try bootstrap promise first (data fetched in parallel with JS bundle)
      if (bootstrapPromise) {
        try {
          const result = await bootstrapPromise;
          if (result && result.tenantId === tenantId) {
            setSiteData(result.site);
            writeSiteCache(tenantId, result.site);
            // Bootstrap also includes page data — PublicPageRouter will consume it
            return; // bootstrap is fresh, no need to revalidate immediately
          }
        } catch {
          // bootstrap failed — fall through to direct fetch
        }
      }

      // 2. If we already have cached (non-stale) data, skip the fetch
      const cached = readSiteCache(tenantId);
      if (cached && !cached.stale) return;

      // 3. Fetch fresh data (background revalidation if we had stale cache,
      //    or blocking fetch on very first visit with no cache and no bootstrap)
      await fetchAndCacheSiteData();
    }

    hydrate();
  }, [tenantId]);

  async function fetchAndCacheSiteData(): Promise<void> {
    try {
      const [themeResult, settingsResult, headerNavResult, footerNavResult] =
        await Promise.all([
          supabase
            .from('site_themes')
            .select('colors, typography, logo_url, favicon_url, custom_css')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .maybeSingle(),

          supabase.rpc('get_tenant_public_settings', { p_tenant_id: tenantId }),

          supabase
            .from('navigation_menus')
            .select('items')
            .eq('tenant_id', tenantId)
            .eq('menu_type', 'header')
            .maybeSingle(),

          supabase
            .from('navigation_menus')
            .select('items')
            .eq('tenant_id', tenantId)
            .eq('menu_type', 'footer')
            .maybeSingle(),
        ]);

      const fresh: TenantSiteData = {
        theme: (themeResult.data as TenantSiteData['theme']) ?? null,
        branding: settingsResult.data?.branding ?? {},
        siteStatus: settingsResult.data?.site_status ?? 'live',
        headerNav: (headerNavResult.data?.items as TenantSiteData['headerNav']) ?? [],
        footerNav: (footerNavResult.data?.items as TenantSiteData['footerNav']) ?? [],
      };

      setSiteData(fresh);
      writeSiteCache(tenantId, fresh);
    } catch (err) {
      console.error('Error loading site data:', err);
    }
  }

  function applyTheme(t: TenantSiteData['theme']) {
    if (!t) return;
    const root = document.documentElement;
    const c = t.colors as any;
    root.style.setProperty('--color-primary', c.primary);
    root.style.setProperty('--color-secondary', c.secondary);
    root.style.setProperty('--color-accent', c.accent);
    root.style.setProperty('--color-accentLight', c.accentLight || c.accent);
    root.style.setProperty('--color-background', c.background);
    root.style.setProperty('--color-backgroundAlt', c.backgroundAlt || '#F8F7F4');
    root.style.setProperty('--color-text', c.text);
    root.style.setProperty('--color-textSecondary', c.textSecondary || c['text-secondary'] || '#4A5568');
    root.style.setProperty('--color-textLight', c.textLight || '#718096');
    root.style.setProperty('--color-border', c.border || '#E2E8F0');
    root.style.setProperty('--font-heading', t.typography.headingFont);
    root.style.setProperty('--font-body', t.typography.bodyFont);

    const faviconHref =
      t.favicon_url ||
      generateFaviconSvg(c.primary || '#1B3A2D', c.accent || '#B8934A');
    let fav = (document.getElementById('favicon')
      || document.querySelector("link[rel*='icon']")) as HTMLLinkElement | null;
    if (!fav) {
      fav = document.createElement('link') as HTMLLinkElement;
      fav.rel = 'icon';
      fav.id = 'favicon';
      document.head.appendChild(fav);
    }
    fav.type = 'image/svg+xml';
    fav.href = faviconHref;
  }

  function generateFaviconSvg(primary: string, accent: string): string {
    const p = encodeURIComponent(primary);
    const a = encodeURIComponent(accent);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='${p}'/%3E%3Cpath d='M16 7 L26 16 L16 25 L6 16 Z' fill='none' stroke='${a}' stroke-width='1.8'/%3E%3Ccircle cx='16' cy='16' r='2.5' fill='${a}'/%3E%3C/svg%3E`;
  }

  function navigate(href: string, external = false) {
    if (external) { window.open(href, '_blank'); return; }
    window.history.pushState({}, '', href);
    setCurrentPath(href);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }

  function handleLoginClick() {
    window.history.pushState({}, '', '/?login=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  if (siteStatus === 'coming_soon') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: primaryColor }}>
        <div className="text-center text-white max-w-2xl">
          {theme?.logo_url && <img src={theme.logo_url} alt="Logo" className="h-20 mx-auto mb-8" />}
          <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: theme?.typography.headingFont || 'inherit' }}>
            Coming Soon
          </h1>
          <p className="text-xl md:text-2xl text-white/90" style={{ fontFamily: theme?.typography.bodyFont || 'inherit' }}>
            We're working hard to bring you something amazing. Stay tuned!
          </p>
        </div>
      </div>
    );
  }

  if (siteStatus === 'maintenance') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <div className="text-center max-w-2xl">
          {theme?.logo_url && <img src={theme.logo_url} alt="Logo" className="h-20 mx-auto mb-8" />}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-800" style={{ fontFamily: theme?.typography.headingFont || 'inherit' }}>
            Under Maintenance
          </h1>
          <p className="text-xl text-gray-600" style={{ fontFamily: theme?.typography.bodyFont || 'inherit' }}>
            We're performing scheduled maintenance. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="public-website min-h-screen flex flex-col"
      style={{ backgroundColor: theme?.colors.background || 'var(--color-background, #FFFFFF)' }}
    >
      {theme?.custom_css && <style>{theme.custom_css}</style>}

      <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: primaryColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}>
        <nav className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <span
                className="text-xl font-bold tracking-tight"
                style={{ color: accentColor, fontFamily: theme?.typography.headingFont || 'inherit' }}
              >
                {displayName}
              </span>
            </button>

            <div className="hidden md:flex items-center gap-8">
              {headerNav.map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.href, item.external)}
                  className="text-sm font-medium tracking-wide transition-opacity hover:opacity-70"
                  style={{ color: accentColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: accentColor, color: primaryColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}
              >
                <LogIn size={15} />
                Investor Login
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              style={{ color: accentColor }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              {headerNav.map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.href, item.external)}
                  className="block w-full text-left py-3 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: accentColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 mt-3 text-sm font-semibold px-4 py-2.5 rounded w-full justify-center transition-all hover:opacity-90"
                style={{ backgroundColor: accentColor, color: primaryColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}
              >
                <LogIn size={15} />
                Investor Login
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <PublicPageRouter tenantId={tenantId} path={currentPath} />
      </main>

      <footer className="px-6 py-4 border-t" style={{ backgroundColor: primaryColor, borderColor: 'rgba(255,255,255,0.10)', fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: accentColor, fontFamily: theme?.typography.headingFont || 'inherit' }}
          >
            {displayName}
          </span>

          {footerNav.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {footerNav.map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.href, item.external)}
                  className="text-xs transition-opacity hover:opacity-100"
                  style={{ color: accentColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-[10px]" style={{ color: accentColor, fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}>
            &copy; {new Date().getFullYear()} {displayName}. All rights reserved.
          </p>
        </div>

        {branding.legal_disclaimer && (
          <p className="text-[10px] leading-relaxed mt-2 max-w-4xl" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: theme?.typography.bodyFont || 'var(--font-body, inherit)' }}>
            {branding.legal_disclaimer}
          </p>
        )}
      </footer>
    </div>
  );
}
