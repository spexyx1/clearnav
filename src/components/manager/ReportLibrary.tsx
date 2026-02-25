import { useState, useEffect } from 'react';
import { FileText, Download, Send, Eye, Calendar, Plus, X, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { generateReport, GeneratedReportContent, ReportSection } from '../../lib/reportGenerator';

interface Report {
  id: string;
  report_type: string;
  report_name: string;
  period_start: string | null;
  period_end: string | null;
  generation_date: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  report_content: GeneratedReportContent | null;
  fund: { fund_code: string; fund_name: string } | null;
  capital_account: { account_number: string; investor: { full_name: string } } | null;
}

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
}

const REPORT_TYPES = [
  { value: 'investor_statement', label: 'Investor Statement' },
  { value: 'performance_report', label: 'Performance Report' },
  { value: 'fee_report', label: 'Fee Report' },
  { value: 'capital_account_report', label: 'Capital Account Report' },
  { value: 'transaction_report', label: 'Transaction Report' },
  { value: 'custom', label: 'Custom Report' },
];

const PERIOD_PRESETS = [
  { label: 'This Month', getRange: () => { const d = new Date(); return { start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0], end: d.toISOString().split('T')[0] }; }},
  { label: 'Last Month', getRange: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); const e = new Date(d.getFullYear(), d.getMonth(), 0); return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }; }},
  { label: 'Last Quarter', getRange: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); const s = new Date(d.getFullYear(), (q - 1) * 3, 1); const e = new Date(d.getFullYear(), q * 3, 0); return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }; }},
  { label: 'YTD', getRange: () => { const d = new Date(); return { start: `${d.getFullYear()}-01-01`, end: d.toISOString().split('T')[0] }; }},
  { label: 'Last Year', getRange: () => { const d = new Date(); return { start: `${d.getFullYear() - 1}-01-01`, end: `${d.getFullYear() - 1}-12-31` }; }},
];

export default function ReportLibrary() {
  const { currentTenant, user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewer, setShowViewer] = useState<Report | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);

  const [genStep, setGenStep] = useState(1);
  const [genForm, setGenForm] = useState({
    reportType: 'investor_statement',
    reportName: '',
    periodStart: '',
    periodEnd: '',
    fundIds: [] as string[],
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
    loadFunds();
  }, [currentTenant, filterType, filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    let query = supabase
      .from('reports')
      .select(`*, fund:funds(fund_code, fund_name), capital_account:capital_accounts!capital_account_id(account_number, investor:client_profiles!investor_id(full_name))`)
      .eq('tenant_id', currentTenant?.id)
      .order('generation_date', { ascending: false });

    if (filterType !== 'all') query = query.eq('report_type', filterType);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);

    const { data } = await query.limit(100);
    setReports((data as any) || []);
    setLoading(false);
  };

  const loadFunds = async () => {
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');
    setFunds(data || []);
  };

  const openGenerateModal = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    setGenForm({
      reportType: 'investor_statement',
      reportName: '',
      periodStart: lastMonth.toISOString().split('T')[0],
      periodEnd: lastMonthEnd.toISOString().split('T')[0],
      fundIds: [],
    });
    setGenStep(1);
    setShowGenerateModal(true);
  };

  const handleGenerate = async () => {
    if (!currentTenant || !user) return;
    setGenerating(true);

    const name = genForm.reportName ||
      `${REPORT_TYPES.find(t => t.value === genForm.reportType)?.label || 'Report'} - ${genForm.periodEnd}`;

    const { reportId, error } = await generateReport({
      reportType: genForm.reportType,
      reportName: name,
      periodStart: genForm.periodStart,
      periodEnd: genForm.periodEnd,
      fundIds: genForm.fundIds,
      capitalAccountIds: [],
      tenantId: currentTenant.id,
      generatedBy: user.id,
    });

    setGenerating(false);
    if (error) {
      alert('Error generating report: ' + error);
    } else {
      setShowGenerateModal(false);
      loadReports();
    }
  };

  const markAsViewed = async (reportId: string) => {
    await supabase.from('reports').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', reportId);
    loadReports();
  };

  const getReportTypeLabel = (type: string) =>
    REPORT_TYPES.find(t => t.value === type)?.label || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return report.report_name?.toLowerCase().includes(q) || report.report_type?.toLowerCase().includes(q);
  });

  const stats = reports.reduce((acc, r) => {
    acc.total++;
    if (r.status === 'sent') acc.sent++;
    if (r.status === 'viewed') acc.viewed++;
    if (r.report_type === 'investor_statement') acc.statements++;
    return acc;
  }, { total: 0, sent: 0, viewed: 0, statements: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Report <span className="font-semibold">Library</span>
          </h2>
          <p className="text-slate-400">Generate, view, and manage all reports</p>
        </div>
        <button
          onClick={openGenerateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, icon: FileText, color: 'text-teal-400' },
          { label: 'Statements', value: stats.statements, icon: FileText, color: 'text-blue-400' },
          { label: 'Sent', value: stats.sent, icon: Send, color: 'text-green-400' },
          { label: 'Viewed', value: stats.viewed, icon: Eye, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="flex-1 max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <div className="flex items-center gap-3 ml-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="all">All Types</option>
              {REPORT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="generated">Generated</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
            </select>
          </div>
        </div>

        {filteredReports.length > 0 ? (
          <div className="space-y-2">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center gap-4 py-3 px-3 hover:bg-slate-700/30 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  if (report.report_content) {
                    setShowViewer(report);
                  } else {
                    markAsViewed(report.id);
                  }
                }}
              >
                <FileText className="w-5 h-5 text-teal-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{report.report_name}</div>
                  <div className="text-xs text-slate-400">{getReportTypeLabel(report.report_type)}</div>
                </div>
                <div className="text-sm text-slate-300 hidden md:block">
                  {report.fund ? report.fund.fund_code : report.capital_account?.investor?.full_name || '-'}
                </div>
                <div className="text-sm text-slate-400 hidden md:block">
                  {report.period_end ? new Date(report.period_end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                </div>
                <div className="text-xs text-slate-500 hidden lg:block">
                  {new Date(report.generation_date).toLocaleDateString()}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  report.status === 'viewed' ? 'bg-green-500/20 text-green-400'
                    : report.status === 'sent' ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-600/30 text-slate-400'
                }`}>
                  {report.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-14 h-14 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No reports found</p>
            <p className="text-slate-500 text-sm mt-1">Generate a report to get started</p>
          </div>
        )}
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-semibold text-white">Generate Report</h3>
                <p className="text-sm text-slate-400 mt-0.5">Step {genStep} of 3</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {genStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {REPORT_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setGenForm({ ...genForm, reportType: t.value })}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            genForm.reportType === t.value
                              ? 'border-teal-500 bg-teal-500/10 text-white'
                              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {genForm.reportType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Report Name</label>
                      <input
                        type="text"
                        value={genForm.reportName}
                        onChange={(e) => setGenForm({ ...genForm, reportName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        placeholder="My Custom Report"
                      />
                    </div>
                  )}
                </div>
              )}

              {genStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Period Presets</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {PERIOD_PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => {
                            const range = p.getRange();
                            setGenForm({ ...genForm, periodStart: range.start, periodEnd: range.end });
                          }}
                          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:border-teal-500 hover:text-white transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={genForm.periodStart}
                        onChange={(e) => setGenForm({ ...genForm, periodStart: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={genForm.periodEnd}
                        onChange={(e) => setGenForm({ ...genForm, periodEnd: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  {funds.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Funds (optional)</label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {funds.map(f => (
                          <label key={f.id} className="flex items-center gap-2 cursor-pointer bg-slate-800/50 rounded-lg px-3 py-2">
                            <input
                              type="checkbox"
                              checked={genForm.fundIds.includes(f.id)}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...genForm.fundIds, f.id]
                                  : genForm.fundIds.filter(id => id !== f.id);
                                setGenForm({ ...genForm, fundIds: ids });
                              }}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-slate-300">{f.fund_code} - {f.fund_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {genStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">Review</h4>
                  <div className="bg-slate-800/50 rounded-lg divide-y divide-slate-700/50">
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-400">Type</span>
                      <span className="text-sm text-white">{REPORT_TYPES.find(t => t.value === genForm.reportType)?.label}</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-400">Period</span>
                      <span className="text-sm text-white">{genForm.periodStart} to {genForm.periodEnd}</span>
                    </div>
                    <div className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-slate-400">Funds</span>
                      <span className="text-sm text-white">
                        {genForm.fundIds.length === 0 ? 'All Funds' : `${genForm.fundIds.length} selected`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between p-5 border-t border-slate-800">
              {genStep > 1 ? (
                <button onClick={() => setGenStep(genStep - 1)} className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
              )}
              {genStep < 3 ? (
                <button
                  onClick={() => setGenStep(genStep + 1)}
                  disabled={genStep === 2 && (!genForm.periodStart || !genForm.periodEnd)}
                  className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {generating ? 'Generating...' : 'Generate Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showViewer && showViewer.report_content && (
        <ReportViewer report={showViewer} onClose={() => setShowViewer(null)} />
      )}
    </div>
  );
}

function ReportViewer({ report, onClose }: { report: Report; onClose: () => void }) {
  const content = report.report_content!;

  const formatValue = (val: any): string => {
    if (typeof val === 'number') {
      return val >= 1000 ? `$${val.toLocaleString()}` : String(val);
    }
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-700 overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-5 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-white">{report.report_name}</h3>
            <p className="text-sm text-slate-400">
              {content.period.start} to {content.period.end}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> Print/PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {Object.keys(content.summary).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(content.summary).map(([key, val]) => (
                <div key={key} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="text-lg font-semibold text-white">{formatValue(val)}</div>
                </div>
              ))}
            </div>
          )}

          {content.sections.map((section, idx) => (
            <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700/50">
                <h4 className="text-sm font-semibold text-white">{section.title}</h4>
              </div>
              <div className="p-5">
                {section.type === 'metrics' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(section.data).map(([key, val]) => (
                      <div key={key} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className="text-base font-medium text-white mt-0.5">{formatValue(val)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {section.type === 'table' && section.data.rows?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {section.data.headers.map((h: string, i: number) => (
                            <th key={i} className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {section.data.rows.slice(0, 50).map((row: any[], ri: number) => (
                          <tr key={ri} className="hover:bg-slate-800/20">
                            {row.map((cell: any, ci: number) => (
                              <td key={ci} className="px-3 py-2 text-slate-300">{formatValue(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {section.data.rows.length > 50 && (
                      <p className="text-xs text-slate-500 mt-2 px-3">Showing 50 of {section.data.rows.length} rows</p>
                    )}
                  </div>
                )}
                {section.type === 'table' && (!section.data.rows || section.data.rows.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">No data for this period</p>
                )}
                {section.type === 'text' && (
                  <p className="text-sm text-slate-300">{section.data.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
