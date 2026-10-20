import { CheckCircle2, AlertTriangle, History, ShieldCheck } from 'lucide-react';
import { MOVEMENT_LABELS, type MonthResult } from '../../lib/fundValuation';

export interface PreviousFigures { unit_price: number; class_value: number; units: number; replaced_at: string }

const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const units = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (v: number) => `${v >= 0 ? '+' : '-'}${usd(Math.abs(v))}`;

function Line({ label, value, tone, strong }: { label: string; value: string; tone?: 'up' | 'down' | 'muted'; strong?: boolean }) {
  const color = tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-red-300' : tone === 'muted' ? 'text-slate-500' : 'text-slate-200';
  return (
    <div className={`flex items-center justify-between gap-4 py-1.5 ${strong ? 'border-t border-slate-800 mt-1 pt-2.5' : ''}`}>
      <span className={strong ? 'text-white font-medium' : 'text-slate-400'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'text-white font-medium' : color}`}>{value}</span>
    </div>
  );
}

export default function FundValueBreakdown({ month: m, previous }: { month: MonthResult; previous?: PreviousFigures | null }) {
  const c = m.charges;
  const totalCharges = c.management + c.performance + c.subadvisor + c.adjustments + c.trading + c.other + c.manual;
  const chargeRows: Array<[string, number]> = [
    ['Management fee', c.management], ['Performance fee', c.performance], ['Subadvisor fees', c.subadvisor],
    ['Fee adjustments and credits', c.adjustments], ['Trading commissions', c.trading], ['Other charges', c.other],
    ['Charges entered by hand', c.manual],
  ];
  const externalFlows = m.flows;
  const accounted = Math.abs(m.unexplained) < 1;
  const brokerGap = m.brokerValue != null ? m.classNav - m.brokerValue : null;

  return (
    <div className="px-4 sm:px-6 pb-5 pt-2 bg-slate-950/40 border-t border-slate-800/60">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
        <section className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Value</h4>
          <Line label="Start of month" value={usd(m.openingValue)} />
          <Line label="Investment gain or loss" value={signed(m.investmentGain)} tone={m.investmentGain >= 0 ? 'up' : 'down'} />
          <Line label="Dividends" value={signed(m.dividends)} tone={m.dividends ? (m.dividends > 0 ? 'up' : 'down') : 'muted'} />
          <Line label="Interest" value={signed(m.interest)} tone={m.interest ? (m.interest > 0 ? 'up' : 'down') : 'muted'} />
          <Line label="Fees and charges" value={signed(-totalCharges)} tone={totalCharges ? 'down' : 'muted'} />
          <Line label="Money in and out" value={signed(externalFlows)} tone={externalFlows ? undefined : 'muted'} />
          <Line label="End of month" value={usd(m.accountValue)} strong />
          <div className={`mt-3 flex items-start gap-2 text-xs rounded-md px-2.5 py-2 ${accounted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
            {accounted ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            {accounted
              ? 'Every dollar is accounted for against the broker.'
              : `${usd(Math.abs(m.unexplained))} of cash ${m.unexplained > 0 ? 'appeared' : 'left'} at the broker without a matching item in the statements.`}
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Fees and charges</h4>
          {chargeRows.map(([label, v]) => <Line key={label} label={label} value={v ? signed(-v) : '—'} tone={v ? (v > 0 ? 'down' : 'up') : 'muted'} />)}
          <Line label="Total" value={signed(-totalCharges)} strong />
          {m.manual.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs">
              {m.manual.map((x) => (
                <li key={`${x.id}-${x.status}`} className="flex justify-between gap-3 text-slate-400">
                  <span className="min-w-0 truncate" title={x.note}>
                    {x.kind === 'class_charge' ? 'Class' : x.kind === 'investor_fee' ? `Fee: ${x.name}` : `Rebate: ${x.name}`} - {x.note}
                    {x.status === 'owed' && <span className="text-amber-300"> (owed by Arkline)</span>}
                  </span>
                  <span className="tabular-nums shrink-0">{x.kind === 'manager_rebate' ? '+' : '-'}{usd(Math.abs(x.amount))}{x.units != null ? ` / ${units(x.units)} units` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {m.chargesPayable > 0.005 && <Line label="Hand-entered charges not yet paid" value={usd(m.chargesPayable)} tone="muted" />}
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">Class fees lower the unit price. Fees for one investor cancel only that investor's units; rebates from Arkline add units.</p>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Units</h4>
          <Line label="Units at start" value={units(m.unitsStart)} />
          <Line label="Issued" value={m.unitsIssued ? `+${units(m.unitsIssued)}` : '—'} tone={m.unitsIssued ? 'up' : 'muted'} />
          <Line label="Redeemed" value={m.unitsRedeemed ? `-${units(m.unitsRedeemed)}` : '—'} tone={m.unitsRedeemed ? 'down' : 'muted'} />
          <Line label="Units at end" value={units(m.units)} strong />
          <Line label="Unit price" value={`$${m.unitPrice.toFixed(4)}`} />
          <Line label="Class value (units × price)" value={usd(m.classNav)} />
          <Line label="Broker reported value" value={m.brokerValue != null ? usd(m.brokerValue) : 'not in statement'} tone={m.brokerValue == null ? 'muted' : undefined} />
          {brokerGap != null && Math.abs(brokerGap) >= 1 && (
            <p className="text-xs text-amber-300 mt-2">Differs from the broker by {usd(Math.abs(brokerGap))}.</p>
          )}
        </section>
      </div>

      <div className={`mt-4 rounded-lg border p-4 text-sm ${m.final ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <h4 className={`flex items-center gap-2 font-medium ${m.final ? 'text-emerald-300' : 'text-amber-300'}`}>
          {m.final ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {m.final ? 'Final - ties to IBKR to the cent' : 'Not final yet'}
        </h4>
        {!m.final && (
          <ul className="mt-2 space-y-1 text-slate-300 list-disc pl-5">
            {m.finalReasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        {m.changeInNav && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <p className="sm:col-span-2 text-xs uppercase tracking-wider text-slate-500 mb-1">IBKR change in value, {m.changeInNav.from} to {m.changeInNav.to}</p>
            {m.changeInNav.starting != null && <Line label="IBKR starting value" value={usd(m.changeInNav.starting)} />}
            {Object.entries(m.changeInNav.lines).map(([label, v]) => <Line key={label} label={label} value={signed(v)} tone={v >= 0 ? 'up' : 'down'} />)}
            {m.changeInNav.ending != null && <Line label="IBKR ending value" value={usd(m.changeInNav.ending)} strong />}
          </div>
        )}
      </div>

      {m.movements.length > 0 && (
        <div className="mt-4 bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 px-4 pt-3 pb-2">Money and shares moved in or out</h4>
          <div className="divide-y divide-slate-800 text-sm">
            {m.movements.map((mv) => (
              <div key={mv.key} className="grid grid-cols-1 sm:grid-cols-[90px_1fr_auto_auto] gap-x-4 gap-y-1 px-4 py-2 items-center">
                <span className="text-slate-500 tabular-nums">{mv.date}</span>
                <span className="min-w-0">
                  <span className="block text-slate-300 truncate" title={mv.description}>{mv.description}</span>
                  <span className={`block text-xs mt-0.5 ${mv.confirmed ? 'text-slate-500' : 'text-amber-300/90'}`}>
                    {mv.reason}
                    {mv.units != null && mv.dealPrice != null && ` ${mv.units >= 0 ? 'Issues' : 'Redeems'} ${units(Math.abs(mv.units))} units at ${mv.dealPrice.toFixed(4)}.`}
                  </span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border w-fit ${mv.confirmed ? 'border-slate-700 text-slate-300' : 'border-amber-500/40 text-amber-300'}`}>
                  {MOVEMENT_LABELS[mv.label]}{mv.confirmed ? '' : ' (needs your answer)'}
                </span>
                <span className={`tabular-nums text-right ${mv.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{signed(mv.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previous && (
        <div className="mt-4 bg-slate-900/70 border border-slate-800 rounded-lg p-4 text-sm">
          <h4 className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-3"><History className="w-3.5 h-3.5" /> Before and after the latest recalculation</h4>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-1"><span /><span className="text-right">Before</span><span className="text-right">Now</span></div>
          {([
            ['Unit price', `$${Number(previous.unit_price).toFixed(4)}`, `$${m.unitPrice.toFixed(4)}`],
            ['Units', units(Number(previous.units)), units(m.units)],
            ['Class value', usd(Number(previous.class_value)), usd(m.classNav)],
          ] as const).map(([label, before, now]) => (
            <div key={label} className="grid grid-cols-3 gap-2 py-1">
              <span className="text-slate-400">{label}</span>
              <span className="text-right tabular-nums text-slate-500 line-through decoration-slate-600">{before}</span>
              <span className="text-right tabular-nums text-white">{now}</span>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-2">
            {previous.replaced_at ? `Replaced ${new Date(previous.replaced_at).toLocaleDateString()}.` : 'The new figures are not saved yet. Save as drafts to keep them.'}
          </p>
        </div>
      )}
    </div>
  );
}
