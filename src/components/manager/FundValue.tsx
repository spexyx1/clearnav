import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, DownloadCloud, Loader2, RefreshCw, Save, Scale, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTenantId } from '../../lib/useTenantId';
import { describeResult, runFundAutomation } from '../../lib/fundAutomation';
import FundReviewQueue from './FundReviewQueue';
import TenantNotice from './TenantNotice';
import {
  approveClassMonth, loadFundData, refreshMarketPrices, saveDrafts, setManualPrice, valueFund,
  type ClassValuation, type FundData,
} from '../../lib/fundValuation';
import FundValueHoldings from './FundValueHoldings';
import FundValueBreakdown, { type PreviousFigures } from './FundValueBreakdown';
import BrokerConnection from './BrokerConnection';
import { hasIbkrConnection, pullFromIbkr } from '../../lib/ibkrSync';
import { reconcileFund, saveReconciliations, type Reconciliation } from '../../lib/reconciliation';
import ReconcileDialog, { ReconBadge } from './ReconcileDialog';

interface SavedRecon { share_class_id: string; month_end: string; status: string; difference: number; run_at: string }

interface Fund { id: string; fund_name: string }
interface SavedNav { share_class_id: string; nav_date: string; status: string; nav_per_share: number; net_asset_value: number; total_shares: number; previous: PreviousFigures | null }

const LINE_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m: string) => `${MONTHS[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

function UnitPriceChart({ valuations, names }: { valuations: ClassValuation[]; names: Record<string, string> }) {
  const series = valuations.filter((v) => v.months.length);
  const months = [...new Set(series.flatMap((v) => v.months.map((m) => m.month)))].sort();
  if (!months.length) return null;
  const values = series.flatMap((v) => v.months.map((m) => m.unitPrice)).concat(1);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const W = 640, H = 200, P = 32;
  const x = (i: number) => P + (months.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (months.length - 1));
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium text-white">Unit price by class</h3>
        <div className="flex flex-wrap gap-4">
          {series.map((v, i) => (
            <span key={v.classId} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
              {names[v.classId]}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
        <line x1={P} x2={W - P} y1={y(1)} y2={y(1)} stroke="#334155" strokeDasharray="4 4" />
        <text x={4} y={y(1) + 4} className="fill-slate-500 text-[10px]">$1.00</text>
        {months.map((m, i) => (
          <text key={m} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{MONTHS[+m.slice(5, 7) - 1]}</text>
        ))}
        {series.map((v, si) => {
          const pts = v.months.map((m) => `${x(months.indexOf(m.month))},${y(m.unitPrice)}`).join(' ');
          const color = LINE_COLORS[si % LINE_COLORS.length];
          return (
            <g key={v.classId}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
              {v.months.map((m) => <circle key={m.month} cx={x(months.indexOf(m.month))} cy={y(m.unitPrice)} r={3} fill={color} />)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function FundValue() {
  const { user } = useAuth();
  const { tenantId, state: tenantState, retry } = useTenantId();
  const [reviewKey, setReviewKey] = useState(0);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundId, setFundId] = useState('');
  const [data, setData] = useState<FundData | null>(null);
  const [saved, setSaved] = useState<SavedNav[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [recOpen, setRecOpen] = useState<string | null>(null);
  const [savedRecs, setSavedRecs] = useState<SavedRecon[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data: f, error: fErr } = await supabase.from('funds').select('id, fund_name').eq('tenant_id', tenantId).eq('status', 'active').order('fund_name');
      if (fErr) { console.error('funds load failed', fErr); setError('Could not load your funds. Please try again.'); return; }
      setFunds(f ?? []);
      if (f?.length) setFundId((cur) => cur || f[0].id);
    })();
  }, [tenantId]);

  const reload = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    setError('');
    try {
      const [d, { data: navs, error: nErr }, { data: rc, error: rcErr }] = await Promise.all([loadFundData(fundId), supabase.from('nav_calculations')
        .select('share_class_id, nav_date, status, nav_per_share, net_asset_value, total_shares, previous:calculation_data->previous').eq('fund_id', fundId).neq('calculation_method', 'opening').neq('status', 'superseded'),
        supabase.from('fund_reconciliations').select('share_class_id, month_end, status, difference, run_at').eq('fund_id', fundId)]);
      if (nErr) throw nErr;
      if (rcErr) throw rcErr;
      setData(d);
      setSaved((navs ?? []) as SavedNav[]);
      setSavedRecs((rc ?? []) as SavedRecon[]);
    } catch (e) {
      console.error('fund value load failed', e);
      setError('Could not load the fund value. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => { reload(); }, [reload]);

  const valuations = useMemo(() => (data ? valueFund(data) : []), [data]);
  const recs = useMemo(() => Object.fromEntries(reconcileFund(valuations).map((r) => [`${r.classId}-${r.month}`, r])) as Record<string, Reconciliation>, [valuations]);
  const lastReconciled = useMemo(() => savedRecs.reduce((m, r) => (r.run_at > m ? r.run_at : m), ''), [savedRecs]);

  useEffect(() => {
    if (!tenantId || !fundId || loading) return;
    const stored = new Map(savedRecs.map((s) => [`${s.share_class_id}-${s.month_end.slice(0, 7)}`, s]));
    const changed = Object.values(recs).filter((r) => {
      const s = stored.get(`${r.classId}-${r.month}`);
      return !r.provisional && (!s || s.status !== r.status || Number(s.difference) !== r.difference);
    });
    if (!changed.length) return;
    saveReconciliations(tenantId, fundId, changed)
      .then(() => setSavedRecs((cur) => [...cur.filter((s) => !changed.some((c) => c.classId === s.share_class_id && s.month_end.startsWith(c.month))),
        ...changed.map((c) => ({ share_class_id: c.classId, month_end: `${c.month}-01`, status: c.status, difference: c.difference, run_at: new Date().toISOString() }))]))
      .catch((e) => console.error('auto reconciliation save failed', e));
  }, [recs, savedRecs, tenantId, fundId, loading]);
  const names = useMemo(() => Object.fromEntries((data?.classes ?? []).map((c) => [c.id, c.class_name])), [data]);
  const months = useMemo(() => [...new Set(valuations.flatMap((v) => v.months.map((m) => m.month)))].sort(), [valuations]);
  const statusOf = (classId: string, date: string) => savedRow(classId, date)?.status ?? null;
  const savedRow = (classId: string, date: string) => {
    const rows = saved.filter((s) => s.share_class_id === classId && s.nav_date === date);
    return rows.find((r) => r.status === 'approved') ?? rows[0] ?? null;
  };
  const previousOf = (classId: string, r: { date: string; unitPrice: number }): PreviousFigures | null => {
    const row = savedRow(classId, r.date);
    if (!row) return null;
    if (Math.abs(Number(row.nav_per_share) - r.unitPrice) > 1e-6) {
      return { unit_price: Number(row.nav_per_share), class_value: Number(row.net_asset_value), units: Number(row.total_shares), replaced_at: '' };
    }
    return row.previous;
  };
  const missingCount = valuations.reduce((s, v) => s + v.months.reduce((t, m) => t + m.unofficialPrices.length, 0), 0);

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      setMessage(await fn());
      await reload();
    } catch (e) {
      console.error('fund value action failed', e);
      setError('That did not work. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const doRefresh = () => run('prices', async () => {
    if (!data || !tenantId || !user?.id) return '';
    let ibkr = '';
    try {
      ibkr = await hasIbkrConnection(fundId)
        ? await pullFromIbkr(tenantId, fundId, user.id)
        : 'Interactive Brokers is not connected, so no official prices could be fetched.';
    } catch (e) {
      console.error('ibkr price pull failed', e);
      ibkr = 'Interactive Brokers could not be reached, so no new official prices were added.';
    }
    const fresh = await loadFundData(fundId);
    const r = await refreshMarketPrices(tenantId, fundId, valueFund(fresh), fresh);
    const info = r.updated || r.failed.length
      ? ` Public prices were looked up for ${r.updated} holding${r.updated === 1 ? '' : 's'} for information only; months using them stay "Not final - waiting for IBKR price".`
      : '';
    return `${ibkr}${info}`.trim();
  });
  const doSave = () => run('save', async () => {
    if (!user?.id) return '';
    const r = await saveDrafts(fundId, user.id, valuations);
    return `Saved ${r.saved} monthly values as drafts${r.skippedApproved ? `; ${r.skippedApproved} already approved and left unchanged` : ''}.`;
  });
  const doReconcile = () => run('reconcile', async () => {
    if (!tenantId || !user?.id) return '';
    let pulled = '';
    try {
      if (await hasIbkrConnection(fundId)) { await pullFromIbkr(tenantId, fundId, user.id); pulled = 'Fresh data pulled from Interactive Brokers. '; }
      else pulled = 'Interactive Brokers is not connected, so the last saved statements were used. ';
    } catch (e) {
      console.error('reconcile ibkr pull failed', e);
      pulled = 'Interactive Brokers could not be reached, so the last saved statements were used. ';
    }
    setReviewKey((k) => k + 1);
    const list = reconcileFund(valueFund(await loadFundData(fundId)));
    await saveReconciliations(tenantId, fundId, list);
    const n = (s: string) => list.filter((r) => r.status === s).length;
    return `${pulled}Reconciled ${list.length} class-month${list.length === 1 ? '' : 's'}: ${n('matched')} match to the cent, ${n('within_tolerance')} within $1, ${n('not_matched')} need attention.`;
  });
  const doApprove = (classId: string, month: string, date: string, reason = '') => run(`approve-${classId}-${month}`, async () => {
    if (!user?.id) return '';
    const rec = recs[`${classId}-${month}`];
    const n = await approveClassMonth(fundId, classId, date, user.id, { status: rec.status, difference: rec.difference, reason });
    setRecOpen(null);
    return n ? `Approved ${names[classId]} for ${monthLabel(month)}${rec.status === 'matched' ? '' : ' with exceptions recorded'}.` : 'Nothing to approve. Save drafts first.';
  });
  async function automate() {
    if (!tenantId || !user?.id || !fundId) return '';
    try {
      return describeResult(await runFundAutomation(tenantId, fundId, user.id));
    } catch (e) {
      console.error('fund automation failed', e);
      return 'Figures could not be updated automatically; try again shortly.';
    } finally {
      setReviewKey((k) => k + 1);
    }
  }

  const onSetPrice = async (symbol: string, date: string, price: number | null) => {
    if (!tenantId) return;
    try {
      await setManualPrice(tenantId, fundId, symbol, date, price);
      setMessage(await automate());
      await reload();
    } catch (e) {
      console.error('manual price save failed', e);
      setError('Could not save that price. Please try again.');
    }
  };

  const btn = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Fund Value</h2>
          <p className="text-sm text-slate-400 mt-1">Month-end value and unit price for each share class, built from your broker statements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {funds.length > 1 && (
            <select value={fundId} onChange={(e) => setFundId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
              {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
            </select>
          )}
          <button onClick={doRefresh} disabled={!!busy || !months.length} className={`${btn} bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700`}>
            {busy === 'prices' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            Fetch missing prices{missingCount ? ` (${missingCount})` : ''}
          </button>
          <button onClick={doReconcile} disabled={!!busy || !months.length} title={lastReconciled ? `Last reconciled ${new Date(lastReconciled).toLocaleString()}` : 'Check every month against Interactive Brokers'}
            className={`${btn} bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700`}>
            {busy === 'reconcile' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
            Reconcile
          </button>
          <button onClick={doSave} disabled={!!busy || !months.length} className={`${btn} bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20`}>
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save as drafts
          </button>
          <button onClick={reload} disabled={loading} title="Reload" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <TenantNotice state={tenantState} retry={retry} />
      {tenantId && user?.id && fundId && (
        <BrokerConnection tenantId={tenantId} fundId={fundId} userId={user.id} onSynced={(m) => { setMessage(m); setReviewKey((k) => k + 1); reload(); }} />
      )}
      {tenantId && user?.id && (
        <FundReviewQueue tenantId={tenantId} userId={user.id} refreshKey={reviewKey} onApplied={(m) => { setMessage(m); reload(); }} />
      )}

      {error && <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
      {message && <div className="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{message}</div>}

      {loading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : !months.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-white font-medium">No months to value yet</p>
          <p className="text-sm text-slate-400 mt-1">Upload a broker statement in Trade Upload and it will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {valuations.map((v, i) => {
              const last = v.months[v.months.length - 1];
              const cls = data?.classes.find((c) => c.id === v.classId);
              const ytd = last && cls ? last.unitPrice / cls.startPrice - 1 : 0;
              return (
                <div key={v.classId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
                    <p className="text-sm text-slate-400">{names[v.classId]}</p>
                  </div>
                  <p className="text-3xl font-semibold text-white mt-2 tabular-nums">${(last?.unitPrice ?? cls?.startPrice ?? 1).toFixed(4)}</p>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className={ytd >= 0 ? 'text-emerald-400' : 'text-red-400'}>{pct(ytd)} since start</span>
                    <span className="text-slate-400 tabular-nums">{usd(last?.classNav ?? 0)}</span>
                  </div>
                  {v.notes.length > 0 && (
                    <details className="mt-3 text-xs text-amber-300/90">
                      <summary className="cursor-pointer select-none">{v.notes.length} note{v.notes.length === 1 ? '' : 's'}</summary>
                      <ul className="mt-2 space-y-1 list-disc pl-4 text-slate-400">{v.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          <UnitPriceChart valuations={valuations} names={names} />

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {months.map((m) => {
              const rows = valuations.map((v) => ({ v, r: v.months.find((x) => x.month === m) })).filter((x) => x.r);
              const allApproved = rows.every(({ v, r }) => statusOf(v.classId, r!.date) === 'approved');
              return (
                <div key={m} className="border-b border-slate-800 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900/80">
                    <p className="text-white font-medium">{monthLabel(m)}</p>
                    {allApproved && <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><ShieldCheck className="w-4 h-4" />All classes approved</span>}
                  </div>
                  {rows.map(({ v, r }) => {
                    const key = `${v.classId}-${m}`;
                    const st = statusOf(v.classId, r!.date);
                    return (
                      <Fragment key={key}>
                        <div role="button" tabIndex={0} onClick={() => setOpen(open === key ? null : key)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(open === key ? null : key); }} className="w-full cursor-pointer grid grid-cols-2 sm:grid-cols-6 gap-2 items-center px-4 sm:px-6 py-3 text-left text-sm hover:bg-slate-800/50 transition-colors">
                          <span className="col-span-2 sm:col-span-2 flex items-center gap-2 text-slate-200">
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open === key ? 'rotate-180' : ''}`} />
                            {names[v.classId]}
                            {r!.trackRecord && data?.officialAccounts[v.classId] && (
                              <span title="Valued from the pre-launch account, before the official Arkline Trust account went live" className="text-xs px-2 py-0.5 rounded-full border border-slate-600 text-slate-400">Track record</span>
                            )}
                          </span>
                          <span className="tabular-nums text-white">${r!.unitPrice.toFixed(4)}</span>
                          <span className={`tabular-nums ${r!.monthReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pct(r!.monthReturn)}
                            <span className="block text-xs opacity-80">
                              {(() => { const g = r!.investmentGain; return `${g >= 0 ? '+' : '-'}${usd(Math.abs(g))}`; })()}
                            </span>
                          </span>
                          <span className="tabular-nums text-slate-300">{usd(r!.classNav)}</span>
                          <span className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${st === 'approved' ? 'border-emerald-500/30 text-emerald-300' : st ? 'border-sky-500/30 text-sky-300' : 'border-slate-700 text-slate-500'}`}>
                              {st === 'approved' ? 'Approved' : st ? 'Draft' : 'Not saved'}
                            </span>
                            {(() => {
                              const rec = recs[key];
                              if (!rec) return null;
                              const direct = rec.status === 'matched' && r!.final;
                              return (
                                <>
                                  <ReconBadge rec={rec} onClick={() => setRecOpen(key)} />
                                  {st && st !== 'approved' && !rec.provisional && (
                                    <button onClick={(e) => { e.stopPropagation(); if (direct) doApprove(v.classId, m, r!.date); else setRecOpen(key); }} disabled={!!busy}
                                      className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 border border-emerald-500/30 transition disabled:opacity-50">
                                      {busy === `approve-${v.classId}-${m}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                      Approve
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </span>
                        </div>
                        {open === key && (
                          <>
                            <FundValueBreakdown month={r!} previous={previousOf(v.classId, r!)} />
                            <FundValueHoldings month={r!} locked={st === 'approved'} onSetPrice={onSetPrice} />
                          </>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {recOpen && recs[recOpen] && (() => {
        const rec = recs[recOpen];
        const st = statusOf(rec.classId, rec.date);
        return (
          <ReconcileDialog rec={rec} title={`${names[rec.classId]} - ${monthLabel(rec.month)}`}
            canApprove={!!st && st !== 'approved' && !rec.provisional}
            approving={busy === `approve-${rec.classId}-${rec.month}`}
            onApprove={(reason) => doApprove(rec.classId, rec.month, rec.date, reason)}
            onClose={() => setRecOpen(null)} />
        );
      })()}
    </div>
  );
}
