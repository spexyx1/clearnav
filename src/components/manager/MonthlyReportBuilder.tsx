import { useState, useEffect } from 'react';
import { FileText, Plus, Eye, ArrowLeft, Send, Upload, Calendar, TrendingUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type View = 'list' | 'builder' | 'preview';

interface Fund { id: string; fund_code: string; fund_name: string; base_currency: string }
interface Report {
  id: string; report_name: string; report_type: string; period_start: string;
  period_end: string; status: string; report_content: any; created_at: string;
  fund_id: string; parameters?: any;
}
interface TradeItem {
  id: string; security_name: string; side: string; quantity: number;
  price: number; total_amount: number; trade_date: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtCcy = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const selectCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500';
const cardCls = 'bg-slate-900/50 border border-slate-800 rounded-xl p-6';
const btnPrimary = 'flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors';

export default function MonthlyReportBuilder() {
  const { currentTenant, user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [reports, setReports] = useState<Report[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [commentary, setCommentary] = useState('');
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  useEffect(() => { if (currentTenant?.id) { loadReports(); loadFunds(); } }, [currentTenant?.id]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const loadReports = async () => {
    if (!currentTenant?.id) return;
    setLoading(true);
    const { data } = await supabase.from('reports').select('*')
      .eq('tenant_id', currentTenant.id).eq('report_type', 'monthly_update')
      .order('created_at', { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  const loadFunds = async () => {
    if (!currentTenant?.id) return;
    const { data } = await supabase.from('funds').select('id, fund_code, fund_name, base_currency')
      .eq('tenant_id', currentTenant.id).eq('status', 'active').order('fund_name');
    if (data) { setFunds(data); if (data.length > 0 && !selectedFund) setSelectedFund(data[0].id); }
  };

  const generateReport = async () => {
    if (!currentTenant?.id || !user?.id || !selectedFund) return;
    setGenerating(true);
    const mm = String(selectedMonth + 1).padStart(2, '0');
    const periodStart = `${selectedYear}-${mm}-01`;
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const periodEnd = `${selectedYear}-${mm}-${lastDay}`;
    try {
      const { data: navData } = await supabase.from('nav_calculations')
        .select('nav_date, nav_per_share, net_asset_value, total_shares, status')
        .eq('fund_id', selectedFund).gte('nav_date', periodStart).lte('nav_date', periodEnd)
        .eq('status', 'approved').order('nav_date', { ascending: true });

      const { data: perfData } = await supabase.from('performance_metrics')
        .select('metric_date, period_type, beginning_nav, ending_nav, total_return_percent')
        .eq('fund_id', selectedFund).gte('metric_date', periodStart).lte('metric_date', periodEnd)
        .order('metric_date', { ascending: false }).limit(1);

      const { data: ytdData } = await supabase.from('performance_metrics')
        .select('beginning_nav, ending_nav, total_return_percent')
        .eq('fund_id', selectedFund).eq('period_type', 'yearly')
        .gte('metric_date', `${selectedYear}-01-01`).lte('metric_date', periodEnd).limit(1);

      const { data: uploads } = await supabase.from('trade_uploads').select('id')
        .eq('fund_id', selectedFund).gte('upload_date', periodStart).lte('upload_date', periodEnd);

      let trades: TradeItem[] = [];
      if (uploads && uploads.length > 0) {
        const { data: items } = await supabase.from('trade_upload_items')
          .select('id, security_name, side, quantity, price, total_amount, trade_date')
          .in('upload_id', uploads.map(u => u.id)).order('trade_date', { ascending: false }).limit(20);
        if (items) trades = items;
      }

      const { count: accountCount } = await supabase.from('capital_accounts')
        .select('id', { count: 'exact', head: true }).eq('fund_id', selectedFund);

      const openNav = navData?.[0]?.net_asset_value ?? perfData?.[0]?.beginning_nav ?? 0;
      const closeNav = navData?.[navData.length - 1]?.net_asset_value ?? perfData?.[0]?.ending_nav ?? 0;
      const openNPS = navData?.[0]?.nav_per_share ?? 0;
      const closeNPS = navData?.[navData.length - 1]?.nav_per_share ?? 0;
      const monthRet = perfData?.[0]?.total_return_percent ?? (openNav > 0 ? ((closeNav - openNav) / openNav) * 100 : 0);
      const ytdRet = ytdData?.[0]?.total_return_percent ?? monthRet;

      const reportContent = {
        performance_summary: {
          opening_nav: openNav, closing_nav: closeNav,
          opening_nav_per_share: openNPS, closing_nav_per_share: closeNPS,
          monthly_return: monthRet, ytd_return: ytdRet, investor_count: accountCount ?? 0,
        },
        holdings_activity: {
          trades: trades.map(t => ({ security: t.security_name, side: t.side, quantity: t.quantity, price: t.price, amount: t.total_amount, date: t.trade_date })),
          total_buys: trades.filter(t => t.side === 'buy').reduce((s, t) => s + (t.total_amount || 0), 0),
          total_sells: trades.filter(t => t.side === 'sell').reduce((s, t) => s + (t.total_amount || 0), 0),
        },
        commentary: commentary.trim(),
      };

      const fund = funds.find(f => f.id === selectedFund);
      const reportName = `Monthly Update - ${MONTHS[selectedMonth]} ${selectedYear} - ${fund?.fund_name ?? 'Fund'}`;
      const { data: inserted, error } = await supabase.from('reports').insert({
        tenant_id: currentTenant.id, report_type: 'monthly_update', report_name: reportName,
        period_start: periodStart, period_end: periodEnd, fund_id: selectedFund,
        generated_by: user.id, status: 'draft', report_content: reportContent,
        parameters: { month: selectedMonth, year: selectedYear, fund_id: selectedFund },
      }).select().single();
      if (error) throw error;
      setActiveReport(inserted);
      setToast({ type: 'success', message: 'Report generated successfully.' });
      setView('preview');
      loadReports();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to generate report.' });
    } finally { setGenerating(false); }
  };

  const publishToVault = async (report: Report) => {
    if (!currentTenant?.id) return;
    try {
      const { count } = await supabase.from('investor_vault_documents')
        .select('id', { count: 'exact', head: true }).eq('tenant_id', currentTenant.id);
      const { error } = await supabase.from('investor_vault_documents').upsert({
        tenant_id: currentTenant.id, document_name: report.report_name,
        document_type: 'strategy_report', storage_path: `reports/${report.id}.json`,
        description: `Monthly investor update for ${report.period_start} to ${report.period_end}`,
        sort_order: (count ?? 0) + 1, is_active: true,
      }, { onConflict: 'tenant_id,storage_path' });
      if (error) throw error;
      await supabase.from('reports').update({ status: 'published' }).eq('id', report.id);
      setToast({ type: 'success', message: 'Report published to Investor Vault.' });
      loadReports();
    } catch (err: any) { setToast({ type: 'error', message: err.message || 'Failed to publish.' }); }
  };

  const emailToInvestors = async (report: Report) => {
    if (!currentTenant?.id) return;
    try {
      const { data: investors } = await supabase.from('client_profiles')
        .select('full_name, email').eq('tenant_id', currentTenant.id);
      if (!investors?.length) { setToast({ type: 'error', message: 'No investors found to email.' }); return; }
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: investors.map(i => i.email), subject: report.report_name,
          html: `<p>Dear Investor,</p><p>Your monthly update report is now available in the Investor Vault.</p><p>Report: ${report.report_name}</p><p>Please log in to review the full report.</p><p>Best regards,<br/>Arkline Trust</p>`,
        },
      });
      if (error) throw error;
      await supabase.from('reports').update({ status: 'sent' }).eq('id', report.id);
      setToast({ type: 'success', message: `Email sent to ${investors.length} investor(s).` });
      loadReports();
    } catch (err: any) { setToast({ type: 'error', message: err.message || 'Failed to send emails.' }); }
  };

  /* ── Toast ──────────────────────────────────────────────────────────── */
  const renderToast = () => {
    if (!toast) return null;
    const Icon = toast.type === 'success' ? CheckCircle : AlertCircle;
    return (
      <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
        <Icon className="w-4 h-4" />{toast.message}
      </div>
    );
  };

  /* ── Report List ────────────────────────────────────────────────────── */
  const renderList = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Monthly Investor Reports</h2>
        <button onClick={() => { setCommentary(''); setView('builder'); }} className={btnPrimary}>
          <Plus className="w-4 h-4" />New Report
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">No monthly reports generated yet.</p>
          <button onClick={() => { setCommentary(''); setView('builder'); }} className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm">Create your first report →</button>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Report</th>
                <th className="text-left px-6 py-3">Period</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Created</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-300">{r.report_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{r.period_start} – {r.period_end}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'published' ? 'bg-emerald-900/50 text-emerald-400' : r.status === 'sent' ? 'bg-blue-900/50 text-blue-400' : 'bg-yellow-900/50 text-yellow-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => { setActiveReport(r); setView('preview'); }} className="text-slate-400 hover:text-white text-sm transition-colors">
                      <Eye className="w-4 h-4 inline mr-1" />View
                    </button>
                    {r.status === 'draft' && (
                      <button onClick={() => publishToVault(r)} className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
                        <Upload className="w-4 h-4 inline mr-1" />Publish to Vault
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ── Builder ────────────────────────────────────────────────────────── */
  const renderBuilder = () => (
    <div>
      <button onClick={() => setView('list')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </button>
      <h2 className="text-xl font-semibold text-white mb-6">Generate Monthly Investor Update</h2>
      <div className="space-y-6">
        <div className={cardCls}>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Report Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fund</label>
              <select value={selectedFund} onChange={e => setSelectedFund(e.target.value)} className={selectCls}>
                {funds.map(f => <option key={f.id} value={f.id}>{f.fund_name} ({f.fund_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Month</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className={selectCls}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={selectCls}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className={cardCls}>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Manager's Commentary
          </h3>
          <p className="text-xs text-slate-500 mb-3">Share your perspective on market conditions, portfolio positioning, and outlook.</p>
          <textarea value={commentary} onChange={e => setCommentary(e.target.value)} rows={8}
            placeholder="During the month, markets experienced..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y" />
        </div>
        <div className="flex justify-end">
          <button onClick={generateReport} disabled={generating || !selectedFund}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Preview (branded) ──────────────────────────────────────────────── */
  const renderPreview = () => {
    if (!activeReport) return null;
    const c = activeReport.report_content ?? {};
    const perf = c.performance_summary ?? {};
    const activity = c.holdings_activity ?? {};
    const trades: any[] = activity.trades ?? [];
    const commentaryText: string = c.commentary ?? '';
    const fund = funds.find(f => f.id === activeReport.fund_id);
    const params = activeReport.parameters as any;
    const periodLabel = params?.month !== undefined && params?.year
      ? `${MONTHS[params.month]} ${params.year}`
      : `${activeReport.period_start} – ${activeReport.period_end}`;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setView('list')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to reports
          </button>
          <div className="flex items-center gap-2">
            {activeReport.status === 'draft' && (
              <button onClick={() => publishToVault(activeReport)} className={btnPrimary}>
                <Upload className="w-4 h-4" /> Publish to Vault
              </button>
            )}
            <button onClick={() => emailToInvestors(activeReport)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <Send className="w-4 h-4" /> Email to Investors
            </button>
          </div>
        </div>

        {/* Branded Report Card */}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-4xl mx-auto">
          {/* Header */}
          <div style={{ backgroundColor: '#1a3c2a' }} className="px-10 pt-10 pb-8">
            <div style={{ backgroundColor: '#c9a84c' }} className="h-1 w-24 mb-6 rounded" />
            <h1 className="text-3xl font-serif text-white tracking-wide mb-2">ARKLINE TRUST</h1>
            <p className="text-sm tracking-widest uppercase" style={{ color: '#c9a84c' }}>Monthly Investor Update — {periodLabel}</p>
            {fund && <p className="text-xs text-emerald-200/60 mt-2">{fund.fund_name} ({fund.fund_code})</p>}
          </div>
          <div style={{ backgroundColor: '#c9a84c' }} className="h-1" />

          <div className="px-10 py-8 space-y-8">
            {/* Key Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                  ['Opening NAV', fmtCcy(perf.opening_nav ?? 0)],
                  ['Closing NAV', fmtCcy(perf.closing_nav ?? 0)],
                  ['Monthly Return', fmtPct(perf.monthly_return ?? 0)],
                  ['YTD Return', fmtPct(perf.ytd_return ?? 0)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-lg font-semibold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* NAV Per Share */}
            {(perf.opening_nav_per_share > 0 || perf.closing_nav_per_share > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div><span className="text-gray-500">NAV/Share (Open):</span> {fmtCcy(perf.opening_nav_per_share ?? 0)}</div>
                <div><span className="text-gray-500">NAV/Share (Close):</span> {fmtCcy(perf.closing_nav_per_share ?? 0)}</div>
                <div><span className="text-gray-500">Investors:</span> {perf.investor_count ?? 0}</div>
              </div>
            )}

            {/* Trade Activity */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trade Activity</h2>
              {trades.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                          <th className="text-left py-2 pr-4">Security</th>
                          <th className="text-left py-2 pr-4">Side</th>
                          <th className="text-right py-2 pr-4">Qty</th>
                          <th className="text-right py-2 pr-4">Price</th>
                          <th className="text-right py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {trades.map((t, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 text-gray-800">{t.security}</td>
                            <td className="py-2 pr-4"><span className={t.side === 'buy' ? 'text-emerald-600' : 'text-red-600'}>{t.side?.toUpperCase()}</span></td>
                            <td className="py-2 pr-4 text-right text-gray-700">{t.quantity?.toLocaleString()}</td>
                            <td className="py-2 pr-4 text-right text-gray-700">{fmtCcy(t.price ?? 0)}</td>
                            <td className="py-2 text-right text-gray-900 font-medium">{fmtCcy(t.amount ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-6 mt-3 text-xs text-gray-500">
                    <span>Total Buys: {fmtCcy(activity.total_buys ?? 0)}</span>
                    <span>Total Sells: {fmtCcy(activity.total_sells ?? 0)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No trade activity recorded for this period.</p>
              )}
            </div>

            {/* Commentary */}
            {commentaryText && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Manager's Commentary</h2>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border-l-4 pl-4" style={{ borderColor: '#c9a84c' }}>
                  {commentaryText}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-10 py-6">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              This report is prepared by Arkline Trust for informational purposes only and does not constitute
              an offer to sell or a solicitation of an offer to buy any securities. Past performance is not indicative
              of future results. All investments involve risk, including the possible loss of principal. This document
              is confidential and intended solely for the use of the investor to whom it is addressed.
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* ── Main Render ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {renderToast()}
      {view === 'list' && renderList()}
      {view === 'builder' && renderBuilder()}
      {view === 'preview' && renderPreview()}
    </div>
  );
}
