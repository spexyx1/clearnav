import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Users, BarChart3, Upload,
  FileText, Mail, AlertTriangle, Clock, CheckCircle2,
  XCircle, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface DashboardData {
  totalAum: number;
  latestNav: number | null;
  latestNavDate: string | null;
  mtdReturn: number | null;
  totalInvestors: number;
  recentReports: { id: string; report_type: string; created_at: string; status: string }[];
  recentUploads: { id: string; upload_month: string; status: string; trade_count: number }[];
  missingMonthlyReport: boolean;
  missingTradeUpload: boolean;
}

const currFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const navFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const pctFmt = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const monthLabel = () => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
const monthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`bg-slate-700 rounded animate-pulse ${className}`} />
);

const statusIcon = (s: string) => {
  if (['approved', 'confirmed', 'published'].includes(s)) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (['rejected', 'failed'].includes(s)) return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-amber-400" />;
};

export default function OperatorDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { currentTenant, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchDashboard(); }, [currentTenant?.id]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const mk = monthKey();

      const [aumRes, navRes, mtdRes, investorRes, reportsRes, uploadsRes, mrRes, muRes] =
        await Promise.all([
          supabase.from('trust_account').select('total_aum').maybeSingle(),
          supabase.from('nav_calculations').select('nav_per_share, nav_date, status')
            .order('nav_date', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('performance_metrics').select('period_return')
            .eq('period_type', 'monthly').order('period_end', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('client_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('reports').select('id, report_type, created_at, status')
            .order('created_at', { ascending: false }).limit(5),
          supabase.from('trade_uploads').select('id, upload_month, status, trade_count')
            .order('created_at', { ascending: false }).limit(5),
          supabase.from('reports').select('id', { count: 'exact', head: true })
            .eq('report_type', 'monthly_update').gte('created_at', `${mk}-01`),
          supabase.from('trade_uploads').select('id', { count: 'exact', head: true })
            .eq('status', 'confirmed').eq('upload_month', mk),
        ]);

      setData({
        totalAum: aumRes.data?.total_aum ?? 0,
        latestNav: navRes.data?.nav_per_share ?? null,
        latestNavDate: navRes.data?.nav_date ?? null,
        mtdReturn: mtdRes.data?.period_return ?? null,
        totalInvestors: investorRes.count ?? 0,
        recentReports: reportsRes.data ?? [],
        recentUploads: uploadsRes.data ?? [],
        missingMonthlyReport: (mrRes.count ?? 0) === 0,
        missingTradeUpload: (muRes.count ?? 0) === 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const alerts = !data ? [] : [
    ...(data.missingMonthlyReport ? [{ msg: `No report generated for ${monthLabel()}`, action: 'Generate Report', tab: 'reports' }] : []),
    ...(data.missingTradeUpload ? [{ msg: `Trade upload pending for ${monthLabel()}`, action: 'Upload Trades', tab: 'trade_upload' }] : []),
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">{error}</div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Fund AUM', value: currFmt.format(data?.totalAum ?? 0), sub: null,
      icon: DollarSign, color: 'emerald' },
    { label: 'Latest NAV', value: data?.latestNav != null ? navFmt.format(data.latestNav) : '—',
      sub: data?.latestNavDate ? `as of ${new Date(data.latestNavDate).toLocaleDateString()}` : null,
      icon: BarChart3, color: 'blue' },
    { label: 'MTD Return',
      value: data?.mtdReturn != null ? `${data.mtdReturn >= 0 ? '+' : ''}${pctFmt.format(data.mtdReturn / 100)}` : '—',
      sub: null, icon: TrendingUp, color: 'violet',
      valueColor: data?.mtdReturn != null ? (data.mtdReturn >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500' },
    { label: 'Total Investors', value: String(data?.totalInvestors ?? 0), sub: null,
      icon: Users, color: 'amber' },
  ] as const;

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/20 text-violet-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-slate-400 mt-1">{currentTenant?.fund_name ?? 'Fund'} &mdash; Operator Dashboard</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <Skel className="h-4 w-24 mb-3" />
                <Skel className="h-8 w-32" />
              </div>
            ))
          : metricCards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorMap[c.color].split(' ')[0]}`}>
                      <Icon className={`w-5 h-5 ${colorMap[c.color].split(' ')[1]}`} />
                    </div>
                    <span className="text-sm text-slate-400">{c.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${'valueColor' in c && c.valueColor ? c.valueColor : 'text-white'}`}>
                    {c.value}
                  </p>
                  {c.sub && <p className="text-xs text-slate-500 mt-1">{c.sub}</p>}
                </div>
              );
            })}
      </div>

      {/* Alerts */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-amber-400 text-sm">{a.msg}</span>
              </div>
              <button onClick={() => onNavigate(a.tab)} className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1 shrink-0">
                {a.action}<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { label: 'Upload Trades', tab: 'trade_upload', icon: Upload, clr: 'text-blue-400' },
            { label: 'Generate Report', tab: 'reports', icon: FileText, clr: 'text-emerald-400' },
            { label: 'Send Email', tab: 'email', icon: Mail, clr: 'text-violet-400' },
          ] as const).map((qa) => {
            const QIcon = qa.icon;
            return (
              <button key={qa.tab} onClick={() => onNavigate(qa.tab)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 text-center transition-colors">
                <QIcon className={`w-6 h-6 ${qa.clr} mx-auto mb-2`} />
                <span className="text-sm font-medium text-white">{qa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Reports</h2>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-4 w-full" />)}</div>
          ) : !data?.recentReports.length ? (
            <p className="text-slate-500 text-sm">No reports yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {data.recentReports.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate capitalize">{r.report_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {statusIcon(r.status)}<span className="text-xs text-slate-400 capitalize">{r.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Trade Uploads */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Trade Uploads</h2>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-4 w-full" />)}</div>
          ) : !data?.recentUploads.length ? (
            <p className="text-slate-500 text-sm">No uploads yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {data.recentUploads.map((u) => (
                <li key={u.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {u.upload_month ? new Date(u.upload_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                    </p>
                    <p className="text-xs text-slate-500">{u.trade_count ?? 0} trade{(u.trade_count ?? 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {statusIcon(u.status)}<span className="text-xs text-slate-400 capitalize">{u.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
