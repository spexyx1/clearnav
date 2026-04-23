import React, { useState } from 'react';
import { ArrowLeft, Table2, DollarSign, TrendingUp, LineChart, Lock } from 'lucide-react';
import CapTable from './platform/financials/CapTable';
import YearOneCosts from './platform/financials/YearOneCosts';
import FiveYearForecast from './platform/financials/FiveYearForecast';

type Tab = 'captable' | 'year1' | 'forecast';

const TABS: { id: Tab; label: string; icon: React.ElementType; description: string }[] = [
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

interface InvestorPageProps {
  onBack: () => void;
}

export default function InvestorPage({ onBack }: InvestorPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('forecast');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-5 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-slate-100">ClearNAV — Investor Overview</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            Confidential
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-950/50 border border-blue-800/50 rounded-full text-xs text-blue-400 mb-5">
            <Lock className="w-3 h-3" />
            Confidential — For Prospective Investors Only
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-3">
            Company Financials & Projections
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            ClearNAV is a bootstrapped, Delaware-incorporated SaaS platform serving hedge fund managers
            with white-label investor portals, NAV automation, and compliance tooling.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Entity', value: 'Delaware C-Corp' },
              { label: 'Model', value: 'Bootstrapped SaaS' },
              { label: 'Market', value: 'Hedge Funds / RIAs' },
              { label: 'Revenue Model', value: 'Monthly Subscription' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-3"
              >
                <div className="text-xs text-slate-500 mb-0.5">{item.label}</div>
                <div className="font-semibold text-slate-200 text-sm">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="border-b border-slate-800 px-6 pt-5 pb-0 bg-slate-900/80">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                      isActive
                        ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-600 px-6 py-2 border-b border-slate-800 bg-slate-900/40">
            {TABS.find((t) => t.id === activeTab)?.description}
          </div>

          {activeTab === 'captable' && <CapTable />}
          {activeTab === 'year1' && <YearOneCosts />}
          {activeTab === 'forecast' && <FiveYearForecast />}
        </div>

        <div className="mt-6 text-center text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
          This document contains forward-looking statements and financial projections that are subject to
          risks and uncertainties. Projections are not guarantees of future results. This material is
          confidential and intended solely for prospective investors.
        </div>
      </div>
    </div>
  );
}
