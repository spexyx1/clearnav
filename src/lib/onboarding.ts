import { supabase } from './supabase';
import { applicationDealingDay, nextDealingDay, redemptionDealingDay, type DealingSchedule } from './dealingTerms';
import type { ClassValuation, Dealt, Movement } from './fundValuation';

export interface ApplicationRow {
  id: string;
  tenant_id: string;
  status: string;
  submitted_at: string | null;
  investor_type: string | null;
  contact_given_names: string | null;
  contact_surname: string | null;
  contact_email: string | null;
  a_given_names: string | null;
  a_surname: string | null;
  c_company_name: string | null;
  d_trust_name: string | null;
  amount_class_a: number | null;
  amount_class_b: number | null;
  amount_class_c: number | null;
  total_committed_capital: number | null;
  reviewer_notes: string | null;
}

export type SubscriptionStatus = 'awaiting_funds' | 'money_received' | 'units_issued' | 'cancelled';

export interface SubscriptionRow {
  id: string;
  share_class_id: string;
  application_id: string | null;
  client_id: string | null;
  investor_name: string;
  investor_email: string | null;
  kind: 'cash' | 'in_kind';
  expected_amount: number | null;
  status: SubscriptionStatus;
  broker_movement_key: string | null;
  money_received_date: string | null;
  received_amount: number | null;
  dealing_date: string | null;
  created_at: string;
}

export interface RedemptionRow {
  id: string;
  capital_account_id: string;
  client_id: string;
  request_date: string | null;
  redemption_date: string | null;
  shares_requested: number | null;
  amount_requested: number | null;
  status: string;
  redemption_type: string;
}

export interface BrokerAccountRow {
  id: string;
  account_id: string;
  share_class_id: string;
  account_role: 'official' | 'track_record';
  official_from: string | null;
}

export interface OfficialHolding {
  id: string;
  share_class_id: string;
  investor_id: string;
  shares_owned: number;
  investor_name: string;
}

export interface ClassRef {
  id: string;
  class_code: string;
  class_name: string;
}

const APP_FIELDS = 'id, tenant_id, status, submitted_at, investor_type, contact_given_names, contact_surname, contact_email, a_given_names, a_surname, c_company_name, d_trust_name, amount_class_a, amount_class_b, amount_class_c, total_committed_capital, reviewer_notes';
const SUB_FIELDS = 'id, share_class_id, application_id, client_id, investor_name, investor_email, kind, expected_amount, status, broker_movement_key, money_received_date, received_amount, dealing_date, created_at';

const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

export function applicantName(a: ApplicationRow) {
  const person = (g: string | null, s: string | null) => [g, s].filter(Boolean).join(' ').trim();
  return a.c_company_name || a.d_trust_name || person(a.a_given_names, a.a_surname) || person(a.contact_given_names, a.contact_surname) || a.contact_email || 'Applicant';
}

const CLASS_HINTS: Record<'a' | 'b' | 'c', RegExp> = { a: /opportun/i, b: /quant/i, c: /conviction/i };

export function applicationAmounts(a: ApplicationRow, classes: ClassRef[]) {
  return (['a', 'b', 'c'] as const).flatMap((k) => {
    const amount = Number(a[`amount_class_${k}`] ?? 0);
    if (!(amount > 0)) return [];
    const cls = classes.find((c) => CLASS_HINTS[k].test(c.class_name));
    return [{ letter: k.toUpperCase(), amount, cls }];
  });
}

export async function loadOnboarding(tenantId: string, fundId: string) {
  const [apps, subs, reds, accts, holdings] = await Promise.all([
    supabase.from('investor_applications').select(APP_FIELDS).eq('tenant_id', tenantId).in('status', ['submitted', 'under_review', 'approved']).order('submitted_at', { ascending: false }),
    supabase.from('unit_subscriptions').select(SUB_FIELDS).eq('fund_id', fundId).order('created_at', { ascending: false }),
    supabase.from('redemption_requests').select('id, capital_account_id, client_id, request_date, redemption_date, shares_requested, amount_requested, status, redemption_type')
      .eq('fund_id', fundId).not('capital_account_id', 'is', null).in('status', ['approved', 'processing', 'completed']).order('redemption_date'),
    supabase.from('fund_broker_accounts').select('id, account_id, share_class_id, account_role, official_from').eq('fund_id', fundId),
    supabase.from('capital_accounts').select('id, share_class_id, investor_id, shares_owned, client_profiles(full_name)').eq('fund_id', fundId).eq('metadata->>official', 'true'),
  ]);
  fail('Could not load applications', apps.error);
  fail('Could not load subscriptions', subs.error);
  fail('Could not load withdrawals', reds.error);
  fail('Could not load IBKR accounts', accts.error);
  fail('Could not load investor holdings', holdings.error);
  return {
    applications: (apps.data ?? []) as ApplicationRow[],
    subscriptions: (subs.data ?? []) as SubscriptionRow[],
    redemptions: (reds.data ?? []) as RedemptionRow[],
    brokerAccounts: (accts.data ?? []) as BrokerAccountRow[],
    holdings: (holdings.data ?? []).map((h) => {
      const p = h.client_profiles as { full_name: string } | { full_name: string }[] | null;
      return {
        id: h.id, share_class_id: h.share_class_id, investor_id: h.investor_id, shares_owned: Number(h.shares_owned || 0),
        investor_name: (Array.isArray(p) ? p[0]?.full_name : p?.full_name) ?? 'Investor',
      };
    }) as OfficialHolding[],
  };
}

async function clientByEmail(tenantId: string, email: string | null) {
  if (!email) return null;
  const { data, error } = await supabase.from('client_profiles').select('id').eq('tenant_id', tenantId).ilike('email', email.trim()).limit(1).maybeSingle();
  fail('Could not look up the investor', error);
  return data?.id ?? null;
}

export async function approveApplication(app: ApplicationRow, classes: ClassRef[], fundId: string, userId: string, notes: string) {
  const amounts = applicationAmounts(app, classes);
  if (!amounts.length) throw new Error('This application has no amount for any class.');
  const missing = amounts.find((a) => !a.cls);
  if (missing) throw new Error(`Class ${missing.letter} on the application does not match a class in this fund.`);
  const { data: existing, error: exErr } = await supabase.from('unit_subscriptions').select('id').eq('application_id', app.id).neq('status', 'cancelled');
  fail('Could not check existing subscriptions', exErr);
  const clientId = await clientByEmail(app.tenant_id, app.contact_email);
  if (!existing?.length) {
    const { error } = await supabase.from('unit_subscriptions').insert(amounts.map((a) => ({
      tenant_id: app.tenant_id, fund_id: fundId, share_class_id: a.cls!.id, application_id: app.id, client_id: clientId,
      investor_name: applicantName(app), investor_email: app.contact_email, kind: 'cash', expected_amount: a.amount,
    })));
    fail('Could not create the subscriptions', error);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from('investor_applications').update({
    status: 'approved', review_decision: 'approved', reviewed_at: now, reviewer_id: userId, reviewer_notes: notes || null,
  }).eq('id', app.id);
  fail('Could not approve the application', error);
}

export async function rejectApplication(app: ApplicationRow, userId: string, notes: string) {
  const { error } = await supabase.from('investor_applications').update({
    status: 'rejected', review_decision: 'rejected', reviewed_at: new Date().toISOString(), reviewer_id: userId, reviewer_notes: notes || null,
  }).eq('id', app.id);
  fail('Could not reject the application', error);
}

export async function loadClients(tenantId: string) {
  const { data, error } = await supabase.from('client_profiles').select('id, full_name, email').eq('tenant_id', tenantId).order('full_name');
  fail('Could not load investors', error);
  return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
}

export async function addSubscription(input: {
  tenantId: string; fundId: string; classId: string; clientId: string; name: string; email: string | null; kind: 'cash' | 'in_kind'; amount: number | null;
}) {
  const { error } = await supabase.from('unit_subscriptions').insert({
    tenant_id: input.tenantId, fund_id: input.fundId, share_class_id: input.classId, client_id: input.clientId,
    investor_name: input.name, investor_email: input.email, kind: input.kind, expected_amount: input.amount,
  });
  fail('Could not add the subscription', error);
}

export async function cancelSubscription(id: string) {
  const { error } = await supabase.from('unit_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id).in('status', ['awaiting_funds', 'money_received']);
  fail('Could not cancel the subscription', error);
}

export interface MoneyIn {
  classId: string;
  movement: Movement;
  suggestions: SubscriptionRow[];
}

// Money that arrived in an official account and has not been tied to a subscription yet.
export function unmatchedMoneyIn(valuations: ClassValuation[], subs: SubscriptionRow[], officialClasses: Set<string>): MoneyIn[] {
  const used = new Set(subs.filter((s) => s.broker_movement_key && s.status !== 'cancelled').map((s) => s.broker_movement_key));
  const waiting = subs.filter((s) => s.status === 'awaiting_funds');
  return valuations.filter((v) => officialClasses.has(v.classId)).flatMap((v) => v.months.filter((m) => !m.trackRecord).flatMap((m) => m.movements
    .filter((x) => x.amount > 0 && x.label !== 'fee' && !used.has(x.key))
    .map((movement) => {
      const text = movement.description.toLowerCase();
      const score = (s: SubscriptionRow) => {
        const kindOk = (s.kind === 'in_kind') === (movement.kind === 'shares');
        const amountOk = s.expected_amount ? Math.abs(Number(s.expected_amount) - movement.amount) <= Math.max(1, Number(s.expected_amount) * 0.01) : false;
        const nameOk = s.investor_name.toLowerCase().split(/\s+/).some((w) => w.length > 2 && text.includes(w));
        return (kindOk ? 1 : 0) + (amountOk ? 2 : 0) + (nameOk ? 2 : 0);
      };
      const suggestions = waiting.filter((s) => s.share_class_id === v.classId).sort((a, b) => score(b) - score(a))
        .filter((s, i) => i === 0 ? score(s) >= 2 : score(s) >= 3);
      return { classId: v.classId, movement, suggestions };
    })));
}

export function dealingDayFor(schedule: DealingSchedule, kind: 'cash' | 'in_kind', arrived: string) {
  // The seed transfer launches the class at the first month-end; cash applications must beat the cut-off.
  return kind === 'in_kind' ? nextDealingDay(schedule, arrived) : applicationDealingDay(schedule, arrived);
}

export async function confirmMoneyReceived(tenantId: string, fundId: string, sub: SubscriptionRow, movement: Movement, schedule: DealingSchedule, userId: string) {
  const dealing = dealingDayFor(schedule, sub.kind, movement.date);
  const { error } = await supabase.from('unit_subscriptions').update({
    status: 'money_received', broker_movement_key: movement.key, money_received_date: movement.date, received_amount: movement.amount,
    dealing_date: dealing, updated_at: new Date().toISOString(),
  }).eq('id', sub.id).eq('status', 'awaiting_funds');
  fail('Could not confirm the money', error);
  const { error: lErr } = await supabase.from('fund_movement_labels').upsert(
    { tenant_id: tenantId, fund_id: fundId, share_class_id: sub.share_class_id, movement_key: movement.key, label: 'investor', set_by: userId, updated_at: new Date().toISOString() },
    { onConflict: 'fund_id,movement_key' },
  );
  fail('Could not label the deposit', lErr);
  return dealing;
}

export async function undoMoneyReceived(sub: SubscriptionRow) {
  const { error } = await supabase.from('unit_subscriptions').update({
    status: 'awaiting_funds', broker_movement_key: null, money_received_date: null, received_amount: null, dealing_date: null, updated_at: new Date().toISOString(),
  }).eq('id', sub.id).eq('status', 'money_received');
  fail('Could not undo the match', error);
}

async function finalMonth(fundId: string, classId: string, dealingDay: string) {
  const month = dealingDay.slice(0, 7);
  const { data, error } = await supabase.from('nav_calculations')
    .select('nav_date, nav_per_share, status, calculation_data')
    .eq('fund_id', fundId).eq('share_class_id', classId).eq('calculation_method', 'broker_statement')
    .gte('nav_date', `${month}-01`).lte('nav_date', dealingDay).order('nav_date', { ascending: false }).order('version', { ascending: false }).limit(1).maybeSingle();
  fail('Could not load the month-end price', error);
  const cd = data?.calculation_data as { final?: boolean; dealt?: Dealt[] } | null;
  if (!data || data.status !== 'approved' || cd?.final !== true) {
    throw new Error(`The ${month} month-end is not final and approved yet. Units can only be dealt at a final, IBKR-confirmed price.`);
  }
  return { navDate: data.nav_date as string, price: Number(data.nav_per_share), dealt: cd.dealt ?? [] };
}

export function dealingStatus(sub: SubscriptionRow, valuations: ClassValuation[]) {
  if (!sub.dealing_date) return null;
  const month = valuations.find((v) => v.classId === sub.share_class_id)?.months.find((m) => m.month === sub.dealing_date!.slice(0, 7));
  return month ? { final: month.final, reasons: month.finalReasons, dealt: month.dealt.find((d) => d.ref === `sub:${sub.id}`) } : null;
}

async function officialAccountFor(tenantId: string, fundId: string, classId: string, classCode: string, clientId: string, since: string) {
  const { data, error } = await supabase.from('capital_accounts').select('id')
    .eq('fund_id', fundId).eq('share_class_id', classId).eq('investor_id', clientId).eq('metadata->>official', 'true').limit(1).maybeSingle();
  fail('Could not load the investor account', error);
  if (data) return data;
  const { data: created, error: cErr } = await supabase.from('capital_accounts').insert({
    tenant_id: tenantId, fund_id: fundId, share_class_id: classId, investor_id: clientId,
    account_number: `ARK-${classCode}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    shares_owned: 0, capital_contributed: 0, capital_returned: 0, inception_date: since, status: 'active', metadata: { official: true },
  }).select('id').maybeSingle();
  fail('Could not open the investor account', cErr);
  if (!created) throw new Error('Could not open the investor account.');
  return created;
}

async function existingDeal(fundId: string, reference: string) {
  const { data, error } = await supabase.from('capital_transactions').select('id').eq('fund_id', fundId).eq('reference_number', reference).limit(1).maybeSingle();
  fail('Could not check the unit register', error);
  return data?.id as string | undefined;
}

export async function issueUnits(tenantId: string, fundId: string, sub: SubscriptionRow, cls: ClassRef, userId: string) {
  if (sub.status !== 'money_received' || !sub.dealing_date) throw new Error('The money for this subscription has not been confirmed yet.');
  const clientId = sub.client_id ?? await clientByEmail(tenantId, sub.investor_email);
  if (!clientId) throw new Error(`${sub.investor_name} has no investor portal account yet. Add them on the Clients page using ${sub.investor_email ?? 'their email'}, then try again.`);
  const month = await finalMonth(fundId, sub.share_class_id, sub.dealing_date);
  const deal = month.dealt.find((d) => d.ref === `sub:${sub.id}`);
  if (!deal) throw new Error('The approved month does not include this subscription. Save the month again after confirming the deposit, then re-approve.');
  const reference = `SUB-${sub.id.slice(0, 8).toUpperCase()}`;
  const txId = await existingDeal(fundId, reference) ?? await (async () => {
    const account = await officialAccountFor(tenantId, fundId, sub.share_class_id, cls.class_code, clientId, month.navDate);
    const { data: tx, error } = await supabase.from('capital_transactions').insert({
      tenant_id: tenantId, fund_id: fundId, capital_account_id: account.id,
      transaction_type: sub.kind === 'in_kind' ? 'transfer_in' : 'contribution',
      transaction_date: month.navDate, settlement_date: month.navDate, amount: deal.amount, shares: deal.units, price_per_share: month.price,
      currency: 'USD', status: 'settled', reference_number: reference,
      description: `${sub.kind === 'in_kind' ? 'Shares transferred in' : 'Application'}: ${deal.units.toLocaleString('en-US')} ${cls.class_name} units at ${month.price}`,
      created_by: userId, approved_by: userId,
    }).select('id').maybeSingle();
    fail('Could not issue the units', error);
    if (!tx) throw new Error('Could not issue the units.');
    return tx.id as string;
  })();
  const { error: sErr } = await supabase.from('unit_subscriptions').update({
    status: 'units_issued', capital_transaction_id: txId, client_id: clientId, updated_at: new Date().toISOString(),
  }).eq('id', sub.id);
  fail('Units were issued but the subscription could not be updated', sErr);
  return deal;
}

export async function recordWithdrawal(input: {
  tenantId: string; fundId: string; holding: OfficialHolding; noticeDate: string; mode: 'full' | 'units' | 'amount'; value: number; schedule: DealingSchedule; userId: string;
}) {
  const { holding, mode, value } = input;
  const dealing = redemptionDealingDay(input.schedule, input.noticeDate);
  const shares = mode === 'full' ? holding.shares_owned : mode === 'units' ? value : null;
  if (shares != null && (shares <= 0 || shares > holding.shares_owned + 1e-6)) throw new Error('The units requested must be more than zero and no more than the investor holds.');
  if (mode === 'amount' && !(value > 0)) throw new Error('Enter the amount to withdraw.');
  const { error } = await supabase.from('redemption_requests').insert({
    tenant_id: input.tenantId, fund_id: input.fundId, capital_account_id: holding.id, client_id: holding.investor_id,
    amount: mode === 'amount' ? value : 0, amount_requested: mode === 'amount' ? value : null, shares_requested: shares,
    redemption_type: mode === 'full' ? 'full' : 'partial', status: 'approved', request_date: input.noticeDate,
    requested_date: input.noticeDate, redemption_date: dealing, currency: 'USD', requested_by: input.userId, approved_by: input.userId,
  });
  fail('Could not record the withdrawal', error);
  return dealing;
}

export async function redeemUnits(tenantId: string, fundId: string, r: RedemptionRow, holding: OfficialHolding, cls: ClassRef, userId: string) {
  if (!r.redemption_date) throw new Error('This withdrawal has no dealing day.');
  const month = await finalMonth(fundId, holding.share_class_id, r.redemption_date);
  const deal = month.dealt.find((d) => d.ref === `red:${r.id}`);
  if (!deal) throw new Error('The approved month does not include this withdrawal. Save the month again, then re-approve.');
  const reference = `RED-${r.id.slice(0, 8).toUpperCase()}`;
  const txId = await existingDeal(fundId, reference) ?? await (async () => {
    if (deal.units > holding.shares_owned + 1e-6) throw new Error('The investor does not hold enough units for this withdrawal.');
    const { data: tx, error } = await supabase.from('capital_transactions').insert({
      tenant_id: tenantId, fund_id: fundId, capital_account_id: holding.id, transaction_type: 'redemption',
      transaction_date: month.navDate, amount: deal.amount, shares: deal.units, price_per_share: month.price, currency: 'USD', status: 'settled',
      reference_number: reference,
      description: `Withdrawal: ${deal.units.toLocaleString('en-US')} ${cls.class_name} units at ${month.price}`, created_by: userId, approved_by: userId,
    }).select('id').maybeSingle();
    fail('Could not redeem the units', error);
    if (!tx) throw new Error('Could not redeem the units.');
    return tx.id as string;
  })();
  const { error: rErr } = await supabase.from('redemption_requests').update({
    status: 'completed', processed_date: new Date().toISOString(), shares_approved: deal.units, amount_approved: deal.amount,
    redemption_price: month.price, settlement_amount: deal.amount, capital_transaction_id: txId, reviewed_by: userId, updated_at: new Date().toISOString(),
  }).eq('id', r.id);
  fail('Units were redeemed but the withdrawal could not be updated', rErr);
  return deal;
}

export async function setOfficialAccount(tenantId: string, fundId: string, classId: string, account: string, fromMonth: string) {
  const id = account.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,20}$/.test(id)) throw new Error('Enter the IBKR account number, for example U12345678.');
  const { error: dErr } = await supabase.from('fund_broker_accounts').update({ account_role: 'track_record' })
    .eq('fund_id', fundId).eq('share_class_id', classId).eq('account_role', 'official').neq('account_id', id);
  fail('Could not update the existing accounts', dErr);
  const { error } = await supabase.from('fund_broker_accounts').upsert({
    tenant_id: tenantId, fund_id: fundId, broker: 'ibkr', account_id: id, share_class_id: classId, account_role: 'official', official_from: `${fromMonth}-01`,
  }, { onConflict: 'fund_id,broker,account_id' });
  fail('Could not save the official account', error);
}
