import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, ShieldCheck, X, XCircle } from 'lucide-react';
import type { Reconciliation, ReconStatus } from '../../lib/reconciliation';

const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

export const STATUS_STYLE: Record<ReconStatus, { label: string; cls: string }> = {
  matched: { label: 'Matches IBKR', cls: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' },
  within_tolerance: { label: 'Within $1', cls: 'border-amber-500/30 text-amber-300 bg-amber-500/10' },
  not_matched: { label: 'Not matched', cls: 'border-red-500/30 text-red-300 bg-red-500/10' },
};

export function ReconBadge({ rec, onClick }: { rec: Reconciliation; onClick: () => void }) {
  const s = STATUS_STYLE[rec.status];
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} title="Open reconciliation"
      className={`ml-2 text-xs px-2 py-0.5 rounded-full border transition hover:brightness-125 ${s.cls}`}>
      {s.label}{rec.provisional ? ' - provisional' : ''}
    </button>
  );
}

interface Props {
  rec: Reconciliation;
  title: string;
  canApprove: boolean;
  approving: boolean;
  onApprove: (reason: string) => void;
  onClose: () => void;
}

export default function ReconcileDialog({ rec, title, canApprove, approving, onApprove, onClose }: Props) {
  const [reason, setReason] = useState('');
  const needsReason = rec.status === 'not_matched';
  const reasonOk = !needsReason || reason.trim().length >= 10;
  const Icon = rec.status === 'matched' ? CheckCircle2 : rec.status === 'within_tolerance' ? AlertTriangle : XCircle;
  const s = STATUS_STYLE[rec.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Reconciliation with Interactive Brokers</p>
            <h3 className="text-lg font-semibold text-white mt-1">{title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${s.cls}`}><Icon className="w-3.5 h-3.5" />{s.label}</span>
              {rec.difference > 0 && <span className="text-xs text-slate-400">Largest difference {usd(rec.difference)}</span>}
              {rec.difference < 0 && <span className="text-xs text-slate-400">IBKR figures missing</span>}
              {rec.provisional && <span className="text-xs px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-300">Provisional - month not over (data to {rec.date})</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <section>
            <h4 className="text-sm font-medium text-white mb-2">Checks</h4>
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60 text-slate-400 text-xs">
                  <tr><th className="text-left font-medium px-3 py-2">Item</th><th className="text-right font-medium px-3 py-2">Ours</th><th className="text-right font-medium px-3 py-2">IBKR</th><th className="text-right font-medium px-3 py-2">Difference</th></tr>
                </thead>
                <tbody>
                  {rec.checks.map((c) => {
                    const d = c.difference;
                    const tone = d == null ? 'text-slate-500' : Math.abs(d) < 0.005 ? 'text-emerald-300' : Math.abs(d) <= 1 ? 'text-amber-300' : 'text-red-300';
                    return (
                      <tr key={c.label} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-slate-300">{c.label}{!c.gating && <span className="block text-xs text-slate-500">Used to find causes</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">{c.ours == null ? '-' : usd(c.ours)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">{c.ibkr == null ? 'Not reported' : usd(c.ibkr)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${tone}`}>{d == null ? '-' : Math.abs(d) < 0.005 ? 'Exact' : usd(d)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {rec.issues.length > 0 && (
            <section>
              <h4 className="text-sm font-medium text-white mb-2">Open items</h4>
              <ul className="space-y-1.5">{rec.issues.map((i) => <li key={i} className="flex gap-2 text-sm text-amber-200/90"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />{i}</li>)}</ul>
            </section>
          )}

          {rec.suggestions.length > 0 && (
            <section>
              <h4 className="text-sm font-medium text-white mb-2">Suggested fixes</h4>
              <ul className="space-y-2">
                {rec.suggestions.map((sg) => (
                  <li key={sg.title + sg.detail} className="flex gap-3 rounded-lg bg-slate-800/50 border border-slate-800 px-3 py-2.5">
                    <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-sky-400" />
                    <div><p className="text-sm text-white">{sg.title}</p><p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{sg.detail}</p></div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canApprove && (
            <section className="border-t border-slate-800 pt-5">
              <label htmlFor="approval-reason" className="text-sm font-medium text-white">
                {needsReason ? 'Reason for approving with exceptions (required)' : 'Note (optional)'}
              </label>
              <textarea id="approval-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder={needsReason ? 'Explain why this month can be approved even though it does not match IBKR.' : 'Anything worth recording with this approval.'}
                className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition" />
              {needsReason && <p className="text-xs text-slate-500 mt-1">At least 10 characters. The month will be marked "approved with exceptions".</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
                <button onClick={() => onApprove(reason)} disabled={!reasonOk || approving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {needsReason ? 'Approve with exceptions' : 'Approve'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
