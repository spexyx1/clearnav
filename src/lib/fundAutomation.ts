import { supabase } from './supabase';
import { monthEnd } from './statementParser';
import { loadFundData, refreshMarketPrices, saveDrafts, valueFund, type ClassValuation, type FundData, type MonthResult } from './fundValuation';
import { MONTH_NAMES, buildReportNumbers, emptyNarrative, type ReportContent } from './monthlyReport';

export interface ReviewOption { key: string; label: string; description: string }

export interface ReviewItem {
  id: string;
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

interface NavRow { id: string; share_class_id: string; nav_date: string; status: string; nav_per_share: number }

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

async function detectDuplicateUploads(fundId: string, className: (id: string) => string): Promise<DetectedItem[]> {
  const { data, error } = await supabase.from('trade_uploads')
    .select('id, share_class_id, upload_year, upload_month, status, created_at, filename, statement_data, trade_upload_items(count)')
    .eq('fund_id', fundId).in('status', ['confirmed', 'superseded']).not('share_class_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) fail('load uploads', error);
  const groups = new Map<string, typeof data>();
  (data ?? []).forEach((u) => {
    const k = `${u.share_class_id}|${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`;
    groups.set(k, [...(groups.get(k) ?? []), u]);
  });
  const out: DetectedItem[] = [];
  groups.forEach((rows, k) => {
    const current = rows.find((r) => r.status === 'confirmed');
    const previous = rows.find((r) => r.status === 'superseded');
    if (!current || !previous) return;
    const count = (r: typeof current) => (r.trade_upload_items as unknown as { count: number }[])?.[0]?.count ?? 0;
    const same = count(current) === count(previous) && JSON.stringify(current.statement_data) === JSON.stringify(previous.statement_data);
    if (same) return;
    const [classId, month] = k.split('|');
    out.push({
      share_class_id: classId, month, kind: 'duplicate_upload', blocking: true,
      dedupe_key: `duplicate_upload:${current.id}:${previous.id}`,
      title: `${className(classId)}: ${monthLabel(month)} was uploaded twice with different figures`,
      detail: `The newer upload has ${count(current)} trades; the earlier one had ${count(previous)}. Only one can count.`,
      options: [
        { key: 'keep_new', label: 'Use the newer upload', description: 'Keep the most recent statement for this month.' },
        { key: 'restore_old', label: 'Go back to the earlier upload', description: 'Ignore the newer statement and use the one uploaded before.' },
      ],
      context: { current_id: current.id, previous_id: previous.id },
    });
  });
  return out;
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

function detectMonthIssues(v: ClassValuation, m: MonthResult, className: string): DetectedItem[] {
  const out: DetectedItem[] = [];
  const base = { share_class_id: v.classId, month: m.month, blocking: true };
  if (m.missingPrices.length) {
    out.push({
      ...base, kind: 'missing_prices',
      dedupe_key: `missing_prices:${v.classId}:${m.month}:${[...m.missingPrices].sort().join(',')}`,
      title: `${className}: no month-end price for ${m.missingPrices.length} position${m.missingPrices.length === 1 ? '' : 's'} in ${monthLabel(m.month)}`,
      detail: `Missing: ${m.missingPrices.slice(0, 8).join(', ')}${m.missingPrices.length > 8 ? '…' : ''}. You can also type the prices in on the Fund Value screen and the month will approve itself.`,
      options: APPROVE_OR_HOLD('Approve, valuing them at zero'),
      context: { symbols: m.missingPrices },
    });
  }
  if (Math.abs(m.monthReturn) > UNUSUAL_RETURN) {
    out.push({
      ...base, kind: 'unusual_return',
      dedupe_key: `unusual_return:${v.classId}:${m.month}:${m.unitPrice.toFixed(4)}`,
      title: `${className}: unusually large move in ${monthLabel(m.month)} (${pct(m.monthReturn)})`,
      detail: `Value went from ${usd(m.openingValue)} to ${usd(m.accountValue)}. Please confirm this is right before investors see it.`,
      options: APPROVE_OR_HOLD('Approve, the figure is right'),
      context: {},
    });
  }
  if (m.brokerValue != null && Math.abs(m.computedValue - m.brokerValue) > Math.max(50, Math.abs(m.brokerValue) * 0.01)) {
    out.push({
      ...base, kind: 'reconcile',
      dedupe_key: `reconcile:${v.classId}:${m.month}:${Math.round(m.computedValue)}:${Math.round(m.brokerValue)}`,
      title: `${className}: our figure and the broker's differ in ${monthLabel(m.month)}`,
      detail: `Rebuilt from trades: ${usd(m.computedValue)}. Broker reports: ${usd(m.brokerValue)}. The broker figure is used.`,
      options: APPROVE_OR_HOLD("Approve using the broker's figure"),
      context: {},
    });
  }
  return out;
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
    .select('id, share_class_id, nav_date, status, nav_per_share, version')
    .eq('fund_id', fundId).eq('calculation_method', 'broker_statement').order('version', { ascending: false });
  if (error) fail('load fund values', error);
  const latest = new Map<string, NavRow>();
  (data ?? []).forEach((n) => { const k = `${n.share_class_id}|${n.nav_date}`; if (!latest.has(k)) latest.set(k, { ...n, nav_per_share: Number(n.nav_per_share) }); });
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
  for (const a of accts ?? []) {
    const latest = navs.filter((n) => n.share_class_id === a.share_class_id && n.status === 'approved').sort((x, y) => y.nav_date.localeCompare(x.nav_date))[0];
    if (!latest) continue;
    const value = Math.round(Number(a.shares_owned) * latest.nav_per_share * 100) / 100;
    const { error: uErr } = await supabase.from('capital_accounts').update({
      unrealized_gain_loss: Math.round((value - Number(a.cost_basis || 0)) * 100) / 100,
      metadata: { ...(a.metadata ?? {}), class_name: className(a.share_class_id), current_value: value, unit_price: latest.nav_per_share, valued_at: latest.nav_date },
      updated_at: new Date().toISOString(),
    }).eq('id', a.id);
    if (uErr) fail('update investor account', uErr);
  }
}

async function draftReports(tenantId: string, fundId: string, userId: string, months: string[]) {
  if (!months.length) return 0;
  const { data: fund } = await supabase.from('funds').select('fund_name').eq('id', fundId).maybeSingle();
  const fundName = fund?.fund_name ?? 'Fund';
  const { data: existing, error } = await supabase.from('reports')
    .select('id, period_start, status, report_content').eq('fund_id', fundId).eq('report_type', 'monthly_update');
  if (error) fail('load reports', error);
  let drafted = 0;
  for (const mk of months) {
    const year = +mk.slice(0, 4);
    const month = +mk.slice(5, 7);
    const report = (existing ?? []).find((r) => r.period_start === `${mk}-01`);
    if (report && report.status !== 'draft') continue;
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

  const fullVals = vals.map((v) => ({ ...v, months: v.months.filter(isFull) }));
  const partialMonths = [...new Set(vals.flatMap((v) => v.months.filter((m) => !isFull(m)).map((m) => m.month)))];

  const detected: DetectedItem[] = [
    ...(await detectDuplicateUploads(fundId, className)),
    ...detectDuplicateTrades(data, className),
    ...fullVals.flatMap((v) => v.months.flatMap((m) => detectMonthIssues(v, m, className(v.classId)))),
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
  const reportsDrafted = await draftReports(tenantId, fundId, userId, [...approvedMonths].sort());

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
  if (item.kind === 'duplicate_upload' && optionKey === 'restore_old') {
    const { current_id, previous_id } = item.context as { current_id: string; previous_id: string };
    const { error: a } = await supabase.from('trade_uploads').update({ status: 'superseded' }).eq('id', current_id);
    if (a) fail('restore earlier upload', a);
    const { error: b } = await supabase.from('trade_uploads').update({ status: 'confirmed' }).eq('id', previous_id);
    if (b) fail('restore earlier upload', b);
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
  if (r.partialMonths.length) parts.push(`${r.partialMonths.map(monthLabel).join(', ')} left out until the full month is uploaded.`);
  if (r.reportsDrafted) parts.push(`${r.reportsDrafted} draft monthly report${r.reportsDrafted === 1 ? '' : 's'} created.`);
  return parts.join(' ');
}
