import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Upload, X, XCircle } from 'lucide-react';
import { prePublishChecks, type PublishCheck, type ReportContent } from '../../lib/monthlyReport';

interface Props {
  fundId: string;
  content: ReportContent;
  busy: boolean;
  onPublish: () => void;
  onClose: () => void;
}

export default function PublishChecklist({ fundId, content, busy, onPublish, onClose }: Props) {
  const [checks, setChecks] = useState<PublishCheck[] | null>(null);
  const [error, setError] = useState('');
  const [ack, setAck] = useState(false);

  useEffect(() => {
    let live = true;
    prePublishChecks(fundId, content)
      .then((c) => { if (live) setChecks(c); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not run the checks.'); });
    return () => { live = false; };
  }, [fundId, content]);

  const blocked = checks?.some((c) => c.blocking && !c.ok) ?? true;
  const warnings = checks?.filter((c) => !c.ok && !c.blocking).length ?? 0;
  const next = (content.edition?.number ?? 0) + 1;
  const canPublish = !!checks && !blocked && (!warnings || ack) && !busy;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Before you publish</h3>
            <p className="text-sm text-slate-400 mt-1">
              This will be edition {next} of the {content.period.label} update{next > 1 ? ' and will replace the copy in the vault' : ''}.
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}
        {!checks && !error && (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Checking the report...</div>
        )}

        {checks && (
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className={`flex gap-3 rounded-lg border px-4 py-3 transition-colors ${c.ok ? 'border-slate-800 bg-slate-800/40' : c.blocking ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                {c.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                  : c.blocking ? <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />}
                <div className="min-w-0">
                  <p className={`text-sm ${c.ok ? 'text-slate-200' : 'text-white font-medium'}`}>{c.label}</p>
                  {c.detail && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{c.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {checks && !blocked && warnings > 0 && (
          <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-emerald-500" />
            I have reviewed the {warnings === 1 ? 'warning' : `${warnings} warnings`} above and want to publish anyway.
          </label>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button onClick={onClose} disabled={busy} className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50">Cancel</button>
          <button onClick={onPublish} disabled={!canPublish} className="inline-flex justify-center items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Publish edition {next}
          </button>
        </div>
      </div>
    </div>
  );
}
