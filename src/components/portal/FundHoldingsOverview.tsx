import { DollarSign, PieChart, TrendingDown, TrendingUp, Calendar } from 'lucide-react';

export interface FundAccount {
  id: string;
  shares_owned: number | string;
  cost_basis: number | string | null;
  metadata: { class_name?: string; current_value?: number; unit_price?: number; valued_at?: string } | null;
}

const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);
const dateLabel = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null);

export default function FundHoldingsOverview({ accounts }: { accounts: FundAccount[] }) {
  const rows = accounts.map((a) => {
    const units = Number(a.shares_owned) || 0;
    const cost = Number(a.cost_basis) || 0;
    const price = a.metadata?.unit_price;
    const value = a.metadata?.current_value ?? cost;
    return { id: a.id, name: a.metadata?.class_name ?? 'Share class', units, cost, price, value, gain: value - cost, valuedAt: a.metadata?.valued_at };
  });
  const total = rows.reduce((s, r) => s + r.value, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const gain = total - cost;
  const ret = cost > 0 ? (gain / cost) * 100 : 0;
  const latest = rows.map((r) => r.valuedAt).filter(Boolean).sort().pop();
  const up = gain >= 0;

  const cards = [
    { label: 'Current Value', value: usd(total), icon: DollarSign, sub: <span className={`flex items-center ${up ? 'text-green-400' : 'text-red-400'}`}>{up ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}{up ? '+' : ''}{ret.toFixed(2)}%</span> },
    { label: 'Amount Invested', value: usd(cost), icon: Calendar, sub: <span className="text-slate-500">Across {rows.length} share class{rows.length === 1 ? '' : 'es'}</span> },
    { label: 'Total Gain / Loss', value: `${up ? '+' : ''}${usd(gain)}`, icon: up ? TrendingUp : TrendingDown, sub: <span className="text-slate-500">Since you invested</span> },
    { label: 'Units Held', value: rows.reduce((s, r) => s + r.units, 0).toLocaleString(undefined, { maximumFractionDigits: 2 }), icon: PieChart, sub: <span className="text-slate-500">Total units</span> },
  ];

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
            <div className="text-3xl font-bold text-white mb-1">{c.value}</div>
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
                <div className={`text-sm ${r.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.gain >= 0 ? '+' : ''}{usd(r.gain)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
