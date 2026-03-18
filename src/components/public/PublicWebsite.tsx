import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PublicPageRouter } from './PublicPageRouter';
import { Menu, X } from 'lucide-react';

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

interface PublicWebsiteProps {
  tenantId: string;
  tenantSlug: string;
}

export function PublicWebsite({ tenantId, tenantSlug }: PublicWebsiteProps) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [headerNav, setHeaderNav] = useState<NavItem[]>([]);
  const [footerNav, setFooterNav] = useState<NavItem[]>([]);
  const [siteStatus, setSiteStatus] = useState<string>('live');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  function applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--font-heading', theme.typography.headingFont);
    root.style.setProperty('--font-body', theme.typography.bodyFont);

    if (theme.favicon_url) {
      let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = theme.favicon_url;
    }

    document.title = tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1);
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (siteStatus === 'coming_soon') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: theme?.colors.primary || '#3B82F6' }}>
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

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {theme?.logo_url ? (
                <img src={theme.logo_url} alt="Logo" className="h-10" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: theme?.colors.primary || '#3B82F6', fontFamily: theme?.typography.headingFont || 'inherit' }}>
                  {tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center gap-8">
              {headerNav.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.href, item.external)}
                  className="font-medium hover:opacity-70 transition-opacity"
                  style={{ color: theme?.colors.text || '#1F2937' }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              style={{ color: theme?.colors.text || '#1F2937' }}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t pt-4">
              {headerNav.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.href, item.external)}
                  className="block w-full text-left py-3 font-medium hover:opacity-70 transition-opacity"
                  style={{ color: theme?.colors.text || '#1F2937' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <PublicPageRouter tenantId={tenantId} path={currentPath} />
      </main>

      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              {theme?.logo_url && (
                <img src={theme.logo_url} alt="Logo" className="h-8 brightness-0 invert" />
              )}
              <span className="text-lg font-semibold">
                {tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}
              </span>
            </div>

            {footerNav.length > 0 && (
              <div className="flex items-center gap-6">
                {footerNav.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(item.href, item.external)}
                    className="text-sm hover:text-gray-300 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
