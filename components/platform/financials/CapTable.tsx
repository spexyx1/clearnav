import React, { useState } from 'react';
import { Users, Info } from 'lucide-react';

interface Stakeholder {
  name: string;
  role: string;
  shareClass: string;
  shares: number;
  vestingSchedule: string;
  vestingCliff: string;
  status: 'active' | 'advisor' | 'pool';
  color: string;
}

const TOTAL_SHARES = 10_000_000;

const stakeholders: Stakeholder[] = [
  {
    name: 'Founder / CEO',
    role: 'Chief Executive Officer',
    shareClass: 'Common Stock',
    shares: 3_750_000,
    vestingSchedule: '4-year vest',
    vestingCliff: '1-year cliff',
    status: 'active',
    color: '#1d4ed8',
  },
  {
    name: 'Co-Founder / CTO',
    role: 'Chief Technology Officer',
    shareClass: 'Common Stock',
    shares: 3_250_000,
    vestingSchedule: '4-year vest',
    vestingCliff: '1-year cliff',
    status: 'active',
    color: '#0369a1',
  },
  {
    name: 'Head of Operations',
    role: 'Early Employee #1',
    shareClass: 'Common Stock',
    shares: 500_000,
    vestingSchedule: '2-year vest',
    vestingCliff: 'No cliff',
    status: 'active',
    color: '#0891b2',
  },
  {
    name: 'Strategic Advisor',
    role: 'Industry Advisor',
    shareClass: 'Stock Options',
    shares: 250_000,
    vestingSchedule: '2-year vest',
    vestingCliff: 'No cliff',
    status: 'advisor',
    color: '#0d9488',
  },
  {
    name: 'ESOP Pool',
    role: 'Employee Stock Option Pool',
    shareClass: 'Options Reserved',
    shares: 1_500_000,
    vestingSchedule: 'Per grant',
    vestingCliff: 'Per grant',
    status: 'pool',
    color: '#475569',
  },
  {
    name: 'Unallocated',
    role: 'Available for future grants',
    shareClass: '—',
    shares: 750_000,
    vestingSchedule: '—',
    vestingCliff: '—',
    status: 'pool',
    color: '#94a3b8',
  },
];

function DonutChart() {
  const cx = 120;
  const cy = 120;
  const r = 90;
  const innerR = 55;
  const circumference = 2 * Math.PI * r;

  let cumulativePercent = 0;
  const arcs = stakeholders.map((s) => {
    const percent = s.shares / TOTAL_SHARES;
    const start = cumulativePercent;
    cumulativePercent += percent;
    return { ...s, percent, start };
  });

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(startPercent: number, endPercent: number, outerR: number, innerR: number) {
    const startAngle = startPercent * 360;
    const endAngle = endPercent * 360;
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const s = polarToCartesian(cx, cy, outerR, startAngle);
    const e = polarToCartesian(cx, cy, outerR, endAngle);
    const is = polarToCartesian(cx, cy, innerR, endAngle);
    const ie = polarToCartesian(cx, cy, innerR, startAngle);
    return `M ${s.x} ${s.y} A ${outerR} ${outerR} 0 ${large} 1 ${e.x} ${e.y} L ${is.x} ${is.y} A ${innerR} ${innerR} 0 ${large} 0 ${ie.x} ${ie.y} Z`;
  }

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center">
      <svg width={240} height={240} viewBox="0 0 240 240">
        {arcs.map((arc) => (
          <path
            key={arc.name}
            d={arcPath(arc.start, arc.start + arc.percent, r, innerR)}
            fill={arc.color}
            opacity={hovered && hovered !== arc.name ? 0.5 : 1}
            stroke="#1e293b"
            strokeWidth={1}
            onMouseEnter={() => setHovered(arc.name)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer transition-opacity duration-150"
          />
        ))}
        <circle cx={cx} cy={cy} r={innerR - 2} fill="#0f172a" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#94a3b8" fontSize={11}>
          Total Shares
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#f1f5f9" fontSize={13} fontWeight="bold">
          10M
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="#64748b" fontSize={10}>
          Fully Diluted
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
        {stakeholders.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-slate-400 truncate">{s.name}</span>
            <span className="text-xs text-slate-500 ml-auto">
              {((s.shares / TOTAL_SHARES) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50',
  advisor: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/50',
  pool: 'bg-slate-700/60 text-slate-400 border border-slate-600/50',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  advisor: 'Advisor',
  pool: 'Reserved',
};

export default function CapTable() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">Capitalization Table</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Delaware C-Corp · Bootstrapped · Founded in the United States
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <DonutChart />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-100">10M</div>
              <div className="text-xs text-slate-400 mt-1">Total Authorized Shares</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-100">7.75M</div>
              <div className="text-xs text-slate-400 mt-1">Issued / Reserved</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-100">$0.0001</div>
              <div className="text-xs text-slate-400 mt-1">Par Value per Share</div>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300 leading-relaxed">
              All common stock is subject to standard vesting schedules. The ESOP pool is reserved
              for future employees and advisors. No external investors. Bootstrapped.
              Jurisdiction: Delaware, USA.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Stakeholder
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Share Class
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Shares
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ownership
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Vesting
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cliff
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {stakeholders.map((s, i) => (
              <tr
                key={s.name}
                className={`transition-colors hover:bg-slate-800/40 ${
                  i % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                }`}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div>
                      <div className="font-medium text-slate-200">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-slate-300">{s.shareClass}</td>
                <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                  {s.shares.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-200">
                  {((s.shares / TOTAL_SHARES) * 100).toFixed(2)}%
                </td>
                <td className="px-4 py-3.5 text-slate-400 text-xs">{s.vestingSchedule}</td>
                <td className="px-4 py-3.5 text-slate-400 text-xs">{s.vestingCliff}</td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[s.status]}`}>
                    {statusLabels[s.status]}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-800/80 border-t-2 border-slate-600">
              <td className="px-4 py-3.5 font-bold text-slate-200 col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 flex-shrink-0" />
                  Fully Diluted Total
                </div>
              </td>
              <td className="px-4 py-3.5" />
              <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-200">
                {TOTAL_SHARES.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-100">100.00%</td>
              <td className="px-4 py-3.5" />
              <td className="px-4 py-3.5" />
              <td className="px-4 py-3.5" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
