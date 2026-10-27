import { supabase } from './supabase';
import { cents } from './money';
import type { ClassValuation, MonthResult } from './fundValuation';

export type ReconStatus = 'matched' | 'within_tolerance' | 'not_matched';

export interface ReconCheck {
  label: string;
  ours: number | null;
  ibkr: number | null;
  difference: number | null;
  gating: boolean;
}

export interface ReconSuggestion {
  title: string;
  detail: string;
}

export interface Reconciliation {
  classId: string;
  month: string;
  date: string;
  status: ReconStatus;
  provisional: boolean;
  difference: number;
  checks: ReconCheck[];
  issues: string[];
  suggestions: ReconSuggestion[];
}

export const EXACT = 0.005;
export const TOLERANCE = 1;

const diffOf = (ours: number | null, ibkr: number | null) => (ours == null || ibkr == null ? null : cents(ibkr - ours));
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const near = (a: number, b: number) => Math.abs(Math.abs(a) - Math.abs(b)) < 0.01;

function monthIsOver(r: MonthResult) {
  const end = new Date(Date.UTC(+r.month.slice(0, 4), +r.month.slice(5, 7), 0));
  const d = new Date(`${r.date}T00:00:00Z`);
  for (d.setUTCDate(d.getUTCDate() + 1); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) return false;
  }
  return true;
}

function line(r: MonthResult, ...labels: string[]) {
  const lines = r.changeInNav?.lines;
  if (!lines || !labels.some((l) => l in lines)) return null;
  return cents(labels.reduce((s, l) => s + (lines[l] ?? 0), 0));
}

export function reconcileMonth(classId: string, r: MonthResult): Reconciliation {
  const cin = r.changeInNav && r.changeInNav.to === r.date ? r.changeInNav : null;
  const checks: ReconCheck[] = [
    { label: 'Month-end value (our rebuild vs IBKR)', ours: cents(r.computedValue), ibkr: r.brokerValue, difference: diffOf(r.computedValue, r.brokerValue), gating: true },
  ];
  if (cin?.ending != null) checks.push({ label: "IBKR Change in NAV ending vs IBKR month-end value", ours: r.brokerValue, ibkr: cin.ending, difference: diffOf(r.brokerValue, cin.ending), gating: true });
  if (cin?.starting != null && cin.from.startsWith(r.month)) checks.push({ label: 'Opening value (ours vs IBKR)', ours: r.openingValue, ibkr: cin.starting, difference: diffOf(r.openingValue, cin.starting), gating: true });

  const clues: Array<[string, number, number | null]> = [
    ['Money in and out', r.flows + r.internalFlows, line(r, 'Deposits & withdrawals', 'Internal cash transfers', 'Position transfers')],
    ['Dividends', r.dividends, line(r, 'Dividends', 'Withholding tax')],
    ['Interest', r.interest, line(r, 'Interest')],
    ['Trading commissions', -r.charges.trading, line(r, 'Commissions')],
  ];
  clues.forEach(([label, ours, ibkr]) => {
    if (ibkr != null) checks.push({ label, ours: cents(ours), ibkr, difference: diffOf(ours, ibkr), gating: false });
  });
  if (r.cashByCurrency.length && r.brokerValue != null) {
    const ibkrCash = cents(r.cashByCurrency.reduce((s, c) => s + c.usd, 0));
    checks.push({ label: 'Cash across all currencies (in USD)', ours: cents(r.cash), ibkr: ibkrCash, difference: diffOf(r.cash, ibkrCash), gating: false });
  }

  const gating = checks.filter((c) => c.gating);
  const difference = gating.some((c) => c.difference == null)
    ? Infinity
    : Math.max(0, ...gating.map((c) => Math.abs(c.difference!)));

  const issues = r.finalReasons.filter((f) => !/differs from IBKR's value|Change in NAV ends|the month is not over/.test(f));
  const unconfirmed = r.movements.filter((m) => !m.confirmed);

  const suggestions = suggest(r, checks, unconfirmed.length, difference);
  const status: ReconStatus = issues.length || difference > TOLERANCE ? 'not_matched' : difference > EXACT ? 'within_tolerance' : 'matched';
  return { classId, month: r.month, date: r.date, status, provisional: !monthIsOver(r), difference: Number.isFinite(difference) ? cents(difference) : -1, checks, issues, suggestions };
}

function suggest(r: MonthResult, checks: ReconCheck[], unconfirmed: number, difference: number): ReconSuggestion[] {
  const out: ReconSuggestion[] = [];
  const gap = r.unexplained;
  if (r.brokerValue == null) out.push({ title: 'Pull the latest IBKR data', detail: 'Press Reconcile to fetch a fresh report. If the month has just ended, IBKR may need until the next business day to publish it.' });
  if (r.missingFx.length) out.push({ title: 'Add exchange rates', detail: `Make sure the IBKR Flex query includes the Conversion Rates section, then reconcile again so ${r.missingFx.join(', ')} holdings are valued in US dollars.` });
  if (r.unofficialPrices.length) out.push({ title: 'Get IBKR prices', detail: 'Make sure the Flex query includes Prior Period Positions, then reconcile again. Public prices are never used for final figures.' });
  if (unconfirmed) out.push({ title: 'Confirm movements', detail: 'Confirm each unexplained money or share movement in the review list above, so investor money is kept apart from transfers and fees.' });

  if (Math.abs(gap) >= EXACT && r.brokerValue != null) {
    const mv = r.movements.find((m) => near(m.amount, gap));
    if (mv) out.push({ title: 'Likely a missing or doubled movement', detail: `The gap of ${usd(gap)} equals "${mv.description}" on ${mv.date} (${usd(mv.amount)}). Check it is counted exactly once.` });
    const h = r.holdings.find((x) => near(x.marketValue, gap));
    if (h) out.push({ title: `Check ${h.symbol}`, detail: `The gap equals the value of ${h.symbol} (${usd(h.marketValue)}). A trade, transfer or corporate action for it may be missing.` });
    const c = r.cashByCurrency.find((x) => x.currency !== 'USD' && near(x.usd, gap));
    if (c) out.push({ title: `Check ${c.currency} cash`, detail: `The gap equals the ${c.currency} cash balance (${c.amount.toLocaleString('en-US')} ${c.currency}, ${usd(c.usd)}). That currency's cash or exchange rate may be missing.` });
    checks.filter((c) => !c.gating && c.difference != null && Math.abs(c.difference) >= EXACT).forEach((c) => {
      out.push({
        title: `${c.label} differ from IBKR`,
        detail: `We have ${usd(c.ours ?? 0)}, IBKR has ${usd(c.ibkr ?? 0)} (difference ${usd(c.difference!)})${near(c.difference!, gap) ? ', which explains the whole gap' : ''}.`,
      });
    });
    if (r.holdings.some((x) => x.currency !== 'USD')) out.push({ title: 'Check exchange rates', detail: 'Some holdings are not in US dollars. A small gap can come from the exchange rate used at month-end.' });
  }
  const cinCheck = checks.find((c) => c.label.startsWith('IBKR Change in NAV'));
  if (cinCheck?.difference && Math.abs(cinCheck.difference) >= EXACT) {
    out.push({ title: "IBKR's own reports disagree", detail: 'This usually means the report was pulled before IBKR finished the day. Reconcile again after the next business day.' });
  }
  if (difference > EXACT && difference <= TOLERANCE && !out.length) {
    out.push({ title: 'Rounding difference', detail: `The difference of ${usd(difference)} is within the $1.00 allowance, usually rounding in IBKR's figures. You may approve with an optional note.` });
  }
  return out;
}

export const hasIbkrData = (v: ClassValuation) => v.months.some((m) => m.brokerValue != null);

export function reconcileFund(valuations: ClassValuation[]): Reconciliation[] {
  return valuations.filter(hasIbkrData).flatMap((v) => v.months.map((m) => reconcileMonth(v.classId, m)));
}

export async function saveReconciliations(tenantId: string, fundId: string, recs: Reconciliation[]) {
  if (!recs.length) return;
  const { error } = await supabase.from('fund_reconciliations').upsert(recs.map((r) => ({
    tenant_id: tenantId, fund_id: fundId, share_class_id: r.classId,
    month_end: new Date(Date.UTC(+r.month.slice(0, 4), +r.month.slice(5, 7), 0)).toISOString().slice(0, 10),
    status: r.status, provisional: r.provisional, difference: r.difference,
    checks: r.checks, suggestions: [...r.issues.map((i) => ({ title: 'Open item', detail: i })), ...r.suggestions],
    run_at: new Date().toISOString(),
  })), { onConflict: 'share_class_id,month_end' });
  if (error) throw new Error(error.message);
}
