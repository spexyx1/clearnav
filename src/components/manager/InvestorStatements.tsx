import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTenantId } from '../../lib/useTenantId';
import { formatNumber } from '../../lib/format';
import { createStatements, latestFinalMonth } from '../../lib/unitRegister';
import TenantNotice from './TenantNotice';
import { PanelLoader } from '../shared/Spinner';
import { FundSelect, PageHeader, useFunds } from './history/useFunds';
import { Button, Empty, Pill, Section, card, input, usd } from './onboarding/ui';

interface StatementRow {
  id: string;
  period_end: string | null;
  beginning_balance: number | null;
  ending_balance: number | null;
  contributions: number | null;
  distributions: number | null;
  fees: number | null;
  return_amount: number | null;
  return_percent: number | null;
  shares_beginning: number | null;
  shares_ending: number | null;
  nav_per_share: number | null;
  status: string;
  capital_account: { account_number: string | null; investor: { full_name: string | null; email: string | null } | null } | null;
}

const STATUS: Record<string, { label: string; tone: 'amber' | 'cyan' | 'green' | 'slate' }> = {
  draft: { label: 'Draft', tone: 'amber' },
  finalized: { label: 'Checked', tone: 'cyan' },
  ready: { label: 'Ready', tone: 'green' },
  sent: { label: 'Sent', tone: 'green' },
  viewed: { label: 'Viewed', tone: 'green' },
};

const money = (v: number | null) => (v == null ? '—' : usd(Number(v)));
const monthName = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—');

export default function InvestorStatements() {
  const { user } = useAuth();
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [statements, setStatements] = useState<StatementRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('');
  const [latest, setLatest] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    let q = supabase.from('investor_statements')
      .select('id, period_end, beginning_balance, ending_balance, contributions, distributions, fees, return_amount, return_percent, shares_beginning, shares_ending, nav_per_share, status, capital_account:capital_accounts!capital_account_id(account_number, investor:client_profiles!investor_id(full_name, email))')
      .eq('fund_id', fundId).order('period_end', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) setMessage({ ok: false, text: 'Could not load the statements. Please try again.' });
    else setStatements((data ?? []) as unknown as StatementRow[]);
    setLoading(false);
  }, [fundId, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!fundId) return;
    setLatest(undefined);
    latestFinalMonth(fundId)
      .then((m) => { setLatest(m); setPeriod((cur) => cur || m || ''); })
      .catch(() => setLatest(null));
  }, [fundId]);

  const generate = async () => {
    if (!tenantId || !user || !period) return;
    setBusy('generate');
    setMessage(null);
    try {
      const r = await createStatements(tenantId, fundId, period, user.id);
      const parts = [`Created ${r.created} statement${r.created === 1 ? '' : 's'}.`];
      if (r.skipped) parts.push(`${r.skipped} already existed and were left as they are.`);
      if (r.notFinalClasses) parts.push(`${r.notFinalClasses} class${r.notFinalClasses === 1 ? ' is' : 'es are'} still awaiting IBKR confirmation for this month, so no statements were made for them.`);
      setMessage({ ok: r.created > 0 || r.skipped > 0, text: parts.join(' ') });
      load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || 'Could not create the statements.' });
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (id: string, status: 'finalized' | 'ready') => {
    setBusy(id);
    setMessage(null);
    const patch = status === 'finalized' ? { status, finalized_at: new Date().toISOString() } : { status };
    const { error } = await supabase.from('investor_statements').update(patch).eq('id', id);
    if (error) setMessage({ ok: false, text: 'Could not update the statement. Please try again.' });
    else load();
    setBusy(null);
  };

  if (state === 'loading') return <PanelLoader />;
  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;

  const counts = statements.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <PageHeader title="Investor" strong="Statements"
        intro="Monthly statements for each investor, made only from month-end prices IBKR has confirmed as final. Check each one, then mark it ready. Nothing is emailed from here.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
      </PageHeader>

      {fundsError && <p className="text-sm text-red-300">{fundsError}</p>}
      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>{message.text}</div>
      )}

      <Section title="Create statements" hint={latest === undefined ? 'Checking the latest confirmed month...' : latest ? `The latest month IBKR has confirmed is ${monthName(`${latest}-01`)}.` : 'No month has been confirmed by IBKR yet. Statements can be made once a month is marked final in Fund Value.'}>
        <div className="px-5 pb-5 flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="block sm:w-56">
            <span className="block text-xs font-medium text-slate-300 mb-1.5">Month</span>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={input} />
          </label>
          <Button onClick={generate} loading={busy === 'generate'} disabled={!period || !fundId}>
            <FileText className="w-3.5 h-3.5" />Create statements
          </Button>
        </div>
      </Section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['draft', 'finalized', 'ready', 'sent'] as const).map((s) => (
          <div key={s} className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-wider text-slate-500">{STATUS[s].label}</p>
            <p className="text-2xl text-white font-light tabular-nums mt-1">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <Section title={`Statements (${statements.length})`}
        action={
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${input} sm:w-44`}>
            <option value="all">All</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        }>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading</div>
        ) : !statements.length ? (
          <Empty>No statements yet. Pick a confirmed month above and create them.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-y border-slate-800">
                  <th className="px-5 py-2 font-medium">Investor</th>
                  <th className="px-5 py-2 font-medium">Month</th>
                  <th className="px-5 py-2 font-medium text-right">Start value</th>
                  <th className="px-5 py-2 font-medium text-right">In / out</th>
                  <th className="px-5 py-2 font-medium text-right">Fees</th>
                  <th className="px-5 py-2 font-medium text-right">End value</th>
                  <th className="px-5 py-2 font-medium text-right">Return</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {statements.map((s) => {
                  const inv = s.capital_account?.investor;
                  const st = STATUS[s.status] ?? { label: s.status, tone: 'slate' as const };
                  const ret = s.return_percent == null ? null : Number(s.return_percent);
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors align-top">
                      <td className="px-5 py-3">
                        <p className="text-slate-200">{inv?.full_name || inv?.email || 'Unnamed investor'}</p>
                        <p className="text-xs text-slate-500">{s.capital_account?.account_number || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{monthName(s.period_end)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        {money(s.beginning_balance)}
                        <p className="text-xs text-slate-500">{formatNumber(s.shares_beginning, 4)} units</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">
                        <span className="text-emerald-300">{money(s.contributions)}</span>
                        <p className="text-xs text-slate-400">{money(s.distributions)} out</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">{money(s.fees)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-white">
                        {money(s.ending_balance)}
                        <p className="text-xs text-slate-500">{formatNumber(s.shares_ending, 4)} units at {formatNumber(s.nav_per_share, 4)}</p>
                      </td>
                      <td className={`px-5 py-3 text-right tabular-nums ${ret == null ? 'text-slate-400' : ret >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {ret == null ? '—' : `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`}
                        <p className="text-xs text-slate-500">{money(s.return_amount)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-2">
                          <Pill tone={st.tone}>{st.label}</Pill>
                          {s.status === 'draft' && <Button tone="quiet" loading={busy === s.id} onClick={() => setStatus(s.id, 'finalized')}>Mark checked</Button>}
                          {s.status === 'finalized' && <Button loading={busy === s.id} onClick={() => setStatus(s.id, 'ready')}><CheckCircle2 className="w-3.5 h-3.5" />Mark as ready</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
