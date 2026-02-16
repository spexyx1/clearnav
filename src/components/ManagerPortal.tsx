import { useState, useEffect } from 'react';
import { LogOut, Users, Contact, UserCheck, FileText, MessageSquare, CheckSquare, BarChart3, Settings, Shield, Briefcase, UserCog, TrendingUp, Building2, Layers, Wallet, ArrowRightLeft, Bell, DollarSign, ArrowUpCircle, Percent, Receipt, PieChart, FolderOpen, Calculator, FileCheck, Package, Coins, ShoppingCart, Mail, Inbox, Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useTenantBranding } from '../lib/hooks';
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
import RoleSwitcher from './RoleSwitcher';

type TabType = 'dashboard' | 'funds' | 'classes' | 'accounts' | 'nav' | 'transactions' | 'capital_calls' | 'distributions' | 'redemptions' | 'fees' | 'statements' | 'performance' | 'reports' | 'waterfall' | 'tax_docs' | 'carried_interest' | 'side_pockets' | 'exchange' | 'contacts' | 'onboarding' | 'clients' | 'communications' | 'newsletters' | 'email' | 'community' | 'tasks' | 'analytics' | 'staff' | 'compliance' | 'users';

export default function ManagerPortal() {
  const { staffAccount, userRole, signOut, currentTenant, user, isTenantAdmin } = useAuth();
  const { branding } = useTenantBranding();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  console.log('🏢 ManagerPortal render:', {
    currentTenant: currentTenant?.slug,
    currentTenantId: currentTenant?.id,
    userRole,
    isTenantAdmin,
    staffAccount: staffAccount?.email,
    userEmail: user?.email,
    userId: user?.id
  });
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeOnboarding: 0,
    pendingTasks: 0,
    totalClients: 0,
  });

  useEffect(() => {
    loadStats();
  }, [currentTenant]);

  const loadStats = async () => {
    const [contactsRes, onboardingRes, tasksRes, clientsRes] = await Promise.all([
      supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
      supabase.from('onboarding_workflows').select('id', { count: 'exact', head: true }).in('status', ['started', 'in_progress', 'pending_approval']),
      supabase.from('tasks_activities').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('client_profiles').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalContacts: contactsRes.count || 0,
      activeOnboarding: onboardingRes.count || 0,
      pendingTasks: tasksRes.count || 0,
      totalClients: clientsRes.count || 0,
    });
  };

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: BarChart3 },
    { id: 'funds' as TabType, label: 'Funds', icon: Building2 },
    { id: 'classes' as TabType, label: 'Share Classes', icon: Layers },
    { id: 'accounts' as TabType, label: 'Capital Accounts', icon: Wallet },
    { id: 'nav' as TabType, label: 'NAV', icon: TrendingUp },
    { id: 'transactions' as TabType, label: 'Transactions', icon: ArrowRightLeft },
    { id: 'capital_calls' as TabType, label: 'Capital Calls', icon: Bell },
    { id: 'distributions' as TabType, label: 'Distributions', icon: DollarSign },
    { id: 'redemptions' as TabType, label: 'Redemptions', icon: ArrowUpCircle },
    { id: 'fees' as TabType, label: 'Fees', icon: Percent },
    { id: 'statements' as TabType, label: 'Statements', icon: Receipt },
    { id: 'performance' as TabType, label: 'Performance', icon: PieChart },
    { id: 'reports' as TabType, label: 'Reports', icon: FolderOpen },
    { id: 'waterfall' as TabType, label: 'Waterfall', icon: Calculator },
    { id: 'carried_interest' as TabType, label: 'Carry', icon: Coins },
    { id: 'side_pockets' as TabType, label: 'Side Pockets', icon: Package },
    { id: 'tax_docs' as TabType, label: 'Tax Docs', icon: FileCheck },
    { id: 'exchange' as TabType, label: 'Exchange', icon: ShoppingCart },
    { id: 'contacts' as TabType, label: 'Contacts', icon: Contact },
    { id: 'onboarding' as TabType, label: 'Onboarding', icon: UserCheck },
    { id: 'clients' as TabType, label: 'Clients', icon: Users },
    { id: 'communications' as TabType, label: 'Communications', icon: MessageSquare },
    { id: 'newsletters' as TabType, label: 'Newsletters', icon: Mail },
    { id: 'email' as TabType, label: 'Email', icon: Inbox },
    { id: 'community' as TabType, label: 'Community', icon: Globe },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare },
    { id: 'analytics' as TabType, label: 'Analytics', icon: Briefcase },
    ...(userRole === 'general_manager' || userRole === 'compliance_manager' || userRole === 'legal_counsel' ? [
      { id: 'compliance' as TabType, label: 'Compliance', icon: Shield }
    ] : []),
    ...(userRole === 'general_manager' ? [
      { id: 'users' as TabType, label: 'Users', icon: UserCog },
      { id: 'staff' as TabType, label: 'Staff', icon: Settings }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        .tab-active-manager { background-color: ${branding.colors.primary} !important; box-shadow: 0 10px 30px ${branding.colors.primary}20 !important; }
        .stat-onboarding { color: ${branding.colors.primary}; }
      `}</style>

      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="h-8" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-sm" style={{ background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})` }}></div>
                  <div>
                    <span className="text-2xl font-light tracking-wider text-white">
                      {branding.company_name.split(' ')[0].toUpperCase()}
                      <span className="font-semibold">{branding.company_name.split(' ')[1]?.toUpperCase() || ''}</span>
                    </span>
                    <span className="ml-3 text-sm text-slate-400">Manager Portal</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-slate-400">Contacts</div>
                  <div className="text-white font-semibold">{stats.totalContacts}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Onboarding</div>
                  <div className="stat-onboarding font-semibold">{stats.activeOnboarding}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Tasks</div>
                  <div className="text-orange-400 font-semibold">{stats.pendingTasks}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Clients</div>
                  <div className="text-green-400 font-semibold">{stats.totalClients}</div>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700"></div>
              <RoleSwitcher />
              <div className="text-right">
                <div className="text-sm text-slate-400 capitalize">{userRole?.replace('_', ' ')}</div>
                <div className="text-white font-medium">{staffAccount?.full_name || user?.email?.split('@')[0] || 'User'}</div>
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

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'tab-active-manager text-white'
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
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'compliance' && <ComplianceCenter />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'staff' && <StaffManagement />}
        </div>
      </div>
    </div>
  );
}
