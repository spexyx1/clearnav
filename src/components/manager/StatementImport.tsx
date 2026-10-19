import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, ChevronDown, FileSpreadsheet, Loader2, RefreshCw, UploadCloud, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  GENERIC_FIELD_LABELS, TRADE_ACTION_LABELS, isMappingUsable, parseGenericRows, parseStatementText,
  type ColumnMapping, type GenericField, type ParsedStatement, type TradeAction,
} from '../../lib/statementParser';
import { buildMonthlyBatches, saveStatementBatches } from '../../lib/statementImport';

interface Fund { id: string; fund_name: string; fund_code: string }
interface ShareClass { id: string; fund_id: string; class_code: string; class_name: string }
interface MappingState { rows: string[][]; headerRow: number; headers: string[]; mapping: ColumnMapping }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

function actionSummary(st: ParsedStatement): Array<[string, number]> {
  const cash = (pred: (c: ParsedStatement['cashEvents'][number]) => boolean) => st.cashEvents.filter(pred).length;
  const rows: Array<[string, number]> = [
    ...(Object.keys(TRADE_ACTION_LABELS) as TradeAction[]).map((k): [string, number] => [TRADE_ACTION_LABELS[k], st.trades.filter((t) => t.action === k).length]),
    ['Dividends and withholding tax', cash((c) => c.type === 'dividend' || c.type === 'withholding')],
    ['Interest', cash((c) => c.type === 'interest')],
    ['Fees', cash((c) => c.type === 'fee')],
    ['Investor deposits and withdrawals', cash((c) => (c.type === 'deposit' || c.type === 'withdrawal') && !c.internal)],
    ['Transfers between your own accounts', cash((c) => !!c.internal)],
  ];
  return rows.filter(([, n]) => n > 0);
}
const fieldCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition';

export default function StatementImport({ onDone, onCancel }: { onDone: (saved: number) => void; onCancel: () => void }) {
  const { currentTenant, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [classes, setClasses] = useState<ShareClass[]>([]);
  const [fundId, setFundId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [mappingState, setMappingState] = useState<MappingState | null>(null);
  const [statement, setStatement] = useState<ParsedStatement | null>(null);
  const [accountToClass, setAccountToClass] = useState<Record<string, string>>({});
  const [showSkipped, setShowSkipped] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'no_company' | 'failed'>('loading');

  const loadFunds = useCallback(async () => {
    if (!user) return;
    setLoadState('loading');
    setError('');
    try {
      let tid = currentTenant?.id ?? '';
      let tname = currentTenant?.name ?? '';
      if (!tid) {
        const { data: links, error: lErr } = await supabase.from('tenant_users').select('tenant_id, platform_tenants(name)').eq('user_id', user.id).limit(1);
        if (lErr) throw lErr;
        const link = links?.[0] as { tenant_id: string; platform_tenants: { name: string } | { name: string }[] | null } | undefined;
        if (!link) { setLoadState('no_company'); return; }
        tid = link.tenant_id;
        const pt = Array.isArray(link.platform_tenants) ? link.platform_tenants[0] : link.platform_tenants;
        tname = pt?.name ?? '';
      }
      setTenantId(tid);
      setTenantName(tname);
      const { data: f, error: fErr } = await supabase.from('funds').select('id, fund_name, fund_code').eq('tenant_id', tid).eq('status', 'active').order('fund_name');
      if (fErr) throw fErr;
      const list = f ?? [];
      setFunds(list);
      setFundId((cur) => (list.some((x) => x.id === cur) ? cur : list[0]?.id ?? ''));
      if (list.length) {
        const { data: sc, error: scErr } = await supabase.from('share_classes').select('id, fund_id, class_code, class_name').in('fund_id', list.map((x) => x.id)).order('class_code');
        if (scErr) throw scErr;
        setClasses(sc ?? []);
      }
      setLoadState('ready');
    } catch (e) {
      console.error('could not load funds', e);
      setLoadState('failed');
    }
  }, [user, currentTenant?.id, currentTenant?.name]);

  useEffect(() => { loadFunds(); }, [loadFunds]);

  const fundClasses = classes.filter((c) => c.fund_id === fundId);

  async function applySavedMatches(st: ParsedStatement) {
    const initial: Record<string, string> = {};
    const { data } = await supabase.from('fund_broker_accounts').select('account_id, share_class_id').eq('fund_id', fundId);
    st.accounts.forEach((a) => {
      const saved = data?.find((m) => m.account_id === a);
      if (saved) initial[a] = saved.share_class_id;
    });
    if (st.accounts.length === 1 && !initial[st.accounts[0]] && fundClasses.length === 1) initial[st.accounts[0]] = fundClasses[0].id;
    setAccountToClass(initial);
  }

  async function finishParse(st: ParsedStatement) {
    if (!st.trades.length && !st.cashEvents.length && !st.positions.length) {
      setError('The file was read, but no trades, cash activity or positions were found in it.');
      return;
    }
    if (!st.periodStart || !st.periodEnd) {
      setError('Could not work out which dates this file covers.');
      return;
    }
    setStatement(st);
    setMappingState(null);
    await applySavedMatches(st);
  }

  async function readFile(f: File) {
    setFile(f);
    setError('');
    setStatement(null);
    setMappingState(null);
    setReading(true);
    try {
      const text = await f.text();
      const result = parseStatementText(text);
      if (result.kind === 'needs_mapping') setMappingState(result);
      else await finishParse(result.statement);
    } catch (e) {
      console.error('statement read failed', e);
      setError('This file could not be read. Please check it is the CSV export from your broker and try again.');
    } finally {
      setReading(false);
    }
  }

  function pickFile(f: File) {
    if (!fundId) {
      setFile(f);
      setError(loadState === 'loading' ? 'Still loading your funds. Please try again in a moment.' : 'Choose a fund before uploading. See the message on the left.');
      return;
    }
    readFile(f);
  }

  const batches = useMemo(() => (statement ? buildMonthlyBatches(statement, accountToClass) : []), [statement, accountToClass]);
  const unmatched = statement?.accounts.filter((a) => !accountToClass[a]) ?? [];
  const duplicateClass = useMemo(() => {
    const vals = Object.values(accountToClass).filter(Boolean);
    return vals.length !== new Set(vals).size;
  }, [accountToClass]);

  async function save() {
    if (!statement || !tenantId || !user || !file) return;
    setSaving(true);
    setError('');
    try {
      const saved = await saveStatementBatches({ tenantId, fundId, userId: user.id, filename: file.name, statement, batches, accountToClass });
      onDone(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The statement could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const className = (id: string) => fundClasses.find((c) => c.id === id)?.class_name ?? '';

  return (
    <div className="space-y-6">
      <button onClick={onCancel} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to uploads
      </button>
      <div>
        <h2 className="text-xl font-semibold text-white">Upload broker statement</h2>
        <p className="text-sm text-slate-400 mt-1">Drop in any broker export. Interactive Brokers activity statements are recognised automatically, including combined statements with several accounts.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Fund</label>
          {loadState === 'loading' ? (
            <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading funds…</p>
          ) : loadState !== 'ready' || funds.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {loadState === 'no_company'
                  ? 'This sign-in is not linked to a fund company. Sign in with your company account to upload statements.'
                  : loadState === 'failed'
                    ? 'Your funds could not be loaded right now.'
                    : 'No active fund was found for this company yet.'}
              </p>
              {loadState !== 'no_company' && (
                <button onClick={loadFunds} className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Try again
                </button>
              )}
            </div>
          ) : funds.length === 1 ? (
            <p className="text-sm text-white font-medium">{funds[0].fund_name} <span className="text-slate-500 font-normal">({funds[0].fund_code})</span></p>
          ) : (
            <select value={fundId} onChange={(e) => { setFundId(e.target.value); setStatement(null); setFile(null); }} className={fieldCls}>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
            </select>
          )}
          {tenantName && <p className="text-xs text-slate-500 mt-3">Company: <span className="text-slate-300">{tenantName}</span>{user?.email ? ` · signed in as ${user.email}` : ''}</p>}
          <p className="text-xs text-slate-500 mt-1">{fundClasses.length} share class{fundClasses.length === 1 ? '' : 'es'}: {fundClasses.map((c) => c.class_name).join(', ') || 'none'}</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={`lg:col-span-2 cursor-pointer rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all ${dragging ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/70'}`}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
          {reading ? <Loader2 className="w-9 h-9 text-blue-400 animate-spin" /> : <UploadCloud className="w-9 h-9 text-slate-400" />}
          <p className="mt-3 text-sm text-white font-medium">{file ? file.name : 'Drop a statement here or click to choose'}</p>
          <p className="text-xs text-slate-500 mt-1">CSV files from Interactive Brokers or any other broker</p>
          <span className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <UploadCloud className="w-4 h-4" /> Choose file
          </span>
        </div>
      </div>

      {mappingState && (
        <ColumnMapper
          state={mappingState}
          onChange={(mapping) => setMappingState({ ...mappingState, mapping })}
          onApply={() => finishParse(parseGenericRows(mappingState.rows, mappingState.headerRow, mappingState.mapping))}
        />
      )}

      {statement && (
        <>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <Wand2 className="w-3.5 h-3.5" /> {statement.format === 'ibkr_activity' ? 'Interactive Brokers activity statement' : 'Trade list'}
              </span>
              <span className="text-sm text-slate-300">{statement.periodStart} to {statement.periodEnd}</span>
              <span className="text-sm text-slate-500">{statement.trades.length} trades · {statement.cashEvents.length} cash items · {statement.positions.length} closing positions</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
              {actionSummary(statement).map(([label, n]) => (
                <div key={label} className="bg-slate-800/40 border border-slate-800 rounded-lg px-3 py-2">
                  <p className="text-lg font-semibold text-white tabular-nums">{n}</p>
                  <p className="text-xs text-slate-400 leading-snug">{label}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-white mb-1">Match each account to a share class</h3>
            <p className="text-xs text-slate-500 mb-4">This is remembered for next time.</p>
            <div className="space-y-2">
              {statement.accounts.map((a) => {
                const s = statement.summaries[a];
                const count = statement.trades.filter((t) => t.account === a).length;
                return (
                  <div key={a} className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 items-center bg-slate-800/40 border border-slate-800 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm text-white font-medium">{a === 'MAIN' ? 'All rows in file' : `Account ${a}`}{s?.name ? ` · ${s.name}` : ''}</p>
                      <p className="text-xs text-slate-500">{count} trades{s?.currentNav != null ? ` · broker value at end ${usd(s.currentNav)}` : ''}</p>
                    </div>
                    <select value={accountToClass[a] ?? ''} onChange={(e) => setAccountToClass({ ...accountToClass, [a]: e.target.value })} className={fieldCls}>
                      <option value="">Do not import</option>
                      {fundClasses.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            {duplicateClass && <p className="text-xs text-amber-300 mt-3">Two accounts are matched to the same share class. Their months will replace each other.</p>}
          </div>

          {statement.warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-200 space-y-1">
              {statement.warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          )}

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Month by month</h3>
              <span className="text-xs text-slate-500">{batches.length} month record{batches.length === 1 ? '' : 's'} will be saved</span>
            </div>
            {batches.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Match at least one account to a share class to continue.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <th className="px-5 py-3">Month</th><th className="px-5 py-3">Share class</th>
                      <th className="px-5 py-3 text-right">Trades</th><th className="px-5 py-3 text-right">Income</th>
                      <th className="px-5 py-3 text-right">Fees</th><th className="px-5 py-3 text-right">Deposits / withdrawals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {batches.map((b) => {
                      const ev = b.data.cash_events;
                      const sum = (types: string[]) => ev.filter((e) => types.includes(e.type)).reduce((s, e) => s + e.amount, 0);
                      const commissions = b.trades.reduce((s, t) => s + t.fees, 0);
                      return (
                        <tr key={`${b.account}-${b.year}-${b.month}`} className="hover:bg-slate-800/30">
                          <td className="px-5 py-3 text-white">{MONTHS[b.month - 1]} {b.year}</td>
                          <td className="px-5 py-3 text-slate-300">{className(b.shareClassId)}</td>
                          <td className="px-5 py-3 text-right text-slate-300">{b.trades.length}</td>
                          <td className="px-5 py-3 text-right text-slate-300">{usd(sum(['dividend', 'withholding', 'interest']))}</td>
                          <td className="px-5 py-3 text-right text-slate-300">{usd(sum(['fee']) - commissions)}</td>
                          <td className="px-5 py-3 text-right text-slate-300">{usd(sum(['deposit', 'withdrawal']))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {statement.skipped.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl">
              <button onClick={() => setShowSkipped(!showSkipped)} className="w-full flex items-center justify-between px-5 py-4 text-sm text-slate-300 hover:text-white">
                <span>{statement.skipped.length} row{statement.skipped.length === 1 ? ' was' : 's were'} skipped</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSkipped ? 'rotate-180' : ''}`} />
              </button>
              {showSkipped && (
                <div className="max-h-64 overflow-y-auto border-t border-slate-800 divide-y divide-slate-800">
                  {statement.skipped.map((s, i) => (
                    <div key={i} className="px-5 py-2 text-xs">
                      <span className="text-slate-500">Line {s.line} · {s.section} · </span>
                      <span className="text-amber-300">{s.reason}</span>
                      <p className="text-slate-500 truncate">{s.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button onClick={() => file && readFile(file)} className="flex items-center gap-2 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm border border-slate-700 hover:border-slate-500 transition-colors">
              <RefreshCw className="w-4 h-4" /> Read again
            </button>
            <button onClick={save} disabled={saving || batches.length === 0 || unmatched.length === statement.accounts.length}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : `Save ${batches.length} month${batches.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ColumnMapper({ state, onChange, onApply }: { state: MappingState; onChange: (m: ColumnMapping) => void; onApply: () => void }) {
  const sample = state.rows.slice(state.headerRow + 1, state.headerRow + 4);
  const fields = Object.keys(GENERIC_FIELD_LABELS) as GenericField[];
  const required: GenericField[] = ['date', 'symbol', 'quantity'];
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Tell us what the columns mean</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">We couldn't recognise every column in this file. Pick the matching column for each item; anything you leave blank is worked out where possible.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f}>
            <label className="block text-xs text-slate-400 mb-1">{GENERIC_FIELD_LABELS[f]}{required.includes(f) ? ' *' : ''}</label>
            <select
              value={state.mapping[f] ?? ''}
              onChange={(e) => onChange({ ...state.mapping, [f]: e.target.value === '' ? undefined : Number(e.target.value) })}
              className={fieldCls}
            >
              <option value="">Not in file</option>
              {state.headers.map((h, i) => (
                <option key={i} value={i}>{h || `Column ${i + 1}`}{sample[0]?.[i] ? ` (e.g. ${sample[0][i].slice(0, 18)})` : ''}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onApply} disabled={!isMappingUsable(state.mapping)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <Wand2 className="w-4 h-4" /> Read file with these columns
        </button>
      </div>
    </div>
  );
}
