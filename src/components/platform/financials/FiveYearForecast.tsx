import React, { useState } from 'react';
import { TrendingUp, Star, AlertCircle } from 'lucide-react';

const PRICING = {
  starter: 299,
  professional: 599,
  enterprise: 1299,
};

const MONTHLY_OPEX = 12897;

interface ScenarioParams {
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  newTenantsPerYear: number[];
  tierSplit: { starter: number; professional: number; enterprise: number };
  churnRate: number[];
}

const SCENARIOS: ScenarioParams[] = [
  {
    label: 'Conservative',
    color: '#64748b',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-800/40',
    borderColor: 'border-slate-600/50',
    newTenantsPerYear: [4, 8, 14, 20, 28],
    tierSplit: { starter: 0.7, professional: 0.25, enterprise: 0.05 },
    churnRate: [0.08, 0.07, 0.06, 0.06, 0.05],
  },
  {
    label: 'Base Case',
    color: '#3b82f6',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-700/50',
    newTenantsPerYear: [8, 18, 30, 48, 70],
    tierSplit: { starter: 0.6, professional: 0.3, enterprise: 0.1 },
    churnRate: [0.07, 0.06, 0.05, 0.05, 0.04],
  },
  {
    label: 'Optimistic',
    color: '#10b981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-950/20',
    borderColor: 'border-emerald-700/50',
    newTenantsPerYear: [14, 32, 60, 100, 150],
    tierSplit: { starter: 0.5, professional: 0.35, enterprise: 0.15 },
    churnRate: [0.06, 0.05, 0.04, 0.04, 0.03],
  },
];

interface YearData {
  year: number;
  newTenants: number;
  totalTenants: number;
  blendedARPU: number;
  mrr: number;
  arr: number;
  churnRate: number;
  netRevenue: number;
  breakEvenMonth: number | null;
}

function buildForecast(scenario: ScenarioParams): YearData[] {
  const { starter, professional, enterprise } = PRICING;
  const { tierSplit } = scenario;
  const blendedARPU =
    starter * tierSplit.starter +
    professional * tierSplit.professional +
    enterprise * tierSplit.enterprise;

  const rows: YearData[] = [];
  let totalTenants = 0;

  for (let y = 0; y < 5; y++) {
    const newT = scenario.newTenantsPerYear[y];
    const churn = scenario.churnRate[y];
    totalTenants = Math.round(totalTenants * (1 - churn) + newT);
    const mrr = totalTenants * blendedARPU;
    const arr = mrr * 12;
    const netRevenue = arr;

    let breakEvenMonth: number | null = null;
    if (y === 0) {
      for (let m = 1; m <= 12; m++) {
        const tenantsAtMonth = Math.round((newT / 12) * m);
        if (tenantsAtMonth * blendedARPU >= MONTHLY_OPEX) {
          breakEvenMonth = m;
          break;
        }
      }
    }

    rows.push({
      year: y + 1,
      newTenants: newT,
      totalTenants,
      blendedARPU: Math.round(blendedARPU),
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      churnRate: churn,
      netRevenue: Math.round(netRevenue),
      breakEvenMonth,
    });
  }
  return rows;
}

function ARRChart({ forecasts }: { forecasts: { scenario: ScenarioParams; data: YearData[] }[] }) {
  const maxArr = Math.max(...forecasts.flatMap((f) => f.data.map((d) => d.arr)));
  const years = [1, 2, 3, 4, 5];
  const W = 540;
  const H = 180;
  const padL = 60;
  const padB = 30;
  const chartW = W - padL;
  const chartH = H - padB;

  function xPos(year: number) {
    return padL + ((year - 1) / 4) * chartW;
  }
  function yPos(val: number) {
    return chartH - (val / (maxArr * 1.1)) * chartH;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxArr * 1.1 * p));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W}
              y1={yPos(v)}
              y2={yPos(v)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text x={padL - 6} y={yPos(v) + 4} textAnchor="end" fill="#475569" fontSize={9}>
              {v >= 1000000
                ? `$${(v / 1000000).toFixed(1)}M`
                : v >= 1000
                ? `$${(v / 1000).toFixed(0)}k`
                : `$${v}`}
            </text>
          </g>
        ))}

        {years.map((y) => (
          <text key={y} x={xPos(y)} y={H - 6} textAnchor="middle" fill="#475569" fontSize={10}>
            Y{y}
          </text>
        ))}

        {forecasts.map(({ scenario, data }) => {
          const points = data.map((d) => `${xPos(d.year)},${yPos(d.arr)}`).join(' ');
          return (
            <g key={scenario.label}>
              <polyline
                points={points}
                fill="none"
                stroke={scenario.color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {data.map((d) => (
                <circle
                  key={d.year}
                  cx={xPos(d.year)}
                  cy={yPos(d.arr)}
                  r={3.5}
                  fill={scenario.color}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-6 justify-center mt-2">
        {forecasts.map(({ scenario }) => (
          <div key={scenario.label} className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ backgroundColor: scenario.color }} />
            <span className="text-xs text-slate-400">{scenario.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierStackedBar({ forecasts }: { forecasts: { scenario: ScenarioParams; data: YearData[] }[] }) {
  const base = forecasts.find((f) => f.scenario.label === 'Base Case')!;
  const maxArr = Math.max(...base.data.map((d) => d.arr));
  const barW = 40;
  const gap = 20;
  const H = 150;
  const W = 5 * (barW + gap) + 20;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" style={{ height: 190 }}>
        {base.data.map((d, i) => {
          const x = 10 + i * (barW + gap);
          const totalH = (d.arr / (maxArr * 1.1)) * H;
          const s = d.totalTenants * base.scenario.tierSplit.starter * PRICING.starter * 12;
          const p = d.totalTenants * base.scenario.tierSplit.professional * PRICING.professional * 12;
          const e = d.totalTenants * base.scenario.tierSplit.enterprise * PRICING.enterprise * 12;
          const total = s + p + e;
          const sH = total > 0 ? (s / total) * totalH : 0;
          const pH = total > 0 ? (p / total) * totalH : 0;
          const eH = total > 0 ? (e / total) * totalH : 0;
          const base_y = H;
          return (
            <g key={d.year}>
              <rect x={x} y={base_y - sH} width={barW} height={sH} fill="#64748b" rx={0} />
              <rect x={x} y={base_y - sH - pH} width={barW} height={pH} fill="#3b82f6" />
              <rect x={x} y={base_y - sH - pH - eH} width={barW} height={eH} fill="#10b981" />
              <text x={x + barW / 2} y={H + 20} textAnchor="middle" fill="#64748b" fontSize={10}>
                Y{d.year}
              </text>
              <text x={x + barW / 2} y={base_y - totalH - 5} textAnchor="middle" fill="#94a3b8" fontSize={9}>
                {d.arr >= 1000000
                  ? `$${(d.arr / 1000000).toFixed(1)}M`
                  : `$${(d.arr / 1000).toFixed(0)}k`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 justify-center mt-1">
        {[
          { color: 'bg-slate-500', label: 'Starter' },
          { color: 'bg-blue-500', label: 'Professional' },
          { color: 'bg-emerald-500', label: 'Enterprise' },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${t.color}`} />
            <span className="text-xs text-slate-400">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

export default function FiveYearForecast() {
  const [activeScenario, setActiveScenario] = useState('Base Case');

  const forecasts = SCENARIOS.map((s) => ({ scenario: s, data: buildForecast(s) }));
  const active = forecasts.find((f) => f.scenario.label === activeScenario)!;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">5-Year Revenue Forecast</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Based on real pricing tiers · Bootstrapped growth model · US market
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { tier: 'Starter', price: PRICING.starter, desc: 'Small hedge funds' },
          { tier: 'Professional', price: PRICING.professional, desc: 'Mid-size funds' },
          { tier: 'Enterprise', price: PRICING.enterprise, desc: 'Large institutions' },
        ].map((t) => (
          <div key={t.tier} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-0.5">{t.tier}</div>
            <div className="text-xl font-bold text-slate-100">${t.price.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span></div>
            <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {SCENARIOS.map((s) => (
          <button
            key={s.label}
            onClick={() => setActiveScenario(s.label)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              activeScenario === s.label
                ? `${s.bgColor} ${s.borderColor} ${s.textColor}`
                : 'bg-slate-800/30 border-slate-700/40 text-slate-500 hover:text-slate-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700/60 mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700/60">
              {['Year', 'New Tenants', 'Total Tenants', 'Blended ARPU', 'MRR', 'ARR', 'Churn', 'Net Revenue'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {active.data.map((d, i) => (
              <tr
                key={d.year}
                className={`transition-colors hover:bg-slate-800/40 ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Year {d.year}</span>
                    {d.breakEvenMonth && (
                      <span className="px-2 py-0.5 bg-emerald-900/50 border border-emerald-700/50 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" />
                        Break-even Mo.{d.breakEvenMonth}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-300">+{d.newTenants}</td>
                <td className="px-4 py-3.5 font-mono text-slate-300">{d.totalTenants}</td>
                <td className="px-4 py-3.5 font-mono text-slate-300">${d.blendedARPU.toLocaleString()}</td>
                <td className="px-4 py-3.5 font-mono font-semibold text-blue-400">{fmt(d.mrr)}</td>
                <td className="px-4 py-3.5 font-mono font-bold text-slate-100">{fmt(d.arr)}</td>
                <td className="px-4 py-3.5 font-mono text-slate-400">{(d.churnRate * 100).toFixed(0)}%</td>
                <td className="px-4 py-3.5 font-mono font-semibold text-emerald-400">{fmt(d.netRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
          <h4 className="font-medium text-slate-200 mb-4">ARR Growth — All Scenarios</h4>
          <ARRChart forecasts={forecasts} />
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
          <h4 className="font-medium text-slate-200 mb-1">Revenue by Tier (Base Case)</h4>
          <p className="text-xs text-slate-500 mb-4">60% Starter / 30% Professional / 10% Enterprise</p>
          <TierStackedBar forecasts={forecasts} />
        </div>
      </div>

      <div className="mt-4 bg-slate-800/30 border border-slate-700/40 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Projections assume organic growth, no paid acquisition beyond Year 1 marketing budget, and retention improving annually as product matures. Monthly operating costs fixed at ${MONTHLY_OPEX.toLocaleString()} (from Year 1 cost model). Actual results will vary.
        </p>
      </div>
    </div>
  );
}
