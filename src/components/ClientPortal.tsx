import { useState, useEffect } from 'react';
import { LogOut, LayoutDashboard, TrendingUp, FileText, ArrowDownCircle, Receipt, Activity, Settings, ShoppingCart, Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Dashboard from './portal/Dashboard';
import Returns from './portal/Returns';
import Documents from './portal/Documents';
import Redemptions from './portal/Redemptions';
import TaxDocuments from './portal/TaxDocuments';
import RiskMetrics from './portal/RiskMetrics';
import IBKRSettings from './portal/IBKRSettings';
import Exchange from './portal/Exchange';
import CommunityHub from './community/CommunityHub';
import RoleSwitcher from './RoleSwitcher';

type TabType = 'dashboard' | 'returns' | 'risk' | 'documents' | 'redemptions' | 'tax' | 'exchange' | 'community' | 'settings';

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
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'returns' as TabType, label: 'Returns', icon: TrendingUp },
    { id: 'risk' as TabType, label: 'Risk Analytics', icon: Activity },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'redemptions' as TabType, label: 'Redemptions', icon: ArrowDownCircle },
    { id: 'tax' as TabType, label: 'Tax Documents', icon: Receipt },
    { id: 'exchange' as TabType, label: 'Exchange', icon: ShoppingCart },
    { id: 'community' as TabType, label: 'Community', icon: Globe },
    { id: 'settings' as TabType, label: 'IBKR Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        .tab-active { background-color: ${branding.colors.primary} !important; box-shadow: 0 10px 30px ${branding.colors.primary}20 !important; }
      `}</style>

      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
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
            <div className="flex items-center space-x-6">
              <RoleSwitcher />
              <div className="text-right">
                <div className="text-sm text-slate-400">Welcome back,</div>
                <div className="text-white font-medium">{profile?.full_name || 'Client'}</div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
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
          {activeTab === 'settings' && <IBKRSettings />}
        </div>
      </div>
    </div>
  );
}
