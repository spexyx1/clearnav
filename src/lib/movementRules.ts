import { supabase } from './supabase';
import type { CashEvent } from './statementParser';

export type MovementKind =
  | 'dividend' | 'payment_in_lieu' | 'withholding_tax' | 'interest_received' | 'interest_paid'
  | 'commission_adjustment' | 'broker_fee' | 'advisor_fee' | 'fee_payout' | 'fee_credit'
  | 'deposit' | 'withdrawal' | 'internal_transfer' | 'other';

export type Treatment = 'nav' | 'subscription' | 'redemption' | 'excluded' | 'review';

export type MovementRules = Record<MovementKind, Treatment>;

export const KIND_INFO: Array<{ kind: MovementKind; label: string; example: string }> = [
  { kind: 'dividend', label: 'Dividends', example: 'Cash dividends paid on shares the class holds' },
  { kind: 'payment_in_lieu', label: 'Payment in lieu of dividends', example: 'Dividend equivalents on lent or shorted shares' },
  { kind: 'withholding_tax', label: 'Withholding tax', example: 'Tax taken from dividends at source' },
  { kind: 'interest_received', label: 'Interest received', example: 'Interest IBKR pays on cash' },
  { kind: 'interest_paid', label: 'Interest charged', example: 'Interest IBKR charges on borrowing' },
  { kind: 'commission_adjustment', label: 'Commission adjustments', example: 'Corrections to trading commissions' },
  { kind: 'broker_fee', label: 'Broker fees', example: 'Market data, account and other IBKR fees' },
  { kind: 'advisor_fee', label: 'Fund-level fees', example: 'Management and performance fees charged to the class' },
  { kind: 'fee_payout', label: 'Fee payments out', example: 'Money paid out of the account to settle fund costs' },
  { kind: 'fee_credit', label: 'Fee refunds', example: 'Fees credited back to the account' },
  { kind: 'deposit', label: 'Investor deposits', example: 'New money from an investor' },
  { kind: 'withdrawal', label: 'Investor withdrawals', example: 'Money paid out to an investor' },
  { kind: 'internal_transfer', label: 'Internal transfers', example: 'Money moved between our own accounts or classes' },
  { kind: 'other', label: 'Anything else', example: 'IBKR types the app does not recognise' },
];

export const TREATMENT_INFO: Record<Treatment, { label: string; detail: string }> = {
  nav: { label: 'Gain or cost', detail: 'Moves the unit price for everyone in the class. Units do not change.' },
  subscription: { label: 'New investment', detail: 'Starts a new unit series at the launch price, so earlier investors are not diluted.' },
  redemption: { label: 'Redemption', detail: 'Cancels units at the month-end price, oldest series first.' },
  excluded: { label: 'Transfer, not a gain', detail: 'Kept out of performance. Money moving between classes moves units with it.' },
  review: { label: 'Ask me each time', detail: 'Goes to the review list until someone decides.' },
};

export const DEFAULT_RULES: MovementRules = {
  dividend: 'nav', payment_in_lieu: 'nav', withholding_tax: 'nav', interest_received: 'nav', interest_paid: 'nav',
  commission_adjustment: 'nav', broker_fee: 'nav', advisor_fee: 'nav', fee_payout: 'nav', fee_credit: 'nav',
  deposit: 'subscription', withdrawal: 'redemption', internal_transfer: 'excluded', other: 'review',
};

export function movementKind(e: CashEvent): MovementKind {
  const raw = (e.ibkrType ?? '').toLowerCase();
  const text = `${raw} ${e.description}`.toLowerCase();
  if (e.type === 'deposit' || e.type === 'withdrawal') {
    if (e.internal) return 'internal_transfer';
    if (e.amount < 0 && /disburse|fee/.test(text)) return 'fee_payout';
    return e.amount >= 0 ? 'deposit' : 'withdrawal';
  }
  if (e.type === 'withholding') return 'withholding_tax';
  if (e.type === 'dividend') return /in lieu/.test(text) ? 'payment_in_lieu' : 'dividend';
  if (e.type === 'interest') return e.amount >= 0 ? 'interest_received' : 'interest_paid';
  if (/commission adj/.test(text)) return 'commission_adjustment';
  if (e.amount > 0) return 'fee_credit';
  if (/advisor fee|fa fee|percent of equity|management|high water|performance|incentive/.test(text)) return 'advisor_fee';
  if (!raw || /fee|commission/.test(raw)) return 'broker_fee';
  return 'other';
}

export async function loadMovementRules(fundId: string): Promise<MovementRules> {
  const { data, error } = await supabase.from('fund_movement_rules').select('movement_kind, treatment').eq('fund_id', fundId);
  if (error) throw new Error(error.message);
  const rules = { ...DEFAULT_RULES };
  (data ?? []).forEach((r) => {
    if (r.movement_kind in rules && r.treatment in TREATMENT_INFO) rules[r.movement_kind as MovementKind] = r.treatment as Treatment;
  });
  return rules;
}

export async function saveMovementRule(tenantId: string, fundId: string, kind: MovementKind, treatment: Treatment, userId: string) {
  const { error } = await supabase.from('fund_movement_rules').upsert(
    { tenant_id: tenantId, fund_id: fundId, movement_kind: kind, treatment, updated_by: userId, updated_at: new Date().toISOString() },
    { onConflict: 'fund_id,movement_kind' },
  );
  if (error) throw new Error(error.message);
}
