import { supabase } from './supabase';
import { parseFlexXml } from './flexStatement';
import { buildMonthlyBatches, saveStatementBatches, storeSourceFile, type PositionSnapshot, type StatementMonthData } from './statementImport';
import { describeResult, runFundAutomation } from './fundAutomation';
import { syncCorporateActions } from './corporateActions';
import { monthEnd, monthsBetween } from './statementParser';

export interface SyncProgress {
  status: 'running' | 'done' | 'failed';
  done: number;
  total: number;
  month: string | null;
  failed_month: string | null;
  message: string | null;
  updated_at?: string;
}

export async function callFlex(payload: Record<string, unknown>) {
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

export async function hasIbkrConnection(fundId: string) {
  const { data, error } = await supabase.from('ibkr_flex_connections').select('fund_id').eq('fund_id', fundId).maybeSingle();
  if (error) throw new Error('Could not check the Interactive Brokers connection. Please try again.');
  return !!data;
}

export const monthName = (mk: string) => new Date(`${mk}-15T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const PAUSE_MS = 2500;
const running = new Set<string>();

interface SavedMonth { share_class_id: string; broker_account: string | null; upload_year: number; upload_month: number; statement_data: StatementMonthData }

async function plan(fundId: string, onlyMonth?: string) {
  const [{ data: fund, error: fErr }, { data: maps, error: mErr }, { data: saved, error: sErr }] = await Promise.all([
    supabase.from('funds').select('inception_date').eq('id', fundId).maybeSingle(),
    supabase.from('fund_broker_accounts').select('account_id, share_class_id').eq('fund_id', fundId),
    supabase.from('trade_uploads').select('share_class_id, broker_account, upload_year, upload_month, statement_data').eq('fund_id', fundId).eq('status', 'confirmed'),
  ]);
  if (fErr || mErr || sErr) throw new Error('Could not load what has already been imported. Please try again.');
  const rows = (saved ?? []) as SavedMonth[];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const keyOf = (r: SavedMonth) => `${r.upload_year}-${String(r.upload_month).padStart(2, '0')}`;
  const firstSaved = rows.map(keyOf).sort()[0];
  const startMonth = (fund?.inception_date ?? firstSaved ?? yesterday).slice(0, 7);
  const classes = [...new Set((maps ?? []).map((m) => m.share_class_id))];
  const all = monthsBetween(`${startMonth}-01`, yesterday);
  const complete = (mk: string) => {
    const end = monthEnd(+mk.slice(0, 4), +mk.slice(5, 7));
    const mine = rows.filter((r) => keyOf(r) === mk);
    return classes.length > 0 && classes.every((c) => mine.some((r) => r.share_class_id === c && r.statement_data?.import_mode === 'monthly' && r.statement_data.period?.end >= end));
  };
  const months = onlyMonth ? [onlyMonth] : all.filter((mk) => !complete(mk));
  const closingFor = (mk: string) => {
    const out: Record<string, PositionSnapshot[]> = {};
    rows.filter((r) => keyOf(r) === mk && r.broker_account && r.statement_data?.closing?.has_positions !== false && r.statement_data?.closing?.positions?.length)
      .forEach((r) => { out[r.broker_account!] = r.statement_data.closing!.positions; });
    return out;
  };
  return { months, maps: maps ?? [], yesterday, closingFor, doneBefore: onlyMonth ? 0 : all.length - months.length };
}

const prevMonth = (mk: string) => {
  const d = new Date(`${mk}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

export async function pullFromIbkr(tenantId: string, fundId: string, userId: string, opts: { onlyMonth?: string; onProgress?: (p: SyncProgress) => void } = {}) {
  if (running.has(fundId)) throw new Error('An update from Interactive Brokers is already running for this fund.');
  running.add(fundId);
  const report = async (p: SyncProgress) => {
    opts.onProgress?.(p);
    if (p.status !== 'running') await callFlex({ action: 'progress', fund_id: fundId, progress: p }).catch((e) => console.error('could not record progress', e));
  };
  try {
    const { months, maps, yesterday, closingFor, doneBefore } = await plan(fundId, opts.onlyMonth);
    if (!months.length) {
      await report({ status: 'done', done: 0, total: 0, month: null, failed_month: null, message: null });
      return 'Every month is already up to date with Interactive Brokers.';
    }
    let previous: Record<string, PositionSnapshot[]> = closingFor(prevMonth(months[0]));
    let saved = 0;
    const skippedAll = new Map<string, number>();
    const warnings = new Set<string>();
    for (let i = 0; i < months.length; i++) {
      const mk = months[i];
      const progress: SyncProgress = { status: 'running', done: i, total: months.length, month: mk, failed_month: null, message: null };
      opts.onProgress?.(progress);
      if (i > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
      const end = monthEnd(+mk.slice(0, 4), +mk.slice(5, 7));
      try {
        const { xml } = await callFlex({ action: 'fetch', fund_id: fundId, from_date: `${mk}-01`, to_date: end < yesterday ? end : yesterday, progress });
        if (!xml) throw new Error('Interactive Brokers returned an empty report.');
        const statement = parseFlexXml(xml);
        const accountToClass = Object.fromEntries(maps.filter((m) => statement.accounts.includes(m.account_id)).map((m) => [m.account_id, m.share_class_id]));
        if (!Object.keys(accountToClass).length) throw new Error('None of the accounts in the Interactive Brokers report are matched to a share class yet. Upload one statement by hand first so the accounts are matched.');
        if (prevMonth(mk) !== months[i - 1]) previous = closingFor(prevMonth(mk));
        const batches = buildMonthlyBatches(statement, accountToClass, previous).filter((b) => `${b.year}-${String(b.month).padStart(2, '0')}` === mk);
        batches.forEach((b) => { b.data.import_mode = 'monthly'; });
        const filename = `IBKR ${monthName(mk)} (pulled ${new Date().toISOString().slice(0, 10)}).xml`;
        const sourcePath = await storeSourceFile(tenantId, new Blob([xml], { type: 'application/xml' }), filename);
        saved += await saveStatementBatches({ tenantId, fundId, userId, filename, sourcePath, statement, batches, accountToClass });
        await syncCorporateActions(tenantId, fundId, batches.map((b) => ({ classId: b.shareClassId, events: b.data.corporate_actions ?? [] })));
        previous = Object.fromEntries(batches.filter((b) => b.data.closing?.positions.length).map((b) => [b.account, b.data.closing!.positions]));
        statement.warnings.forEach((w) => warnings.add(w));
        statement.skipped.filter((s) => !s.reason.startsWith('Currency conversion'))
          .forEach((s) => { const k = `${s.section}: ${s.reason.toLowerCase()}`; skippedAll.set(k, (skippedAll.get(k) ?? 0) + 1); });
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'Interactive Brokers could not produce the report.';
        const message = `${monthName(mk)} could not be pulled: ${reason} ${i ? `The ${i} month${i === 1 ? '' : 's'} before it ${i === 1 ? 'is' : 'are'} saved. ` : ''}Retry ${monthName(mk)} to try just that month.`;
        await report({ status: 'failed', done: i, total: months.length, month: mk, failed_month: mk, message });
        throw new Error(message);
      }
    }
    const automation = describeResult(await runFundAutomation(tenantId, fundId, userId));
    await report({ status: 'done', done: months.length, total: months.length, month: null, failed_month: null, message: null });
    const skippedN = [...skippedAll.values()].reduce((a, b) => a + b, 0);
    const skippedText = skippedN
      ? ` ${skippedN} line${skippedN === 1 ? '' : 's'} in the reports could not be used (${[...skippedAll].map(([k, n]) => `${k} x${n}`).join('; ')}). Check these in Interactive Brokers if a month does not reconcile.`
      : '';
    const scope = doneBefore ? ` ${doneBefore} earlier month${doneBefore === 1 ? ' was' : 's were'} already final and not pulled again.` : '';
    return `Pulled ${months.length} month${months.length === 1 ? '' : 's'} from Interactive Brokers (${saved} class-month${saved === 1 ? '' : 's'} changed).${scope} ${automation}${warnings.size ? ` ${[...warnings].join(' ')}` : ''}${skippedText}`.trim();
  } finally {
    running.delete(fundId);
  }
}
