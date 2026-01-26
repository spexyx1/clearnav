import { useState, useEffect } from 'react';
import { FileText, Download, Send, Eye, Filter, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

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
  fund: { fund_code: string; fund_name: string } | null;
  capital_account: {
    account_number: string;
    investor: { full_name: string };
  } | null;
  generated_by_user: {
    email: string;
  } | null;
}

export default function ReportLibrary() {
  const { currentTenant } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReports();
  }, [currentTenant, filterType, filterStatus]);

  const loadReports = async () => {
    setLoading(true);

    let query = supabase
      .from('reports')
      .select(`
        *,
        fund:funds(fund_code, fund_name),
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name)
        ),
        generated_by_user:auth.users!generated_by(email)
      `)
      .eq('tenant_id', currentTenant?.id)
      .order('generation_date', { ascending: false });

    if (filterType !== 'all') {
      query = query.eq('report_type', filterType);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query.limit(100);

    if (data) {
      setReports(data as any);
    }

    setLoading(false);
  };

  const getReportIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-cyan-500" />;
  };

  const getReportTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const markAsViewed = async (reportId: string) => {
    await supabase
      .from('reports')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    loadReports();
  };

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.report_name.toLowerCase().includes(query) ||
      report.report_type.toLowerCase().includes(query) ||
      report.fund?.fund_name.toLowerCase().includes(query) ||
      report.capital_account?.investor.full_name.toLowerCase().includes(query)
    );
  });

  const calculateStats = () => {
    return reports.reduce((acc, report) => {
      acc.total++;
      if (report.status === 'sent') acc.sent++;
      if (report.status === 'viewed') acc.viewed++;
      if (report.report_type === 'investor_statement') acc.statements++;
      return acc;
    }, { total: 0, sent: 0, viewed: 0, statements: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Report Library</h2>
          <p className="text-slate-400 mt-1">View and manage all generated reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Reports</span>
            <FileText className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Investor Statements</span>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.statements}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Sent</span>
            <Send className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.sent}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Viewed</span>
            <Eye className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.viewed}</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="flex-1 max-w-md px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="investor_statement">Investor Statements</option>
              <option value="performance_report">Performance Reports</option>
              <option value="fee_report">Fee Reports</option>
              <option value="capital_account_report">Capital Account Reports</option>
              <option value="transaction_report">Transaction Reports</option>
              <option value="quarterly_letter">Quarterly Letters</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
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
            <div className="grid grid-cols-8 gap-4 text-sm font-medium text-slate-400 pb-3 border-b border-slate-700">
              <div className="col-span-2">Report Name</div>
              <div>Type</div>
              <div>Fund/Investor</div>
              <div>Period</div>
              <div>Generated</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="grid grid-cols-8 gap-4 items-center py-3 hover:bg-slate-700/50 rounded-lg px-3 transition-colors"
              >
                <div className="col-span-2 flex items-center space-x-3">
                  {getReportIcon(report.report_type)}
                  <div>
                    <div className="font-medium text-white">{report.report_name}</div>
                    {report.generated_by_user && (
                      <div className="text-xs text-slate-400">
                        by {report.generated_by_user.email.split('@')[0]}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-slate-300 text-sm">
                  {getReportTypeLabel(report.report_type)}
                </div>
                <div className="text-white text-sm">
                  {report.fund ? (
                    <div>
                      <div>{report.fund.fund_code}</div>
                      <div className="text-xs text-slate-400">{report.fund.fund_name}</div>
                    </div>
                  ) : report.capital_account ? (
                    <div>
                      <div>{report.capital_account.investor.full_name}</div>
                      <div className="text-xs text-slate-400">{report.capital_account.account_number}</div>
                    </div>
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </div>
                <div className="text-slate-300 text-sm">
                  {report.period_end ? (
                    new Date(report.period_end).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </div>
                <div className="text-slate-300 text-sm">
                  {new Date(report.generation_date).toLocaleDateString()}
                </div>
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    report.status === 'viewed'
                      ? 'bg-green-500/20 text-green-400'
                      : report.status === 'sent'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {report.status}
                  </span>
                  {report.sent_at && (
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(report.sent_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {report.status !== 'viewed' && (
                    <button
                      onClick={() => markAsViewed(report.id)}
                      className="text-cyan-400 hover:text-cyan-300 text-xs"
                      title="Mark as viewed"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    className="text-slate-400 hover:text-white text-xs"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No reports found</p>
            <p className="text-slate-500 text-sm mt-2">
              {searchQuery ? 'Try adjusting your search or filters' : 'Generate reports to see them here'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Report Generation Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-white">Monthly Reports</h4>
            </div>
            <p className="text-slate-400 text-sm">
              Investor statements generated on the 5th of each month
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="w-5 h-5 text-green-500" />
              <h4 className="font-medium text-white">Quarterly Reports</h4>
            </div>
            <p className="text-slate-400 text-sm">
              Performance reports generated at end of each quarter
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h4 className="font-medium text-white">Annual Reports</h4>
            </div>
            <p className="text-slate-400 text-sm">
              Annual reports and tax documents generated in January
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
