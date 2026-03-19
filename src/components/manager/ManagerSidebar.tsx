import { useState, useEffect } from 'react';
import { BarChart3, Building2, Layers, Wallet, TrendingUp, ArrowRightLeft, Bell, DollarSign, ArrowUpCircle, Percent, Receipt, PieChart, FolderOpen, Calculator, Coins, Package, FileCheck, ShoppingCart, Contact, UserCheck, Users, MessageSquare, Mail, Inbox, Globe, CheckSquare, Briefcase, Shield, UserCog, Settings, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, Video as LucideIcon, Bot, Phone, PhoneCall, BarChart2, CreditCard, BookOpen, Star, HelpCircle, FileText, Calendar, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

export type TabType = 'dashboard' | 'funds' | 'classes' | 'accounts' | 'nav' | 'transactions' | 'capital_calls' | 'distributions' | 'redemptions' | 'fees' | 'statements' | 'performance' | 'reports' | 'waterfall' | 'tax_docs' | 'carried_interest' | 'side_pockets' | 'exchange' | 'contacts' | 'onboarding' | 'clients' | 'communications' | 'newsletters' | 'email' | 'community' | 'tasks' | 'analytics' | 'staff' | 'compliance' | 'users' | 'whitelabel' | 'ai_agents' | 'voice_setup' | 'voice_live' | 'voice_dialer' | 'voice_analytics' | 'blog' | 'testimonials' | 'faq' | 'forms' | 'scheduler' | 'subscribers' | 'account_settings';

interface NavItem {
  id: TabType;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface ManagerSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isTenantAdmin: boolean;
  userRole: string | null;
  primaryColor: string;
  tenantId?: string;
}

const STORAGE_KEY = 'clearnav-sidebar-collapsed';
const SECTIONS_KEY = 'clearnav-sidebar-sections';

export default function ManagerSidebar({ activeTab, onTabChange, isTenantAdmin, userRole, primaryColor, tenantId }: ManagerSidebarProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch { return false; }
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SECTIONS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(collapsedSections)); } catch {}
  }, [collapsedSections]);

  useEffect(() => {
    if (!tenantId) return;
    loadPendingCount();
    const subscription = subscribeToApprovals();
    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId]);

  const loadPendingCount = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .rpc('get_pending_approvals_count', { p_tenant_id: tenantId });
      if (!error && data) {
        setPendingApprovalsCount(data);
      }
    } catch (error) {
      console.error('Error loading pending approvals count:', error);
    }
  };

  const subscribeToApprovals = () => {
    return supabase
      .channel('sidebar_approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_agent_actions',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          loadPendingCount();
        }
      )
      .subscribe();
  };

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const navGroups: NavGroup[] = [
    {
      label: t('navGroups.portfolio'),
      items: [
        { id: 'dashboard', label: t('nav.dashboard'), icon: BarChart3 },
        { id: 'funds', label: t('nav.funds'), icon: Building2 },
        { id: 'classes', label: t('nav.classes'), icon: Layers },
        { id: 'accounts', label: t('nav.accounts'), icon: Wallet },
        { id: 'nav', label: t('nav.nav'), icon: TrendingUp },
        { id: 'transactions', label: t('nav.transactions'), icon: ArrowRightLeft },
      ],
    },
    {
      label: t('navGroups.operations'),
      items: [
        { id: 'capital_calls', label: t('nav.capitalCalls'), icon: Bell },
        { id: 'distributions', label: t('nav.distributions'), icon: DollarSign },
        { id: 'redemptions', label: t('nav.redemptions'), icon: ArrowUpCircle },
        { id: 'fees', label: t('nav.fees'), icon: Percent },
        { id: 'exchange', label: t('nav.exchange'), icon: ShoppingCart },
      ],
    },
    {
      label: t('navGroups.reporting'),
      items: [
        { id: 'statements', label: t('nav.statements'), icon: Receipt },
        { id: 'performance', label: t('nav.performance'), icon: PieChart },
        { id: 'reports', label: t('nav.reports'), icon: FolderOpen },
        { id: 'tax_docs', label: t('nav.taxDocs'), icon: FileCheck },
      ],
    },
    {
      label: t('navGroups.advanced'),
      items: [
        { id: 'waterfall', label: t('nav.waterfall'), icon: Calculator },
        { id: 'carried_interest', label: t('nav.carriedInterest'), icon: Coins },
        { id: 'side_pockets', label: t('nav.sidePockets'), icon: Package },
      ],
    },
    {
      label: t('navGroups.crm'),
      items: [
        { id: 'contacts', label: t('nav.contacts'), icon: Contact },
        { id: 'onboarding', label: t('nav.onboarding'), icon: UserCheck },
        { id: 'clients', label: t('nav.clients'), icon: Users },
      ],
    },
    {
      label: t('navGroups.communications'),
      items: [
        { id: 'email', label: t('nav.email'), icon: Inbox },
        { id: 'newsletters', label: t('nav.newsletters'), icon: Mail },
        { id: 'communications', label: t('nav.communications'), icon: MessageSquare },
        { id: 'community', label: t('nav.community'), icon: Globe },
      ],
    },
    {
      label: t('navGroups.agents'),
      items: [
        { id: 'ai_agents', label: t('nav.aiAgents'), icon: Bot },
        { id: 'voice_setup', label: t('nav.voiceSetup'), icon: Settings },
        { id: 'voice_live', label: t('nav.voiceLive'), icon: Phone },
        { id: 'voice_dialer', label: t('nav.voiceDialer'), icon: PhoneCall },
        { id: 'voice_analytics', label: t('nav.voiceAnalytics'), icon: BarChart2 },
      ],
    },
    {
      label: t('navGroups.website'),
      items: [
        ...(isTenantAdmin ? [
          { id: 'whitelabel' as TabType, label: t('nav.whitelabel'), icon: Globe },
        ] : []),
        { id: 'blog' as TabType, label: t('nav.blog'), icon: BookOpen },
        { id: 'testimonials' as TabType, label: t('nav.testimonials'), icon: Star },
        { id: 'faq' as TabType, label: t('nav.faq'), icon: HelpCircle },
        { id: 'forms' as TabType, label: t('nav.forms'), icon: FileText },
        { id: 'scheduler' as TabType, label: t('nav.scheduler'), icon: Calendar },
        { id: 'subscribers' as TabType, label: t('nav.subscribers'), icon: UserPlus },
      ],
    },
    {
      label: t('navGroups.admin'),
      items: [
        ...(isTenantAdmin || userRole === 'general_manager' ? [
          { id: 'users' as TabType, label: t('nav.users'), icon: UserCog },
        ] : []),
        ...(userRole === 'general_manager' || userRole === 'compliance_manager' || userRole === 'legal_counsel' ? [
          { id: 'compliance' as TabType, label: t('nav.compliance'), icon: Shield },
        ] : []),
        { id: 'tasks' as TabType, label: t('nav.tasks'), icon: CheckSquare },
        { id: 'analytics' as TabType, label: t('nav.analytics'), icon: Briefcase },
        { id: 'account_settings' as TabType, label: t('nav.accountSettings'), icon: CreditCard },
      ],
    },
  ].filter(g => g.items.length > 0);

  const activeGroupLabel = navGroups.find(g => g.items.some(i => i.id === activeTab))?.label;

  return (
    <aside
      className={`flex-shrink-0 bg-slate-950 border-r border-slate-800/70 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
        {navGroups.map((group) => {
          const isOpen = !collapsedSections[group.label];
          const hasActive = group.items.some(i => i.id === activeTab);

          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(group.label)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                    hasActive ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{group.label}</span>
                  {isOpen
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                  }
                </button>
              )}

              {(collapsed || isOpen) && (
                <div className={collapsed ? 'space-y-0.5 px-2' : 'space-y-0.5 px-2'}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        title={collapsed ? item.label : undefined}
                        className={`w-full flex items-center rounded-lg transition-all duration-150 group relative ${
                          collapsed ? 'justify-center p-2.5' : 'px-3 py-2 gap-3'
                        } ${
                          isActive
                            ? 'text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                        style={isActive ? {
                          backgroundColor: primaryColor,
                          boxShadow: `0 4px 12px ${primaryColor}30`,
                        } : undefined}
                      >
                        <Icon className={`flex-shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                        {!collapsed && (
                          <span className="text-sm font-medium truncate">{item.label}</span>
                        )}
                        {item.id === 'ai_agents' && pendingApprovalsCount > 0 && (
                          <span className="ml-auto flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px]">
                            {pendingApprovalsCount}
                          </span>
                        )}
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                            {item.label}
                            {item.id === 'ai_agents' && pendingApprovalsCount > 0 && (
                              <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-xs font-bold">
                                {pendingApprovalsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {!collapsed && isOpen && <div className="h-2" />}
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-800/70 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/60 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeft className="w-5 h-5" />
            : <PanelLeftClose className="w-5 h-5" />
          }
        </button>
      </div>
    </aside>
  );
}
