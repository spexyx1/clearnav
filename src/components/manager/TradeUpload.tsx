import { useState, useEffect } from 'react';
import { Eye, AlertCircle, FileText, ArrowLeft, Plus, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTenantId } from '../../lib/useTenantId';
import { describeResult, runTenantAutomation } from '../../lib/fundAutomation';
import StatementImport from './StatementImport';
import FundReviewQueue from './FundReviewQueue';
import type { CashEvent } from '../../lib/statementParser';

interface TradeUploadRecord {
  id: string;
  fund_id: string | null;
  share_class_id: string | null;
  broker_account: string | null;
  upload_month: number;
  upload_year: number;
  status: string;
  filename: string;
  created_at: string;
  statement_data: { cash_events?: CashEvent[] } | null;
  item_count: number;
}

interface TradeItem {
  id: string;
  trade_date: string;
  instrument: string;
  direction: string;
  quantity: number;
  price: number;
  fees: number;
  total_value: number;
  asset_category: string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const CASH_LABELS: Record<string, string> = { dividend: 'Dividend', withholding: 'Withholding tax', interest: 'Interest', fee: 'Fee', deposit: 'Deposit', withdrawal: 'Withdrawal' };

function statusBadge(status: string) {
  const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
  if (status === 'confirmed') return <span className={`${base} bg-green-500/20 text-green-400`}>Saved</span>;
  if (status === 'superseded') return <span className={`${base} bg-slate-500/20 text-slate-400`}>Replaced</span>;
  return <span className={`${base} bg-yellow-500/20 text-yellow-400`}>Draft</span>;
}

export default function TradeUpload() {
  const { user } = useAuth();
  const { tenantId, state: tenantState, retry } = useTenantId();
  const [processing, setProcessing] = useState(false);
  const [queueKey, setQueueKey] = useState(0);
  const [view, setView] = useState<'history' | 'upload' | 'detail'>('history');
  const [uploads, setUploads] = useState<TradeUploadRecord[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showReplaced, setShowReplaced] = useState(false);
  const [selected, setSelected] = useState<TradeUploadRecord | null>(null);
  const [detailItems, setDetailItems] = useState<TradeItem[]>([]);

  useEffect(() => {
    if (tenantId) loadUploads();
    else if (tenantState === 'missing' || tenantState === 'error') setLoading(false);
  }, [tenantId, tenantState]);

  async function processUploads(prefix: string) {
    if (!tenantId || !user) return;
    setProcessing(true);
    setError('');
    try {
      const result = await runTenantAutomation(tenantId, user.id);
      setNotice(`${prefix}${describeResult(result)}`);
    } catch (e) {
      setNotice(prefix);
      setError(e instanceof Error ? e.message : 'The fund figures could not be updated. Please try again.');
    } finally {
      setProcessing(false);
      setQueueKey((k) => k + 1);
    }
  }

  async function loadUploads() {
    if (!tenantId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('trade_uploads')
      .select('id, fund_id, share_class_id, broker_account, upload_month, upload_year, status, filename, created_at, statement_data, trade_upload_items(count)')
      .eq('tenant_id', tenantId)
      .order('upload_year', { ascending: false })
      .order('upload_month', { ascending: false })
      .order('created_at', { ascending: false });
    if (err) {
      console.error('load uploads failed', err);
      setError('Could not load your uploads. Please try again.');
    } else {
      const rows = (data || []).map((u: any) => ({ ...u, item_count: u.trade_upload_items?.[0]?.count ?? 0 }));
      setUploads(rows);
      const ids = [...new Set(rows.map((r) => r.share_class_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: sc } = await supabase.from('share_classes').select('id, class_name').in('id', ids);
        setClassNames(Object.fromEntries((sc ?? []).map((c) => [c.id, c.class_name])));
      }
    }
    setLoading(false);
  }

  async function viewUpload(upload: TradeUploadRecord) {
    setSelected(upload);
    setView('detail');
    const { data, error: err } = await supabase.from('trade_upload_items').select('*').eq('upload_id', upload.id).order('trade_date').order('sort_order');
    if (err) { console.error('load trades failed', err); setError('Could not load the trades for this month.'); }
    setDetailItems(data || []);
  }

  if (view === 'upload') {
    return (
      <StatementImport
        onCancel={() => setView('history')}
        onDone={(saved) => {
          setView('history');
          loadUploads();
          processUploads(`${saved} month record${saved === 1 ? '' : 's'} saved. `);
        }}
      />
    );
  }

  if (view === 'detail' && selected) {
    const cash = selected.statement_data?.cash_events ?? [];
    return (
      <div className="space-y-6">
        <button onClick={() => setView('history')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to uploads
        </button>
        <div>
          <h2 className="text-xl font-semibold text-white">{MONTHS[selected.upload_month - 1]} {selected.upload_year} · {classNames[selected.share_class_id ?? ''] ?? 'Unassigned'}</h2>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">{selected.filename}{selected.broker_account ? ` · Account ${selected.broker_account}` : ''} {statusBadge(selected.status)}</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 text-sm font-semibold text-white">Trades</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Date</th><th className="px-6 py-3">Instrument</th><th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Direction</th><th className="px-6 py-3 text-right">Qty</th><th className="px-6 py-3 text-right">Price</th>
                  <th className="px-6 py-3 text-right">Fees</th><th className="px-6 py-3 text-right">Cash effect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {detailItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-6 py-3 text-sm text-slate-300">{item.trade_date}</td>
                    <td className="px-6 py-3 text-sm text-white font-medium">{item.instrument}</td>
                    <td className="px-6 py-3 text-sm text-slate-400">{item.asset_category || '—'}</td>
                    <td className="px-6 py-3"><span className={`text-xs font-medium ${item.direction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{item.direction.toUpperCase()}</span></td>
                    <td className="px-6 py-3 text-sm text-slate-300 text-right">{Number(item.quantity).toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm text-slate-300 text-right">{Number(item.price).toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-slate-300 text-right">{Number(item.fees).toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-white text-right font-medium">{usd(Number(item.total_value))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detailItems.length === 0 && <div className="p-8 text-center text-slate-400">No trades this month.</div>}
        </div>

        {cash.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 text-sm font-semibold text-white">Cash activity</div>
            <table className="w-full">
              <tbody className="divide-y divide-slate-800">
                {cash.map((c, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-sm text-slate-300 w-32">{c.date}</td>
                    <td className="px-6 py-3 text-sm text-slate-400 w-40">{CASH_LABELS[c.type] ?? c.type}</td>
                    <td className="px-6 py-3 text-sm text-slate-300">{c.description}</td>
                    <td className={`px-6 py-3 text-sm text-right font-medium ${c.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{usd(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const visible = uploads.filter((u) => showReplaced || u.status !== 'superseded');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Trade Uploads</h2>
          <p className="text-sm text-slate-400 mt-1">Broker statements split into monthly records for each share class.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showReplaced} onChange={(e) => setShowReplaced(e.target.checked)} className="rounded border-slate-600 bg-slate-800" />
            Show replaced
          </label>
          <button onClick={() => processUploads('')} disabled={processing || !tenantId} className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} /> Update figures
          </button>
          <button onClick={() => { setNotice(''); setError(''); setView('upload'); }} disabled={processing} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" /> {uploads.length ? 'Upload another statement' : 'Upload statement'}
          </button>
        </div>
      </div>

      {processing && (
        <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/30 text-sky-300 px-4 py-3 rounded-lg text-sm">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> Valuing each month, checking for anything unusual and updating investor balances…
        </div>
      )}
      {(tenantState === 'error' || tenantState === 'missing') && (
        <div className="flex flex-wrap items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {tenantState === 'missing' ? 'Your account is not linked to a company yet.' : 'Your company details took too long to load.'}
          <button onClick={retry} className="underline hover:text-white">Try again</button>
        </div>
      )}
      {tenantId && user && !processing && (
        <FundReviewQueue tenantId={tenantId} userId={user.id} refreshKey={queueKey} onApplied={(m) => { setNotice(m); loadUploads(); }} />
      )}
      {notice && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading uploads…</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p>No statements uploaded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Month</th><th className="px-6 py-3">Share class</th><th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">File</th><th className="px-6 py-3">Trades</th><th className="px-6 py-3">Status</th><th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visible.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-800/30 ${u.status === 'superseded' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-white font-medium">{MONTHS[u.upload_month - 1]} {u.upload_year}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{classNames[u.share_class_id ?? ''] ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{u.broker_account ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 max-w-[220px] truncate">{u.filename}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{u.item_count}</td>
                    <td className="px-6 py-4">{statusBadge(u.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => viewUpload(u)} className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1">
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
