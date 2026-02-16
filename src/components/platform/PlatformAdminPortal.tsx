import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  Percent,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import TenantManagement from './TenantManagement';
import BillingOverview from './BillingOverview';
import PlatformAnalytics from './PlatformAnalytics';
import PlatformSettings from './PlatformSettings';
import DiscountManagement from './DiscountManagement';
import UserManagement from './UserManagement';
import SupportTools from './SupportTools';

type Tab = 'tenants' | 'users' | 'discounts' | 'billing' | 'analytics' | 'support' | 'settings';

export default function PlatformAdminPortal() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tenants');

  const tabs = [
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'support', label: 'Support', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Platform Admin</h1>
                <p className="text-sm text-slate-600">Multi-Tenant Management</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
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
          {activeTab === 'settings' && <PlatformSettings />}
        </div>
      </div>
    </div>
  );
}
