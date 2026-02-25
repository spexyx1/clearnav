import { useState, useEffect } from 'react';
import {
  BarChart3, Building2, Layers, Wallet, TrendingUp, ArrowRightLeft,
  Bell, DollarSign, ArrowUpCircle, Percent, Receipt, PieChart,
  FolderOpen, Calculator, Coins, Package, FileCheck, ShoppingCart,
  Contact, UserCheck, Users, MessageSquare, Mail, Inbox, Globe,
  CheckSquare, Briefcase, Shield, UserCog, Settings, ChevronDown,
  ChevronRight, PanelLeftClose, PanelLeft, LucideIcon
} from 'lucide-react';

export type TabType = 'dashboard' | 'funds' | 'classes' | 'accounts' | 'nav' | 'transactions' | 'capital_calls' | 'distributions' | 'redemptions' | 'fees' | 'statements' | 'performance' | 'reports' | 'waterfall' | 'tax_docs' | 'carried_interest' | 'side_pockets' | 'exchange' | 'contacts' | 'onboarding' | 'clients' | 'communications' | 'newsletters' | 'email' | 'community' | 'tasks' | 'analytics' | 'staff' | 'compliance' | 'users' | 'whitelabel';

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
}

const STORAGE_KEY = 'clearnav-sidebar-collapsed';
const SECTIONS_KEY = 'clearnav-sidebar-sections';

export default function ManagerSidebar({ activeTab, onTabChange, isTenantAdmin, userRole, primaryColor }: ManagerSidebarProps) {
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

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(collapsedSections)); } catch {}
  }, [collapsedSections]);

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const navGroups: NavGroup[] = [
    {
      label: 'Portfolio',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'funds', label: 'Funds', icon: Building2 },
        { id: 'classes', label: 'Share Classes', icon: Layers },
        { id: 'accounts', label: 'Capital Accounts', icon: Wallet },
        { id: 'nav', label: 'NAV', icon: TrendingUp },
        { id: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'capital_calls', label: 'Capital Calls', icon: Bell },
        { id: 'distributions', label: 'Distributions', icon: DollarSign },
        { id: 'redemptions', label: 'Redemptions', icon: ArrowUpCircle },
        { id: 'fees', label: 'Fees', icon: Percent },
        { id: 'exchange', label: 'Exchange', icon: ShoppingCart },
      ],
    },
    {
      label: 'Reporting',
      items: [
        { id: 'statements', label: 'Statements', icon: Receipt },
        { id: 'performance', label: 'Performance', icon: PieChart },
        { id: 'reports', label: 'Reports', icon: FolderOpen },
        { id: 'tax_docs', label: 'Tax Docs', icon: FileCheck },
      ],
    },
    {
      label: 'Advanced',
      items: [
        { id: 'waterfall', label: 'Waterfall', icon: Calculator },
        { id: 'carried_interest', label: 'Carried Interest', icon: Coins },
        { id: 'side_pockets', label: 'Side Pockets', icon: Package },
      ],
    },
    {
      label: 'CRM',
      items: [
        { id: 'contacts', label: 'Contacts', icon: Contact },
        { id: 'onboarding', label: 'Onboarding', icon: UserCheck },
        { id: 'clients', label: 'Clients', icon: Users },
      ],
    },
    {
      label: 'Communications',
      items: [
        { id: 'email', label: 'Email', icon: Inbox },
        { id: 'newsletters', label: 'Newsletters', icon: Mail },
        { id: 'communications', label: 'Messaging', icon: MessageSquare },
        { id: 'community', label: 'Community', icon: Globe },
      ],
    },
    {
      label: 'Admin',
      items: [
        ...(isTenantAdmin || userRole === 'general_manager' ? [
          { id: 'staff' as TabType, label: 'Team', icon: Settings },
          { id: 'users' as TabType, label: 'Users', icon: UserCog },
        ] : []),
        ...(isTenantAdmin ? [
          { id: 'whitelabel' as TabType, label: 'White Label', icon: Globe },
        ] : []),
        ...(userRole === 'general_manager' || userRole === 'compliance_manager' || userRole === 'legal_counsel' ? [
          { id: 'compliance' as TabType, label: 'Compliance', icon: Shield },
        ] : []),
        { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare },
        { id: 'analytics' as TabType, label: 'Analytics', icon: Briefcase },
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
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                            {item.label}
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
