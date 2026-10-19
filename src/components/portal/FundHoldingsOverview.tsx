import type { ReactNode } from 'react';
import { DollarSign, TrendingDown, TrendingUp, Calendar, type LucideIcon } from 'lucide-react';

export interface FundAccount {
  id: string;
  shares_owned: number | string;
  cost_basis: number | string | null;
  metadata: { class_name?: string; current_value?: number; unit_price?: number; valued_at?: string; month_gain?: number } | null;
}

export interface RegisterHolding {
  account_id: string;
  class_name: string;
  units: number | string;
  units_before: number | string;
  invested: number | string;
  unit_price: number | string | null;
  valued_at: string | null;
  prev_unit_price: number | string | null;
}

export function fromRegister(account: FundAccount, h: RegisterHolding): FundAccount {
  const units = Number(h.units) || 0;
  const price = h.unit_price == null ? undefined : Number(h.unit_price);
  const before = Number(h.units_before) || 0;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    id: account.id,
    shares_owned: units,
    cost_basis: Number(h.invested) || 0,
    metadata: {
      class_name: h.class_name,
      unit_price: price,
      valued_at: h.valued_at ?? undefined,
      current_value: price == null ? undefined : r2(units * price),
      month_gain: price == null ? undefined : before && h.prev_unit_price != null ? r2(before * (price - Number(h.prev_unit_price))) : 0,
    },
  };
}

const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);
const dateLabel = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null);

export default function FundHoldingsOverview({ accounts }: { accounts: FundAccount[] }) {
  const rows = accounts.map((a) => {
    const units = Number(a.shares_owned) || 0;
    const cost = Number(a.cost_basis) || 0;
    const price = a.metadata?.unit_price;
    const value = a.metadata?.current_value ?? cost;
    return { id: a.id, name: a.metadata?.class_name ?? 'Share class', units, cost, price, value, gain: value - cost, monthGain: a.metadata?.month_gain, valuedAt: a.metadata?.valued_at };
  });
  const total = rows.reduce((s, r) => s + r.value, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const gain = total - cost;
  const ret = cost > 0 ? (gain / cost) * 100 : 0;
  const latest = rows.map((r) => r.valuedAt).filter(Boolean).sort().pop();
  const up = gain >= 0;
  const monthGain = rows.some((r) => r.monthGain != null) ? rows.reduce((s, r) => s + (r.monthGain ?? 0), 0) : null;
  const monthUp = (monthGain ?? 0) >= 0;
  const monthLabel = latest ? new Date(`${latest}T00:00:00`).toLocaleDateString('en-US', { month: 'long' }) : 'this month';

  const cards = [
    { label: 'Current Value', value: usd(total), icon: DollarSign, sub: <span className={`flex items-center ${up ? 'text-green-400' : 'text-red-400'}`}>{up ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}{up ? '+' : ''}{ret.toFixed(2)}%</span> },
    { label: 'Gain / Loss This Month', value: monthGain == null ? '-' : `${monthUp ? '+' : '-'}${usd(Math.abs(monthGain))}`, icon: monthUp ? TrendingUp : TrendingDown, tone: monthGain == null ? undefined : monthUp ? 'text-green-400' : 'text-red-400', sub: <span className="text-slate-500">For {monthLabel}, after all trades and costs</span> },
    { label: 'Amount Invested', value: usd(cost), icon: Calendar, sub: <span className="text-slate-500">Across {rows.length} share class{rows.length === 1 ? '' : 'es'}</span> },
    { label: 'Total Gain / Loss', value: `${up ? '+' : '-'}${usd(Math.abs(gain))}`, icon: up ? TrendingUp : TrendingDown, tone: up ? 'text-green-400' : 'text-red-400', sub: <span className="text-slate-500">Since you invested · {rows.reduce((s, r) => s + r.units, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} units</span> },
  ] as { label: string; value: string; icon: LucideIcon; tone?: string; sub: ReactNode }[];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">Portfolio <span className="font-semibold">Overview</span></h2>
        <p className="text-sm text-slate-400">{latest ? `Approved values as of ${dateLabel(latest)}` : 'Values will appear once the first month is approved'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6 transition-colors hover:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-slate-400">{c.label}</div>
              <c.icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div className={`text-3xl font-bold mb-1 ${c.tone ?? 'text-white'}`}>{c.value}</div>
            <div className="text-sm">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Your Share Classes</h3>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{r.name}</div>
                <div className="text-sm text-slate-400">
                  {r.units.toLocaleString(undefined, { maximumFractionDigits: 2 })} units{r.price != null ? ` at ${usd(r.price)} per unit` : ''}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="font-semibold text-white">{usd(r.value)}</div>
                {r.monthGain != null && (
                  <div className={`text-sm ${r.monthGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.monthGain >= 0 ? '+' : '-'}{usd(Math.abs(r.monthGain))} this month
                  </div>
                )}
                <div className={`text-xs ${r.gain >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                  {r.gain >= 0 ? '+' : '-'}{usd(Math.abs(r.gain))} since you invested
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
