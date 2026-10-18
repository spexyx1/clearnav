import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, DownloadCloud, Loader2, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  approveMonth, loadFundData, refreshMarketPrices, saveDrafts, setManualPrice, valueFund,
  type ClassValuation, type FundData,
} from '../../lib/fundValuation';
import FundValueHoldings from './FundValueHoldings';

interface Fund { id: string; fund_name: string }
interface SavedNav { share_class_id: string; nav_date: string; status: string; nav_per_share: number }

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
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundId, setFundId] = useState('');
  const [data, setData] = useState<FundData | null>(null);
  const [saved, setSaved] = useState<SavedNav[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTenant?.id) return;
    (async () => {
      const { data: f, error: fErr } = await supabase.from('funds').select('id, fund_name').eq('tenant_id', currentTenant.id).eq('status', 'active').order('fund_name');
      if (fErr) { setError(fErr.message); return; }
      setFunds(f ?? []);
      if (f?.length) setFundId((cur) => cur || f[0].id);
    })();
  }, [currentTenant?.id]);

  const reload = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    setError('');
    try {
      const d = await loadFundData(fundId);
      const { data: navs, error: nErr } = await supabase.from('nav_calculations')
        .select('share_class_id, nav_date, status, nav_per_share').eq('fund_id', fundId).neq('calculation_method', 'opening');
      if (nErr) throw new Error(nErr.message);
      setData(d);
      setSaved((navs ?? []) as SavedNav[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load fund value');
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => { reload(); }, [reload]);

  const valuations = useMemo(() => (data ? valueFund(data) : []), [data]);
  const names = useMemo(() => Object.fromEntries((data?.classes ?? []).map((c) => [c.id, c.class_name])), [data]);
  const months = useMemo(() => [...new Set(valuations.flatMap((v) => v.months.map((m) => m.month)))].sort(), [valuations]);
  const statusOf = (classId: string, date: string) => {
    const rows = saved.filter((s) => s.share_class_id === classId && s.nav_date === date);
    return rows.find((r) => r.status === 'approved')?.status ?? rows[0]?.status ?? null;
  };
  const missingCount = valuations.reduce((s, v) => s + v.months.reduce((t, m) => t + m.holdings.filter((h) => h.priceSource === 'trade' || h.priceSource === 'missing').length, 0), 0);

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      setMessage(await fn());
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const doRefresh = () => run('prices', async () => {
    if (!data || !currentTenant?.id) return '';
    const r = await refreshMarketPrices(currentTenant.id, fundId, valuations, data);
    return r.failed.length ? `Updated ${r.updated} prices. No market price found for ${r.failed.join(', ')}; set these by hand.` : `Updated ${r.updated} month-end prices.`;
  });
  const doSave = () => run('save', async () => {
    if (!user?.id) return '';
    const r = await saveDrafts(fundId, user.id, valuations);
    return `Saved ${r.saved} monthly values as drafts${r.skippedApproved ? `; ${r.skippedApproved} already approved and left unchanged` : ''}.`;
  });
  const doApprove = (month: string) => run(`approve-${month}`, async () => {
    if (!user?.id) return '';
    const date = valuations.flatMap((v) => v.months).find((m) => m.month === month)?.date;
    if (!date) return '';
    const n = await approveMonth(fundId, date, user.id);
    return n ? `Approved ${monthLabel(month)} for ${n} class${n === 1 ? '' : 'es'}.` : 'Nothing to approve. Save drafts first.';
  });
  const onSetPrice = async (symbol: string, date: string, price: number | null) => {
    if (!currentTenant?.id) return;
    try {
      await setManualPrice(currentTenant.id, fundId, symbol, date, price);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save price');
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
            Update market prices{missingCount ? ` (${missingCount})` : ''}
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
              const anyDraft = rows.some(({ v, r }) => statusOf(v.classId, r!.date) && statusOf(v.classId, r!.date) !== 'approved');
              return (
                <div key={m} className="border-b border-slate-800 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900/80">
                    <p className="text-white font-medium">{monthLabel(m)}</p>
                    {allApproved ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><ShieldCheck className="w-4 h-4" />Approved</span>
                    ) : (
                      <button onClick={() => doApprove(m)} disabled={!!busy || !anyDraft} title={anyDraft ? '' : 'Save drafts first'}
                        className={`${btn} py-1.5 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 border border-emerald-500/30`}>
                        {busy === `approve-${m}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Approve month
                      </button>
                    )}
                  </div>
                  {rows.map(({ v, r }) => {
                    const key = `${v.classId}-${m}`;
                    const st = statusOf(v.classId, r!.date);
                    return (
                      <Fragment key={key}>
                        <button onClick={() => setOpen(open === key ? null : key)} className="w-full grid grid-cols-2 sm:grid-cols-6 gap-2 items-center px-4 sm:px-6 py-3 text-left text-sm hover:bg-slate-800/50 transition-colors">
                          <span className="col-span-2 sm:col-span-2 flex items-center gap-2 text-slate-200">
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open === key ? 'rotate-180' : ''}`} />
                            {names[v.classId]}
                          </span>
                          <span className="tabular-nums text-white">${r!.unitPrice.toFixed(4)}</span>
                          <span className={`tabular-nums ${r!.monthReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pct(r!.monthReturn)}</span>
                          <span className="tabular-nums text-slate-300">{usd(r!.classNav)}</span>
                          <span className="text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${st === 'approved' ? 'border-emerald-500/30 text-emerald-300' : st ? 'border-sky-500/30 text-sky-300' : 'border-slate-700 text-slate-500'}`}>
                              {st === 'approved' ? 'Approved' : st ? 'Draft' : 'Not saved'}
                            </span>
                            {r!.missingPrices.length > 0 && <span className="ml-2 text-xs text-red-300">{r!.missingPrices.length} unpriced</span>}
                          </span>
                        </button>
                        {open === key && <FundValueHoldings month={r!} locked={st === 'approved'} onSetPrice={onSetPrice} />}
                      </Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
