import { supabase } from './supabase';
import { roundTo as round } from './money';
import { monthEnd, monthsBetween, type CashEvent, type ChangeInNav } from './statementParser';
import type { StatementMonthData } from './statementImport';
import { loadDealingTerms, numberOf, type DealingTerms } from './dealingTerms';
import { fetchAll, fetchAllIn } from './fetchAll';
import { DEFAULT_RULES, KIND_INFO, TREATMENT_INFO, loadMovementRules, movementKind, type MovementKind, type MovementRules } from './movementRules';
import { dealSeries, seriesValue, type SeriesValue, type UnitSeries } from './unitSeries';

export interface UploadRow {
  id: string;
  share_class_id: string;
  broker_account?: string | null;
  upload_year: number;
  upload_month: number;
  statement_data: StatementMonthData;
}

export interface ItemRow {
  id?: string;
  upload_id: string;
  trade_date: string;
  instrument: string;
  direction: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  proceeds: number | null;
  multiplier: number | null;
  asset_category: string | null;
  currency?: string | null;
  notes?: string | null;
}

export interface PriceMark {
  symbol: string;
  price_date: string;
  price: number;
  source: 'market' | 'statement' | 'trade' | 'manual';
}

export interface ClassInfo {
  id: string;
  class_code: string;
  class_name: string;
  units: number;
  startPrice: number;
}

export type PriceSource = 'manual' | 'statement' | 'ibkr' | 'market' | 'trade' | 'broker_last' | 'missing' | 'expired';

export const isIbkrPrice = (s: PriceSource) => s === 'statement' || s === 'ibkr' || s === 'expired';

export interface HoldingValue {
  symbol: string;
  quantity: number;
  multiplier: number;
  assetCategory: string;
  currency: string;
  fxRate: number;
  price: number;
  priceSource: PriceSource;
  priceDate?: string;
  marketValue: number;
}

export type MovementLabel = 'investor' | 'fee' | 'internal' | 'other_fund';

export const MOVEMENT_LABELS: Record<MovementLabel, string> = {
  investor: 'Investor money in or out',
  fee: 'Fee or expense',
  internal: 'Move between our own classes',
  other_fund: 'Transfer to or from another fund',
};

export interface Movement {
  key: string;
  date: string;
  kind: 'shares' | 'cash';
  description: string;
  amount: number;
  suggested: MovementLabel;
  label: MovementLabel;
  confirmed: boolean;
  reason: string;
  dealPrice?: number;
  units?: number;
}

export interface Dealt {
  ref: string;
  kind: 'issue' | 'redeem';
  name: string;
  amount: number;
  units: number;
  price: number;
}

export interface DealingSubscription {
  id: string;
  classId: string;
  key: string;
  name: string;
  kind: 'cash' | 'in_kind';
  dealingDate: string;
  ref?: string;
}

export type ManualKind = 'class_charge' | 'investor_fee' | 'manager_rebate';
export type ManualCategory = 'admin' | 'audit' | 'legal' | 'custom';

export interface ManualCharge {
  id: string;
  kind: ManualKind;
  category: ManualCategory;
  amount: number;
  month: string;
  classId: string;
  accountId: string | null;
  name: string;
  note: string;
  movementKey: string | null;
  paidMonth: string | null;
  correctsId: string | null;
}

export interface ManualLine {
  id: string;
  kind: ManualKind;
  category: ManualCategory;
  amount: number;
  note: string;
  name: string;
  status: 'charged' | 'owed' | 'paid';
  units?: number;
}

export interface DealingRedemption {
  id: string;
  classId: string;
  name: string;
  dealingDate: string;
  shares: number | null;
  amount: number | null;
}

export interface OfficialDealing {
  launchPrice: number;
  subscriptions: DealingSubscription[];
  redemptions: DealingRedemption[];
  manualCharges: ManualCharge[];
}

export interface OfficialAccount {
  account: string;
  fromMonth: string;
}

export interface Charges {
  management: number;
  performance: number;
  subadvisor: number;
  adjustments: number;
  trading: number;
  other: number;
  manual: number;
}

export interface MonthResult {
  month: string;
  date: string;
  openingValue: number;
  flows: number;
  internalFlows: number;
  movements: Movement[];
  charges: Charges;
  dividends: number;
  interest: number;
  investmentGain: number;
  unitsStart: number;
  unitsIssued: number;
  unitsRedeemed: number;
  cash: number;
  unitemisedCash: number;
  cashByCurrency: Array<{ currency: string; amount: number; usd: number }>;
  holdings: HoldingValue[];
  holdingsValue: number;
  accountValue: number;
  computedValue: number;
  brokerValue: number | null;
  income: number;
  fees: number;
  tradeCount: number;
  monthReturn: number;
  unitPrice: number;
  units: number;
  classNav: number;
  series: SeriesValue[];
  missingPrices: string[];
  unofficialPrices: string[];
  missingFx: string[];
  unexplained: number;
  tradeFx: Record<string, number>;
  final: boolean;
  finalReasons: string[];
  changeInNav: ChangeInNav | null;
  trackRecord: boolean;
  uninvestedCash: number;
  redemptionsPayable: number;
  dealt: Dealt[];
  manual: ManualLine[];
  chargesPayable: number;
  manualPaid: number;
}

export interface ClassValuation {
  classId: string;
  months: MonthResult[];
  notes: string[];
}

const markKey = (symbol: string, date: string) => `${symbol}|${date}`;

export function isMarketPriceable(assetCategory: string) {
  return !/future|bond|fop|warrant|cfd/i.test(assetCategory || '');
}

export const isOption = (assetCategory: string, symbol: string) => /option/i.test(assetCategory || '') || OPTION_RE.test(symbol);
const OPTION_RE = /\s(\d{2})([A-Z]{3})(\d{2})\s+[\d.]+\s+[CP]$/;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function optionExpiry(symbol: string): string | null {
  const m = symbol.match(OPTION_RE);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[2]);
  return mi < 0 ? null : `20${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1]}`;
}

export function guessCurrency(symbol: string) {
  return /^\d{4}\.T$/i.test(symbol) ? 'JPY' : 'USD';
}

export const fxKey = (ccy: string) => `FX:${ccy}`;

function fixMultiplier(mult: number, assetCategory: string, symbol: string) {
  const m = Number(mult) || 1;
  return m <= 1 && isOption(assetCategory, symbol) ? 100 : m;
}

const NO_CHARGES: Charges = { management: 0, performance: 0, subadvisor: 0, adjustments: 0, trading: 0, other: 0, manual: 0 };

export const MANUAL_CATEGORY_LABELS: Record<ManualCategory, string> = { admin: 'Administration', audit: 'Audit', legal: 'Legal', custom: 'Other' };

function chargeCategory(description: string): keyof Charges {
  const d = description.toLowerCase();
  if (/high water|performance|incentive/.test(d)) return 'performance';
  if (/fa fee: manual|adjust|reversal|rebate/.test(d)) return 'adjustments';
  if (/fa fee|percent of equity|management|advisor fee/.test(d)) return 'management';
  return 'other';
}

const DAY = 86_400_000;

const usdText = (v: number) => `${v < 0 ? '-' : ''}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function lastWeekday(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function valueClass(
  cls: ClassInfo,
  uploads: UploadRow[],
  items: ItemRow[],
  marks: PriceMark[],
  inceptionMonth: string,
  fallbackMonths: string[],
  labels: Record<string, MovementLabel> = {},
  classNames: Record<string, string> = {},
  official?: OfficialDealing,
  rules: MovementRules = DEFAULT_RULES,
  consolidate = true,
): ClassValuation {
  const notes: string[] = [];
  const own = uploads.filter((u) => u.share_class_id === cls.id);
  const capital = cls.units * cls.startPrice;
  const uploadClass = new Map(uploads.map((u) => [u.id, u.share_class_id]));
  const nameOf = (id: string | undefined) => (id && classNames[id]) || 'another class';
  const near = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) <= 3 * DAY;
  const peerTransfers = items.filter((i) => i.notes === 'transfer' && uploadClass.get(i.upload_id) && uploadClass.get(i.upload_id) !== cls.id);
  const mirrorOf = (t: ItemRow) => peerTransfers.find((o) => o.instrument === t.instrument && o.direction !== t.direction
    && Math.abs(Number(o.quantity) - Number(t.quantity)) < 1e-6 && near(o.trade_date, t.trade_date));
  const peerCash = uploads.filter((u) => u.share_class_id !== cls.id).flatMap((u) => (u.statement_data.cash_events ?? [])
    .filter((e) => e.type === 'deposit' || e.type === 'withdrawal').map((e) => ({ ...e, classId: u.share_class_id })));
  const cashMirrorOf = (e: CashEvent) => peerCash.find((o) => (o.currency || 'USD') === (e.currency || 'USD') && Math.abs(o.amount + e.amount) < 0.005 && near(o.date, e.date));
  const allFees = own.flatMap((u) => (u.statement_data.cash_events ?? []).filter((e) => e.type === 'fee'));
  const reversedCharge = (credit: CashEvent) => allFees.find((o) => o.amount < 0 && Math.abs(o.amount + credit.amount) < 0.005 && o.date <= credit.date
    && Date.parse(credit.date) - Date.parse(o.date) <= 120 * DAY);

  if (!own.length) {
    const months = fallbackMonths.filter((m) => m >= inceptionMonth);
    if (months.length) notes.push('No broker activity yet. Held as cash at the starting unit price.');
    return {
      classId: cls.id,
      notes,
      months: months.map((m) => ({
        month: m, date: monthEnd(+m.slice(0, 4), +m.slice(5, 7)), openingValue: capital, flows: 0, internalFlows: 0, cash: capital, unitemisedCash: 0, cashByCurrency: [],
        movements: [], charges: { ...NO_CHARGES }, dividends: 0, interest: 0, investmentGain: 0, unitsStart: cls.units, unitsIssued: 0, unitsRedeemed: 0,
        holdings: [], holdingsValue: 0, accountValue: capital, computedValue: capital, brokerValue: null, income: 0, fees: 0,
        tradeCount: 0, monthReturn: 0, unitPrice: cls.startPrice, units: cls.units, classNav: round(capital),
        series: cls.units > 0 ? [{ n: 1, start: inceptionMonth, startPrice: cls.startPrice, units: cls.units, price: cls.startPrice, value: round(capital), hwm: cls.startPrice, issued: 0, redeemed: 0 }] : [], missingPrices: [], unofficialPrices: [], missingFx: [], unexplained: 0, tradeFx: {},
        final: false, finalReasons: ['No IBKR account activity for this class yet.'], changeInNav: null,
        trackRecord: !official, uninvestedCash: 0, redemptionsPayable: 0, dealt: [], manual: [], chargesPayable: 0, manualPaid: 0,
      })),
    };
  }

  const byMonth = new Map<string, UploadRow>();
  own.forEach((u) => byMonth.set(`${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`, u));
  const keys = [...byMonth.keys()].sort();
  const allMonths = monthsBetween(`${keys[0]}-01`, `${keys[keys.length - 1]}-01`);

  const manual = new Map<string, number>();
  const market = new Map<string, number>();
  const fxSeries = new Map<string, Array<[string, number]>>();
  marks.forEach((m) => {
    if (m.symbol.startsWith('FX:')) {
      const ccy = m.symbol.slice(3);
      fxSeries.set(ccy, [...(fxSeries.get(ccy) ?? []), [m.price_date, Number(m.price)]]);
      return;
    }
    (m.source === 'manual' ? manual : market).set(markKey(m.symbol, m.price_date), Number(m.price));
  });

  const currencyOf = new Map<string, string>();
  own.forEach((u) => [u.statement_data.opening, u.statement_data.closing].forEach((s) => s?.positions.forEach((p) => {
    if (p.currency) currencyOf.set(p.symbol, p.currency);
  })));
  items.forEach((i) => { if (i.currency) currencyOf.set(i.instrument, i.currency); });
  const ccyOf = (symbol: string) => currencyOf.get(symbol) ?? guessCurrency(symbol);

  const missingFx = new Set<string>();
  const fxFor = (ccy: string, date: string, stmtRates?: Record<string, number>): number => {
    if (!ccy || ccy === 'USD') return 1;
    if (stmtRates?.[ccy]) return stmtRates[ccy];
    const series = fxSeries.get(ccy);
    if (!series?.length) { missingFx.add(ccy); return 0; }
    const target = Date.parse(date);
    const nearest = series.reduce((best, cur) => (Math.abs(Date.parse(cur[0]) - target) < Math.abs(Date.parse(best[0]) - target) ? cur : best));
    // A rate more than a week away is only an estimate, so the month stays in review.
    if (Math.abs(Date.parse(nearest[0]) - target) > 7 * 86400000) missingFx.add(ccy);
    return nearest[1];
  };

  const first = byMonth.get(keys[0])!.statement_data;
  const opening = first.opening;
  const positions = new Map<string, { quantity: number; multiplier: number; assetCategory: string }>();
  opening?.positions.forEach((p) => positions.set(p.symbol, { quantity: p.quantity, multiplier: fixMultiplier(p.multiplier, p.assetCategory, p.symbol), assetCategory: p.assetCategory }));
  const lastTrade = new Map<string, number>();
  const brokerLast = new Map<string, Array<[string, number]>>();
  own.forEach((u) => {
    const c = u.statement_data.closing;
    c?.positions.forEach((p) => { if (p.price) brokerLast.set(p.symbol, [...(brokerLast.get(p.symbol) ?? []), [c.as_of, p.price]]); });
  });
  const brokerPrice = (symbol: string, date: string) => {
    const list = brokerLast.get(symbol);
    if (!list?.length) return null;
    const before = list.filter(([d]) => d <= date).sort((a, b) => b[0].localeCompare(a[0]))[0];
    return (before ?? [...list].sort((a, b) => a[0].localeCompare(b[0]))[0])[1];
  };

  const ibkrDaily = new Map<string, { prices: Map<string, number>; dates: Record<string, string> }>();
  own.forEach((u) => {
    const p = u.statement_data.ibkr_prices;
    if (p) ibkrDaily.set(p.as_of.slice(0, 7), { prices: new Map(Object.entries(p.prices)), dates: p.dates ?? {} });
  });

  const priceFor = (symbol: string, assetCategory: string, date: string, statementPrices: Map<string, number> | null): [number, PriceSource, string?] => {
    const k = markKey(symbol, date);
    if (statementPrices?.has(symbol)) return [statementPrices.get(symbol)!, 'statement'];
    const daily = ibkrDaily.get(date.slice(0, 7));
    if (daily?.prices.has(symbol)) return [daily.prices.get(symbol)!, 'ibkr', daily.dates[symbol]];
    const expiry = isOption(assetCategory, symbol) ? optionExpiry(symbol) : null;
    if (expiry && expiry < date) return [0, 'expired'];
    if (manual.has(k)) return [manual.get(k)!, 'manual'];
    if (market.has(k)) return [market.get(k)!, 'market'];
    if (lastTrade.has(symbol)) return [lastTrade.get(symbol)!, 'trade'];
    const bp = brokerPrice(symbol, date);
    if (bp != null) return [bp, 'broker_last'];
    return [0, 'missing'];
  };

  const valueHoldings = (date: string, statementPrices: Map<string, number> | null, stmtRates?: Record<string, number>) => {
    const holdings: HoldingValue[] = [];
    positions.forEach((p, symbol) => {
      if (Math.abs(p.quantity) < 1e-9) return;
      const [price, priceSource, priceDate] = priceFor(symbol, p.assetCategory, date, statementPrices);
      const currency = ccyOf(symbol);
      const fxRate = fxFor(currency, date, stmtRates);
      holdings.push({
        symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory, currency, fxRate,
        price, priceSource, ...(priceDate ? { priceDate } : {}), marketValue: round(p.quantity * p.multiplier * price * fxRate),
      });
    });
    holdings.sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));
    return holdings;
  };

  const hasBrokerCash = opening?.cash != null || opening?.nav != null;
  let cash = opening?.cash ?? (hasBrokerCash ? 0 : capital);
  if (!hasBrokerCash) notes.push('The file had no cash balance, so the class starting capital was used as opening cash.');

  let prevValue: number;
  // Broker cash lines often cover only one currency; the rest of the broker's opening value is carried as cash so it is not booked as a loss.
  let unitemisedCash = 0;
  if (opening?.nav != null) {
    prevValue = opening.nav;
    const oh = valueHoldings(opening.as_of, null);
    unitemisedCash = opening.nav - ((opening.cash ?? 0) + oh.reduce((s, h) => s + h.marketValue, 0));
    if (opening.cash == null) cash = 0;
    if (Math.abs(unitemisedCash) > 1) {
      const unpriced = oh.filter((h) => h.priceSource === 'missing').map((h) => h.symbol);
      notes.push(`The broker's opening value includes ${round(unitemisedCash).toLocaleString('en-US')} USD not itemised in the file (usually cash in other currencies). It is carried as cash until the broker's closing value takes over.${unpriced.length ? ` Unpriced at the start: ${unpriced.join(', ')}.` : ''}`);
    }
    cash += unitemisedCash;
  } else {
    const oh = valueHoldings(opening?.as_of ?? `${keys[0]}-01`, null);
    prevValue = cash + oh.reduce((s, h) => s + h.marketValue, 0);
  }

  let unitPrice = cls.startPrice;
  let units = cls.units;
  if (!official && opening?.nav != null && Math.abs(units * unitPrice - opening.nav) > 1) {
    notes.push(`The class started with ${units.toLocaleString('en-US')} units at ${unitPrice}, but the broker's opening value is ${round(opening.nav).toLocaleString('en-US')} USD. Units were set to match the broker so every unit starts at ${unitPrice}.`);
    units = opening.nav / unitPrice;
  }
  const results: MonthResult[] = [];
  let series: UnitSeries[] = [];
  let seriesCount = 0;
  let pending: Array<{ key: string; amount: number; date: string; sub?: DealingSubscription }> = [];
  let payable = 0;
  let chargesPayable = 0;
  const subByKey = new Map((official?.subscriptions ?? []).filter((s) => s.classId === cls.id).map((s) => [s.key, s]));
  const ownManual = (official?.manualCharges ?? []).filter((c) => c.classId === cls.id);
  const settleByKey = new Map(ownManual.filter((c) => c.kind === 'class_charge' && c.movementKey).map((c) => [c.movementKey!, c]));
  const rebateByKey = new Map(ownManual.filter((c) => c.kind === 'manager_rebate' && c.movementKey).map((c) => [c.movementKey!, c]));
  const manualFor = (mk: string, kind: ManualKind) => ownManual.filter((c) => c.kind === kind && c.month === mk);
  const lineOf = (c: ManualCharge, status: ManualLine['status'], units?: number): ManualLine => ({
    id: c.id, kind: c.kind, category: c.category, amount: c.amount, note: c.note, name: c.name, status, units,
  });

  allMonths.forEach((mk) => {
    const up = byMonth.get(mk);
    const data = up?.statement_data;
    const monthItems = up ? items.filter((i) => i.upload_id === up.id).sort((a, b) => a.trade_date.localeCompare(b.trade_date)) : [];
    const closing = data?.closing;
    const fullMonthEnd = monthEnd(+mk.slice(0, 4), +mk.slice(5, 7));
    const isPeriodEnd = !!closing && !!data && closing.as_of >= data.period.end;
    const date = closing && isPeriodEnd && closing.as_of < fullMonthEnd ? closing.as_of : fullMonthEnd;
    const brokerHoldings = !!closing && closing.has_positions !== false;
    const stmtRates = data?.fx_rates;
    missingFx.clear();
    let fees = 0;
    let flows = 0;
    let internalFlows = 0;
    let manualPaid = 0;
    const charges: Charges = { ...NO_CHARGES };
    const movements: Movement[] = [];
    const tradeFx: Record<string, number> = {};
    const classify = (key: string, suggested: MovementLabel, auto: boolean, why: string) => {
      const label = labels[key] ?? suggested;
      const reason = key in labels ? `You marked this as "${MOVEMENT_LABELS[label].toLowerCase()}".` : auto ? why : `Needs your answer: ${why}`;
      return { label, confirmed: auto || key in labels, reason };
    };
    monthItems.forEach((t) => {
      const assetCategory = t.asset_category || '';
      const mult = fixMultiplier(Number(t.multiplier), assetCategory, t.instrument);
      const fx = fxFor(t.currency || ccyOf(t.instrument), date, stmtRates);
      if (t.id) tradeFx[t.id] = fx;
      const signed = t.direction === 'buy' ? Number(t.quantity) : -Number(t.quantity);
      // IBKR renames the old line to "X.OLD" on a consolidation or ticker change; those shares were held as "X".
      const renamed = t.instrument.endsWith('.OLD') ? t.instrument.slice(0, -4) : '';
      const symbol = renamed && !positions.has(t.instrument) && positions.has(renamed) ? renamed : t.instrument;
      const cur = positions.get(symbol) ?? { quantity: 0, multiplier: mult, assetCategory };
      cur.quantity += signed;
      cur.multiplier = mult;
      positions.set(symbol, cur);
      if (t.notes === 'transfer') {
        const value = signed * Number(t.price) * mult * fx;
        const key = `${cls.id}:shares:${t.trade_date}:${t.instrument}:${t.direction}:${Number(t.quantity)}`;
        const peer = mirrorOf(t);
        const suggested: MovementLabel = peer ? 'internal' : signed > 0 ? 'investor' : 'other_fund';
        const why = peer
          ? `Class switch: the same ${Number(t.quantity).toLocaleString('en-US')} ${t.instrument} ${signed > 0 ? 'left' : 'arrived in'} ${nameOf(uploadClass.get(peer.upload_id))} on ${peer.trade_date}.`
          : `no matching transfer in another class account, so it may be ${signed > 0 ? 'an investor bringing in shares' : 'shares sent to another fund'}.`;
        const { label, confirmed, reason } = classify(key, suggested, !!peer, why);
        movements.push({
          key, date: t.trade_date, kind: 'shares', amount: round(value), suggested, label, confirmed, reason,
          description: `${signed > 0 ? 'Received' : 'Sent out'} ${Number(t.quantity).toLocaleString('en-US')} ${t.instrument} at ${Number(t.price)} ${t.currency || ccyOf(t.instrument)}`,
        });
        flows += value;
        if (label === 'internal') internalFlows += value;
        return;
      }
      const proceeds = t.proceeds != null ? Number(t.proceeds) : -signed * Number(t.price) * mult;
      cash += (proceeds - Number(t.fees)) * fx;
      fees += Number(t.fees) * fx;
      charges.trading += Number(t.fees) * fx;
      if (Number(t.price) > 0 && t.notes !== 'corporate_action') lastTrade.set(t.instrument, Number(t.price));
    });
    const events = data?.cash_events ?? [];
    let income = 0;
    let dividends = 0;
    let interest = 0;
    const paired = new Set<number>();
    events.forEach((e, i) => {
      if (paired.has(i) || (e.type !== 'deposit' && e.type !== 'withdrawal')) return;
      const j = events.findIndex((o, k) => k > i && !paired.has(k) && o.currency === e.currency && Math.abs(o.amount + e.amount) < 0.005 && (o.type === 'deposit' || o.type === 'withdrawal'));
      if (j >= 0) { paired.add(i); paired.add(j); }
    });
    events.forEach((e, i) => {
      const amount = e.amount * fxFor(e.currency || 'USD', date, stmtRates);
      cash += amount;
      const transfer = e.type === 'deposit' || e.type === 'withdrawal';
      const peer = transfer ? cashMirrorOf(e) : undefined;
      const kind: MovementKind = transfer && (peer || paired.has(i)) ? 'internal_transfer' : movementKind(e);
      const treatment = rules[kind];
      const kindLabel = KIND_INFO.find((k) => k.kind === kind)!.label.toLowerCase();
      const reversed = e.type === 'fee' && e.amount > 0 ? reversedCharge(e) : undefined;
      const bookNav = () => {
        if (e.type === 'fee' || transfer) {
          fees -= amount;
          const cat: keyof Charges = reversed
            ? (reversed.date.slice(0, 7) === mk ? chargeCategory(reversed.description) : 'adjustments')
            : transfer ? (amount < 0 ? 'subadvisor' : 'adjustments') : e.amount > 0 ? 'adjustments' : chargeCategory(e.description);
          charges[cat] -= amount;
        } else {
          income += amount;
          if (e.type === 'interest') interest += amount;
          else dividends += amount;
        }
      };
      const key = transfer ? `${cls.id}:cash:${e.date}:${e.currency || 'USD'}:${e.amount.toFixed(2)}` : `${cls.id}:${e.type}:${e.date}:${e.amount.toFixed(2)}`;
      const description = `${e.description || (e.amount < 0 ? 'Withdrawal' : 'Deposit')} (${e.amount.toLocaleString('en-US')} ${e.currency || 'USD'})`;
      if (!transfer && treatment === 'nav' && !(key in labels)) {
        bookNav();
        if (e.type === 'fee' && e.amount > 0) {
          movements.push({
            key, date: e.date, kind: 'cash', amount: round(amount), suggested: 'fee', label: 'fee', confirmed: true, description,
            reason: reversed
              ? `Fee credit: reverses the ${usdText(-reversed.amount)} "${reversed.description}" charge on ${reversed.date}, so only the net fee counts.`
              : 'Fee refund: sorted by your rule for fee refunds, so it raises the unit price.',
          });
        }
        return;
      }
      const suggested: MovementLabel = treatment === 'nav' || treatment === 'review' ? 'fee' : treatment === 'excluded' ? 'internal' : 'investor';
      const context = peer
        ? `Class switch: matches the ${usdText(peer.amount)} ${peer.amount > 0 ? 'deposit into' : 'withdrawal from'} ${nameOf(peer.classId)} on ${peer.date}. `
        : paired.has(i)
          ? 'Cancelled out by an equal and opposite entry in the same account. '
          : e.internal ? 'IBKR marks this as an internal transfer between our own accounts. ' : '';
      const why = treatment === 'review'
        ? `IBKR type "${e.ibkrType || e.description}" is set to "ask me each time". Is it investor money, a cost or a transfer? Until answered it counts as a cost.`
        : `${context}Sorted by your rule for ${kindLabel}: ${TREATMENT_INFO[treatment].label.toLowerCase()}.`;
      const { label, confirmed, reason } = classify(key, suggested, treatment !== 'review', why);
      const mv: Movement = { key, date: e.date, kind: 'cash', amount: round(amount), suggested, label, confirmed, reason, description };
      movements.push(mv);
      const settles = official && transfer ? settleByKey.get(key) : undefined;
      if (settles) {
        Object.assign(mv, { label: 'fee', confirmed: true, reason: `Pays the ${MANUAL_CATEGORY_LABELS[settles.category].toLowerCase()} charge entered by hand for ${settles.month} ("${settles.note}"). It already lowered the unit price when it was entered, so it is not counted again.` });
        manualPaid += -amount;
        return;
      }
      const rebate = official && transfer ? rebateByKey.get(key) : undefined;
      if (rebate) {
        Object.assign(mv, { label: 'investor', confirmed: true });
        flows += amount;
        return;
      }
      if (label === 'fee') { bookNav(); return; }
      flows += amount;
      if (label === 'internal') internalFlows += amount;
    });

    let unexplained = 0;
    let statementPrices: Map<string, number> | null = null;
    if (closing && brokerHoldings) {
      statementPrices = new Map(closing.positions.filter((p) => p.price).map((p) => [p.symbol, p.price!]));
      positions.forEach((p, s) => {
        if (closing.positions.some((c) => c.symbol === s) || Math.abs(p.quantity) < 1e-6) return;
        notes.push(`${s}: rebuilt quantity ${p.quantity} is not held at the broker at ${closing.as_of}; treated as closed.`);
        p.quantity = 0;
      });
      closing.positions.forEach((p) => {
        const cur = positions.get(p.symbol);
        if (!cur || Math.abs(cur.quantity - p.quantity) > 1e-6) notes.push(`${p.symbol}: rebuilt quantity ${cur?.quantity ?? 0} differs from broker ${p.quantity} at ${closing.as_of}; broker figure used.`);
        positions.set(p.symbol, { quantity: p.quantity, multiplier: fixMultiplier(p.multiplier, p.assetCategory, p.symbol), assetCategory: p.assetCategory });
      });
      if (closing.cash != null && closing.nav == null) {
        if (Math.abs(closing.cash - cash) > 1) notes.push(`Cash rebuilt from activity (${round(cash)}) differs from broker ending cash (${round(closing.cash)}); broker figure used.`);
        unexplained += closing.cash - cash;
        cash = closing.cash;
        unitemisedCash = 0;
      }
    }

    const holdings = valueHoldings(date, statementPrices, stmtRates);
    const holdingsValue = round(holdings.reduce((s, h) => s + h.marketValue, 0));
    const computedValue = round(cash + holdingsValue);
    if (closing?.nav != null) {
      const impliedCash = closing.nav - holdingsValue;
      unexplained += impliedCash - cash - (closing.accruals ?? 0);
      if (Math.abs(closing.accruals ?? 0) >= 0.005) notes.push(`IBKR's value at ${closing.as_of} includes ${usdText(closing.accruals!)} of interest and dividends earned but not yet paid.`);
      cash = impliedCash;
      unitemisedCash = closing.cash != null ? impliedCash - closing.cash : 0;
    }
    const brokerValue = closing?.nav ?? null;
    const accountValue = brokerValue ?? computedValue;
    const cashByCurrency = Object.entries(closing?.cash_by_currency ?? {})
      .filter(([, amount]) => Math.abs(amount) >= 0.005)
      .map(([currency, amount]) => ({ currency, amount: round(amount), usd: round(amount * fxFor(currency, date, stmtRates)) }));
    const denom = prevValue + flows;
    const monthReturn = denom > 0.01 ? (accountValue - prevValue - flows) / denom : 0;

    if (mk >= inceptionMonth) {
      if (!official && !series.length && prevValue > 0.01) {
        series.push({ n: ++seriesCount, start: mk, startPrice: cls.startPrice, units: prevValue / cls.startPrice, price: cls.startPrice, hwm: cls.startPrice, issued: 0, redeemed: 0 });
        units = series[0].units;
        unitPrice = cls.startPrice;
      }
      const unitsStart = units;
      const startPrice = unitPrice;
      let monthManual: ManualLine[] = [];
      let seriesReturn = 0;
      const dealingReasons: string[] = [];
      const dealt: Dealt[] = [];
      let issued = 0;
      let redeemed = 0;
      if (official) {
        const manual: ManualLine[] = [];
        movements.filter((x) => x.label !== 'fee').forEach((x) => {
          const reb = rebateByKey.get(x.key);
          if (reb) {
            pending.push({ key: x.key, amount: x.amount, date: x.date, sub: { id: reb.id, classId: cls.id, key: x.key, name: reb.name, kind: 'cash', dealingDate: fullMonthEnd, ref: `reb:${reb.id}` } });
            x.reason = `Arkline's payment of the fee rebate for ${reb.name} ("${reb.note}"). Units are issued to them at this month's final price.`;
            if (Math.abs(x.amount - reb.amount) >= 0.005) dealingReasons.push(`Arkline paid ${usdText(x.amount)} for ${reb.name}'s rebate, but the rebate is ${usdText(reb.amount)}. Link the right IBKR payment on the Fees page.`);
            return;
          }
          if (x.amount > 0) {
            const sub = subByKey.get(x.key);
            pending.push({ key: x.key, amount: x.amount, date: x.date, sub });
            x.label = 'investor';
            x.confirmed = !!sub;
            x.reason = sub
              ? `Application money from ${sub.name}. Held outside the class value until units are issued at the ${sub.dealingDate} price.`
              : 'Needs your answer: confirm which approved application this money belongs to on the Onboarding page. Until then it is kept outside the class value.';
          } else if (payable + x.amount >= -0.01) {
            payable += x.amount;
            x.confirmed = true;
            x.reason = 'Pays out a withdrawal already dealt at an earlier month-end price.';
          } else {
            x.confirmed = false;
            x.reason = 'Needs your answer: money left the account but no withdrawal was dealt at an earlier month-end. Record the withdrawal request on the Onboarding page.';
          }
        });
        manualFor(mk, 'class_charge').forEach((c) => { charges.manual += c.amount; manual.push(lineOf(c, 'charged')); });
        manualFor(mk, 'manager_rebate').filter((r) => r.paidMonth !== mk).forEach((r) => manual.push(lineOf(r, r.paidMonth ? 'paid' : 'owed')));
        chargesPayable += charges.manual - manualPaid;
        if (chargesPayable < -0.01) dealingReasons.push('More was paid from IBKR for hand-entered charges than was charged. Check which IBKR payments are linked on the Fees page.');
        // Money waiting for its dealing day, unpaid withdrawals and unpaid hand-entered charges are not part of the class value.
        const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);
        const value = accountValue - pendingTotal - payable - chargesPayable;
        const launching = unitsStart < 1e-9;
        const price = launching ? official.launchPrice : value / unitsStart;
        if (!launching && price <= 0) dealingReasons.push('The class value after setting aside application money is not positive, so no unit price can be set.');
        pending.filter((p) => p.sub && p.sub.dealingDate.slice(0, 7) < mk).forEach((p) => {
          dealingReasons.push(`${p.sub!.name}'s money was due to be invested on ${p.sub!.dealingDate}, which has passed. Re-confirm the deposit so a new dealing day is set.`);
        });
        const due = pending.filter((p) => p.sub && p.sub.dealingDate.slice(0, 7) === mk);
        const inKindDue = due.filter((p) => p.sub!.kind === 'in_kind');
        const inKindTotal = inKindDue.reduce((s, p) => s + p.amount, 0);
        const issueValue = (p: (typeof due)[number]) => (launching && p.sub!.kind === 'in_kind' && inKindTotal > 0 ? (value + inKindTotal) * (p.amount / inKindTotal) : p.amount);
        if (launching && !inKindDue.length && Math.abs(value) >= 0.01) {
          dealingReasons.push(`${usdText(value)} in the account does not belong to any application, and no units are on issue yet.`);
        }
        if (!launching && inKindDue.length) notes.push('Shares transferred in after launch are valued at the transfer price; check them before approving.');
        if (price > 0) {
          due.forEach((p) => {
            const amount = round(issueValue(p));
            const u = round(amount / price, 4);
            issued += u;
            dealt.push({ ref: p.sub!.ref ?? `sub:${p.sub!.id}`, kind: 'issue', name: p.sub!.name, amount, units: u, price: round(price, 6) });
            const reb = p.sub!.ref ? ownManual.find((c) => `reb:${c.id}` === p.sub!.ref) : undefined;
            if (reb) manual.push(lineOf(reb, 'paid', u));
          });
          (official.redemptions ?? []).filter((r) => r.classId === cls.id && r.dealingDate.slice(0, 7) === mk).forEach((r) => {
            const u = round(r.shares ?? (r.amount ?? 0) / price, 4);
            const amount = round(u * price);
            redeemed += u;
            payable += amount;
            dealt.push({ ref: `red:${r.id}`, kind: 'redeem', name: r.name, amount, units: u, price: round(price, 6) });
          });
          manualFor(mk, 'investor_fee').forEach((f) => {
            const u = round(f.amount / price, 4);
            redeemed += u;
            payable += f.amount;
            dealt.push({ ref: `fee:${f.id}`, kind: 'redeem', name: f.name, amount: f.amount, units: u, price: round(price, 6) });
            manual.push(lineOf(f, 'charged', u));
          });
          pending = pending.filter((p) => !due.includes(p));
        }
        if (redeemed > unitsStart + issued + 1e-6) dealingReasons.push('Withdrawals dealt this month are larger than the units on issue.');
        units = unitsStart + issued - redeemed;
        unitPrice = price > 0 ? price : unitPrice;
        monthManual = manual;
      } else {
        const dealtSeries = dealSeries(series, movements.filter((x) => x.label !== 'fee'), {
          month: mk, prevValue, flows, accountValue, launchPrice: cls.startPrice, consolidate, nextN: () => ++seriesCount,
        });
        series = dealtSeries.series;
        issued = dealtSeries.issued;
        redeemed = dealtSeries.redeemed;
        seriesReturn = dealtSeries.monthReturn;
        dealingReasons.push(...dealtSeries.problems);
        notes.push(...dealtSeries.notes);
        units = series.reduce((s, x) => s + x.units, 0);
        unitPrice = series[0]?.price ?? unitPrice;
      }
      Object.keys(charges).forEach((k) => { charges[k as keyof Charges] = round(charges[k as keyof Charges]); });
      const unofficial = holdings.filter((h) => !isIbkrPrice(h.priceSource)).map((h) => h.symbol);
      const changeInNav = data?.change_in_nav ?? null;
      const finalReasons: string[] = [];
      if (brokerValue == null) finalReasons.push('IBKR has not reported a month-end account value yet.');
      else if (date < lastWeekday(fullMonthEnd)) finalReasons.push(`IBKR has only reported up to ${date}; the month is not over.`);
      if (brokerValue != null && Math.abs(unexplained) >= 0.005) finalReasons.push(`Our rebuild from trades and cash differs from IBKR's value by ${usdText(unexplained)}.`);
      if (changeInNav?.ending != null && changeInNav.to === date && brokerValue != null && Math.abs(changeInNav.ending - brokerValue) >= 0.005) {
        finalReasons.push(`IBKR's Change in NAV ends at ${usdText(changeInNav.ending)} but its month-end value is ${usdText(brokerValue)}.`);
      }
      if (unofficial.length) finalReasons.push(`Waiting for IBKR price: ${unofficial.join(', ')}.`);
      if (missingFx.size) finalReasons.push(`No IBKR exchange rate for ${[...missingFx].join(', ')}.`);
      const unexplainedMoves = movements.filter((x) => !x.confirmed).length;
      if (unexplainedMoves) finalReasons.push(`${unexplainedMoves} money or share movement${unexplainedMoves === 1 ? '' : 's'} not yet explained.`);
      finalReasons.push(...dealingReasons);
      results.push({
        month: mk, date, openingValue: round(prevValue), flows: round(flows), internalFlows: round(internalFlows), cash: round(cash), unitemisedCash: round(unitemisedCash), cashByCurrency, holdings, holdingsValue,
        movements, charges, dividends: round(dividends), interest: round(interest),
        investmentGain: round(accountValue - prevValue - flows - income + fees + manualPaid),
        unitsStart: round(unitsStart, 4), unitsIssued: round(issued, 4), unitsRedeemed: round(redeemed, 4),
        accountValue: round(accountValue), computedValue, brokerValue, income: round(income), fees: round(fees),
        tradeCount: monthItems.length, monthReturn: !official ? seriesReturn : unitsStart < 1e-9 ? 0 : startPrice > 0 ? unitPrice / startPrice - 1 : monthReturn, unitPrice: round(unitPrice, 6), units: round(units, 4),
        classNav: !official && series.length ? round(series.reduce((s, x) => s + x.units * x.price, 0)) : round(unitPrice * units),
        series: series.map(seriesValue), missingPrices: holdings.filter((h) => h.priceSource === 'missing').map((h) => h.symbol),
        unofficialPrices: unofficial,
        missingFx: [...missingFx], unexplained: round(unexplained), tradeFx,
        final: finalReasons.length === 0, finalReasons, changeInNav,
        trackRecord: !official, uninvestedCash: round(pending.reduce((s, p) => s + p.amount, 0)), redemptionsPayable: round(payable), dealt,
        manual: monthManual, chargesPayable: round(chargesPayable), manualPaid: round(manualPaid),
      });
    }
    prevValue = accountValue;
  });

  return { classId: cls.id, months: results, notes: [...new Set(notes)] };
}

export interface FundData {
  classes: ClassInfo[];
  uploads: UploadRow[];
  items: ItemRow[];
  marks: PriceMark[];
  labels: Record<string, MovementLabel>;
  inceptionMonth: string;
  officialAccounts: Record<string, OfficialAccount>;
  dealing: OfficialDealing;
  terms: DealingTerms;
  rules: MovementRules;
}

type Joined<T> = T | T[] | null;
const one = <T,>(v: Joined<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export async function loadFundData(fundId: string): Promise<FundData> {
  const [fundRes, scRes, openRes, accts, labelRows, uploads, marks, officialRes, subs, reds, manualRows, terms] = await Promise.all([
    supabase.from('funds').select('id, inception_date').eq('id', fundId).maybeSingle(),
    supabase.from('share_classes').select('id, class_code, class_name').eq('fund_id', fundId).order('class_code'),
    supabase.from('nav_calculations').select('share_class_id, nav_per_share, total_shares, nav_date').eq('fund_id', fundId).eq('calculation_method', 'opening'),
    fetchAll(() => supabase.from('capital_accounts').select('id, share_class_id, shares_owned, metadata').eq('fund_id', fundId).order('id')),
    fetchAll(() => supabase.from('fund_movement_labels').select('movement_key, label').eq('fund_id', fundId).order('id')),
    fetchAll(() => supabase.from('trade_uploads')
      .select('id, share_class_id, broker_account, upload_year, upload_month, statement_data')
      .eq('fund_id', fundId).eq('status', 'confirmed').not('share_class_id', 'is', null).order('id')),
    fetchAll(() => supabase.from('fund_price_marks').select('symbol, price_date, price, source').eq('fund_id', fundId).order('id')),
    supabase.from('fund_broker_accounts').select('account_id, share_class_id, official_from').eq('fund_id', fundId).eq('account_role', 'official'),
    fetchAll(() => supabase.from('unit_subscriptions')
      .select('id, share_class_id, broker_movement_key, investor_name, kind, dealing_date')
      .eq('fund_id', fundId).in('status', ['money_received', 'units_issued']).order('id')),
    fetchAll(() => supabase.from('redemption_requests')
      .select('id, redemption_date, shares_requested, amount_requested, capital_accounts(share_class_id), client_profiles(full_name)')
      .eq('fund_id', fundId).in('status', ['approved', 'processing', 'completed']).not('redemption_date', 'is', null).not('capital_account_id', 'is', null).order('id')),
    fetchAll(() => supabase.from('fund_manual_charges')
      .select('id, kind, category, amount, charge_month, share_class_id, capital_account_id, note, ibkr_movement_key, paid_month, corrects_id, capital_accounts(client_profiles(full_name))')
      .eq('fund_id', fundId).eq('status', 'active').order('id')),
    loadDealingTerms(fundId),
  ]);
  const rules = await loadMovementRules(fundId);
  if (fundRes.error || !fundRes.data) throw new Error(fundRes.error?.message || 'Fund not found');
  if (scRes.error) throw new Error(scRes.error.message);
  if (openRes.error) throw new Error(openRes.error.message);
  if (officialRes.error) throw new Error(officialRes.error.message);
  const fund = fundRes.data;
  const openings = openRes.data ?? [];
  const items = (await fetchAllIn(uploads.map((u) => u.id as string), (chunk) => supabase.from('trade_upload_items')
    .select('id, upload_id, trade_date, instrument, direction, quantity, price, fees, proceeds, multiplier, asset_category, currency, notes')
    .in('upload_id', chunk).order('id'))) as ItemRow[];

  const dealing: OfficialDealing = {
    launchPrice: (terms && numberOf(terms.terms.launch_unit_price)) || 1,
    subscriptions: subs.filter((s) => s.broker_movement_key && s.dealing_date).map((s) => ({
      id: s.id, classId: s.share_class_id, key: s.broker_movement_key!, name: s.investor_name, kind: s.kind as 'cash' | 'in_kind', dealingDate: s.dealing_date!,
    })),
    redemptions: reds.flatMap((r) => {
      const classId = one(r.capital_accounts as Joined<{ share_class_id: string }>)?.share_class_id;
      if (!classId) return [];
      return [{
        id: r.id, classId, dealingDate: r.redemption_date as string,
        name: one(r.client_profiles as Joined<{ full_name: string }>)?.full_name ?? 'Investor',
        shares: r.shares_requested != null ? Number(r.shares_requested) : null,
        amount: r.amount_requested != null ? Number(r.amount_requested) : null,
      }];
    }),
    manualCharges: manualRows.map((c) => {
      const acct = one(c.capital_accounts as Joined<{ client_profiles: Joined<{ full_name: string }> }>);
      return {
        id: c.id, kind: c.kind as ManualKind, category: c.category as ManualCategory, amount: Number(c.amount),
        month: String(c.charge_month).slice(0, 7), classId: c.share_class_id, accountId: c.capital_account_id,
        name: acct ? one(acct.client_profiles)?.full_name ?? 'Investor' : 'Whole class',
        note: c.note, movementKey: c.ibkr_movement_key, paidMonth: c.paid_month ? String(c.paid_month).slice(0, 7) : null, correctsId: c.corrects_id,
      };
    }),
  };
  const officialAccounts: Record<string, OfficialAccount> = Object.fromEntries((officialRes.data ?? []).filter((o) => o.official_from)
    .map((o) => [o.share_class_id, { account: o.account_id, fromMonth: String(o.official_from).slice(0, 7) }]));

  const classes: ClassInfo[] = (scRes.data ?? []).map((c) => {
    const open = openings.find((o) => o.share_class_id === c.id);
    return {
      id: c.id,
      class_code: c.class_code,
      class_name: c.class_name,
      units: open?.total_shares != null ? Number(open.total_shares) : accts.filter((a) => a.share_class_id === c.id && !(a.metadata as { official?: boolean } | null)?.official)
        .reduce((s, a) => s + Number(a.shares_owned || 0), 0),
      startPrice: Number(open?.nav_per_share ?? 1),
    };
  });
  const inception = fund.inception_date ?? `${new Date().getFullYear()}-01-01`;
  const labels = Object.fromEntries(labelRows.map((l) => [l.movement_key, l.label as MovementLabel]));
  return {
    classes, uploads: uploads as UploadRow[], items, marks: marks as PriceMark[], labels, inceptionMonth: inception.slice(0, 7), officialAccounts, dealing, terms: terms?.terms ?? {}, rules,
  };
}

const uploadMonth = (u: UploadRow) => `${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`;

export function valueFund(d: FundData): ClassValuation[] {
  const monthsWithData = [...new Set(d.uploads.map(uploadMonth))].sort();
  const fallback = monthsWithData.length ? monthsBetween(`${d.inceptionMonth}-01`, `${monthsWithData[monthsWithData.length - 1]}-01`) : [];
  const classNames = Object.fromEntries(d.classes.map((c) => [c.id, c.class_name]));
  const consolidate = d.terms.consolidate_series?.value !== false && d.terms.consolidate_series?.value !== 'false';
  return d.classes.map((c) => {
    const off = d.officialAccounts[c.id];
    if (!off) return valueClass(c, d.uploads, d.items, d.marks, d.inceptionMonth, fallback, d.labels, classNames, undefined, d.rules, consolidate);
    const isOfficial = (u: UploadRow) => u.share_class_id === c.id && u.broker_account === off.account;
    const trackUploads = d.uploads.filter((u) => u.share_class_id !== c.id || (!isOfficial(u) && uploadMonth(u) < off.fromMonth));
    const officialUploads = d.uploads.filter((u) => u.share_class_id !== c.id || (isOfficial(u) && uploadMonth(u) >= off.fromMonth));
    const track = valueClass(c, trackUploads, d.items, d.marks, d.inceptionMonth, fallback.filter((m) => m < off.fromMonth), d.labels, classNames, undefined, d.rules, consolidate);
    const launchFallback = fallback.length ? monthsBetween(`${off.fromMonth}-01`, `${[fallback[fallback.length - 1], off.fromMonth].sort().pop()}-01`) : [off.fromMonth];
    const live = valueClass({ ...c, units: 0, startPrice: d.dealing.launchPrice }, officialUploads, d.items, d.marks, off.fromMonth, launchFallback, d.labels, classNames, d.dealing, d.rules, consolidate);
    return {
      classId: c.id,
      months: [...track.months.filter((m) => m.month < off.fromMonth), ...live.months],
      notes: [...new Set([...track.notes.map((n) => `Pre-launch track record: ${n}`), ...live.notes])],
    };
  });
}

export async function refreshMarketPrices(tenantId: string, fundId: string, valuations: ClassValuation[], d: FundData) {
  const needs = new Map<string, Set<string>>();
  valuations.forEach((v) => v.months.forEach((m) => m.holdings.forEach((h) => {
    if ((h.priceSource === 'trade' || h.priceSource === 'missing' || h.priceSource === 'broker_last') && isMarketPriceable(h.assetCategory)) {
      if (!needs.has(h.symbol)) needs.set(h.symbol, new Set());
      needs.get(h.symbol)!.add(m.date);
    }
  })));
  d.uploads.forEach((u) => u.statement_data.opening?.positions.forEach((p) => {
    if (isMarketPriceable(p.assetCategory)) {
      if (!needs.has(p.symbol)) needs.set(p.symbol, new Set());
      needs.get(p.symbol)!.add(u.statement_data.opening!.as_of);
    }
  }));
  const symbolCcy = new Map<string, string>();
  d.items.forEach((i) => { if (i.currency) symbolCcy.set(i.instrument, i.currency); });
  valuations.forEach((v) => v.months.forEach((m) => m.holdings.forEach((h) => symbolCcy.set(h.symbol, h.currency))));

  const fxNeeds = new Map<string, Set<string>>();
  const haveFx = new Set(d.marks.filter((m) => m.symbol.startsWith('FX:')).map((m) => markKey(m.symbol, m.price_date)));
  const currencies = new Set<string>([
    ...symbolCcy.values(),
    ...d.uploads.flatMap((u) => (u.statement_data.cash_events ?? []).map((e) => e.currency || 'USD')),
  ]);
  currencies.delete('USD');
  valuations.forEach((v) => v.months.forEach((m) => currencies.forEach((ccy) => {
    if (haveFx.has(markKey(fxKey(ccy), m.date))) return;
    if (!fxNeeds.has(ccy)) fxNeeds.set(ccy, new Set());
    fxNeeds.get(ccy)!.add(m.date);
  })));
  if (!needs.size && !fxNeeds.size) return { updated: 0, failed: [] as string[], reasons: {} as Record<string, string> };

  const items = [...needs.keys()].map((symbol) => ({ symbol, currency: symbolCcy.get(symbol) ?? guessCurrency(symbol) }));
  const dates = [...new Set([...needs.values(), ...fxNeeds.values()].flatMap((s) => [...s]))];
  const data = { prices: {} as Record<string, Record<string, number>>, rates: {} as Record<string, Record<string, number>>, errors: {} as Record<string, string> };
  const batches: Array<{ items: typeof items; fx: string[] }> = [];
  for (let i = 0; i < items.length; i += 15) batches.push({ items: items.slice(i, i + 15), fx: [] });
  if (fxNeeds.size) batches.push({ items: [], fx: [...fxNeeds.keys()] });
  let reached = 0;
  for (const b of batches) {
    let res: { prices?: unknown; rates?: unknown; errors?: unknown } | null = null;
    for (let attempt = 0; attempt < 3 && !res; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      const { data: out, error } = await supabase.functions.invoke('market-prices', { body: { items: b.items, fx: b.fx, dates } });
      if (!error && out && typeof out.prices === 'object') res = out;
    }
    if (!res) {
      b.items.forEach((it) => { data.errors[it.symbol] = 'price service did not respond'; });
      continue;
    }
    reached++;
    Object.assign(data.prices, res.prices ?? {});
    Object.assign(data.rates, res.rates ?? {});
    Object.assign(data.errors, res.errors ?? {});
  }
  if (!reached) throw new Error('The price service could not be reached.');

  const manualKeys = new Set(d.marks.filter((m) => m.source === 'manual').map((m) => markKey(m.symbol, m.price_date)));
  const rows: Array<Record<string, unknown>> = [];
  Object.entries((data.rates ?? {}) as Record<string, Record<string, number>>).forEach(([ccy, byDate]) => {
    Object.entries(byDate).forEach(([price_date, price]) => {
      if (!fxNeeds.get(ccy)?.has(price_date)) return;
      if (typeof price === 'number' && price > 0) rows.push({ tenant_id: tenantId, fund_id: fundId, symbol: fxKey(ccy), price_date, price, source: 'market', updated_at: new Date().toISOString() });
    });
  });
  Object.entries(data.prices as Record<string, Record<string, number>>).forEach(([symbol, byDate]) => {
    Object.entries(byDate).forEach(([price_date, price]) => {
      if (!needs.get(symbol)?.has(price_date) || manualKeys.has(markKey(symbol, price_date))) return;
      if (typeof price === 'number' && price > 0) rows.push({ tenant_id: tenantId, fund_id: fundId, symbol, price_date, price, source: 'market', updated_at: new Date().toISOString() });
    });
  });
  if (rows.length) {
    const { error: upErr } = await supabase.from('fund_price_marks').upsert(rows, { onConflict: 'fund_id,symbol,price_date' });
    if (upErr) throw new Error(upErr.message);
  }
  const failed = Object.keys(data.errors).filter((k) => !k.startsWith('FX:'));
  return { updated: rows.length, failed, reasons: data.errors };
}

export async function setMovementLabel(tenantId: string, fundId: string, classId: string | null, key: string, label: MovementLabel, userId: string) {
  const { error } = await supabase.from('fund_movement_labels').upsert(
    { tenant_id: tenantId, fund_id: fundId, share_class_id: classId, movement_key: key, label, set_by: userId, updated_at: new Date().toISOString() },
    { onConflict: 'fund_id,movement_key' },
  );
  if (error) throw new Error(error.message);
}

export interface SaveDraftResult { saved: number; skippedApproved: number }

export async function saveDrafts(fundId: string, userId: string, valuations: ClassValuation[]): Promise<SaveDraftResult> {
  let saved = 0;
  let skippedApproved = 0;
  const latest = new Map<string, { id: string; status: string; calculation_data: unknown; nav_per_share: number; net_asset_value: number; total_shares: number }>();
  (await fetchAll(() => supabase.from('nav_calculations')
    .select('id, share_class_id, nav_date, status, calculation_data, nav_per_share, net_asset_value, total_shares').eq('fund_id', fundId)
    .order('version', { ascending: false }).order('id')))
    .forEach((r) => { const k = `${r.share_class_id}|${r.nav_date}`; if (!latest.has(k)) latest.set(k, r); });
  for (const v of valuations) {
    for (const m of v.months) {
      const existing = latest.get(`${v.classId}|${m.date}`);
      if (existing?.status === 'approved') { skippedApproved++; continue; }
      const signature = JSON.stringify([m.unitPrice, m.units, m.cash, m.accountValue, m.unexplained, m.final, m.finalReasons, v.notes.length, m.movements.map((x) => [x.key, x.label]), m.holdings.map((h) => [h.symbol, h.quantity, h.price, h.priceSource, h.marketValue]), m.dealt, m.uninvestedCash, m.redemptionsPayable, m.manual, m.chargesPayable, m.series]);
      const prior = existing?.calculation_data as { signature?: string; previous?: unknown } | null;
      if (existing && prior?.signature === signature) continue;
      const previous = existing && Math.abs(Number(existing.nav_per_share) - m.unitPrice) > 1e-6
        ? { unit_price: Number(existing.nav_per_share), class_value: Number(existing.net_asset_value), units: Number(existing.total_shares), replaced_at: new Date().toISOString() }
        : prior?.previous ?? null;
      const record = {
        fund_id: fundId,
        share_class_id: v.classId,
        nav_date: m.date,
        status: 'draft',
        total_assets: m.classNav,
        total_liabilities: 0,
        net_asset_value: m.classNav,
        total_shares: m.units,
        nav_per_share: m.unitPrice,
        total_fees: m.fees,
        calculated_by: userId,
        calculation_method: 'broker_statement',
        notes: v.notes.join('\n') || null,
        calculation_data: {
          month: m.month, month_return: m.monthReturn, opening_value: m.openingValue, flows: m.flows, cash: m.cash,
          holdings_value: m.holdingsValue, account_value: m.accountValue, computed_value: m.computedValue,
          broker_value: m.brokerValue, income: m.income, fees: m.fees, trade_count: m.tradeCount, missing_prices: m.missingPrices,
          internal_flows: m.internalFlows, missing_fx: m.missingFx, signature, previous,
          units_start: m.unitsStart, units_issued: m.unitsIssued, units_redeemed: m.unitsRedeemed,
          charges: m.charges, dividends: m.dividends, interest: m.interest, investment_gain: m.investmentGain,
          unexplained: m.unexplained, movements: m.movements, series: m.series,
          final: m.final, final_reasons: m.finalReasons, change_in_nav: m.changeInNav,
          track_record: m.trackRecord, uninvested_cash: m.uninvestedCash, redemptions_payable: m.redemptionsPayable, dealt: m.dealt,
          manual_charges: m.manual, charges_payable: m.chargesPayable, manual_paid: m.manualPaid,
        },
      };
      let navId = existing?.id as string | undefined;
      if (navId) {
        const { error } = await supabase.from('nav_calculations').update(record).eq('id', navId);
        if (error) throw new Error(error.message);
        const { error: dErr } = await supabase.from('nav_calculation_details').delete().eq('nav_calculation_id', navId);
        if (dErr) throw new Error(dErr.message);
      } else {
        const { data: ins, error } = await supabase.from('nav_calculations').insert({ ...record, version: 1 }).select('id').maybeSingle();
        if (error || !ins) throw new Error(error?.message || 'Could not save the month');
        navId = ins.id;
      }
      const details = [
        { nav_calculation_id: navId, line_type: 'asset', category: 'cash', description: 'Cash', amount: m.cash, currency: 'USD', base_currency_amount: m.cash, source: 'broker_statement', sort_order: 0, metadata: {} },
        ...m.holdings.map((h, i) => ({
          nav_calculation_id: navId, line_type: 'position', category: h.assetCategory || 'Stocks', description: h.symbol,
          quantity: h.quantity, unit_price: h.price, amount: h.marketValue, currency: 'USD', base_currency_amount: h.marketValue,
          source: h.priceSource, sort_order: i + 1, metadata: { multiplier: h.multiplier, local_currency: h.currency, fx_rate: h.fxRate },
        })),
      ];
      const { error: detErr } = await supabase.from('nav_calculation_details').insert(details);
      if (detErr) throw new Error(detErr.message);
      saved++;
    }
  }
  return { saved, skippedApproved };
}

export interface ApprovalEvidence { status: 'matched' | 'within_tolerance' | 'not_matched'; difference: number; reason: string }

export async function approveClassMonth(fundId: string, classId: string, date: string, userId: string, evidence: ApprovalEvidence) {
  const { data: rows, error: rErr } = await supabase.from('nav_calculations')
    .select('id, calculation_data').eq('fund_id', fundId).eq('share_class_id', classId).eq('nav_date', date).in('status', ['draft', 'pending_approval']);
  if (rErr) throw new Error(rErr.message);
  const reason = evidence.reason.trim();
  for (const row of rows ?? []) {
    const cd: Record<string, unknown> = { ...((row.calculation_data as Record<string, unknown>) ?? {}), reconciliation_status: evidence.status };
    if (evidence.status !== 'not_matched') cd.reconciliation_difference = evidence.difference;
    else delete cd.reconciliation_difference;
    if (reason) cd.approval_reason = reason;
    const { error } = await supabase.from('nav_calculations')
      .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString(), calculation_data: cd })
      .eq('id', row.id);
    if (error) throw new Error(error.message);
  }
  return rows?.length ?? 0;
}

