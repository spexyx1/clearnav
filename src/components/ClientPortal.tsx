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

export default function ClientPortal() {
  const { user, signOut, currentTenant } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [branding, setBranding] = useState<TenantBranding>({
    logo_url: '',
    company_name: currentTenant?.name || 'Portal',
    colors: {
      primary: '#06b6d4',
      secondary: '#0ea5e9',
      accent: '#22d3ee',
      background: '#020617',
      text: '#ffffff',
    },
  });

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
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('branding')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.branding) {
        setBranding(data.branding as TenantBranding);
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

  const primaryColor = branding.colors.primary || '#0E7490';

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="h-8" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-sm bg-brand-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{branding.company_name.charAt(0)}</span>
                  </div>
                  <span className="text-xl font-semibold tracking-wide text-white">
                    {branding.company_name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-sm text-slate-400">{t('clientPortal.welcome')},</div>
                <div className="text-white font-medium">{profile?.full_name || 'Client'}</div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{t('nav.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-current={isActive ? 'page' : undefined}
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                style={isActive ? { backgroundColor: primaryColor } : undefined}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
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

        <PageFooter companyName={branding.company_name} theme="dark" />
      </div>
    </div>
  );
}
