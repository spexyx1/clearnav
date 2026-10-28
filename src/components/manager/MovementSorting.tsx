import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Check, Loader2 } from 'lucide-react';
import {
  DEFAULT_RULES, KIND_INFO, TREATMENT_INFO, loadMovementRules, saveMovementRule,
  type MovementKind, type MovementRules, type Treatment,
} from '../../lib/movementRules';

interface Props { tenantId: string; fundId: string; userId: string | null }

const TONE: Record<Treatment, string> = {
  nav: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  subscription: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  redemption: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  excluded: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  review: 'text-red-300 border-red-500/40 bg-red-500/10',
};

export default function MovementSorting({ tenantId, fundId, userId }: Props) {
  const [rules, setRules] = useState<MovementRules | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<MovementKind | null>(null);
  const [saved, setSaved] = useState<MovementKind | null>(null);

  useEffect(() => {
    let live = true;
    setRules(null);
    setError(null);
    loadMovementRules(fundId)
      .then((r) => { if (live) setRules(r); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not load the sorting rules.'); });
    return () => { live = false; };
  }, [fundId]);

  const change = async (kind: MovementKind, treatment: Treatment) => {
    if (!rules || !userId) return;
    const before = rules[kind];
    setRules({ ...rules, [kind]: treatment });
    setSaving(kind);
    setError(null);
    try {
      await saveMovementRule(tenantId, fundId, kind, treatment, userId);
      setSaved(kind);
      setTimeout(() => setSaved((s) => (s === kind ? null : s)), 1500);
    } catch (e) {
      setRules((r) => (r ? { ...r, [kind]: before } : r));
      setError(e instanceof Error ? e.message : 'Could not save that rule.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/10"><ArrowLeftRight className="w-4 h-4 text-cyan-300" /></div>
        <div>
          <h4 className="text-white font-medium">How IBKR cash movements are sorted</h4>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Set once and applied to every import. Gains and costs move the unit price only. Investor money in starts a new unit series
            at the launch price; money out cancels units, oldest series first. You can still override a single movement on the fund value page.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {!rules ? (
        !error && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
      ) : (
        <ul className="divide-y divide-slate-700/60">
          {KIND_INFO.map(({ kind, label, example }) => {
            const t = rules[kind];
            return (
              <li key={kind} className="py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                <div className="md:w-64 flex-shrink-0">
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{example}</p>
                </div>
                <p className="flex-1 text-xs text-slate-400 leading-relaxed">
                  {TREATMENT_INFO[t].detail}
                  {t !== DEFAULT_RULES[kind] && <span className="text-amber-300/90"> Standard: {TREATMENT_INFO[DEFAULT_RULES[kind]].label.toLowerCase()}.</span>}
                </p>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <select value={t} disabled={saving === kind || !userId} onChange={(e) => change(kind, e.target.value as Treatment)}
                    className={`text-xs font-medium rounded-lg border px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors ${TONE[t]}`}>
                    {(Object.keys(TREATMENT_INFO) as Treatment[]).map((o) => <option key={o} value={o} className="bg-slate-900 text-white">{TREATMENT_INFO[o].label}</option>)}
                  </select>
                  <span className="w-4">
                    {saving === kind ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : saved === kind ? <Check className="w-4 h-4 text-emerald-400" /> : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
