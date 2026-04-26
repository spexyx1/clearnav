import { useState, useEffect } from 'react';
import { LogOut, LayoutDashboard, TrendingUp, FileText, ArrowDownCircle, Receipt, Activity, Settings as SettingsIcon, ShoppingCart, Globe, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import PageFooter from './shared/PageFooter';
import Dashboard from './portal/Dashboard';
import Returns from './portal/Returns';
import Documents from './portal/Documents';
import Redemptions from './portal/Redemptions';
import TaxDocuments from './portal/TaxDocuments';
import RiskMetrics from './portal/RiskMetrics';
import Settings from './portal/Settings';
import Exchange from './portal/Exchange';
import CommunityHub from './community/CommunityHub';
import KYCVerification from './portal/KYCVerification';

type TabType = 'dashboard' | 'returns' | 'risk' | 'documents' | 'redemptions' | 'tax' | 'exchange' | 'community' | 'kyc' | 'settings';

interface TenantBranding {
  logo_url: string;
  company_name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

/** Read CSS variables already set synchronously by the index.html priming script. */
function readCSSVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name).trim();
}

function getInitialBranding(tenantName: string): TenantBranding {
  const primary = readCSSVar('--color-primary');
  // Only use CSS vars if the priming script ran (tenant domain)
  if (primary) {
    return {
      logo_url: '',
      company_name: tenantName,
      colors: {
        primary,
        secondary: readCSSVar('--color-secondary') || primary,
        accent:    readCSSVar('--color-accent')    || primary,
        background: readCSSVar('--color-background') || '#ffffff',
        text:       readCSSVar('--color-text')       || '#1a1a1a',
      },
    };
  }
  // Platform root / no priming — ClearNAV defaults
  return {
    logo_url: '',
    company_name: tenantName,
    colors: {
      primary:    '#06b6d4',
      secondary:  '#0ea5e9',
      accent:     '#22d3ee',
      background: '#020617',
      text:       '#ffffff',
    },
  };
}

export default function ClientPortal() {
  const { user, signOut, currentTenant } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [branding, setBranding] = useState<TenantBranding>(() =>
    getInitialBranding(currentTenant?.name || 'Portal')
  );

  useEffect(() => {
    if (user) {
      loadProfile();
      loadBranding();
    }
  }, [user, currentTenant]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();

    setProfile(data);
  };

  const loadBranding = async () => {
    if (!currentTenant) return;

    try {
      // Prefer site_themes (canonical source), fall back to tenant_settings.branding
      const [themeResult, settingsResult] = await Promise.all([
        supabase
          .from('site_themes')
          .select('colors, logo_url')
          .eq('tenant_id', currentTenant.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('tenant_settings')
          .select('branding')
          .eq('tenant_id', currentTenant.id)
          .maybeSingle(),
      ]);

      const colors = (themeResult.data?.colors ?? {}) as Record<string, string>;
      const sb = settingsResult.data?.branding as any ?? {};

      if (Object.keys(colors).length > 0) {
        setBranding({
          logo_url: themeResult.data?.logo_url || sb.logo_url || '',
          company_name: sb.company_name || currentTenant.name,
          colors: {
            primary:    colors.primary    || branding.colors.primary,
            secondary:  colors.secondary  || branding.colors.secondary,
            accent:     colors.accent     || branding.colors.accent,
            background: colors.background || branding.colors.background,
            text:       colors.text       || branding.colors.text,
          },
        });
      } else if (sb && sb.colors) {
        setBranding(sb as TenantBranding);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const tabs = [
    { id: 'dashboard' as TabType, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'returns' as TabType, label: t('clientPortal.returns'), icon: TrendingUp },
    { id: 'risk' as TabType, label: t('clientPortal.risk'), icon: Activity },
    { id: 'documents' as TabType, label: t('clientPortal.documents'), icon: FileText },
    { id: 'redemptions' as TabType, label: t('clientPortal.redemptions'), icon: ArrowDownCircle },
    { id: 'tax' as TabType, label: t('clientPortal.tax'), icon: Receipt },
    { id: 'exchange' as TabType, label: t('clientPortal.exchange'), icon: ShoppingCart },
    { id: 'community' as TabType, label: t('clientPortal.community'), icon: Globe },
    { id: 'kyc' as TabType, label: 'Verification', icon: Shield },
    { id: 'settings' as TabType, label: t('clientPortal.settings'), icon: SettingsIcon },
  ];

  const isDarkBg = (() => {
    const h = branding.colors.background.replace('#', '');
    if (h.length < 6) return true;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  const navBorder = isDarkBg ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const navBg = isDarkBg
    ? `${branding.colors.primary}F0`
    : `${branding.colors.background}F5`;
  const textPrimary = isDarkBg ? '#ffffff' : branding.colors.text;
  const textMuted = isDarkBg ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const tabInactiveBg = isDarkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const tabInactiveText = isDarkBg ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.50)';
  const tabInactiveHoverBg = isDarkBg ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)';
  const footerTheme = isDarkBg ? 'dark' : 'light';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: branding.colors.background, color: branding.colors.text }}
    >
      <nav
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          backgroundColor: navBg,
          borderBottom: `1px solid ${navBorder}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="h-8 w-auto object-contain" />
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: branding.colors.accent }}
                  />
                  <span className="text-xl font-semibold tracking-wide" style={{ color: textPrimary }}>
                    {branding.company_name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-xs" style={{ color: textMuted }}>{t('clientPortal.welcome')}</div>
                <div className="text-sm font-medium" style={{ color: textPrimary }}>{profile?.full_name || 'Client'}</div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                style={{ color: textMuted }}
                onMouseEnter={(e) => { e.currentTarget.style.color = textPrimary; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = textMuted; }}
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-150 whitespace-nowrap text-sm"
                style={isActive ? {
                  backgroundColor: branding.colors.primary,
                  color: '#ffffff',
                  boxShadow: `0 4px 14px ${branding.colors.primary}40`,
                } : {
                  backgroundColor: tabInactiveBg,
                  color: tabInactiveText,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = tabInactiveHoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = tabInactiveBg;
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && <Dashboard profile={profile} />}
          {activeTab === 'returns' && <Returns />}
          {activeTab === 'risk' && <RiskMetrics />}
          {activeTab === 'documents' && <Documents />}
          {activeTab === 'redemptions' && <Redemptions profile={profile} />}
          {activeTab === 'tax' && <TaxDocuments />}
          {activeTab === 'exchange' && <Exchange profile={profile} />}
          {activeTab === 'community' && <CommunityHub />}
          {activeTab === 'kyc' && <KYCVerification />}
          {activeTab === 'settings' && <Settings />}
        </div>

        <PageFooter companyName={branding.company_name} theme={footerTheme} />
      </div>
    </div>
  );
}
