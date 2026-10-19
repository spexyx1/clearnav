import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Link2, Loader2, PlugZap, RefreshCw, Settings2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseFlexXml } from '../../lib/flexStatement';
import { buildMonthlyBatches, saveStatementBatches, storeSourceFile } from '../../lib/statementImport';
import { describeResult, runFundAutomation } from '../../lib/fundAutomation';

interface Connection { query_id: string; token_expires_on: string | null; last_sync_at: string | null; last_status: string | null; last_error: string | null }
interface Props { tenantId: string; fundId: string; userId: string; onSynced: (message: string) => void }

const DAY = 86_400_000;
const fieldCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition';
const SECTIONS = ['Account Information', 'Net Asset Value (NAV) in Base', 'Cash Report', 'Open Positions', 'Trades', 'Cash Transactions', 'Transfers', 'Corporate Actions', 'Conversion Rates'];

async function callFlex(payload: Record<string, unknown>) {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ibkr-flex-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.session?.access_token ?? ''}`, 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null) as { error?: string; xml?: string; ok?: boolean } | null;
  if (!res.ok || !body || body.error) throw new Error(body?.error ?? 'Interactive Brokers could not be reached. Please try again.');
  return body;
}

function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function BrokerConnection({ tenantId, fundId, userId, onSynced }: Props) {
  const [conn, setConn] = useState<Connection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const autoRan = useRef('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('ibkr_flex_connections')
      .select('query_id, token_expires_on, last_sync_at, last_status, last_error').eq('fund_id', fundId).maybeSingle();
    if (error) console.error('broker connection load failed', error);
    setConn((data as Connection | null) ?? null);
    setLoaded(true);
  }, [fundId]);

  useEffect(() => { setLoaded(false); load(); }, [load]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const { xml } = await callFlex({ action: 'fetch', fund_id: fundId });
      if (!xml) throw new Error('Interactive Brokers returned an empty report.');
      const statement = parseFlexXml(xml);
      const { data: maps, error: mErr } = await supabase.from('fund_broker_accounts').select('account_id, share_class_id').eq('fund_id', fundId);
      if (mErr) throw new Error('Could not load which accounts belong to which class.');
      const accountToClass = Object.fromEntries((maps ?? []).filter((m) => statement.accounts.includes(m.account_id)).map((m) => [m.account_id, m.share_class_id]));
      if (!Object.keys(accountToClass).length) throw new Error('None of the accounts in the Interactive Brokers report are matched to a share class yet. Upload one statement by hand first so the accounts are matched.');
      const batches = buildMonthlyBatches(statement, accountToClass);
      const filename = `IBKR automatic update ${new Date().toISOString().slice(0, 10)}.xml`;
      const sourcePath = await storeSourceFile(tenantId, new Blob([xml], { type: 'application/xml' }), filename);
      const saved = await saveStatementBatches({ tenantId, fundId, userId, filename, sourcePath, statement, batches, accountToClass });
      const automation = describeResult(await runFundAutomation(tenantId, fundId, userId));
      onSynced(`Pulled the latest figures from Interactive Brokers (${saved} month${saved === 1 ? '' : 's'} updated). ${automation}`.trim());
    } catch (e) {
      console.error('ibkr sync failed', e);
      setSyncError(e instanceof Error ? e.message : 'The update from Interactive Brokers failed.');
    } finally {
      setSyncing(false);
      load();
    }
  }, [fundId, tenantId, userId, onSynced, load]);

  useEffect(() => {
    if (!conn || autoRan.current === fundId) return;
    autoRan.current = fundId;
    const stale = !conn.last_sync_at || Date.now() - new Date(conn.last_sync_at).getTime() > DAY;
    if (stale) sync();
  }, [conn, fundId, sync]);

  if (!loaded) return null;

  const daysLeft = conn?.token_expires_on ? Math.ceil((new Date(`${conn.token_expires_on}T23:59:59`).getTime() - Date.now()) / DAY) : null;
  const expiring = daysLeft != null && daysLeft <= 30;

  return (
    <>
      {!conn ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-500/10 via-slate-900 to-slate-900 border border-sky-500/20 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-sky-500/15 text-sky-300"><PlugZap className="w-4 h-4" /></span>
            <div>
              <p className="text-sm font-medium text-white">Update automatically from Interactive Brokers</p>
              <p className="text-xs text-slate-400 mt-0.5">Connect once and the fund value refreshes itself every day, with no statements to upload.</p>
            </div>
          </div>
          <button onClick={() => setSetupOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 transition">
            <Link2 className="w-4 h-4" /> Connect
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="relative flex w-2.5 h-2.5">
                {syncing && <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60 animate-ping" />}
                <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${conn.last_status === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
              </span>
              <span className="text-white font-medium">Interactive Brokers connected</span>
              <span className="text-slate-500">{syncing ? 'Pulling latest figures…' : conn.last_sync_at ? `Last update ${relative(conn.last_sync_at)}` : 'Not updated yet'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Update now
              </button>
              <button onClick={() => setSetupOpen(true)} title="Connection settings" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {expiring && (
            <p className="flex items-center gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              {daysLeft! <= 0 ? 'The access code has expired. Create a new one in Interactive Brokers and reconnect.' : `The access code expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Create a new one in Interactive Brokers and reconnect before then.`}
            </p>
          )}
          {(syncError || (conn.last_status === 'error' && conn.last_error)) && (
            <p className="flex items-start gap-2 text-xs text-red-300"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{syncError || conn.last_error}</p>
          )}
        </div>
      )}
      {setupOpen && (
        <ConnectModal fundId={fundId} existing={conn} onClose={() => setSetupOpen(false)}
          onSaved={async (connected) => { setSetupOpen(false); autoRan.current = ''; await load(); if (!connected) onSynced('Interactive Brokers was disconnected.'); }} />
      )}
    </>
  );
}

function ConnectModal({ fundId, existing, onClose, onSaved }: { fundId: string; existing: Connection | null; onClose: () => void; onSaved: (connected: boolean) => void }) {
  const [token, setToken] = useState('');
  const [queryId, setQueryId] = useState(existing?.query_id ?? '');
  const [expires, setExpires] = useState(existing?.token_expires_on ?? '');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy('save');
    setError('');
    try {
      await callFlex({ action: 'connect', fund_id: fundId, token: token.trim(), query_id: queryId.trim(), token_expires_on: expires || null });
      onSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy('remove');
    setError('');
    try {
      await callFlex({ action: 'disconnect', fund_id: fundId });
      onSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not disconnect.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Connect Interactive Brokers</h3>
            <p className="text-sm text-slate-400 mt-1">A read-only report link. It cannot place trades or move money.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-sky-500/15 text-sky-300 text-xs flex items-center justify-center font-medium">1</span>
              <div className="text-slate-300">
                In Interactive Brokers, open <span className="text-white">Performance &amp; Reports → Flex Queries</span> and create a new <span className="text-white">Activity Flex Query</span>.
                Include both fund accounts (Opportunistic and Quant Value) and tick these sections:
                <div className="flex flex-wrap gap-1.5 mt-2">{SECTIONS.map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{s}</span>)}</div>
                <p className="mt-2 text-slate-400">Set the format to <span className="text-white">XML</span> and the period to <span className="text-white">Year to Date</span>. Save it and note the <span className="text-white">Query ID</span> number.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-sky-500/15 text-sky-300 text-xs flex items-center justify-center font-medium">2</span>
              <p className="text-slate-300">On the same page open <span className="text-white">Flex Web Service Configuration</span>, turn it on and generate a <span className="text-white">current token</span>. Leave the IP restriction empty and choose the longest expiry (up to one year).</p>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-sky-500/15 text-sky-300 text-xs flex items-center justify-center font-medium">3</span>
              <p className="text-slate-300">Paste both below. The token is kept on the server and is never shown again.</p>
            </li>
          </ol>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Flex Query ID</span>
              <input value={queryId} onChange={(e) => setQueryId(e.target.value)} inputMode="numeric" placeholder="e.g. 987654" className={fieldCls} />
            </label>
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Token expires on</span>
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={fieldCls} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs text-slate-400 mb-1">Access token{existing ? ' (paste again to change)' : ''}</span>
              <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" placeholder="Long number from Flex Web Service" className={fieldCls} />
            </label>
          </div>

          {error && <p className="flex items-start gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
          {existing && !error && <p className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> Currently connected with report {existing.query_id}.</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800">
          {existing ? (
            <button onClick={remove} disabled={!!busy} className="text-sm text-red-300 hover:text-red-200 disabled:opacity-50 inline-flex items-center gap-2">
              {busy === 'remove' && <Loader2 className="w-4 h-4 animate-spin" />} Disconnect
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition">Cancel</button>
            <button onClick={save} disabled={!!busy || !token.trim() || !queryId.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} {busy === 'save' ? 'Testing connection…' : 'Test and connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
