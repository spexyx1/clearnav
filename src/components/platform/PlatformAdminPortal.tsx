import React, { useState } from 'react';
import LanguageSelector from '../shared/LanguageSelector';
import {
  Building2,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  Percent,
  MessageSquare,
  LogOut,
  Mail,
  AtSign,
  LineChart,
  Shield,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import PageFooter from '../shared/PageFooter';
import { TutorialProvider } from '../../lib/tutorial/TutorialContext';
import { TourOverlay } from '../tutorial/TourOverlay';
import { TutorialLauncher } from '../tutorial/TutorialLauncher';
import { HelpButton } from '../help/HelpButton';
import { HelpChatPanel } from '../help/HelpChatPanel';
import TenantManagement from './TenantManagement';
import BillingOverview from './BillingOverview';
import PlatformAnalytics from './PlatformAnalytics';
import PlatformSettings from './PlatformSettings';
import DiscountManagement from './DiscountManagement';
import UserManagement from './UserManagement';
import SupportTools from './SupportTools';
import PlatformEmailInbox from './PlatformEmailInbox';
import TenantEmailOversight from './TenantEmailOversight';
import PlatformFinancials from './PlatformFinancials';
import ComplianceOfficerManager from './ComplianceOfficerManager';

type Tab = 'tenants' | 'users' | 'discounts' | 'billing' | 'analytics' | 'support' | 'settings' | 'inbox' | 'email_oversight' | 'financials' | 'compliance';

export default function PlatformAdminPortal() {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('tenants');

  const tabs = [
    { id: 'tenants', label: t('platformAdmin.tenants'), icon: Building2 },
    { id: 'users', label: t('platformAdmin.users'), icon: Users },
    { id: 'discounts', label: t('platformAdmin.discounts'), icon: Percent },
    { id: 'billing', label: t('platformAdmin.billing'), icon: DollarSign },
    { id: 'analytics', label: t('platformAdmin.analytics'), icon: BarChart3 },
    { id: 'support', label: t('platformAdmin.support'), icon: MessageSquare },
    { id: 'inbox', label: t('platformAdmin.inbox'), icon: Mail },
    { id: 'email_oversight', label: t('platformAdmin.emailOversight'), icon: AtSign },
    { id: 'financials', label: t('platformAdmin.financials'), icon: LineChart },
    { id: 'compliance', label: t('platformAdmin.complianceOfficers'), icon: Shield },
    { id: 'settings', label: t('platformAdmin.settings'), icon: Settings },
  ];

  return (
    <TutorialProvider portal="platform_admin" onNavigate={(route) => setActiveTab(route as Tab)}>
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200" data-tour="platform-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t('platformAdmin.title')}</h1>
                <p className="text-sm text-slate-600">{t('platformAdmin.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector variant="compact" theme="light" />
              <HelpButton variant="light" />
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                data-tour={`platform-tab-${tab.id}`}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-md transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'tenants' && <TenantManagement />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'discounts' && <DiscountManagement />}
          {activeTab === 'billing' && <BillingOverview />}
          {activeTab === 'analytics' && <PlatformAnalytics />}
          {activeTab === 'support' && <SupportTools />}
          {activeTab === 'inbox' && <PlatformEmailInbox />}
          {activeTab === 'email_oversight' && <TenantEmailOversight />}
          {activeTab === 'financials' && <PlatformFinancials />}
          {activeTab === 'compliance' && <ComplianceOfficerManager />}
          {activeTab === 'settings' && <PlatformSettings />}
        </div>

        <PageFooter companyName="Platform Admin" theme="light" />
      </div>
      <TourOverlay />
      <TutorialLauncher />
      <HelpChatPanel
        portal="platform_admin"
        currentRoute={activeTab}
        onNavigate={(route) => setActiveTab(route as Tab)}
      />
    </div>
    </TutorialProvider>
  );
}
