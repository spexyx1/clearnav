import type { ReactNode } from 'react';
import type { ReportContent } from '../../lib/monthlyReport';

const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const tone = (v: number) => (v >= 0 ? 'text-emerald-700' : 'text-red-700');
const signedUsd = (v: number) => `${v >= 0 ? '+' : '-'}${usd(Math.abs(v))}`;
const localPrice = (v: number, ccy?: string) => {
  const code = (ccy || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, currencyDisplay: code === 'USD' ? 'symbol' : 'code' }).format(v);
  } catch {
    return `${v.toLocaleString()} ${code}`;
  }
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-3 font-serif text-xl text-[#1a3c2a]">
        <span className="w-1 h-5 bg-[#c9a84c] rounded-sm" />{title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ text }: { text: string }) {
  return <div className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">{text}</div>;
}

export default function MonthlyReportPreview({ content }: { content: ReportContent }) {
  const provisional = content.classes.some((c) => c.status !== 'approved');
  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/40 max-w-4xl mx-auto">
      <header className="bg-[#1a3c2a] px-8 sm:px-12 pt-10 pb-9 border-b-4 border-[#c9a84c]">
        <div className="h-[3px] w-12 bg-[#c9a84c] mb-6" />
        <h1 className="font-serif text-3xl sm:text-4xl text-white tracking-[0.15em]">ARKLINE TRUST</h1>
        <p className="mt-3 text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-[#c9a84c]">Monthly Update · {content.period.label}</p>
        <p className="mt-2 text-sm text-emerald-100/70">{content.fund_name}</p>
      </header>

      <div className="px-8 sm:px-12 py-10 space-y-10">
        <Section title="Performance summary">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {content.classes.map((c) => (
              <div key={c.class_id} className="rounded-lg border border-[#e7e2d6] bg-[#faf8f3] p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">{c.name}{c.status !== 'approved' && ' *'}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">${c.unit_price.toFixed(4)}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span className={tone(c.month_return)}>{pct(c.month_return)} month</span>
                  <span className={tone(c.ytd_return)}>{pct(c.ytd_return)} YTD</span>
                </div>
                {c.month_gain != null && (
                  <p className={`mt-2 text-sm font-medium tabular-nums ${tone(c.month_gain)}`}>{signedUsd(c.month_gain)} gain this month</p>
                )}
                <p className="mt-1 text-xs text-gray-500 tabular-nums">Class value {usd(c.nav)}</p>
                {!!c.flows && <p className="text-xs text-gray-500 tabular-nums">Net money in/out {signedUsd(c.flows)}</p>}
              </div>
            ))}
          </div>
          {provisional && <p className="text-xs text-gray-500">* Provisional figure, pending approval.</p>}
        </Section>

        {content.commentary.trim() && <Section title="Letter from the manager"><Prose text={content.commentary} /></Section>}
        {content.market_insights.trim() && <Section title="Market insights"><Prose text={content.market_insights} /></Section>}

        {content.classes.map((c) => {
          const notes = Object.entries(content.position_notes[c.code] ?? {}).filter(([, v]) => v.trim());
          return (
            <Section key={c.class_id} title={c.name}>
              {content.class_notes[c.code]?.trim() && <Prose text={content.class_notes[c.code]} />}
              {c.holdings.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f7f4ec] text-xs uppercase tracking-wider text-gray-500">
                        <th className="text-left font-semibold px-3 py-2">Holding</th>
                        <th className="text-right font-semibold px-3 py-2">Quantity</th>
                        <th className="text-right font-semibold px-3 py-2">Price</th>
                        <th className="text-right font-semibold px-3 py-2">Value</th>
                        <th className="text-right font-semibold px-3 py-2">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee9dd]">
                      {c.holdings.map((h) => (
                        <tr key={h.symbol}>
                          <td className="px-3 py-2 font-medium text-gray-900">{h.symbol}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-700">{h.quantity.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-700">{localPrice(h.price, h.currency)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-900">{usd(h.value)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-500">{(h.weight * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-3 py-2 text-gray-500">Cash</td><td /><td />
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">{usd(c.cash)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">{((c.cash / (c.nav || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Held fully in cash ({usd(c.cash)}).</p>
              )}
              {notes.map(([sym, v]) => (
                <div key={sym} className="border-l-2 border-[#c9a84c] pl-4">
                  <p className="font-semibold text-[#1a3c2a]">{sym}</p>
                  <Prose text={v} />
                </div>
              ))}
              {c.trades.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-800">{c.trades.length} trade{c.trades.length === 1 ? '' : 's'} this month</summary>
                  <table className="w-full mt-2">
                    <tbody className="divide-y divide-[#eee9dd]">
                      {c.trades.map((t, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-3 text-gray-500">{t.date}</td>
                          <td className="py-1.5 pr-3 text-gray-900">{t.symbol}</td>
                          <td className={`py-1.5 pr-3 ${t.direction === 'buy' ? 'text-emerald-700' : 'text-red-700'}`}>{t.direction === 'buy' ? 'Buy' : 'Sell'}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums text-gray-700">{t.quantity.toLocaleString()}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-900">
                            {usd(t.amount)}
                            {t.currency && t.currency !== 'USD' && t.local_amount != null && (
                              <span className="block text-[11px] text-gray-500">{localPrice(t.local_amount, t.currency)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </Section>
          );
        })}
      </div>

      <footer className="border-t border-[#e7e2d6] bg-[#faf8f3] px-8 sm:px-12 py-6">
        <p className="text-[11px] leading-relaxed text-gray-500">
          This report is prepared by Arkline Trust for informational purposes only and does not constitute an offer to sell or a solicitation
          of an offer to buy any securities. Past performance is not indicative of future results. All investments involve risk, including the
          possible loss of principal. This document is confidential and intended solely for the use of the investor to whom it is addressed.
        </p>
      </footer>
    </article>
  );
}
