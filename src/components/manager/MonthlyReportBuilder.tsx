import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, FileText, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTenantId } from '../../lib/useTenantId';
import TenantNotice from './TenantNotice';
import { MONTH_NAMES, buildReportNumbers, emptyNarrative, type ReportContent } from '../../lib/monthlyReport';
import MonthlyReportEditor, { type ReportRecord } from './MonthlyReportEditor';

interface Fund { id: string; fund_name: string }
interface ReportRow extends ReportRecord { period_start: string; created_at: string; parameters: { month?: number; year?: number } | null }

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  published: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  sent: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

function lastMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function MonthlyReportBuilder() {
  const { user } = useAuth();
  const { tenant: currentTenant, state: tenantState, retry } = useTenantId();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<ReportRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fundId: '', ...lastMonth() });

  const load = useCallback(async () => {
    if (!currentTenant?.id) return;
    setLoading(true);
    const [{ data: r, error: rErr }, { data: f, error: fErr }] = await Promise.all([
      supabase.from('reports').select('id, report_name, fund_id, status, report_content, sent_at, period_start, created_at, parameters')
        .eq('tenant_id', currentTenant.id).eq('report_type', 'monthly_update').order('period_start', { ascending: false }),
      supabase.from('funds').select('id, fund_name').eq('tenant_id', currentTenant.id).eq('status', 'active').order('fund_name'),
    ]);
    if (rErr || fErr) { console.error('reports load failed', rErr || fErr); setError('Could not load your reports. Please try again.'); }
    setReports((r ?? []) as ReportRow[]);
    setFunds(f ?? []);
    setForm((cur) => ({ ...cur, fundId: cur.fundId || f?.[0]?.id || '' }));
    setLoading(false);
  }, [currentTenant?.id]);

  useEffect(() => {
    if (currentTenant?.id) load();
    else if (tenantState === 'missing' || tenantState === 'error') setLoading(false);
  }, [load, currentTenant?.id, tenantState]);

  async function open(r: ReportRow) {
    const c = r.report_content as Partial<ReportContent> & { commentary?: string } | null;
    if (c?.version === 2) { setActive(r); return; }
    setBusy(true);
    setError('');
    try {
      const fund = funds.find((f) => f.id === r.fund_id);
      const year = r.parameters?.year ?? +r.period_start.slice(0, 4);
      const month = r.parameters?.month != null ? r.parameters.month + 1 : +r.period_start.slice(5, 7);
      const upgraded: ReportContent = { version: 2, ...emptyNarrative(), ...(await buildReportNumbers(r.fund_id, fund?.fund_name ?? 'Arkline Trust', year, month)), commentary: c?.commentary ?? '' };
      const { error: uErr } = await supabase.from('reports').update({ report_content: upgraded }).eq('id', r.id);
      if (uErr) throw uErr;
      setActive({ ...r, report_content: upgraded });
    } catch (e) {
      console.error('report open failed', e);
      setError('Could not open that report. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!currentTenant?.id || !user?.id || !form.fundId) return;
    const existing = reports.find((r) => r.fund_id === form.fundId && r.period_start === `${form.year}-${String(form.month).padStart(2, '0')}-01`);
    if (existing) { setCreating(false); open(existing); return; }
    setBusy(true);
    setError('');
    try {
      const fund = funds.find((f) => f.id === form.fundId);
      const nums = await buildReportNumbers(form.fundId, fund?.fund_name ?? 'Arkline Trust', form.year, form.month);
      const content: ReportContent = { version: 2, ...emptyNarrative(), ...nums };
      const { data, error: iErr } = await supabase.from('reports').insert({
        tenant_id: currentTenant.id, report_type: 'monthly_update', fund_id: form.fundId, generated_by: user.id, status: 'draft',
        report_name: `Monthly Update - ${nums.period.label} - ${fund?.fund_name ?? 'Fund'}`,
        period_start: nums.period.start, period_end: nums.period.end, report_content: content,
        parameters: { year: form.year, month: form.month - 1, fund_id: form.fundId },
      }).select('id, report_name, fund_id, status, report_content, sent_at').maybeSingle();
      if (iErr || !data) throw iErr ?? new Error('report insert returned no row');
      setCreating(false);
      setActive(data as ReportRecord);
      load();
    } catch (e) {
      console.error('report create failed', e);
      setError('Could not create the report. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (active) return <MonthlyReportEditor report={active} onBack={() => { setActive(null); load(); }} />;

  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);
  const sel = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';

  return (
    <div className="space-y-6">
      <TenantNotice state={tenantState} retry={retry} />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Monthly Investor Reports</h2>
          <p className="text-sm text-slate-400 mt-1">Branded monthly updates built from your approved fund values.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-emerald-600/20 transition-all">
          <Plus className="w-4 h-4" />New report
        </button>
      </div>

      {error && <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>
      ) : !reports.length ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-medium">No monthly reports yet</p>
          <p className="text-sm text-slate-400 mt-1">Create one once a month's fund value is ready.</p>
        </div>
      ) : (
        <ul className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden">
          {reports.map((r) => (
            <li key={r.id}>
              <button onClick={() => open(r)} disabled={busy} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#1a3c2a] border border-[#c9a84c]/40 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#c9a84c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{MONTH_NAMES[+r.period_start.slice(5, 7) - 1]} {r.period_start.slice(0, 4)}</p>
                  <p className="text-xs text-slate-500 truncate">{funds.find((f) => f.id === r.fund_id)?.fund_name ?? r.report_name}{r.sent_at ? ` · emailed ${new Date(r.sent_at).toLocaleDateString()}` : ''}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLE[r.status] ?? 'border-slate-700 text-slate-400'}`}>{r.status}</span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setCreating(false)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New monthly report</h3>
              <button onClick={() => setCreating(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {funds.length > 1 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fund</label>
                <select value={form.fundId} onChange={(e) => setForm({ ...form, fundId: e.target.value })} className={sel}>
                  {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Month</label>
                <select value={form.month} onChange={(e) => setForm({ ...form, month: +e.target.value })} className={sel}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Year</label>
                <select value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} className={sel}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button onClick={create} disabled={busy || !form.fundId} className="w-full inline-flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
