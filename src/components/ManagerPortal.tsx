import { useState, useEffect } from 'react';
import { LogOut, Search, Bell } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useTenantBranding } from '../lib/hooks';
import ManagerSidebar, { TabType } from './manager/ManagerSidebar';
import CRMDashboard from './manager/CRMDashboard';
import ContactList from './manager/ContactList';
import OnboardingManager from './manager/OnboardingManager';
import Communications from './manager/Communications';
import TaskManager from './manager/TaskManager';
import Analytics from './manager/Analytics';
import StaffManagement from './manager/StaffManagement';
import ComplianceCenter from './manager/ComplianceCenter';
import ClientManager from './manager/ClientManager';
import UserManagement from './manager/UserManagement';
import NAVDashboard from './manager/NAVDashboard';
import FundManagement from './manager/FundManagement';
import ShareClassManager from './manager/ShareClassManager';
import CapitalAccountManager from './manager/CapitalAccountManager';
import TransactionManager from './manager/TransactionManager';
import CapitalCallManager from './manager/CapitalCallManager';
import DistributionManager from './manager/DistributionManager';
import RedemptionManager from './manager/RedemptionManager';
import FeeManager from './manager/FeeManager';
import InvestorStatements from './manager/InvestorStatements';
import PerformanceReports from './manager/PerformanceReports';
import ReportLibrary from './manager/ReportLibrary';
import WaterfallCalculator from './manager/WaterfallCalculator';
import TaxDocumentManager from './manager/TaxDocumentManager';
import CarriedInterestTracker from './manager/CarriedInterestTracker';
import SidePocketManager from './manager/SidePocketManager';
import ExchangeManagement from './manager/ExchangeManagement';
import NewsletterManager from './manager/NewsletterManager';
import EmailClient from './manager/EmailClient';
import CommunityHub from './community/CommunityHub';
import WhiteLabelManager from './manager/WhiteLabelManager';

export default function ManagerPortal() {
  const { staffAccount, userRole, signOut, currentTenant, user, isTenantAdmin } = useAuth();
  const { branding } = useTenantBranding();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <nav className="flex-shrink-0 border-b border-slate-800/50 bg-slate-950/95 backdrop-blur-md z-50">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="h-7" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md" style={{ background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})` }} />
                  <span className="text-lg font-light tracking-wide text-white">
                    {branding.company_name.split(' ')[0]?.toUpperCase()}
                    <span className="font-semibold">{branding.company_name.split(' ')[1]?.toUpperCase() || ''}</span>
                  </span>
                </div>
              )}
              <span className="text-xs text-slate-500 font-medium tracking-wide ml-1">MANAGER</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <div
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: branding.colors.primary }}>
                    {(staffAccount?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm text-white font-medium leading-tight">{staffAccount?.full_name || user?.email?.split('@')[0]}</div>
                    <div className="text-[11px] text-slate-400 capitalize leading-tight">{userRole?.replace(/_/g, ' ')}</div>
                  </div>
                </div>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <div className="text-sm text-white font-medium">{staffAccount?.full_name || user?.email?.split('@')[0]}</div>
                        <div className="text-xs text-slate-400">{user?.email}</div>
                      </div>
                      <button
                        onClick={() => { setShowUserMenu(false); signOut(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <ManagerSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isTenantAdmin={isTenantAdmin}
          userRole={userRole}
          primaryColor={branding.colors.primary}
        />

        <main className="flex-1 overflow-y-auto scrollbar-thin bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div className="animate-fadeIn">
              {activeTab === 'dashboard' && <CRMDashboard onNavigate={setActiveTab} />}
              {activeTab === 'funds' && <FundManagement />}
              {activeTab === 'classes' && <ShareClassManager />}
              {activeTab === 'accounts' && <CapitalAccountManager />}
              {activeTab === 'nav' && <NAVDashboard />}
              {activeTab === 'transactions' && <TransactionManager />}
              {activeTab === 'capital_calls' && <CapitalCallManager />}
              {activeTab === 'distributions' && <DistributionManager />}
              {activeTab === 'redemptions' && <RedemptionManager />}
              {activeTab === 'fees' && <FeeManager />}
              {activeTab === 'statements' && <InvestorStatements />}
              {activeTab === 'performance' && <PerformanceReports />}
              {activeTab === 'reports' && <ReportLibrary />}
              {activeTab === 'waterfall' && <WaterfallCalculator />}
              {activeTab === 'carried_interest' && <CarriedInterestTracker />}
              {activeTab === 'side_pockets' && <SidePocketManager />}
              {activeTab === 'tax_docs' && <TaxDocumentManager />}
              {activeTab === 'exchange' && <ExchangeManagement />}
              {activeTab === 'contacts' && <ContactList />}
              {activeTab === 'onboarding' && <OnboardingManager />}
              {activeTab === 'clients' && <ClientManager />}
              {activeTab === 'communications' && <Communications />}
              {activeTab === 'newsletters' && <NewsletterManager />}
              {activeTab === 'email' && <EmailClient />}
              {activeTab === 'community' && <CommunityHub />}
              {activeTab === 'whitelabel' && <WhiteLabelManager />}
              {activeTab === 'tasks' && <TaskManager />}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'compliance' && <ComplianceCenter />}
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'staff' && <StaffManagement />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
