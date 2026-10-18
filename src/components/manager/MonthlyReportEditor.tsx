import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, Eye, FileEdit, Loader2, RefreshCw, Save, Send, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { buildReportNumbers, loadInvestors, type InvestorLine, type ReportContent } from '../../lib/monthlyReport';
import { downloadReportPdf, emailReport, loadSenderAccounts, publishReport, type EmailAccount } from '../../lib/reportDelivery';
import MonthlyReportPreview from './MonthlyReportPreview';

export interface ReportRecord {
  id: string; report_name: string; fund_id: string; status: string; report_content: ReportContent; sent_at: string | null;
}

const area = 'w-full bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-3 text-sm leading-relaxed text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition resize-y';
const btn = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export default function MonthlyReportEditor({ report, onBack }: { report: ReportRecord; onBack: () => void }) {
  const { currentTenant, user } = useAuth();
  const [content, setContent] = useState<ReportContent>(report.report_content);
  const [status, setStatus] = useState(report.status);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [investors, setInvestors] = useState<InvestorLine[]>([]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  const patch = (p: Partial<ReportContent>) => { setContent((c) => ({ ...c, ...p })); setDirty(true); };
  const setClassNote = (code: string, v: string) => patch({ class_notes: { ...content.class_notes, [code]: v } });
  const setPositionNote = (code: string, sym: string, v: string) =>
    patch({ position_notes: { ...content.position_notes, [code]: { ...(content.position_notes[code] ?? {}), [sym]: v } } });

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    try { setToast({ ok: true, msg: await fn() }); } catch (e) { setToast({ ok: false, msg: e instanceof Error ? e.message : 'Something went wrong' }); } finally { setBusy(null); }
  }

  async function persist(c: ReportContent) {
    const { error } = await supabase.from('reports').update({ report_content: c }).eq('id', report.id);
    if (error) throw new Error(error.message);
    setDirty(false);
  }

  const save = () => run('save', async () => { await persist(content); return 'Report saved.'; });
  const refresh = () => run('refresh', async () => {
    const nums = await buildReportNumbers(report.fund_id, content.fund_name, content.period.year, content.period.month);
    const next = { ...content, ...nums };
    setContent(next);
    await persist(next);
    return 'Figures refreshed from the latest fund values. Your writing was kept.';
  });
  const pdf = () => run('pdf', async () => { await downloadReportPdf(content); return 'PDF downloaded.'; });
  const publish = () => run('publish', async () => {
    if (!currentTenant?.id) return '';
    if (dirty) await persist(content);
    await publishReport(currentTenant.id, report.id, report.report_name, content);
    setStatus('published');
    return 'Published to the investor vault.';
  });

  async function openSend() {
    if (!currentTenant?.id) return;
    setSendOpen(true);
    try {
      const [acc, inv] = await Promise.all([loadSenderAccounts(currentTenant.id), loadInvestors(report.fund_id, content)]);
      setAccounts(acc);
      setAccountId((cur) => cur || acc.find((a) => a.email_address.startsWith('hello@'))?.id || acc[0]?.id || '');
      setInvestors(inv);
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : 'Could not load recipients' });
    }
  }

  const send = (test: boolean) => run(test ? 'test' : 'send', async () => {
    if (!accountId) throw new Error('Choose a sender address first.');
    if (dirty) await persist(content);
    const list = test
      ? [{ to: user?.email ?? '', investor: investors[0] ?? null }]
      : investors.map((i) => ({ to: i.email, investor: i }));
    if (!list.length || !list[0].to) throw new Error('There is nobody to send to.');
    const r = await emailReport(accountId, content, list);
    if (!test && r.sent) {
      await supabase.from('reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', report.id);
      setStatus('sent');
      setSendOpen(false);
    }
    if (r.failed.length) throw new Error(`Sent ${r.sent}; could not send to ${r.failed.join(', ')}.`);
    return test ? `Test email sent to ${list[0].to}.` : `Sent to ${r.sent} investor${r.sent === 1 ? '' : 's'}.`;
  });

  const provisional = content.classes.some((c) => c.status !== 'approved');

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-2 max-w-sm px-4 py-3 rounded-lg shadow-xl text-sm text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}{toast.msg}
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-2 transition-colors"><ArrowLeft className="w-4 h-4" />All reports</button>
          <h2 className="text-xl font-semibold text-white">{content.period.label} update</h2>
          <p className="text-sm text-slate-400">{content.fund_name} · <span className="capitalize">{status}</span>{dirty && ' · unsaved changes'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refresh} disabled={!!busy} className={`${btn} text-slate-300 hover:text-white hover:bg-slate-800`}>
            {busy === 'refresh' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Refresh figures
          </button>
          <button onClick={save} disabled={!!busy || !dirty} className={`${btn} bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700`}>
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
          </button>
          <button onClick={pdf} disabled={!!busy} className={`${btn} bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700`}>
            {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}PDF
          </button>
          <button onClick={publish} disabled={!!busy} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}>
            {busy === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{status === 'draft' ? 'Publish to vault' : 'Republish'}
          </button>
          <button onClick={openSend} disabled={!!busy} className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}><Send className="w-4 h-4" />Email</button>
        </div>
      </div>

      {provisional && (
        <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          Some figures for this month are not yet approved in Fund Value. They are marked as provisional in the report.
        </p>
      )}
      {!content.classes.length && (
        <p className="text-sm text-slate-300 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3">
          No fund values exist for this month yet. Upload the broker statement, then use Refresh figures.
        </p>
      )}

      <div className="inline-flex bg-slate-900 border border-slate-800 rounded-lg p-1">
        {([['write', 'Write', FileEdit], ['preview', 'Preview', Eye]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${tab === id ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'preview' ? <MonthlyReportPreview content={content} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-medium text-white">Letter from the manager</h3>
              <textarea rows={9} value={content.commentary} onChange={(e) => patch({ commentary: e.target.value })} className={area} placeholder="A short note to investors on the month..." />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-medium text-white">Market insights</h3>
              <textarea rows={9} value={content.market_insights} onChange={(e) => patch({ market_insights: e.target.value })} className={area} placeholder="What moved markets this month and what we are watching..." />
            </div>
          </div>
          <div className="space-y-6">
            {content.classes.map((c) => (
              <div key={c.class_id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium text-white">{c.name}</h3>
                  <span className="text-xs text-slate-400 tabular-nums">${c.unit_price.toFixed(4)} · <span className={c.month_return >= 0 ? 'text-emerald-400' : 'text-red-400'}>{(c.month_return * 100).toFixed(2)}%</span></span>
                </div>
                <textarea rows={3} value={content.class_notes[c.code] ?? ''} onChange={(e) => setClassNote(c.code, e.target.value)} className={area} placeholder={`How ${c.name} did this month...`} />
                {c.holdings.map((h) => (
                  <div key={h.symbol}>
                    <label className="block text-xs text-slate-400 mb-1">{h.symbol} <span className="text-slate-600">· {(h.weight * 100).toFixed(1)}% of class</span></label>
                    <textarea rows={2} value={content.position_notes[c.code]?.[h.symbol] ?? ''} onChange={(e) => setPositionNote(c.code, h.symbol, e.target.value)} className={area} placeholder="Why we hold it and what changed..." />
                  </div>
                ))}
                {!c.holdings.length && <p className="text-xs text-slate-500">Held fully in cash, so there are no positions to describe.</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {sendOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && setSendOpen(false)}>
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Email this report</h3>
              <button onClick={() => setSendOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Send from</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.display_name ? `${a.display_name} <${a.email_address}>` : a.email_address}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Investors ({investors.length}) · each receives their own holding and the PDF</p>
              <ul className="max-h-40 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-lg">
                {investors.map((i) => (
                  <li key={i.email} className="flex justify-between px-3 py-2 text-sm"><span className="text-slate-200">{i.name}<span className="text-slate-500"> · {i.email}</span></span><span className="text-slate-400 tabular-nums">${i.total.toLocaleString()}</span></li>
                ))}
                {!investors.length && <li className="px-3 py-2 text-sm text-slate-500">No investors with an email address in this fund.</li>}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button onClick={() => send(true)} disabled={!!busy || !accountId} className={`${btn} justify-center bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700`}>
                {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send test to me
              </button>
              <button onClick={() => send(false)} disabled={!!busy || !accountId || !investors.length} className={`${btn} justify-center bg-sky-600 text-white hover:bg-sky-500`}>
                {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send to investors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
