import React, { useState } from 'react';
import { CreditCard, Receipt, TrendingUp, Headphones, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BillingDetails from './account/BillingDetails';
import UsageOverview from './account/UsageOverview';
import SupportTickets from './account/SupportTickets';
import InvoiceHistory from './account/InvoiceHistory';
import LanguageSelector from '../shared/LanguageSelector';

type TabType = 'billing' | 'usage' | 'invoices' | 'support' | 'preferences';

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const { t } = useTranslation();

  const tabs = [
    { id: 'billing' as TabType, label: t('settings.billing'), icon: CreditCard },
    { id: 'usage' as TabType, label: t('settings.usage'), icon: TrendingUp },
    { id: 'invoices' as TabType, label: t('settings.invoices'), icon: Receipt },
    { id: 'support' as TabType, label: t('settings.support'), icon: Headphones },
    { id: 'preferences' as TabType, label: t('settings.preferences'), icon: Globe },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('nav.accountSettings')}</h1>
        <p className="text-slate-400 mt-1">Manage your account preferences and subscription</p>
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
        {activeTab === 'preferences' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">{t('settings.languagePreferences')}</h2>
              <p className="text-slate-400 text-sm">{t('settings.chooseLanguage')}</p>
            </div>
            <LanguageSelector />
          </div>
        )}
      </div>
    </div>
  );
}
