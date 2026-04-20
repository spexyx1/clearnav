import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PublicPageRouter } from './PublicPageRouter';
import { Menu, X, LogIn } from 'lucide-react';

interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textSecondary: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  logo_url?: string;
  favicon_url?: string;
  custom_css?: string;
}

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

interface TenantBranding {
  company_name?: string;
  tagline?: string;
  address?: string;
  founded?: string;
  website?: string;
}

interface PublicWebsiteProps {
  tenantId: string;
  tenantSlug: string;
}

export function PublicWebsite({ tenantId, tenantSlug }: PublicWebsiteProps) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [branding, setBranding] = useState<TenantBranding>({});
  const [headerNav, setHeaderNav] = useState<NavItem[]>([]);
  const [footerNav, setFooterNav] = useState<NavItem[]>([]);
  const [siteStatus, setSiteStatus] = useState<string>('live');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const displayName = branding.company_name || (tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1));
  const accentColor = (theme?.colors as any)?.accent || '#C9A84C';
  const primaryColor = theme?.colors.primary || '#0A1628';

  useEffect(() => {
    loadSiteData();

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setMobileMenuOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tenantId]);

  useEffect(() => {
    if (theme) {
      applyTheme(theme);
    }
  }, [theme]);

  async function loadSiteData() {
    try {
      setLoading(true);

      const [themeResult, settingsResult, headerNavResult, footerNavResult] = await Promise.all([
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

      if (themeResult.data) {
        setTheme(themeResult.data as Theme);
      }

      if (settingsResult.data) {
        setSiteStatus(settingsResult.data.site_status || 'live');
        if (settingsResult.data.branding) {
          setBranding(settingsResult.data.branding as TenantBranding);
        }
      }

      if (headerNavResult.data?.items) {
        setHeaderNav(headerNavResult.data.items as NavItem[]);
      }

      if (footerNavResult.data?.items) {
        setFooterNav(footerNavResult.data.items as NavItem[]);
      }
    } catch (error) {
      console.error('Error loading site data:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyTheme(t: Theme) {
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

    if (t.favicon_url) {
      let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = t.favicon_url;
    }
  }

  useEffect(() => {
    const name = branding.company_name || (tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1));
    document.title = name;
  }, [branding, tenantSlug]);

  function navigate(href: string, external: boolean = false) {
    if (external) {
      window.open(href, '_blank');
      return;
    }

    window.history.pushState({}, '', href);
    setCurrentPath(href);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }

  function handleLoginClick() {
    window.history.pushState({}, '', '/?login=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F7F4' }}>
        <div className="text-center">
          <div
            className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: `${primaryColor}40`, borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (siteStatus === 'coming_soon') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: primaryColor }}>
        <div className="text-center text-white max-w-2xl">
          {theme?.logo_url && (
            <img src={theme.logo_url} alt="Logo" className="h-20 mx-auto mb-8" />
          )}
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
          {theme?.logo_url && (
            <img src={theme.logo_url} alt="Logo" className="h-20 mx-auto mb-8" />
          )}
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
    <div className="public-website min-h-screen flex flex-col" style={{ backgroundColor: theme?.colors.background || '#FFFFFF' }}>
      {theme?.custom_css && <style>{theme.custom_css}</style>}

      <header
        className="sticky top-0 z-50 shadow-md"
        style={{ backgroundColor: primaryColor }}
      >
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {theme?.logo_url ? (
                <img src={theme.logo_url} alt="Logo" className="h-10" />
              ) : (
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{
                    color: accentColor,
                    fontFamily: theme?.typography.headingFont || 'inherit',
                  }}
                >
                  {displayName}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center gap-8">
              {headerNav.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.href, item.external)}
                  className="text-sm font-medium tracking-wide transition-opacity hover:opacity-70"
                  style={{ color: 'rgba(255,255,255,0.88)' }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: accentColor,
                  color: primaryColor,
                  fontFamily: theme?.typography.bodyFont || 'inherit',
                }}
              >
                <LogIn size={15} />
                Investor Login
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              {headerNav.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.href, item.external)}
                  className="block w-full text-left py-3 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'rgba(255,255,255,0.88)' }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 mt-3 text-sm font-semibold px-4 py-2.5 rounded w-full justify-center transition-all hover:opacity-90"
                style={{
                  backgroundColor: accentColor,
                  color: primaryColor,
                  fontFamily: theme?.typography.bodyFont || 'inherit',
                }}
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

      <footer
        className="py-14 px-6"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
            <div>
              {theme?.logo_url ? (
                <img src={theme.logo_url} alt="Logo" className="h-8 brightness-0 invert mb-3" />
              ) : (
                <span
                  className="text-lg font-bold tracking-tight block mb-3"
                  style={{
                    color: accentColor,
                    fontFamily: theme?.typography.headingFont || 'inherit',
                  }}
                >
                  {displayName}
                </span>
              )}
              {branding.tagline && (
                <p className="text-xs max-w-xs leading-relaxed tracking-wide" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  {branding.tagline}
                </p>
              )}
              {branding.address && (
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {branding.address}
                </p>
              )}
            </div>

            {footerNav.length > 0 && (
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {footerNav.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(item.href, item.external)}
                    className="text-sm transition-colors hover:opacity-100"
                    style={{ color: 'rgba(255,255,255,0.60)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="pt-8 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.10)' }}
          >
            <p className="text-[10px] leading-relaxed mb-5 max-w-4xl" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Arkline Trust holds an Australian Financial Services Licence (AFSL) issued by the Australian Securities and Investments Commission (ASIC). Access to Arkline Trust funds is restricted to wholesale investors as defined under section 761G of the Corporations Act 2001 (Cth). Investment in our funds involves risk, including potential loss of capital. Past performance is not indicative of future results. This website does not constitute an offer to sell or a solicitation to acquire any financial product and is intended only for wholesale investors located in Australia.
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              &copy; {new Date().getFullYear()} {displayName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
