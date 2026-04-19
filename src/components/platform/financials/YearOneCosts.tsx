import React, { useState } from 'react';
import { DollarSign, Zap, Info } from 'lucide-react';

interface CostItem {
  label: string;
  monthly: number;
  oneTime: number;
  category: string;
  note?: string;
}

interface CostCategory {
  id: string;
  name: string;
  color: string;
  barColor: string;
  items: CostItem[];
}

const CATEGORIES: CostCategory[] = [
  {
    id: 'legal',
    name: 'Legal & Incorporation',
    color: 'text-amber-400',
    barColor: '#f59e0b',
    items: [
      { label: 'Delaware C-Corp formation', monthly: 0, oneTime: 500, category: 'legal' },
      { label: 'Operating & shareholder agreements', monthly: 0, oneTime: 1500, category: 'legal' },
      { label: 'Privacy policy & terms drafting', monthly: 0, oneTime: 1200, category: 'legal' },
      { label: 'FINRA / RIA compliance review', monthly: 0, oneTime: 3500, category: 'legal' },
      { label: 'Registered agent (annual)', monthly: 17, oneTime: 0, category: 'legal', note: '$200/yr' },
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    color: 'text-blue-400',
    barColor: '#3b82f6',
    items: [
      { label: 'Supabase Pro', monthly: 25, oneTime: 0, category: 'infrastructure' },
      { label: 'Vercel Pro (hosting / CDN)', monthly: 20, oneTime: 0, category: 'infrastructure' },
      { label: 'Domain & SSL', monthly: 5, oneTime: 15, category: 'infrastructure' },
      { label: 'Backups & monitoring (Sentry + Datadog)', monthly: 40, oneTime: 0, category: 'infrastructure' },
      { label: 'Email provider (Resend)', monthly: 20, oneTime: 0, category: 'infrastructure' },
    ],
  },
  {
    id: 'labor',
    name: 'Engineering & Labor',
    color: 'text-emerald-400',
    barColor: '#10b981',
    items: [
      { label: 'Founder 1 draw (CEO)', monthly: 5000, oneTime: 0, category: 'labor' },
      { label: 'Founder 2 draw (CTO)', monthly: 5000, oneTime: 0, category: 'labor' },
      { label: 'Ops hire (part-time contractor)', monthly: 2000, oneTime: 0, category: 'labor' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales & Marketing',
    color: 'text-rose-400',
    barColor: '#f43f5e',
    items: [
      { label: 'Branding & logo design', monthly: 0, oneTime: 1500, category: 'sales' },
      { label: 'Paid ads (LinkedIn / Google)', monthly: 500, oneTime: 0, category: 'sales' },
      { label: 'Conference & event attendance', monthly: 0, oneTime: 2000, category: 'sales' },
      { label: 'CRM (HubSpot Starter)', monthly: 50, oneTime: 0, category: 'sales' },
    ],
  },
  {
    id: 'tools',
    name: 'Tooling & Operations',
    color: 'text-cyan-400',
    barColor: '#06b6d4',
    items: [
      { label: 'Stripe (processing fees ~2.9% + 30¢)', monthly: 0, oneTime: 0, category: 'tools', note: 'Variable' },
      { label: 'Accounting software (QuickBooks)', monthly: 30, oneTime: 0, category: 'tools' },
      { label: 'Password manager & security (1Password)', monthly: 10, oneTime: 0, category: 'tools' },
      { label: 'Productivity suite (Notion + Slack)', monthly: 25, oneTime: 0, category: 'tools' },
      { label: 'AI tooling (OpenAI / Anthropic API)', monthly: 150, oneTime: 0, category: 'tools' },
    ],
  },
];

function getMonthData(startingCapital: number) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const isMonth1 = i === 0;
    let fixed = 0;
    let oneTime = 0;
    CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        fixed += item.monthly;
        if (isMonth1) oneTime += item.oneTime;
      });
    });
    return {
      month: i + 1,
      label: new Date(2026, i).toLocaleString('default', { month: 'short' }),
      fixed,
      oneTime,
      total: fixed + oneTime,
    };
  });

  let cumSpend = 0;
  return months.map((m) => {
    cumSpend += m.total;
    return { ...m, cumSpend, remaining: startingCapital - cumSpend };
  });
}

function BarChart({ data, startingCapital }: { data: ReturnType<typeof getMonthData>; startingCapital: number }) {
  const maxVal = Math.max(...data.map((d) => d.total));
  const barWidth = 100 / 12;

  return (
    <div className="relative">
      <svg viewBox="0 0 600 200" className="w-full" style={{ height: 180 }}>
        {[0, 5000, 10000, 15000].map((tick) => (
          <g key={tick}>
            <line
              x1={40}
              x2={590}
              y1={180 - (tick / (maxVal * 1.15)) * 160}
              y2={180 - (tick / (maxVal * 1.15)) * 160}
              stroke="#334155"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
            <text
              x={36}
              y={185 - (tick / (maxVal * 1.15)) * 160}
              textAnchor="end"
              fill="#64748b"
              fontSize={9}
            >
              ${(tick / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = 44 + i * ((590 - 44) / 12);
          const totalH = (d.total / (maxVal * 1.15)) * 160;
          const fixedH = (d.fixed / (maxVal * 1.15)) * 160;
          const oneTimeH = totalH - fixedH;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={180 - fixedH}
                width={(590 - 44) / 12 - 4}
                height={fixedH}
                fill="#10b981"
                rx={2}
                opacity={0.85}
              />
              {oneTimeH > 0 && (
                <rect
                  x={x}
                  y={180 - totalH}
                  width={(590 - 44) / 12 - 4}
                  height={oneTimeH}
                  fill="#f59e0b"
                  rx={2}
                  opacity={0.85}
                />
              )}
              <text
                x={x + (590 - 44) / 24 - 2}
                y={194}
                textAnchor="middle"
                fill="#64748b"
                fontSize={9}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-1 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-400">Recurring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span className="text-xs text-slate-400">One-time</span>
        </div>
      </div>
    </div>
  );
}

export default function YearOneCosts() {
  const [startingCapital, setStartingCapital] = useState(150000);
  const [expanded, setExpanded] = useState<string | null>('labor');
  const monthData = getMonthData(startingCapital);

  const totalOneTime = CATEGORIES.flatMap((c) => c.items).reduce((s, i) => s + i.oneTime, 0);
  const totalMonthly = CATEGORIES.flatMap((c) => c.items).reduce((s, i) => s + i.monthly, 0);
  const totalYear1 = totalOneTime + totalMonthly * 12;
  const breakEvenMonth = monthData.find((m) => m.remaining <= 0);
  const runwayMonths = breakEvenMonth ? breakEvenMonth.month - 1 : 12;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-slate-100">Year 1 Setup & Operating Costs</h3>
        </div>
        <p className="text-slate-400 text-sm">Bootstrapped US startup — no VC funding assumed</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100">${totalMonthly.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Monthly Burn</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-400">${totalOneTime.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">One-time Setup</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-100">${totalYear1.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Total Year 1 Cost</div>
        </div>
        <div className={`border rounded-lg p-4 ${runwayMonths >= 12 ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-rose-900/30 border-rose-700/50'}`}>
          <div className={`text-2xl font-bold ${runwayMonths >= 12 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {runwayMonths >= 12 ? '12+ mo' : `${runwayMonths} mo`}
          </div>
          <div className="text-xs text-slate-400 mt-1">Runway</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-200">Monthly Cash Outflow</h4>
          </div>
          <BarChart data={monthData} startingCapital={startingCapital} />
        </div>

        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-200">Starting Capital</h4>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={startingCapital}
              onChange={(e) => setStartingCapital(Number(e.target.value))}
              className="flex-1 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              step={10000}
              min={0}
            />
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {monthData.map((m) => {
              const pct = Math.max(0, Math.min(100, (m.remaining / startingCapital) * 100));
              return (
                <div key={m.month} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-8">{m.label}</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#f43f5e',
                      }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-20 text-right ${m.remaining < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    ${m.remaining.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Revenue from early tenants is not included here. First paying customer extends runway significantly.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const catMonthly = cat.items.reduce((s, i) => s + i.monthly, 0);
          const catOneTime = cat.items.reduce((s, i) => s + i.oneTime, 0);
          const isOpen = expanded === cat.id;
          return (
            <div key={cat.id} className="border border-slate-700/50 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800/80 transition-colors"
                onClick={() => setExpanded(isOpen ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  <Zap className={`w-4 h-4 ${cat.color}`} />
                  <span className="font-medium text-slate-200">{cat.name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-slate-400">
                    <span className={cat.color}>${catMonthly.toLocaleString()}/mo</span>
                    {catOneTime > 0 && (
                      <span className="text-amber-400 ml-3">+${catOneTime.toLocaleString()} setup</span>
                    )}
                  </span>
                  <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="bg-slate-900/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Item</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Monthly</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">One-time</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Year 1</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {cat.items.map((item) => (
                        <tr key={item.label} className="hover:bg-slate-800/20">
                          <td className="px-4 py-2.5 text-slate-300">
                            {item.label}
                            {item.note && <span className="text-slate-500 text-xs ml-2">({item.note})</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                            {item.monthly > 0 ? `$${item.monthly.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-amber-400/80">
                            {item.oneTime > 0 ? `$${item.oneTime.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                            ${(item.monthly * 12 + item.oneTime).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
