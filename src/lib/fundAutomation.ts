import { supabase } from './supabase';
import { cents as r2 } from './money';
import { monthEnd } from './statementParser';
import { MOVEMENT_LABELS, loadFundData, refreshMarketPrices, saveDrafts, setMovementLabel, valueFund, type ClassValuation, type FundData, type HoldingValue, type MonthResult, type MovementLabel } from './fundValuation';
import { hasIbkrData } from './reconciliation';
import { MONTH_NAMES, buildReportNumbers, emptyNarrative, type ReportContent } from './monthlyReport';

export interface ReviewOption { key: string; label: string; description: string }

export interface ReviewItem {
  id: string;
  tenant_id: string;
  fund_id: string;
  share_class_id: string | null;
  month: string | null;
  kind: string;
  dedupe_key: string;
  title: string;
  detail: string;
  options: ReviewOption[];
  context: Record<string, unknown>;
  status: 'open' | 'resolved';
  resolution: string | null;
  created_at: string;
}

export interface AutomationResult {
  approvedMonths: string[];
  heldMonths: string[];
  partialMonths: string[];
  openItems: number;
  reportsDrafted: number;
}

interface DetectedItem {
  share_class_id: string | null;
  month: string | null;
  kind: string;
  dedupe_key: string;
  title: string;
  detail: string;
  options: ReviewOption[];
  context: Record<string, unknown>;
  blocking: boolean;
}

interface NavRow { id: string; share_class_id: string; nav_date: string; status: string; nav_per_share: number; total_shares: number; flows: number }

const UNUSUAL_RETURN = 0.25;
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
export const monthLabel = (mk: string) => `${MONTH_NAMES[+mk.slice(5, 7) - 1]} ${mk.slice(0, 4)}`;
const fullMonthEnd = (mk: string) => monthEnd(+mk.slice(0, 4), +mk.slice(5, 7));

const APPROVE_OR_HOLD = (approveLabel: string): ReviewOption[] => [
  { key: 'approve', label: approveLabel, description: 'The month is approved and investors see the figures straight away.' },
  { key: 'hold', label: 'Keep the month on hold', description: 'Nothing is published for this class from this month on until you change your mind.' },
];

function fail(step: string, cause: unknown): never {
  console.error(`fund automation failed: ${step}`, cause);
  throw new Error('The fund figures could not be updated. Please try again.');
}

function coverageEnd(d: FundData) {
  return d.uploads.reduce((max, u) => {
    const end = u.statement_data?.period?.end ?? fullMonthEnd(`${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`);
    return end > max ? end : max;
  }, '');
}

function detectDuplicateTrades(d: FundData, className: (id: string) => string): DetectedItem[] {
  const out: DetectedItem[] = [];
  d.uploads.forEach((u) => {
    const seen = new Map<string, string[]>();
    d.items.filter((i) => i.upload_id === u.id && i.id).forEach((i) => {
      const k = `${i.trade_date}|${i.instrument}|${i.direction}|${Number(i.quantity)}|${Number(i.price)}`;
      seen.set(k, [...(seen.get(k) ?? []), i.id!]);
    });
    const extras = [...seen.entries()].filter(([, ids]) => ids.length > 1);
    if (!extras.length) return;
    const month = `${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`;
    const sample = extras.slice(0, 3).map(([k, ids]) => { const [date, sym, dir, q, p] = k.split('|'); return `${ids.length}x ${dir} ${q} ${sym} @ ${p} on ${date}`; }).join('; ');
    out.push({
      share_class_id: u.share_class_id, month, kind: 'duplicate_trades', blocking: false,
      dedupe_key: `duplicate_trades:${u.id}`,
      title: `${className(u.share_class_id)}: ${extras.length} trade${extras.length === 1 ? '' : 's'} in ${monthLabel(month)} appear more than once`,
      detail: `Identical rows: ${sample}${extras.length > 3 ? '…' : ''}. Brokers often split one order into several identical fills, so these are usually real.`,
      options: [
        { key: 'keep', label: 'Keep them, they are separate fills', description: 'Figures stay as they are.' },
        { key: 'remove_extra', label: 'Remove the extra copies', description: 'Only one of each identical row is kept and the month is re-valued.' },
      ],
      context: { upload_id: u.id, extra_ids: extras.flatMap(([, ids]) => ids.slice(1)) },
    });
  });
  return out;
}

function detectClassGaps(v: ClassValuation, className: string): DetectedItem[] {
  const out: DetectedItem[] = [];
  const group = (pick: (m: MonthResult) => string[]) => {
    const months = v.months.filter((m) => pick(m).length);
    return { months, names: [...new Set(months.flatMap(pick))].sort() };
  };
  const prices = group((m) => m.missingPrices);
  if (prices.names.length) {
    const n = prices.names;
    out.push({
      share_class_id: v.classId, month: prices.months[0].month, blocking: true, kind: 'missing_prices',
      dedupe_key: `missing_prices:${v.classId}:${n.join(',')}`,
      title: `${className}: ${n.length} holding${n.length === 1 ? '' : 's'} could not be priced`,
      detail: `${n.slice(0, 10).join(', ')}${n.length > 10 ? '…' : ''} had no IBKR price in ${prices.months.length} month${prices.months.length === 1 ? '' : 's'} from ${monthLabel(prices.months[0].month)}. These months stay not final until IBKR reports a price; the next automatic update checks again.`,
      options: APPROVE_OR_HOLD('Approve, valuing them at zero'),
      context: { symbols: n, months: prices.months.map((m) => m.month) },
    });
  }
  const fx = group((m) => m.missingFx);
  if (fx.names.length) {
    out.push({
      share_class_id: v.classId, month: fx.months[0].month, blocking: true, kind: 'missing_fx',
      dedupe_key: `missing_fx:${v.classId}:${fx.names.join(',')}`,
      title: `${className}: no exchange rate found for ${fx.names.join(', ')}`,
      detail: `Holdings and cash in ${fx.names.join(', ')} cannot be converted to US dollars, so they are valued at zero. This usually resolves itself when the rate service is reachable again.`,
      options: APPROVE_OR_HOLD('Approve anyway'),
      context: { currencies: fx.names },
    });
  }
  return out;
}

const LABEL_EFFECT: Record<MovementLabel, string> = {
  investor: "Units are issued or cancelled at that day's IBKR unit price, so the unit price is not affected.",
  fee: 'Treated as an expense: it lowers the unit price and no units change.',
  internal: "Class switch: units come off one class and go onto the other at that day's IBKR unit price.",
  other_fund: "Units are cancelled or issued at that day's IBKR unit price, so the unit price is not affected.",
};

function detectMovements(v: ClassValuation, className: string): DetectedItem[] {
  return v.months.flatMap((m) => m.movements.filter((x) => !x.confirmed).map((x) => {
    const choices: MovementLabel[] = x.kind === 'shares' ? ['investor', 'other_fund', 'internal'] : ['fee', 'investor', 'other_fund', 'internal'];
    const ordered = [x.suggested, ...choices.filter((c) => c !== x.suggested)];
    return {
      share_class_id: v.classId, month: m.month, kind: 'movement', blocking: true,
      dedupe_key: `movement:${x.key}`,
      title: `${className}: what was the ${usd(Math.abs(x.amount))} ${x.amount < 0 ? 'going out' : 'coming in'} on ${x.date}?`,
      detail: `${x.description}. ${x.reason} The month cannot become final until this is answered, because it decides whether the unit price or the number of units changes.`,
      options: ordered.map((c) => ({ key: `label:${c}`, label: MOVEMENT_LABELS[c] + (c === x.suggested ? ' (suggested)' : ''), description: LABEL_EFFECT[c] })),
      context: { movement_key: x.key },
    };
  }));
}

interface Diagnosis { cause: string; detail: string }

function diagnoseMove(m: MonthResult, prev: MonthResult | undefined): Diagnosis {
  const before = new Map<string, HoldingValue>((prev?.holdings ?? []).map((h) => [h.symbol, h]));
  const change = m.accountValue - m.openingValue - m.flows;
  const lines: string[] = [];
  let cause = 'market';

  if (Math.abs(m.unexplained) > Math.max(1000, Math.abs(change) * 0.25, Math.abs(m.openingValue) * 0.02)) {
    cause = 'incomplete';
    lines.push(m.unexplained > 0
      ? `${usd(m.unexplained)} of value shows up at IBKR that the activity in the IBKR report does not explain.`
      : `${usd(-m.unexplained)} of value the activity in the IBKR report expects is not at IBKR.`);
    lines.push("IBKR's own month-end value is used either way. The gap usually comes from a corporate action, such as a takeover paid in cash, that the report describes in a way the rebuild does not follow.");
  }

  const movers = m.holdings
    .map((h) => ({ h, p: before.get(h.symbol), delta: h.marketValue - (before.get(h.symbol)?.marketValue ?? 0) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  for (const { h, p } of movers.slice(0, 5)) {
    if (!p?.price || !h.price) continue;
    const ratio = h.price / p.price;
    const n = ratio >= 1 ? Math.round(ratio) : Math.round(1 / ratio);
    const splitLike = n >= 2 && Math.abs((ratio >= 1 ? ratio : 1 / ratio) - n) < 0.08;
    if (splitLike && Math.abs(h.quantity - p.quantity) < 1e-6) {
      if (cause === 'market') cause = 'split';
      lines.push(`${h.symbol}: IBKR's price moved ${ratio >= 1 ? `${n} times up` : `to 1/${n}`} while the share count stayed the same, which looks like a split the report did not record.`);
    }
  }

  if (m.internalFlows && Math.abs(m.internalFlows) > Math.abs(m.openingValue) * 0.05) {
    lines.push(`${usd(Math.abs(m.internalFlows))} moved between your own accounts. This is not counted as gain or loss.`);
  }
  const fxHeavy = m.holdings.filter((h) => h.currency !== 'USD').reduce((s, h) => s + Math.abs(h.marketValue), 0);
  if (cause === 'market' && fxHeavy > Math.abs(m.accountValue) * 0.3) {
    cause = 'currency';
    lines.push(`${usd(fxHeavy)} is held in foreign currencies, so exchange-rate moves add to the swing.`);
  }
  if (cause === 'market') {
    const top = movers.slice(0, 3).filter((x) => Math.abs(x.delta) > 1).map((x) => `${x.h.symbol} ${x.delta >= 0 ? '+' : '−'}${usd(Math.abs(x.delta))}`);
    lines.push(`No data problem was found. The biggest contributors were ${top.join(', ') || 'cash'}, out of a total change of ${usd(change)}.`);
  }
  return { cause, detail: lines.join(' ') };
}

const CAUSE_TITLE: Record<string, string> = {
  incomplete: 'part of the move is not explained by the IBKR activity',
  split: 'possible unrecorded share split',
  currency: 'large move, partly from exchange rates',
  market: 'large market move',
};

function detectMonthIssues(v: ClassValuation, m: MonthResult, prev: MonthResult | undefined, className: string): DetectedItem[] {
  const out: DetectedItem[] = [];
  const base = { share_class_id: v.classId, month: m.month, blocking: true };
  if (Math.abs(m.monthReturn) > UNUSUAL_RETURN) {
    const d = diagnoseMove(m, prev);
    out.push({
      ...base, kind: 'unusual_return',
      dedupe_key: `unusual_return:${v.classId}:${m.month}:${m.unitPrice.toFixed(4)}:${d.cause}`,
      title: `${className}, ${monthLabel(m.month)}: ${pct(m.monthReturn)} — ${CAUSE_TITLE[d.cause]}`,
      detail: `Value went from ${usd(m.openingValue)} to ${usd(m.accountValue)}. ${d.detail}`,
      options: APPROVE_OR_HOLD('Approve, the figure is right'),
      context: { cause: d.cause },
    });
  }
  return out;
}

function detectRebuildGaps(v: ClassValuation, className: string): DetectedItem[] {
  const gaps = v.months.filter((m) => m.brokerValue != null && Math.abs(m.computedValue - m.brokerValue) > Math.max(50, Math.abs(m.brokerValue) * 0.01));
  if (!gaps.length) return [];
  const list = gaps.map((m) => `${monthLabel(m.month)} ${usd(m.brokerValue! - m.computedValue)}`).join(', ');
  return [{
    share_class_id: v.classId, month: gaps[0].month, kind: 'reconcile', blocking: false,
    dedupe_key: `reconcile:${v.classId}:${gaps.map((m) => `${m.month}=${Math.round(m.computedValue - m.brokerValue!)}`).join(',')}`,
    title: `${className}: IBKR's value differs from the rebuild in ${gaps.length} month${gaps.length === 1 ? '' : 's'}`,
    detail: `IBKR's own month-end value is always the one used, so the unit price is right. The rebuild from IBKR's trades and cash differs in: ${list}. Open Reconcile on the Fund Value screen to see the cause for each month.`,
    options: [{ key: 'noted', label: 'Understood', description: "IBKR's figures stay in use; the check runs again after every update." }],
    context: {},
  }];
}

async function syncReviewItems(tenantId: string, fundId: string, detected: DetectedItem[]): Promise<ReviewItem[]> {
  if (detected.length) {
    const rows = detected.map(({ blocking: _b, ...d }) => ({ tenant_id: tenantId, fund_id: fundId, ...d, status: 'open' }));
    const { error } = await supabase.from('fund_review_items').upsert(rows, { onConflict: 'fund_id,dedupe_key', ignoreDuplicates: true });
    if (error) fail('save questions', error);
  }
  const { data, error } = await supabase.from('fund_review_items').select('*').eq('fund_id', fundId);
  if (error) fail('load questions', error);
  const keys = new Set(detected.map((d) => d.dedupe_key));
  const stale = (data ?? []).filter((r) => r.status === 'open' && !keys.has(r.dedupe_key)).map((r) => r.id);
  if (stale.length) {
    const { error: sErr } = await supabase.from('fund_review_items')
      .update({ status: 'resolved', resolution: 'auto_cleared', resolved_at: new Date().toISOString() }).in('id', stale);
    if (sErr) fail('clear old questions', sErr);
  }
  return ((data ?? []) as ReviewItem[]).map((r) => (stale.includes(r.id) ? { ...r, status: 'resolved', resolution: 'auto_cleared' } : r));
}

async function loadNavs(fundId: string): Promise<NavRow[]> {
  const { data, error } = await supabase.from('nav_calculations')
    .select('id, share_class_id, nav_date, status, nav_per_share, total_shares, version, calculation_data')
    .eq('fund_id', fundId).eq('calculation_method', 'broker_statement').order('version', { ascending: false });
  if (error) fail('load fund values', error);
  const latest = new Map<string, NavRow>();
  (data ?? []).forEach((n) => {
    const k = `${n.share_class_id}|${n.nav_date}`;
    if (latest.has(k)) return;
    latest.set(k, {
      id: n.id, share_class_id: n.share_class_id, nav_date: n.nav_date, status: n.status, nav_per_share: Number(n.nav_per_share),
      total_shares: Number(n.total_shares), flows: Number((n.calculation_data as { flows?: number } | null)?.flows ?? 0),
    });
  });
  return [...latest.values()];
}

async function reopenChangedMonths(navs: NavRow[], vals: ClassValuation[]) {
  const reopen: string[] = [];
  vals.forEach((v) => {
    const approved = navs.filter((n) => n.share_class_id === v.classId && n.status === 'approved').sort((a, b) => a.nav_date.localeCompare(b.nav_date));
    const firstChanged = approved.find((n) => {
      const m = v.months.find((x) => x.date === n.nav_date);
      return !m || Math.abs(m.unitPrice - n.nav_per_share) > 1e-6;
    });
    if (firstChanged) approved.filter((n) => n.nav_date >= firstChanged.nav_date).forEach((n) => reopen.push(n.id));
  });
  if (!reopen.length) return;
  const { error } = await supabase.from('nav_calculations').update({ status: 'draft', approved_by: null, approved_at: null }).in('id', reopen);
  if (error) fail('reopen changed months', error);
}

async function updateCapitalAccounts(fundId: string, navs: NavRow[], className: (id: string | null) => string) {
  const { data: accts, error } = await supabase.from('capital_accounts')
    .select('id, share_class_id, shares_owned, cost_basis, metadata').eq('fund_id', fundId);
  if (error) fail('load investor accounts', error);
  // Official investor units come only from the unit register; the investor portal values them from final months itself.
  const legacy = (accts ?? []).filter((a) => ((a.metadata ?? {}) as Record<string, unknown>).official !== true);
  for (const a of legacy) {
    const approved = navs.filter((n) => n.share_class_id === a.share_class_id && n.status === 'approved').sort((x, y) => y.nav_date.localeCompare(x.nav_date));
    const latest = approved[0];
    if (!latest) continue;
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const openingUnits = Number(meta.opening_units ?? a.shares_owned);
    const openingCost = Number(meta.opening_cost ?? a.cost_basis ?? 0);
    const classOpening = legacy.filter((x) => x.share_class_id === a.share_class_id)
      .reduce((s, x) => s + Number(((x.metadata ?? {}) as Record<string, unknown>).opening_units ?? x.shares_owned), 0);
    // Without an investor-level dealing record, new class units are shared in proportion to each account's starting units.
    const share = classOpening > 0 ? openingUnits / classOpening : 1;
    const units = Math.round(latest.total_shares * share * 10000) / 10000;
    const netFlows = approved.reduce((s, n) => s + n.flows, 0) * share;
    const costBasis = r2(openingCost + netFlows);
    const value = r2(units * latest.nav_per_share);
    const prev = approved[1];
    const prevPrice = prev?.nav_per_share ?? 1;
    const monthGain = r2(units * (latest.nav_per_share - prevPrice));
    const { error: uErr } = await supabase.from('capital_accounts').update({
      shares_owned: units,
      cost_basis: costBasis,
      unrealized_gain_loss: r2(value - costBasis),
      metadata: { ...meta, opening_units: openingUnits, opening_cost: openingCost, class_name: className(a.share_class_id), current_value: value, unit_price: latest.nav_per_share, valued_at: latest.nav_date, month_gain: monthGain, prev_unit_price: prevPrice },
      updated_at: new Date().toISOString(),
    }).eq('id', a.id);
    if (uErr) fail('update investor account', uErr);
  }
}

async function draftReports(tenantId: string, fundId: string, userId: string, months: string[], refreshOnly: string[]) {
  if (!months.length && !refreshOnly.length) return 0;
  const { data: fund } = await supabase.from('funds').select('fund_name').eq('id', fundId).maybeSingle();
  const fundName = fund?.fund_name ?? 'Fund';
  const { data: existing, error } = await supabase.from('reports')
    .select('id, period_start, status, report_content').eq('fund_id', fundId).eq('report_type', 'monthly_update');
  if (error) fail('load reports', error);
  let drafted = 0;
  for (const mk of [...new Set([...months, ...refreshOnly])].sort()) {
    const year = +mk.slice(0, 4);
    const month = +mk.slice(5, 7);
    const report = (existing ?? []).find((r) => r.period_start === `${mk}-01`);
    if (report && report.status !== 'draft') continue;
    if (!report && !months.includes(mk)) continue;
    const nums = await buildReportNumbers(fundId, fundName, year, month);
    const prior = (report?.report_content ?? {}) as Partial<ReportContent>;
    const content: ReportContent = { version: 2, ...emptyNarrative(), ...prior, ...nums };
    const res = report
      ? await supabase.from('reports').update({ report_content: content }).eq('id', report.id)
      : await supabase.from('reports').insert({
        tenant_id: tenantId, report_type: 'monthly_update', fund_id: fundId, generated_by: userId, status: 'draft',
        report_name: `Monthly Update - ${nums.period.label} - ${fundName}`,
        period_start: nums.period.start, period_end: nums.period.end, report_content: content,
        parameters: { year, month: month - 1, fund_id: fundId },
      });
    if (res.error) fail('draft report', res.error);
    if (!report) drafted++;
  }
  return drafted;
}

async function valueWithPrices(tenantId: string, fundId: string) {
  let data = await loadFundData(fundId);
  let vals = valueFund(data);
  try {
    const { updated } = await refreshMarketPrices(tenantId, fundId, vals, data);
    if (updated) { data = await loadFundData(fundId); vals = valueFund(data); }
  } catch (e) {
    console.warn('market prices unavailable', e);
  }
  return { data, vals };
}

export async function runFundAutomation(tenantId: string, fundId: string, userId: string): Promise<AutomationResult> {
  const { data, vals } = await valueWithPrices(tenantId, fundId);
  const cutoff = coverageEnd(data);
  const className = (id: string | null) => data.classes.find((c) => c.id === id)?.class_name ?? 'Unassigned class';
  const isFull = (m: MonthResult) => !!cutoff && m.date === fullMonthEnd(m.month) && m.date <= cutoff;

  const fullVals = vals.filter(hasIbkrData).map((v) => ({ ...v, months: v.months.filter(isFull) }));
  const partialMonths = [...new Set(vals.flatMap((v) => v.months.filter((m) => !isFull(m)).map((m) => m.month)))];

  const detected: DetectedItem[] = [
    ...detectDuplicateTrades(data, className),
    ...fullVals.flatMap((v) => detectClassGaps(v, className(v.classId))),
    ...fullVals.flatMap((v) => detectMovements(v, className(v.classId))),
    ...fullVals.flatMap((v) => v.months.flatMap((m, i) => detectMonthIssues(v, m, v.months[i - 1], className(v.classId)))),
    ...fullVals.flatMap((v) => detectRebuildGaps(v, className(v.classId))),
  ];
  const items = await syncReviewItems(tenantId, fundId, detected);
  const blockingKeys = new Set(detected.filter((d) => d.blocking).map((d) => d.dedupe_key));
  const blocked = new Set(items
    .filter((i) => blockingKeys.has(i.dedupe_key) && (i.status === 'open' || i.resolution === 'hold'))
    .map((i) => `${i.share_class_id}|${i.month}`));

  await reopenChangedMonths(await loadNavs(fundId), fullVals);
  await saveDrafts(fundId, userId, fullVals);
  const navs = await loadNavs(fundId);

  const toApprove: string[] = [];
  const approvedMonths = new Set<string>();
  const heldMonths = new Set<string>();
  fullVals.forEach((v) => {
    let stopped = false;
    v.months.forEach((m) => {
      const row = navs.find((n) => n.share_class_id === v.classId && n.nav_date === m.date);
      if (!row) return;
      if (stopped || blocked.has(`${v.classId}|${m.month}`)) { stopped = true; heldMonths.add(m.month); return; }
      if (row.status !== 'approved') { toApprove.push(row.id); approvedMonths.add(m.month); }
    });
  });
  if (toApprove.length) {
    const { error } = await supabase.from('nav_calculations')
      .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() }).in('id', toApprove);
    if (error) fail('approve months', error);
    toApprove.forEach((id) => { const n = navs.find((x) => x.id === id); if (n) n.status = 'approved'; });
  }

  await updateCapitalAccounts(fundId, navs, className);
  const approvedFullMonths = fullVals.flatMap((v) => v.months
    .filter((m) => navs.some((n) => n.share_class_id === v.classId && n.nav_date === m.date && n.status === 'approved'))
    .map((m) => m.month));
  const allFullMonths = [...new Set(fullVals.flatMap((v) => v.months.map((m) => m.month)))];
  const reportsDrafted = await draftReports(tenantId, fundId, userId, [...new Set(approvedFullMonths)], allFullMonths);

  return {
    approvedMonths: [...approvedMonths].sort(),
    heldMonths: [...heldMonths].sort(),
    partialMonths: partialMonths.sort(),
    openItems: items.filter((i) => i.status === 'open').length,
    reportsDrafted,
  };
}

export async function runTenantAutomation(tenantId: string, userId: string) {
  const { data: funds, error } = await supabase.from('funds').select('id').eq('tenant_id', tenantId).eq('status', 'active');
  if (error) fail('load funds', error);
  const results: AutomationResult[] = [];
  for (const f of funds ?? []) results.push(await runFundAutomation(tenantId, f.id, userId));
  return results.reduce<AutomationResult>((acc, r) => ({
    approvedMonths: [...new Set([...acc.approvedMonths, ...r.approvedMonths])].sort(),
    heldMonths: [...new Set([...acc.heldMonths, ...r.heldMonths])].sort(),
    partialMonths: [...new Set([...acc.partialMonths, ...r.partialMonths])].sort(),
    openItems: acc.openItems + r.openItems,
    reportsDrafted: acc.reportsDrafted + r.reportsDrafted,
  }), { approvedMonths: [], heldMonths: [], partialMonths: [], openItems: 0, reportsDrafted: 0 });
}

export async function loadOpenReviewItems(tenantId: string): Promise<ReviewItem[]> {
  const { data, error } = await supabase.from('fund_review_items').select('*')
    .eq('tenant_id', tenantId).eq('status', 'open').order('created_at');
  if (error) fail('load questions', error);
  return (data ?? []) as ReviewItem[];
}

export async function resolveReviewItem(item: ReviewItem, optionKey: string, userId: string) {
  if (!item.options.some((o) => o.key === optionKey)) throw new Error('That choice is not available.');
  if (item.kind === 'movement' && optionKey.startsWith('label:')) {
    await setMovementLabel(item.tenant_id, item.fund_id, item.share_class_id, String(item.context.movement_key), optionKey.slice(6) as MovementLabel, userId)
      .catch((e) => fail('save movement label', e));
  }
  if (item.kind === 'duplicate_trades' && optionKey === 'remove_extra') {
    const ids = (item.context.extra_ids as string[]) ?? [];
    if (ids.length) {
      const { error } = await supabase.from('trade_upload_items').delete().in('id', ids);
      if (error) fail('remove duplicate trades', error);
    }
  }
  const { error } = await supabase.from('fund_review_items')
    .update({ status: 'resolved', resolution: optionKey, resolved_by: userId, resolved_at: new Date().toISOString() }).eq('id', item.id);
  if (error) fail('save decision', error);
}

export function describeResult(r: AutomationResult) {
  const parts: string[] = [];
  const range = (ms: string[]) => (ms.length === 1 ? monthLabel(ms[0]) : `${monthLabel(ms[0])} to ${monthLabel(ms[ms.length - 1])}`);
  parts.push(r.approvedMonths.length ? `${range(r.approvedMonths)} approved and published to investors.` : 'No new months needed approving.');
  if (r.heldMonths.length) parts.push(`${r.heldMonths.length} month${r.heldMonths.length === 1 ? ' is' : 's are'} waiting on your decision.`);
  if (r.partialMonths.length) parts.push(`${r.partialMonths.map(monthLabel).join(', ')} left out until IBKR reports the full month.`);
  if (r.reportsDrafted) parts.push(`${r.reportsDrafted} draft monthly report${r.reportsDrafted === 1 ? '' : 's'} created.`);
  return parts.join(' ');
}
