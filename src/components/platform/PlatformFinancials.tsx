import React, { useState } from 'react';
import { Table2, DollarSign, TrendingUp, Printer } from 'lucide-react';
import CapTable from './financials/CapTable';
import YearOneCosts from './financials/YearOneCosts';
import FiveYearForecast from './financials/FiveYearForecast';

type FinancialTab = 'captable' | 'year1' | 'forecast';

const TABS: { id: FinancialTab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'captable',
    label: 'Cap Table',
    icon: Table2,
    description: 'Ownership, vesting & equity structure',
  },
  {
    id: 'year1',
    label: 'Year 1 Costs',
    icon: DollarSign,
    description: 'Setup costs, burn rate & runway',
  },
  {
    id: 'forecast',
    label: '5-Year Forecast',
    icon: TrendingUp,
    description: 'Revenue scenarios & ARR projections',
  },
];

export default function PlatformFinancials() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('captable');

  return (
    <div className="bg-slate-900 min-h-[600px] rounded-lg">
      <div className="border-b border-slate-700/60 px-6 pt-6 pb-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Company Financials</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Internal founder document · Bootstrapped · Delaware C-Corp · United States
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Export / Print
          </button>
        </div>

        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-slate-500 px-6 py-2 border-b border-slate-800 bg-slate-900/60">
        {TABS.find((t) => t.id === activeTab)?.description}
      </div>

      {activeTab === 'captable' && <CapTable />}
      {activeTab === 'year1' && <YearOneCosts />}
      {activeTab === 'forecast' && <FiveYearForecast />}
    </div>
  );
}
