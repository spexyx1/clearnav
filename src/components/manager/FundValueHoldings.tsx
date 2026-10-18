import { useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import type { MonthResult, PriceSource } from '../../lib/fundValuation';

const usd = (v: number, d = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

const SOURCE_STYLE: Record<PriceSource, { label: string; cls: string }> = {
  manual: { label: 'Manual', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  statement: { label: 'Broker', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  market: { label: 'Market', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  trade: { label: 'Last trade', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  missing: { label: 'No price', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

interface Props {
  month: MonthResult;
  locked: boolean;
  onSetPrice: (symbol: string, date: string, price: number | null) => Promise<void>;
}

export default function FundValueHoldings({ month, locked, onSetPrice }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(symbol: string, price: number | null) {
    setBusy(true);
    try {
      await onSetPrice(symbol, month.date, price);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-slate-950/60 border-t border-slate-800 px-4 sm:px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        {[
          ['Start of month', usd(month.openingValue)],
          ['Cash', usd(month.cash)],
          ['Positions', usd(month.holdingsValue)],
          ['Income', usd(month.income)],
          ['Fees', usd(month.fees)],
        ].map(([l, v]) => (
          <div key={l} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">{l}</p>
            <p className="text-white font-medium tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {month.brokerValue != null && Math.abs(month.brokerValue - month.computedValue) > 1 && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Broker reported {usd(month.brokerValue)}; our rebuild gives {usd(month.computedValue)}. The broker figure is used.
        </p>
      )}
      {month.holdings.length === 0 ? (
        <p className="text-sm text-slate-500">No open positions at {month.date}. Fully in cash.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Holding</th>
                <th className="py-2 pr-4 font-medium text-right">Quantity</th>
                <th className="py-2 pr-4 font-medium text-right">Price</th>
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {month.holdings.map((h) => {
                const s = SOURCE_STYLE[h.priceSource];
                return (
                  <tr key={h.symbol} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2 pr-4">
                      <p className="text-white font-medium">{h.symbol}</p>
                      <p className="text-xs text-slate-500">{h.assetCategory || 'Stocks'}{h.multiplier !== 1 ? ` · x${h.multiplier}` : ''}</p>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-300">{h.quantity.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">
                      {editing === h.symbol ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            autoFocus type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && Number(value) > 0) save(h.symbol, Number(value)); if (e.key === 'Escape') setEditing(null); }}
                            className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-blue-500"
                          />
                          <button disabled={busy || !(Number(value) > 0)} onClick={() => save(h.symbol, Number(value))} className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button
                          disabled={locked}
                          onClick={() => { setEditing(h.symbol); setValue(h.price ? String(h.price) : ''); }}
                          className="group inline-flex items-center gap-1.5 tabular-nums text-slate-200 hover:text-white disabled:cursor-default"
                          title={locked ? 'Approved months are locked' : 'Set a manual price'}
                        >
                          {h.price ? usd(h.price, 4) : '—'}
                          {!locked && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>
                        {s.label}
                        {h.priceSource === 'manual' && !locked && (
                          <button onClick={() => save(h.symbol, null)} title="Remove manual price" className="hover:text-white"><X className="w-3 h-3" /></button>
                        )}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-white">{usd(h.marketValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
