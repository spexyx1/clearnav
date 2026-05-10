import { useState, lazy, Suspense, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import LanguageSelector from './shared/LanguageSelector';
import { useAuth } from '../lib/auth';
import { useTenantBranding } from '../lib/hooks';
import ManagerSidebar, { TabType } from './manager/ManagerSidebar';
import { PanelLoader } from './shared/Spinner';
import { TutorialProvider } from '../lib/tutorial/TutorialContext';
import { TourOverlay } from './tutorial/TourOverlay';
import { TutorialLauncher } from './tutorial/TutorialLauncher';
import { HelpButton } from './help/HelpButton';
import { HelpChatPanel } from './help/HelpChatPanel';

// Lazy-load every tab so only the active tab's code is downloaded.
// Heavy portfolio/reporting tabs (which account for most of the bundle)
// will not be parsed until first use.
const CRMDashboard = lazy(() => import('./manager/CRMDashboard'));
const ContactList = lazy(() => import('./manager/ContactList'));
const OnboardingManager = lazy(() => import('./manager/OnboardingManager'));
const Communications = lazy(() => import('./manager/Communications'));
const TaskManager = lazy(() => import('./manager/TaskManager'));
const Analytics = lazy(() => import('./manager/Analytics'));
const StaffManagement = lazy(() => import('./manager/StaffManagement'));
const ComplianceCenter = lazy(() => import('./manager/ComplianceCenter'));
const ClientManager = lazy(() => import('./manager/ClientManager'));
const UserManagement = lazy(() => import('./manager/UserManagement'));
const NAVDashboard = lazy(() => import('./manager/NAVDashboard'));
const FundManagement = lazy(() => import('./manager/FundManagement'));
const ShareClassManager = lazy(() => import('./manager/ShareClassManager'));
const CapitalAccountManager = lazy(() => import('./manager/CapitalAccountManager'));
const TransactionManager = lazy(() => import('./manager/TransactionManager'));
const CapitalCallManager = lazy(() => import('./manager/CapitalCallManager'));
const DistributionManager = lazy(() => import('./manager/DistributionManager'));
const RedemptionManager = lazy(() => import('./manager/RedemptionManager'));
const FeeManager = lazy(() => import('./manager/FeeManager'));
const InvestorStatements = lazy(() => import('./manager/InvestorStatements'));
const PerformanceReports = lazy(() => import('./manager/PerformanceReports'));
const ReportLibrary = lazy(() => import('./manager/ReportLibrary'));
const WaterfallCalculator = lazy(() => import('./manager/WaterfallCalculator'));
const TaxDocumentManager = lazy(() => import('./manager/TaxDocumentManager'));
const CarriedInterestTracker = lazy(() => import('./manager/CarriedInterestTracker'));
const SidePocketManager = lazy(() => import('./manager/SidePocketManager'));
const ExchangeManagement = lazy(() => import('./manager/ExchangeManagement'));
const NewsletterManager = lazy(() => import('./manager/NewsletterManager'));
const EmailClient = lazy(() => import('./manager/EmailClient'));
const CommunityHub = lazy(() => import('./community/CommunityHub'));
const WhiteLabelManager = lazy(() => import('./manager/WhiteLabelManager'));
const AIAgentManagement = lazy(() => import('./manager/AIAgentManagement'));
const VoiceAgentSetup = lazy(() => import('./manager/VoiceAgentSetup'));
const LiveCallDashboard = lazy(() => import('./manager/LiveCallDashboard'));
const VoiceAgentDialer = lazy(() => import('./manager/VoiceAgentDialer'));
const VoiceAgentAnalytics = lazy(() => import('./manager/VoiceAgentAnalytics'));
const AccountSettings = lazy(() => import('./manager/AccountSettings'));
const BlogManager = lazy(() => import('./manager/BlogManager').then(m => ({ default: m.BlogManager })));
const TestimonialsManager = lazy(() => import('./manager/TestimonialsManager').then(m => ({ default: m.TestimonialsManager })));
const FAQManager = lazy(() => import('./manager/FAQManager').then(m => ({ default: m.FAQManager })));
const FormBuilder = lazy(() => import('./manager/FormBuilder').then(m => ({ default: m.FormBuilder })));
const ContentScheduler = lazy(() => import('./manager/ContentScheduler').then(m => ({ default: m.ContentScheduler })));
const NewsletterSubscribers = lazy(() => import('./manager/NewsletterSubscribers').then(m => ({ default: m.NewsletterSubscribers })));
const InvitationTemplateManager = lazy(() => import('./manager/InvitationTemplateManager'));
const EmailTemplateManager = lazy(() => import('./manager/EmailTemplateManager'));

function TabFallback() {
  return <PanelLoader />;
}

export default function ManagerPortal() {
  const { staffAccount, userRole, signOut, currentTenant, user, isTenantAdmin } = useAuth();
  const { branding } = useTenantBranding();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <TutorialProvider portal="manager" onNavigate={(route) => setActiveTab(route as TabType)}>
    <div className="h-screen flex flex-col bg-slate-950">
      <nav className="flex-shrink-0 border-b border-slate-800/50 bg-slate-950/95 backdrop-blur-md z-50" data-tour="manager-header">
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
              <LanguageSelector variant="compact" theme="dark" />
              <HelpButton variant="dark" />
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
                        aria-label="Sign out"
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
          tenantId={currentTenant?.id}
        />

        <main className="flex-1 overflow-y-auto scrollbar-thin bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div className="animate-fadeIn">
              <Suspense fallback={<TabFallback />}>
                {activeTab === 'dashboard' && <CRMDashboard onNavigate={(tab) => setActiveTab(tab as TabType)} />}
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
                {activeTab === 'ai_agents' && <AIAgentManagement />}
                {activeTab === 'voice_setup' && <VoiceAgentSetup />}
                {activeTab === 'voice_live' && <LiveCallDashboard />}
                {activeTab === 'voice_dialer' && <VoiceAgentDialer />}
                {activeTab === 'voice_analytics' && <VoiceAgentAnalytics />}
                {activeTab === 'tasks' && <TaskManager />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'compliance' && <ComplianceCenter />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'staff' && <StaffManagement />}
                {activeTab === 'blog' && <BlogManager />}
                {activeTab === 'testimonials' && <TestimonialsManager />}
                {activeTab === 'faq' && <FAQManager />}
                {activeTab === 'forms' && <FormBuilder />}
                {activeTab === 'scheduler' && <ContentScheduler />}
                {activeTab === 'subscribers' && <NewsletterSubscribers />}
                {activeTab === 'invitation_templates' && <InvitationTemplateManager />}
                {activeTab === 'email_templates' && <EmailTemplateManager />}
                {activeTab === 'account_settings' && <AccountSettings />}
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      <TourOverlay />
      <TutorialLauncher />
      <HelpChatPanel
        portal="manager"
        currentRoute={activeTab}
        userRole={userRole ?? undefined}
        tenantName={currentTenant?.name}
        onNavigate={(route) => setActiveTab(route as TabType)}
      />
    </div>
    </TutorialProvider>
  );
}
