import { useState, useEffect } from 'react';
import { LogOut, LayoutDashboard, TrendingUp, FileText, ArrowDownCircle, Receipt, Activity, Settings as SettingsIcon, ShoppingCart, Globe, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import PageFooter from './shared/PageFooter';
import { TutorialProvider } from '../lib/tutorial/TutorialContext';
import { TourOverlay } from './tutorial/TourOverlay';
import { TutorialLauncher } from './tutorial/TutorialLauncher';
import { HelpButton } from './help/HelpButton';
import { HelpChatPanel } from './help/HelpChatPanel';
import LanguageSelector from './shared/LanguageSelector';
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

  return (
    <TutorialProvider portal="client" onNavigate={(route) => setActiveTab(route as TabType)}>
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        .tab-active { background-color: ${branding.colors.primary} !important; box-shadow: 0 10px 30px ${branding.colors.primary}20 !important; }
      `}</style>

      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md" data-tour="client-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="h-8" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-sm" style={{ background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})` }}></div>
                  <span className="text-2xl font-light tracking-wider text-white">
                    {branding.company_name.split(' ')[0].toUpperCase()}
                    <span className="font-semibold">{branding.company_name.split(' ')[1]?.toUpperCase() || ''}</span>
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-slate-400">{t('clientPortal.welcome')},</div>
                <div className="text-white font-medium">{profile?.full_name || 'Client'}</div>
              </div>
              <LanguageSelector variant="compact" theme="dark" />
              <HelpButton variant="dark" />
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{t('nav.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-tour={`client-tab-${tab.id}`}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'tab-active text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
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

        <PageFooter companyName={branding.company_name} theme="dark" />
      </div>
      <TourOverlay />
      <TutorialLauncher />
      <HelpChatPanel
        portal="client"
        currentRoute={activeTab}
        tenantName={currentTenant?.name}
        onNavigate={(route) => setActiveTab(route as TabType)}
      />
    </div>
    </TutorialProvider>
  );
}
