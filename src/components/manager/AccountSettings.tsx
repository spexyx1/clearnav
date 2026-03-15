import React, { useState } from 'react';
import { CreditCard, Receipt, TrendingUp, Headphones } from 'lucide-react';
import BillingDetails from './account/BillingDetails';
import UsageOverview from './account/UsageOverview';
import SupportTickets from './account/SupportTickets';
import InvoiceHistory from './account/InvoiceHistory';

type TabType = 'billing' | 'usage' | 'invoices' | 'support';

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('billing');

  const tabs = [
    { id: 'billing' as TabType, label: 'Subscription & Billing', icon: CreditCard },
    { id: 'usage' as TabType, label: 'Usage', icon: TrendingUp },
    { id: 'invoices' as TabType, label: 'Invoices', icon: Receipt },
    { id: 'support' as TabType, label: 'Support', icon: Headphones },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-slate-400 mt-1">Manage your ClearNav subscription and support</p>
      </div>

      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'billing' && <BillingDetails />}
        {activeTab === 'usage' && <UsageOverview />}
        {activeTab === 'invoices' && <InvoiceHistory />}
        {activeTab === 'support' && <SupportTickets />}
      </div>
    </div>
  );
}
