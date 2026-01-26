import { useState, useEffect } from 'react';
import { LogOut, Users, Contact, UserCheck, FileText, MessageSquare, CheckSquare, BarChart3, Settings, Shield, Briefcase, UserCog, TrendingUp, Building2 } from 'lucide-react';
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

type TabType = 'dashboard' | 'funds' | 'nav' | 'contacts' | 'onboarding' | 'clients' | 'communications' | 'tasks' | 'analytics' | 'staff' | 'compliance' | 'users';

export default function ManagerPortal() {
  const { staffAccount, userRole, signOut, currentTenant } = useAuth();
  const { branding } = useTenantBranding();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
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
    { id: 'nav' as TabType, label: 'NAV', icon: TrendingUp },
    { id: 'contacts' as TabType, label: 'Contacts', icon: Contact },
    { id: 'onboarding' as TabType, label: 'Onboarding', icon: UserCheck },
    { id: 'clients' as TabType, label: 'Clients', icon: Users },
    { id: 'communications' as TabType, label: 'Communications', icon: MessageSquare },
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
              <div className="text-right">
                <div className="text-sm text-slate-400 capitalize">{userRole?.replace('_', ' ')}</div>
                <div className="text-white font-medium">{staffAccount?.full_name}</div>
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
          {activeTab === 'nav' && <NAVDashboard />}
          {activeTab === 'contacts' && <ContactList />}
          {activeTab === 'onboarding' && <OnboardingManager />}
          {activeTab === 'clients' && <ClientManager />}
          {activeTab === 'communications' && <Communications />}
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
