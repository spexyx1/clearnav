import type { MonthResult, PriceSource } from '../../lib/fundValuation';

const usd = (v: number, d = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

const SOURCE_STYLE: Record<PriceSource, { label: string; cls: string }> = {
  manual: { label: 'Manual - not final', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  statement: { label: 'IBKR close', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ibkr: { label: 'IBKR close', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  market: { label: 'Public - info only', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  trade: { label: 'Last trade - not final', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  broker_last: { label: 'Older IBKR price - not final', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  missing: { label: 'No price', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  expired: { label: 'Expired', cls: 'bg-slate-500/10 text-slate-400 border-slate-600/40' },
};

const localPrice = (v: number, ccy: string) =>
  ccy === 'USD' ? usd(v, 4) : `${v.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${ccy}`;

export default function FundValueHoldings({ month }: { month: MonthResult }) {
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
          IBKR reported {usd(month.brokerValue)}; the rebuild from IBKR's activity gives {usd(month.computedValue)}. IBKR's figure is used.
        </p>
      )}
      {Math.abs(month.unitemisedCash) > 1 && (
        <p className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
          Cash includes {usd(month.unitemisedCash)} that IBKR counts in the account value but does not itemise (usually cash in other currencies). It is kept in the balance instead of being counted as a gain or loss.
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
                      <p className="text-xs text-slate-500">{h.assetCategory || 'Stocks'}{h.multiplier !== 1 ? ` · x${h.multiplier}` : ''}{h.currency !== 'USD' ? ` · ${h.currency} @ ${h.fxRate ? h.fxRate.toFixed(4) : 'no rate'}` : ''}</p>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-300">{h.quantity.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-200">{h.price ? localPrice(h.price, h.currency) : '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
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
