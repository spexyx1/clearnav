import { supabase } from './supabase';
import type { Dealt } from './fundValuation';

const TOLERANCE = 0.00005;
const UNIT_TYPES = ['contribution', 'transfer_in', 'redemption', 'transfer_out'];

export interface RegisterClass { id: string; class_code: string; class_name: string }

export interface RegisterTx {
  id: string;
  accountId: string;
  type: 'contribution' | 'transfer_in' | 'redemption' | 'transfer_out';
  date: string;
  units: number;
  signedUnits: number;
  price: number;
  amount: number;
  reference: string;
}

export interface RegisterAccount {
  id: string;
  classId: string;
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  accountNumber: string;
  storedUnits: number;
  issued: number;
  redeemed: number;
  units: number;
  invested: number;
  returned: number;
  balanceMatches: boolean;
  transactions: RegisterTx[];
}

export interface FinalMonth {
  classId: string;
  date: string;
  price: number;
  classUnits: number;
  unitsIssued: number;
  unitsRedeemed: number;
  dealt: Dealt[];
}

export type CheckStatus = 'matched' | 'awaiting' | 'mismatch';

export interface MonthCheck {
  month: FinalMonth;
  registerUnits: number;
  difference: number;
  pending: Dealt[];
  status: CheckStatus;
}

export interface UnitRegister {
  accounts: RegisterAccount[];
  finals: FinalMonth[];
  checks: MonthCheck[];
}

const refFor = (d: Dealt) => `${d.kind === 'issue' ? 'SUB' : 'RED'}-${d.ref.split(':')[1]?.slice(0, 8).toUpperCase()}`;
const isIn = (type: string) => type === 'contribution' || type === 'transfer_in';

export async function loadUnitRegister(fundId: string): Promise<UnitRegister> {
  const [acctRes, navRes] = await Promise.all([
    supabase.from('capital_accounts')
      .select('id, share_class_id, investor_id, account_number, shares_owned, client_profiles(full_name, email)')
      .eq('fund_id', fundId).eq('metadata->>official', 'true'),
    supabase.from('nav_calculations')
      .select('share_class_id, nav_date, nav_per_share, total_shares, version, calculation_data')
      .eq('fund_id', fundId).eq('calculation_method', 'broker_statement').eq('status', 'approved')
      .order('nav_date', { ascending: true }).order('version', { ascending: false }),
  ]);
  if (acctRes.error) throw new Error(`Could not load investor accounts: ${acctRes.error.message}`);
  if (navRes.error) throw new Error(`Could not load the approved months: ${navRes.error.message}`);

  const accountIds = (acctRes.data ?? []).map((a) => a.id as string);
  const txRes = accountIds.length
    ? await supabase.from('capital_transactions')
      .select('id, capital_account_id, transaction_type, transaction_date, shares, price_per_share, amount, reference_number, status')
      .in('capital_account_id', accountIds).in('transaction_type', UNIT_TYPES).eq('status', 'settled')
      .order('transaction_date', { ascending: true }).order('created_at', { ascending: true })
    : { data: [], error: null };
  if (txRes.error) throw new Error(`Could not load the unit register: ${txRes.error.message}`);

  const txs: RegisterTx[] = (txRes.data ?? []).filter((t) => Number(t.shares || 0) !== 0).map((t) => {
    const units = Number(t.shares);
    return {
      id: t.id, accountId: t.capital_account_id, type: t.transaction_type, date: t.transaction_date,
      units, signedUnits: isIn(t.transaction_type) ? units : -units,
      price: Number(t.price_per_share || 0), amount: Number(t.amount || 0), reference: t.reference_number ?? '',
    };
  });

  const accounts: RegisterAccount[] = (acctRes.data ?? []).map((a) => {
    const own = txs.filter((t) => t.accountId === a.id);
    const issued = own.filter((t) => t.signedUnits > 0).reduce((s, t) => s + t.units, 0);
    const redeemed = own.filter((t) => t.signedUnits < 0).reduce((s, t) => s + t.units, 0);
    const profile = (Array.isArray(a.client_profiles) ? a.client_profiles[0] : a.client_profiles) as { full_name?: string; email?: string } | null;
    const stored = Number(a.shares_owned || 0);
    return {
      id: a.id, classId: a.share_class_id, investorId: a.investor_id,
      investorName: profile?.full_name || profile?.email || 'Unnamed investor', investorEmail: profile?.email ?? null,
      accountNumber: a.account_number ?? '', storedUnits: stored, issued, redeemed, units: issued - redeemed,
      invested: own.filter((t) => t.signedUnits > 0).reduce((s, t) => s + t.amount, 0),
      returned: own.filter((t) => t.signedUnits < 0).reduce((s, t) => s + t.amount, 0),
      balanceMatches: Math.abs(stored - (issued - redeemed)) < TOLERANCE, transactions: own,
    };
  }).sort((x, y) => x.investorName.localeCompare(y.investorName));

  const seen = new Set<string>();
  const finals: FinalMonth[] = [];
  for (const n of navRes.data ?? []) {
    const key = `${n.share_class_id}|${n.nav_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cd = (n.calculation_data ?? {}) as { final?: boolean; track_record?: boolean; units_issued?: number; units_redeemed?: number; dealt?: Dealt[] };
    if (cd.final !== true || cd.track_record === true) continue;
    finals.push({
      classId: n.share_class_id, date: n.nav_date, price: Number(n.nav_per_share), classUnits: Number(n.total_shares || 0),
      unitsIssued: Number(cd.units_issued || 0), unitsRedeemed: Number(cd.units_redeemed || 0), dealt: cd.dealt ?? [],
    });
  }

  const classOf = new Map(accounts.map((a) => [a.id, a.classId]));
  const references = new Set(txs.map((t) => t.reference));
  const checks: MonthCheck[] = finals.map((month) => {
    const registerUnits = txs.filter((t) => classOf.get(t.accountId) === month.classId && t.date <= month.date).reduce((s, t) => s + t.signedUnits, 0);
    const difference = month.classUnits - registerUnits;
    const pending = month.dealt.filter((d) => !references.has(refFor(d)));
    const pendingUnits = pending.reduce((s, d) => s + (d.kind === 'issue' ? d.units : -d.units), 0);
    const status: CheckStatus = Math.abs(difference) < TOLERANCE ? 'matched'
      : pending.length && Math.abs(difference - pendingUnits) < TOLERANCE ? 'awaiting' : 'mismatch';
    return { month, registerUnits, difference, pending, status };
  }).reverse();

  return { accounts, finals, checks };
}

export function unitsAt(account: RegisterAccount, date: string) {
  return account.transactions.filter((t) => t.date <= date).reduce((s, t) => s + t.signedUnits, 0);
}

export function finalMonthsFor(register: UnitRegister, classId: string) {
  return register.finals.filter((f) => f.classId === classId);
}

export interface StatementFigures {
  periodStart: string;
  periodEnd: string;
  unitsStart: number;
  unitsEnd: number;
  priceStart: number;
  priceEnd: number;
  valueStart: number;
  valueEnd: number;
  contributions: number;
  withdrawals: number;
  gain: number;
  gainPercent: number;
}

export function statementFor(register: UnitRegister, account: RegisterAccount, monthEnd: string): StatementFigures {
  const months = finalMonthsFor(register, account.classId);
  const idx = months.findIndex((m) => m.date === monthEnd);
  if (idx < 0) throw new Error(`The month ending ${monthEnd} is not final and approved for this class, so no statement can be produced.`);
  const end = months[idx];
  const prev = idx > 0 ? months[idx - 1] : null;
  const unitsStart = prev ? unitsAt(account, prev.date) : 0;
  const inPeriod = account.transactions.filter((t) => (!prev || t.date > prev.date) && t.date <= end.date);
  const contributions = inPeriod.filter((t) => t.signedUnits > 0).reduce((s, t) => s + t.amount, 0);
  const withdrawals = inPeriod.filter((t) => t.signedUnits < 0).reduce((s, t) => s + t.amount, 0);
  const unitsEnd = unitsAt(account, end.date);
  const priceStart = prev?.price ?? end.price;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const valueStart = r2(unitsStart * priceStart);
  const valueEnd = r2(unitsEnd * end.price);
  const gain = r2(valueEnd - valueStart - contributions + withdrawals);
  const base = valueStart + contributions;
  return {
    periodStart: prev ? nextDay(prev.date) : `${end.date.slice(0, 7)}-01`, periodEnd: end.date,
    unitsStart, unitsEnd, priceStart, priceEnd: end.price, valueStart, valueEnd, contributions, withdrawals,
    gain, gainPercent: base > 0 ? (gain / base) * 100 : 0,
  };
}

export async function createStatements(tenantId: string, fundId: string, month: string, userId: string) {
  const register = await loadUnitRegister(fundId);
  if (!register.accounts.length) throw new Error('There are no official investor accounts yet, so there is nothing to put on a statement.');
  const { data: existing, error } = await supabase.from('investor_statements').select('capital_account_id, period_end')
    .eq('fund_id', fundId).gte('period_end', `${month}-01`).lte('period_end', `${month}-31`);
  if (error) throw new Error(`Could not check existing statements: ${error.message}`);
  const done = new Set((existing ?? []).map((s) => s.capital_account_id));
  const rows = [];
  const notFinal = new Set<string>();
  let skipped = 0;
  for (const account of register.accounts) {
    const end = finalMonthsFor(register, account.classId).find((m) => m.date.startsWith(month));
    if (!end) { notFinal.add(account.classId); continue; }
    if (done.has(account.id)) { skipped++; continue; }
    const s = statementFor(register, account, end.date);
    if (s.unitsStart === 0 && s.unitsEnd === 0) continue;
    rows.push({
      tenant_id: tenantId, capital_account_id: account.id, fund_id: fundId, statement_date: s.periodEnd,
      period_start: s.periodStart, period_end: s.periodEnd, statement_type: 'monthly',
      beginning_balance: s.valueStart, ending_balance: s.valueEnd, contributions: s.contributions, distributions: s.withdrawals,
      fees: 0, return_amount: s.gain, return_percent: Math.round(s.gainPercent * 10000) / 10000,
      shares_beginning: s.unitsStart, shares_ending: s.unitsEnd, nav_per_share: s.priceEnd, status: 'draft', created_by: userId,
    });
  }
  if (rows.length) {
    const { error: iErr } = await supabase.from('investor_statements').insert(rows);
    if (iErr) throw new Error(`Could not create the statements: ${iErr.message}`);
  }
  return { created: rows.length, skipped, notFinalClasses: notFinal.size };
}

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
