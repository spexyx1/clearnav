import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { CATEGORY_LABELS, decideCorporateAction, type CorporateDecision } from '../../lib/corporateActions';
import type { ClassValuation } from '../../lib/fundValuation';

interface Props {
  decisions: CorporateDecision[];
  valuations: ClassValuation[];
  names: Record<string, string>;
  userId: string;
  onChanged: (message: string) => void;
}

const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const dateText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function figures(d: CorporateDecision, valuations: ClassValuation[]) {
  const r = valuations.find((v) => v.classId === d.share_class_id)?.months.find((m) => m.month === d.action_date.slice(0, 7));
  const ev = r?.corporate.find((c) => c.key === d.event_key);
  if (!r || !ev) return null;
  const counted = ev.status === 'approved';
  const navWith = counted ? r.accountValue : r.accountValue + ev.impact;
  const navWithout = counted ? r.accountValue - ev.impact : r.accountValue;
  const perUnit = r.units > 0 ? ev.impact / r.units : 0;
  const priceWith = counted ? r.unitPrice : r.unitPrice + perUnit;
  const priceWithout = counted ? r.unitPrice - perUnit : r.unitPrice;
  return { navWith, navWithout, priceWith, priceWithout, ibkr: r.brokerValue, impact: ev.impact };
}

function Row({ d, valuations, names, userId, onChanged }: { d: CorporateDecision } & Omit<Props, 'decisions'>) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const f = figures(d, valuations);
  const label = `${d.symbol} on ${dateText(d.action_date)}`;

  const decide = async (status: CorporateDecision['status']) => {
    setBusy(true);
    setError('');
    try {
      await decideCorporateAction(d.id, status, userId, reason);
      onChanged(status === 'approved' ? `Approved ${label}. Figures from that month onward now include it.`
        : status === 'rejected' ? `Rejected ${label}. It stays out of the figures unless IBKR changes its details.`
        : `Reopened ${label} for review.`);
    } catch (e) {
      setError((e as Error).message || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const close = (a: number | null, b: number | null) => a != null && b != null && Math.abs(a - b) < 1;

  return (
    <li className="border-t border-slate-800 first:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-5 py-3 text-left hover:bg-slate-800/40 transition-colors">
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="font-medium text-white min-w-20">{d.symbol}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border border-slate-600 text-slate-300">{CATEGORY_LABELS[d.category]}</span>
        {d.detected && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-300"><Sparkles className="w-3 h-3" />Not labelled by IBKR</span>}
        <span className="text-xs text-slate-500">{dateText(d.action_date)} - {names[d.share_class_id] ?? 'Class'}</span>
        {f && <span className={`ml-auto text-sm tabular-nums ${f.impact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{f.impact >= 0 ? '+' : '-'}{usd(Math.abs(f.impact))}</span>}
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 space-y-3">
          <p className="text-sm text-slate-200">{d.description}</p>
          {d.details.ibkrText && <p className="text-xs text-slate-500">IBKR says: {d.details.ibkrText}</p>}
          {d.status === 'rejected' && d.reason && <p className="text-xs text-red-300">Rejected because: {d.reason}</p>}
          {f ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className={`rounded-lg border p-3 ${close(f.navWith, f.ibkr) ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700'}`}>
                <p className="text-xs text-slate-400">With this event</p>
                <p className="text-white tabular-nums mt-1">{usd(f.navWith)}</p>
                <p className="text-xs text-slate-400 tabular-nums">Unit price ${f.priceWith.toFixed(4)}</p>
              </div>
              <div className={`rounded-lg border p-3 ${close(f.navWithout, f.ibkr) ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700'}`}>
                <p className="text-xs text-slate-400">Without this event</p>
                <p className="text-white tabular-nums mt-1">{usd(f.navWithout)}</p>
                <p className="text-xs text-slate-400 tabular-nums">Unit price ${f.priceWithout.toFixed(4)}</p>
              </div>
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                <p className="text-xs text-sky-300">IBKR month-end value</p>
                <p className="text-white tabular-nums mt-1">{f.ibkr != null ? usd(f.ibkr) : 'Not reported'}</p>
                <p className="text-xs text-slate-500">Includes every event IBKR booked</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Month-end figures for this event are not available yet.</p>
          )}
          {error && <p className="flex items-center gap-2 text-xs text-red-300"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
          {rejecting ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this event wrong?"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500" />
              <button onClick={() => decide('rejected')} disabled={busy || !reason.trim()} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-600/80 text-white hover:bg-red-600 disabled:opacity-50 transition">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}Confirm reject
              </button>
              <button onClick={() => setRejecting(false)} className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {d.status === 'pending' ? (
                <>
                  <button onClick={() => decide('approved')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Approve
                  </button>
                  <button onClick={() => setRejecting(true)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 transition">
                    <X className="w-4 h-4" />Reject
                  </button>
                </>
              ) : (
                <button onClick={() => decide('pending')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}Reopen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function CorporateActionReview({ decisions, valuations, names, userId, onChanged }: Props) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  if (!decisions.length) return null;
  const count = (s: string) => decisions.filter((d) => d.status === s).length;
  const list = decisions.filter((d) => d.status === tab).sort((a, b) => {
    const fa = Math.abs(figures(a, valuations)?.impact ?? 0), fb = Math.abs(figures(b, valuations)?.impact ?? 0);
    return fb - fa || a.action_date.localeCompare(b.action_date);
  });
  const pending = count('pending');

  return (
    <div className={`rounded-xl border overflow-hidden ${pending ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-slate-800 bg-slate-900'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4">
        <div>
          <h3 className="text-white font-medium">Splits, restructurings and spinoffs</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {pending ? `${pending} event${pending === 1 ? '' : 's'} waiting for your decision. Months containing them stay "Not final" until decided.` : 'Every event has been reviewed.'}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-700 p-0.5 text-xs">
          {(['pending', 'approved', 'rejected'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md capitalize transition ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              {t === 'pending' ? 'Waiting' : t} ({count(t)})
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <ul className="border-t border-slate-800">
          {list.map((d) => <Row key={d.id} d={d} valuations={valuations} names={names} userId={userId} onChanged={onChanged} />)}
        </ul>
      ) : (
        <p className="border-t border-slate-800 px-5 py-6 text-sm text-slate-500 text-center">Nothing here.</p>
      )}
    </div>
  );
}
