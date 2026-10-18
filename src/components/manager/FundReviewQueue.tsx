import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { loadOpenReviewItems, resolveReviewItem, runTenantAutomation, describeResult, type ReviewItem } from '../../lib/fundAutomation';

interface Props {
  tenantId: string;
  userId: string;
  refreshKey: number;
  onApplied: (message: string) => void;
}

export default function FundReviewQueue({ tenantId, userId, refreshKey, onApplied }: Props) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await loadOpenReviewItems(tenantId));
      setError('');
    } catch {
      setError('Could not load the questions. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function choose(item: ReviewItem, key: string) {
    setBusy(item.id);
    setError('');
    try {
      await resolveReviewItem(item, key, userId);
      const result = await runTenantAutomation(tenantId, userId);
      onApplied(`Decision applied. ${describeResult(result)}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your decision could not be applied. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !items.length) return null;
  if (!items.length && !error) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl px-5 py-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Nothing needs your decision.
      </div>
    );
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-200">Needs your decision</h3>
        <span className="ml-1 text-xs bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">{items.length}</span>
      </div>
      {error && <p className="px-5 py-3 text-sm text-red-300 border-b border-amber-500/20">{error}</p>}
      <ul className="divide-y divide-amber-500/10">
        {items.map((item) => (
          <li key={item.id} className="px-5 py-4">
            <button onClick={() => setOpen(open === item.id ? null : item.id)} className="w-full flex items-start justify-between gap-3 text-left">
              <span className="text-sm text-white font-medium">{item.title}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open === item.id ? 'rotate-180' : ''}`} />
            </button>
            {open === item.id && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-300 leading-relaxed">{item.detail}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {item.options.map((o) => (
                    <button
                      key={o.key}
                      disabled={!!busy}
                      onClick={() => choose(item, o.key)}
                      className="text-left bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg px-4 py-3 transition-colors disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-white">
                        {busy === item.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{o.label}
                      </span>
                      <span className="block text-xs text-slate-400 mt-1">{o.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
