import { supabase } from './supabase';
import { monthEnd } from './statementParser';
import { existingDeal, finalMonth } from './onboarding';
import { refFor, type RegisterAccount } from './unitRegister';
import type { ManualCategory, ManualKind } from './fundValuation';
import { fetchAll } from './fetchAll';

export interface ChargeRow {
  id: string;
  kind: ManualKind;
  category: ManualCategory;
  amount: number;
  month: string;
  classId: string;
  accountId: string | null;
  note: string;
  documentPath: string | null;
  movementKey: string | null;
  paidMonth: string | null;
  correctsId: string | null;
  status: 'active' | 'cancelled';
  createdAt: string;
}

export const KIND_LABELS: Record<ManualKind, string> = {
  class_charge: 'Class charge',
  investor_fee: 'Fee for one investor',
  manager_rebate: 'Rebate paid by Arkline',
};

const lastDay = (month: string) => monthEnd(+month.slice(0, 4), +month.slice(5, 7));
const fail = (what: string, error: { message: string } | null) => { if (error) throw new Error(`${what}: ${error.message}`); };

export async function listCharges(fundId: string): Promise<ChargeRow[]> {
  const rows = await fetchAll(() => supabase.from('fund_manual_charges')
    .select('id, kind, category, amount, charge_month, share_class_id, capital_account_id, note, document_path, ibkr_movement_key, paid_month, corrects_id, status, created_at')
    .eq('fund_id', fundId).order('charge_month', { ascending: false }).order('created_at', { ascending: false }).order('id'));
  return rows.map((r) => ({
    id: r.id, kind: r.kind, category: r.category, amount: Number(r.amount), month: String(r.charge_month).slice(0, 7),
    classId: r.share_class_id, accountId: r.capital_account_id, note: r.note, documentPath: r.document_path,
    movementKey: r.ibkr_movement_key, paidMonth: r.paid_month ? String(r.paid_month).slice(0, 7) : null,
    correctsId: r.corrects_id, status: r.status, createdAt: r.created_at,
  }));
}

export async function addCharge(input: {
  tenantId: string; fundId: string; classId: string; accountId: string | null; kind: ManualKind; category: ManualCategory;
  amount: number; month: string; note: string; correctsId?: string | null;
}) {
  if (!Number.isFinite(input.amount) || input.amount === 0) throw new Error('Enter an amount.');
  if (input.amount < 0 && !(input.kind === 'class_charge' && input.correctsId)) throw new Error('Only a correction to a class charge can be a credit.');
  if (input.kind !== 'class_charge' && !input.accountId) throw new Error('Choose the investor.');
  if (!input.note.trim()) throw new Error('Add a note. It is shown to investors on their statement.');
  const { error } = await supabase.from('fund_manual_charges').insert({
    tenant_id: input.tenantId, fund_id: input.fundId, share_class_id: input.classId,
    capital_account_id: input.kind === 'class_charge' ? null : input.accountId,
    kind: input.kind, category: input.category, amount: Math.round(input.amount * 100) / 100,
    charge_month: `${input.month}-01`, note: input.note.trim(), corrects_id: input.correctsId ?? null,
  });
  fail('Could not save the charge', error);
}

export async function cancelCharge(id: string) {
  const { error } = await supabase.from('fund_manual_charges').update({ status: 'cancelled' }).eq('id', id);
  fail('Could not cancel the charge', error);
}

export async function linkPayment(id: string, movementKey: string | null, month: string | null) {
  const { error } = await supabase.from('fund_manual_charges')
    .update({ ibkr_movement_key: movementKey, paid_month: movementKey && month ? `${month}-01` : null }).eq('id', id);
  fail('Could not link the IBKR payment', error);
}

export const unitRef = (c: ChargeRow) => refFor({ ref: `fee:${c.id}`, kind: 'issue', name: '', amount: 0, units: 0, price: 0 });

export async function applyToRegister(tenantId: string, fundId: string, c: ChargeRow, account: RegisterAccount, className: string, userId: string) {
  if (c.kind !== 'investor_fee') throw new Error('Only fees for one investor change anyone\'s units.');
  const month = await finalMonth(fundId, c.classId, lastDay(c.month));
  const deal = month.dealt.find((d) => d.ref === `fee:${c.id}`);
  if (!deal) throw new Error('The approved month does not include this item. Save the month again in Fund Value, then re-approve it.');
  const reference = unitRef(c);
  if (await existingDeal(fundId, reference)) return deal;
  if (deal.units > account.storedUnits + 1e-6) throw new Error(`${account.investorName} does not hold enough units to pay this fee.`);
  const { error } = await supabase.from('capital_transactions').insert({
    tenant_id: tenantId, fund_id: fundId, capital_account_id: account.id,
    transaction_type: 'fee',
    transaction_date: month.navDate, settlement_date: month.navDate, amount: deal.amount, shares: deal.units, price_per_share: month.price,
    currency: 'USD', status: 'settled', reference_number: reference,
    description: `Fee: ${c.note} (${deal.units.toLocaleString('en-US')} ${className} units at ${month.price})`,
    created_by: userId, approved_by: userId,
  });
  fail('Could not update the unit register', error);
  return deal;
}
