import { supabase } from './supabase';
import { finalMonthsFor, loadUnitRegister, unitsAt, type RegisterAccount, type UnitRegister } from './unitRegister';

export type TaxDocType = 'annual_statement' | 'k1';

export interface TaxField { key: string; label: string; hint?: string }

export const TAX_FIELDS: Record<TaxDocType, TaxField[]> = {
  annual_statement: [
    { key: 'australian_interest', label: 'Australian interest' },
    { key: 'unfranked_dividends', label: 'Unfranked dividends' },
    { key: 'franked_dividends', label: 'Franked dividends' },
    { key: 'franking_credits', label: 'Franking credits' },
    { key: 'other_australian_income', label: 'Other Australian income' },
    { key: 'discounted_capital_gains', label: 'Discounted capital gains', hint: 'Grossed-up amount before the discount' },
    { key: 'other_capital_gains', label: 'Other capital gains' },
    { key: 'foreign_income', label: 'Assessable foreign income' },
    { key: 'foreign_tax_offset', label: 'Foreign income tax offset' },
    { key: 'amit_cost_base_net', label: 'AMIT cost base net amount', hint: 'Excess (decrease) or shortfall (increase)' },
    { key: 'tfn_withholding', label: 'TFN amounts withheld' },
  ],
  k1: [
    { key: 'ordinary_income', label: 'Ordinary business income' },
    { key: 'interest_income', label: 'Interest income' },
    { key: 'qualified_dividends', label: 'Qualified dividends' },
    { key: 'capital_gains_short', label: 'Net short-term capital gain' },
    { key: 'capital_gains_long', label: 'Net long-term capital gain' },
    { key: 'other_income', label: 'Other income' },
    { key: 'foreign_taxes', label: 'Foreign taxes paid' },
  ],
};

export const DOC_LABEL: Record<string, string> = {
  annual_statement: 'Australian annual tax statement',
  k1: 'Schedule K-1',
};

export interface RegisterFacts {
  period_start: string;
  period_end: string;
  units_start: number;
  units_end: number;
  price_start: number | null;
  price_end: number | null;
  price_end_date: string | null;
  value_start: number | null;
  value_end: number | null;
  invested: number;
  redeemed: number;
  fees: number;
  rebates: number;
  year_end_confirmed: boolean;
}

export function periodFor(type: TaxDocType, year: number) {
  return type === 'annual_statement'
    ? { start: `${year - 1}-07-01`, end: `${year}-06-30`, label: `FY${year} (1 Jul ${year - 1} to 30 Jun ${year})` }
    : { start: `${year}-01-01`, end: `${year}-12-31`, label: `Calendar year ${year}` };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function factsFor(register: UnitRegister, account: RegisterAccount, start: string, end: string): RegisterFacts {
  const finals = [...finalMonthsFor(register, account.classId)].sort((a, b) => a.date.localeCompare(b.date));
  const before = [...finals].reverse().find((m) => m.date < start) ?? null;
  const atEnd = [...finals].reverse().find((m) => m.date <= end) ?? null;
  const dayBefore = new Date(`${start}T00:00:00Z`);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const unitsStart = unitsAt(account, dayBefore.toISOString().slice(0, 10));
  const unitsEnd = unitsAt(account, end);
  const inYear = account.transactions.filter((t) => t.date >= start && t.date <= end);
  const sum = (pred: (t: RegisterAccount['transactions'][number]) => boolean) => r2(inYear.filter(pred).reduce((s, t) => s + t.amount, 0));
  return {
    period_start: start,
    period_end: end,
    units_start: unitsStart,
    units_end: unitsEnd,
    price_start: before?.price ?? null,
    price_end: atEnd?.price ?? null,
    price_end_date: atEnd?.date ?? null,
    value_start: before ? r2(unitsStart * before.price) : unitsStart === 0 ? 0 : null,
    value_end: atEnd ? r2(unitsEnd * atEnd.price) : null,
    invested: sum((t) => t.type === 'contribution' || t.type === 'transfer_in'),
    redeemed: sum((t) => t.type === 'redemption' || t.type === 'transfer_out'),
    fees: sum((t) => t.type === 'fee'),
    rebates: sum((t) => t.type === 'adjustment'),
    year_end_confirmed: !!atEnd && atEnd.date.slice(0, 7) === end.slice(0, 7),
  };
}

export interface Holder { id: string; name: string; email: string | null; accountNumber: string; held: boolean }

export async function loadHolders(fundId: string, type: TaxDocType, year: number) {
  const register = await loadUnitRegister(fundId);
  const { start, end } = periodFor(type, year);
  const holders: Holder[] = register.accounts.map((a) => {
    const f = factsFor(register, a, start, end);
    return { id: a.id, name: a.investorName, email: a.investorEmail, accountNumber: a.accountNumber, held: f.units_start > 0 || f.units_end > 0 || f.invested > 0 || f.redeemed > 0 };
  });
  return { register, holders };
}

export async function createTaxDocuments(opts: {
  tenantId: string; fundId: string; userId: string; type: TaxDocType; year: number; accountIds: string[]; register: UnitRegister;
}) {
  const { start, end } = periodFor(opts.type, opts.year);
  const { data: existing, error } = await supabase.from('tax_documents').select('capital_account_id')
    .eq('fund_id', opts.fundId).eq('tax_year', opts.year).eq('document_type', opts.type);
  if (error) throw new Error('Could not check the existing tax documents. Please try again.');
  const done = new Set((existing ?? []).map((d) => d.capital_account_id));
  const today = new Date().toISOString().slice(0, 10);
  const rows = opts.register.accounts
    .filter((a) => opts.accountIds.includes(a.id) && !done.has(a.id))
    .map((a) => ({
      tenant_id: opts.tenantId, fund_id: opts.fundId, capital_account_id: a.id, document_type: opts.type, tax_year: opts.year,
      document_status: 'draft', generation_date: today, created_by: opts.userId,
      register_facts: factsFor(opts.register, a, start, end), tax_breakdown: {},
    }));
  if (rows.length) {
    const { error: iErr } = await supabase.from('tax_documents').insert(rows);
    if (iErr) throw new Error('Could not create the tax documents. Please try again.');
  }
  return { created: rows.length, skipped: opts.accountIds.length - rows.length };
}

export function breakdownComplete(type: string, breakdown: Record<string, unknown>) {
  const fields = TAX_FIELDS[type as TaxDocType];
  return !!fields && fields.every((f) => typeof breakdown[f.key] === 'number' && Number.isFinite(breakdown[f.key] as number));
}

export async function saveBreakdown(id: string, type: TaxDocType, breakdown: Record<string, number>, notes: string) {
  const patch: Record<string, unknown> = { tax_breakdown: breakdown, notes: notes || null, updated_at: new Date().toISOString() };
  if (type === 'k1') {
    for (const k of ['ordinary_income', 'interest_income', 'qualified_dividends', 'capital_gains_short', 'capital_gains_long', 'other_income']) patch[k] = breakdown[k] ?? null;
  }
  const { error } = await supabase.from('tax_documents').update(patch).eq('id', id);
  if (error) throw new Error('Could not save the tax figures. Please try again.');
}
