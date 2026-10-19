import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle, FileText, Loader2, Lock, Pencil, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import {
  applicationDealingDay, cutoffFor, effectiveRules, latestNoticeFor, loadDealingTerms, nextDealingDay,
  redemptionDealingDay, saveDealingTerms, scheduleFrom, formatTermValue,
  type DealingTerms, type EffectiveRule, type TermEntry,
} from '../../lib/dealingTerms';

interface Props {
  tenantId: string;
  funds: { id: string; fund_name: string }[];
  onOpenDocuments: () => void;
}

interface SourceDoc { id: string; file_name: string; document_type: string; file_url: string }

const DOC_LABELS: Record<string, string> = {
  trust_deed: 'Trust deed', im: 'Information memorandum', ppm: 'Offering memorandum',
  subscription_agreement: 'Subscription agreement', other: 'Document',
};

const day = (d: string) => formatDate(`${d}T12:00:00`);
const today = () => new Date().toISOString().slice(0, 10);

export default function DealingRules({ tenantId, funds, onOpenDocuments }: Props) {
  const { user } = useAuth();
  const [fundId, setFundId] = useState(funds[0]?.id ?? '');
  const [terms, setTerms] = useState<DealingTerms>({});
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, SourceDoc>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EffectiveRule | null>(null);

  const load = useCallback(async (id: string) => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const saved = await loadDealingTerms(id);
      setTerms(saved?.terms ?? {});
      setSourceIds(saved?.sourceDocumentIds ?? []);
      const { data, error: dErr } = await supabase
        .from('fund_documents').select('id, file_name, document_type, file_url').eq('fund_id', id);
      if (dErr) throw new Error(dErr.message);
      setDocs(Object.fromEntries((data ?? []).map(d => [d.id, d as SourceDoc])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the dealing rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!fundId && funds[0]) setFundId(funds[0].id); }, [fundId, funds]);
  useEffect(() => { load(fundId); }, [fundId, load]);

  const rules = useMemo(() => effectiveRules(terms), [terms]);
  const schedule = useMemo(() => scheduleFrom(terms), [terms]);
  const upcoming = useMemo(() => {
    const t = today();
    const dealing = nextDealingDay(schedule, t);
    return {
      dealing,
      cutoff: cutoffFor(schedule, dealing),
      notice: latestNoticeFor(schedule, dealing),
      moneyToday: applicationDealingDay(schedule, t),
      redeemToday: redemptionDealingDay(schedule, t),
    };
  }, [schedule]);
  const unlinked = rules.filter(r => r.source === 'default' || r.source === 'manual').length;

  const openDoc = async (doc: SourceDoc) => {
    const { data, error: sErr } = await supabase.storage.from('fund-documents').createSignedUrl(doc.file_url, 300);
    if (sErr || !data?.signedUrl) { setError('That document could not be opened.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const saveRule = async (rule: EffectiveRule, entry: TermEntry) => {
    const next: DealingTerms = { ...terms, [rule.field.key]: entry };
    await saveDealingTerms(tenantId, fundId, next, sourceIds, user?.id ?? null);
    setTerms(next);
    setEditing(null);
  };

  if (!funds.length) {
    return <p className="text-sm text-slate-400">Create the fund first, then set its dealing rules here.</p>;
  }

  const card = 'rounded-xl border border-slate-700 bg-slate-800/30 p-5';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Dealing rules</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            How and when units are issued and redeemed. Each rule should point to the trust deed or IM clause it comes from.
          </p>
        </div>
        {funds.length > 1 && (
          <select value={fundId} onChange={e => setFundId(e.target.value)}
            className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {funds.map(f => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-cyan-400 animate-spin" /></div>
      ) : (
        <>
          <section className={`${card} grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <Stat icon={CalendarClock} label="Next dealing day" value={day(upcoming.dealing)}
              hint="Units are issued and redeemed at this day's final IBKR price." />
            <Stat icon={CalendarClock} label="Application cut-off" value={day(upcoming.cutoff)}
              hint={`Money arriving today is dealt on ${day(upcoming.moneyToday)}.`} />
            <Stat icon={CalendarClock} label="Redemption notice deadline" value={day(upcoming.notice)}
              hint={`A request received today is paid at the ${day(upcoming.redeemToday)} price.`} />
          </section>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-sm text-cyan-100">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-300" />
            <p>Units can only be issued or redeemed at a month-end price marked <span className="font-medium">Final - ties to IBKR</span> and approved.
              Any other price is refused, even if someone enters it by hand.</p>
          </div>

          {unlinked > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <p className="text-sm text-amber-200">
                {unlinked} rule{unlinked === 1 ? ' is' : 's are'} not yet linked to a clause in your trust deed or IM.
                Upload the documents, or edit each rule and enter its clause.
              </p>
              <button onClick={onOpenDocuments}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors">
                Upload documents
              </button>
            </div>
          )}

          {(['Dealing', 'Investing', 'Fees'] as const).map(group => (
            <section key={group} className={card}>
              <h4 className="text-white font-medium mb-3">{group}</h4>
              <ul className="divide-y divide-slate-700/60">
                {rules.filter(r => r.field.group === group).map(rule => (
                  <RuleRow key={rule.field.key} rule={rule}
                    doc={rule.entry?.document_id ? docs[rule.entry.document_id] : undefined}
                    onOpenDoc={openDoc} onEdit={() => setEditing(rule)} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {editing && <EditRule rule={editing} onClose={() => setEditing(null)} onSave={saveRule} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof CalendarClock; label: string; value: string; hint: string }) {
  return (
    <div className="flex gap-3">
      <div className="p-2 h-fit rounded-lg bg-cyan-500/10"><Icon className="w-4 h-4 text-cyan-300" /></div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-white font-semibold mt-0.5">{value}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}

function RuleRow({ rule, doc, onOpenDoc, onEdit }: {
  rule: EffectiveRule; doc?: SourceDoc; onOpenDoc: (d: SourceDoc) => void; onEdit: () => void;
}) {
  const { entry, source, field } = rule;
  const where = [entry?.clause && `clause ${entry.clause}`, entry?.page && `page ${entry.page}`].filter(Boolean).join(', ');
  return (
    <li className="py-3 flex flex-col md:flex-row md:items-start gap-2 md:gap-6 group">
      <div className="md:w-56 flex-shrink-0">
        <p className="text-sm text-slate-300">{field.label}</p>
        <p className="text-white font-medium mt-0.5">{formatTermValue(field, entry)}</p>
      </div>
      <div className="flex-1 min-w-0 text-sm">
        {source === 'document' && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-green-300">
              <CheckCircle className="w-3.5 h-3.5" />
              {doc ? (
                <button onClick={() => onOpenDoc(doc)} className="underline decoration-dotted underline-offset-2 hover:text-green-200">
                  {DOC_LABELS[doc.document_type] ?? 'Document'}
                </button>
              ) : 'From an approved document'}
              {where && <span className="text-slate-400">· {where}</span>}
            </p>
            {entry?.quote && <p className="text-slate-400 italic line-clamp-2">"{entry.quote}"</p>}
          </div>
        )}
        {source === 'manual' && (
          <p className="flex items-center gap-1.5 text-sky-300">
            <Pencil className="w-3.5 h-3.5" /> Set by you{where ? ` · ${where}` : ' · no clause entered yet'}
          </p>
        )}
        {source === 'default' && (
          <p className="flex items-center gap-1.5 text-amber-300">
            <BookOpen className="w-3.5 h-3.5" /> Standard setting, not yet linked to a clause
          </p>
        )}
        {source === 'missing' && <p className="text-slate-500">Not set</p>}
      </div>
      <button onClick={onEdit}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-white transition-colors">
        <Pencil className="w-3.5 h-3.5" /> Edit
      </button>
    </li>
  );
}

function EditRule({ rule, onClose, onSave }: {
  rule: EffectiveRule; onClose: () => void; onSave: (r: EffectiveRule, e: TermEntry) => Promise<void>;
}) {
  const { field, entry } = rule;
  const [value, setValue] = useState(entry?.value === null || entry?.value === undefined ? '' : String(entry.value));
  const [clause, setClause] = useState(entry?.clause ?? '');
  const [page, setPage] = useState(entry?.page ? String(entry.page) : '');
  const [quote, setQuote] = useState(entry?.quote ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    let parsed: TermEntry['value'] = value.trim();
    if (field.kind === 'number') {
      const n = Number(value);
      if (value.trim() === '' || !Number.isFinite(n) || n < 0) { setErr('Enter a number of zero or more.'); return; }
      parsed = n;
    }
    if (field.kind === 'boolean') parsed = value === 'true';
    if (parsed === '') { setErr('Enter a value.'); return; }
    const pageNo = page.trim() ? Number(page) : null;
    if (pageNo !== null && (!Number.isInteger(pageNo) || pageNo < 1)) { setErr('Page must be a whole number.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const keepsDocument = !!entry?.document_id && parsed === entry.value;
      await onSave(rule, {
        value: parsed,
        clause: clause.trim() || null,
        page: pageNo,
        quote: quote.trim() || null,
        document_id: keepsDocument ? entry?.document_id : null,
        set_manually: !keepsDocument,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
      setSaving(false);
    }
  };

  const input = 'w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h4 className="text-white font-semibold">{field.label}</h4>
            <p className="text-xs text-slate-400 mt-1">Changes apply from the next dealing day.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-slate-400">Value{field.unit ? ` (${field.unit})` : ''}</span>
            {field.kind === 'select' ? (
              <select value={value} onChange={e => setValue(e.target.value)} className={`${input} mt-1`}>
                <option value="">Choose</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : field.kind === 'boolean' ? (
              <select value={value} onChange={e => setValue(e.target.value)} className={`${input} mt-1`}>
                <option value="">Choose</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input value={value} onChange={e => setValue(e.target.value)} inputMode={field.kind === 'number' ? 'decimal' : undefined} className={`${input} mt-1`} />
            )}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-400">Clause</span>
              <input value={clause} onChange={e => setClause(e.target.value)} placeholder="e.g. 12.3" className={`${input} mt-1`} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Page</span>
              <input value={page} onChange={e => setPage(e.target.value)} inputMode="numeric" className={`${input} mt-1`} />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-slate-400">Wording from the document (optional)</span>
            <textarea value={quote} onChange={e => setQuote(e.target.value)} rows={3} className={`${input} mt-1`} />
          </label>
          {err && <p className="text-sm text-red-300">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Save rule
          </button>
        </div>
      </div>
    </div>
  );
}
