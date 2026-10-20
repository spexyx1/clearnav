import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FilePlus2, Loader2, PencilLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTenantId } from '../../lib/useTenantId';
import { formatNumber } from '../../lib/format';
import {
  DOC_LABEL, TAX_FIELDS, breakdownComplete, createTaxDocuments, loadHolders, periodFor, saveBreakdown,
  type Holder, type RegisterFacts, type TaxDocType,
} from '../../lib/taxDocuments';
import type { UnitRegister } from '../../lib/unitRegister';
import TenantNotice from './TenantNotice';
import { PanelLoader } from '../shared/Spinner';
import { FundSelect, PageHeader, useFunds } from './history/useFunds';
import { Button, Empty, Field, Modal, Pill, Section, input, usd } from './onboarding/ui';

interface TaxDocRow {
  id: string;
  document_type: string;
  tax_year: number;
  document_status: string;
  finalized_date: string | null;
  notes: string | null;
  tax_breakdown: Record<string, number>;
  register_facts: Partial<RegisterFacts>;
  capital_account: { account_number: string | null; investor: { full_name: string | null; email: string | null } | null } | null;
}

const STATUS: Record<string, { label: string; tone: 'amber' | 'cyan' | 'green' | 'slate' }> = {
  draft: { label: 'Draft', tone: 'amber' },
  review: { label: 'In review', tone: 'amber' },
  finalized: { label: 'Finalised', tone: 'cyan' },
  ready: { label: 'Ready', tone: 'green' },
  sent: { label: 'Sent', tone: 'green' },
  filed: { label: 'Filed', tone: 'green' },
};

const money = (v: number | null | undefined) => (v == null ? '—' : usd(Number(v)));
const thisYear = new Date().getFullYear();

export default function TaxDocumentManager() {
  const { user } = useAuth();
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [type, setType] = useState<TaxDocType>('annual_statement');
  const [year, setYear] = useState(new Date().getMonth() >= 6 ? thisYear + 1 : thisYear);
  const [docs, setDocs] = useState<TaxDocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<TaxDocRow | null>(null);
  const [picker, setPicker] = useState<{ register: UnitRegister; holders: Holder[] } | null>(null);

  const period = periodFor(type, year);

  const load = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    const { data, error } = await supabase.from('tax_documents')
      .select('id, document_type, tax_year, document_status, finalized_date, notes, tax_breakdown, register_facts, capital_account:capital_accounts!capital_account_id(account_number, investor:client_profiles!investor_id(full_name, email))')
      .eq('fund_id', fundId).eq('tax_year', year).eq('document_type', type).order('created_at', { ascending: false });
    if (error) setMessage({ ok: false, text: 'Could not load the tax documents. Please try again.' });
    else setDocs((data ?? []) as unknown as TaxDocRow[]);
    setLoading(false);
  }, [fundId, year, type]);

  useEffect(() => { load(); }, [load]);

  const create = async (accountIds?: string[], preloaded?: UnitRegister) => {
    if (!tenantId || !user || !fundId) return;
    setBusy('create');
    setMessage(null);
    try {
      let register = preloaded;
      let ids = accountIds;
      if (!register || !ids) {
        const loaded = await loadHolders(fundId, type, year);
        if (type === 'k1') { setPicker(loaded); return; }
        register = loaded.register;
        ids = loaded.holders.filter((h) => h.held).map((h) => h.id);
      }
      if (!ids.length) { setMessage({ ok: false, text: `No investor held units during ${period.label}.` }); return; }
      const r = await createTaxDocuments({ tenantId, fundId, userId: user.id, type, year, accountIds: ids, register });
      setMessage({ ok: true, text: `Created ${r.created} document${r.created === 1 ? '' : 's'}.${r.skipped ? ` ${r.skipped} already existed.` : ''} Enter the tax figures for each one before finalising.` });
      setPicker(null);
      load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || 'Could not create the documents.' });
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (doc: TaxDocRow, status: 'finalized' | 'ready') => {
    setBusy(doc.id);
    setMessage(null);
    const patch = status === 'finalized' ? { document_status: status, finalized_date: new Date().toISOString().slice(0, 10) } : { document_status: status };
    const { error } = await supabase.from('tax_documents').update(patch).eq('id', doc.id);
    if (error) setMessage({ ok: false, text: 'Could not update the document. Please try again.' });
    else load();
    setBusy(null);
  };

  if (state === 'loading') return <PanelLoader />;
  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tax" strong="Documents"
        intro="Holding facts come straight from the unit register and IBKR-confirmed prices. You enter the tax breakdown from your accountant's figures. A document can only be finalised once every figure is entered.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${input} w-auto`}>
          {Array.from({ length: 5 }, (_, i) => thisYear + 1 - i).map((y) => (
            <option key={y} value={y}>{type === 'annual_statement' ? `FY${y}` : y}</option>
          ))}
        </select>
      </PageHeader>

      {fundsError && <p className="text-sm text-red-300">{fundsError}</p>}

      <div className="flex rounded-lg border border-slate-700 p-0.5 w-fit">
        {(['annual_statement', 'k1'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${type === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t === 'annual_statement' ? 'Australian annual statements' : 'K-1s (selected investors)'}
          </button>
        ))}
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>{message.text}</div>
      )}

      <Section title={`${DOC_LABEL[type]}s · ${period.label}`}
        hint={type === 'annual_statement' ? 'One statement for every investor who held units during the year.' : 'Only for the investors you pick, such as US taxpayers.'}
        action={
          <Button onClick={() => create()} loading={busy === 'create'} disabled={!fundId}>
            <FilePlus2 className="w-3.5 h-3.5" />{type === 'annual_statement' ? 'Create for all holders' : 'Choose investors'}
          </Button>
        }>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading</div>
        ) : !docs.length ? (
          <Empty>No documents for this year yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-y border-slate-800">
                  <th className="px-5 py-2 font-medium">Investor</th>
                  <th className="px-5 py-2 font-medium text-right">Units start / end</th>
                  <th className="px-5 py-2 font-medium text-right">Value at year end</th>
                  <th className="px-5 py-2 font-medium">Tax figures</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {docs.map((d) => {
                  const inv = d.capital_account?.investor;
                  const f = d.register_facts ?? {};
                  const complete = breakdownComplete(d.document_type, d.tax_breakdown ?? {});
                  const confirmed = f.year_end_confirmed === true;
                  const st = STATUS[d.document_status] ?? { label: d.document_status, tone: 'slate' as const };
                  const editable = d.document_status === 'draft' || d.document_status === 'review';
                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-slate-200">{inv?.full_name || inv?.email || 'Unnamed investor'}</p>
                        <p className="text-xs text-slate-500">{d.capital_account?.account_number || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">{formatNumber(f.units_start, 4)} / {formatNumber(f.units_end, 4)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {money(f.value_end)}
                        {!confirmed && <p className="text-xs text-amber-300">Year end awaiting IBKR</p>}
                      </td>
                      <td className="px-5 py-3">{complete ? <Pill tone="green">Entered</Pill> : <Pill tone="amber">Needed</Pill>}</td>
                      <td className="px-5 py-3"><Pill tone={st.tone}>{st.label}</Pill></td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {editable && <Button tone="quiet" onClick={() => setEditing(d)}><PencilLine className="w-3.5 h-3.5" />Tax figures</Button>}
                          {editable && (
                            <Button onClick={() => setStatus(d, 'finalized')} loading={busy === d.id} disabled={!complete || !confirmed}
                              title={!complete ? 'Enter every tax figure first' : !confirmed ? 'The year-end price is not yet confirmed by IBKR' : undefined}>Finalise</Button>
                          )}
                          {d.document_status === 'finalized' && <Button onClick={() => setStatus(d, 'ready')} loading={busy === d.id}><CheckCircle2 className="w-3.5 h-3.5" />Mark as ready</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {editing && <BreakdownModal doc={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {picker && <HolderPicker holders={picker.holders} busy={busy === 'create'} onClose={() => setPicker(null)} onCreate={(ids) => create(ids, picker.register)} />}
    </div>
  );
}

function HolderPicker({ holders, busy, onClose, onCreate }: { holders: Holder[]; busy: boolean; onClose: () => void; onCreate: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setPicked((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Modal title="Choose investors for K-1s" onClose={onClose}>
      {!holders.length ? <p className="text-sm text-slate-400">There are no investor accounts yet.</p> : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {holders.map((h) => (
            <label key={h.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-800 cursor-pointer">
              <input type="checkbox" checked={picked.has(h.id)} onChange={() => toggle(h.id)} className="accent-cyan-500" />
              <span className="flex-1 text-sm text-slate-200">{h.name}<span className="block text-xs text-slate-500">{h.accountNumber || h.email || ''}</span></span>
              {!h.held && <span className="text-xs text-slate-500">No units this year</span>}
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onCreate([...picked])} loading={busy} disabled={!picked.size}>Create {picked.size || ''} K-1{picked.size === 1 ? '' : 's'}</Button>
      </div>
    </Modal>
  );
}

function BreakdownModal({ doc, onClose, onSaved }: { doc: TaxDocRow; onClose: () => void; onSaved: () => void }) {
  const type = doc.document_type as TaxDocType;
  const fields = TAX_FIELDS[type] ?? [];
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, doc.tax_breakdown?.[f.key] != null ? String(doc.tax_breakdown[f.key]) : ''])),
  );
  const [notes, setNotes] = useState(doc.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const f = doc.register_facts ?? {};

  const save = async () => {
    const parsed: Record<string, number> = {};
    for (const field of fields) {
      const raw = values[field.key].trim();
      if (raw === '') continue;
      const n = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(n)) { setError(`"${field.label}" must be a number.`); return; }
      parsed[field.key] = n;
    }
    setSaving(true);
    setError('');
    try {
      await saveBreakdown(doc.id, type, parsed, notes.trim());
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const facts: [string, string][] = [
    ['Units at start', formatNumber(f.units_start, 4)],
    ['Units at end', formatNumber(f.units_end, 4)],
    ['Value at start', money(f.value_start)],
    ['Value at end', money(f.value_end)],
    ['Invested', money(f.invested)],
    ['Redeemed', money(f.redeemed)],
    ['Fees charged', money(f.fees)],
    ['Fee rebates', money(f.rebates)],
  ];

  return (
    <Modal title={`${DOC_LABEL[type] ?? 'Tax document'} · ${doc.capital_account?.investor?.full_name || 'Investor'}`} onClose={onClose}>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">From the register</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {facts.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-slate-400">{k}</dt><dd className="text-slate-200 tabular-nums">{v}</dd></div>)}
        </dl>
        {f.year_end_confirmed !== true && (
          <p className="flex items-start gap-2 text-xs text-amber-300 mt-3"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />The year-end price is not yet confirmed by IBKR, so this document cannot be finalised.</p>
        )}
      </div>
      <div className="border-t border-slate-800 pt-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-slate-500">Tax breakdown (enter 0 where none)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((field) => (
            <Field key={field.key} label={field.label} hint={field.hint}>
              <input inputMode="decimal" value={values[field.key]} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} className={input} placeholder="0.00" />
            </Field>
          ))}
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button tone="quiet" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save figures</Button>
      </div>
    </Modal>
  );
}
