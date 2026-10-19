import { supabase } from './supabase';
import { monthEnd, monthsBetween, type CashEvent, type ChangeInNav } from './statementParser';
import type { StatementMonthData } from './statementImport';

export interface UploadRow {
  id: string;
  share_class_id: string;
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

export interface Charges {
  management: number;
  performance: number;
  subadvisor: number;
  adjustments: number;
  trading: number;
  other: number;
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
  missingPrices: string[];
  unofficialPrices: string[];
  missingFx: string[];
  unexplained: number;
  tradeFx: Record<string, number>;
  final: boolean;
  finalReasons: string[];
  changeInNav: ChangeInNav | null;
}

export interface ClassValuation {
  classId: string;
  months: MonthResult[];
  notes: string[];
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
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

const NO_CHARGES: Charges = { management: 0, performance: 0, subadvisor: 0, adjustments: 0, trading: 0, other: 0 };

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
        month: m, date: monthEnd(+m.slice(0, 4), +m.slice(5, 7)), openingValue: capital, flows: 0, internalFlows: 0, cash: capital, unitemisedCash: 0,
        movements: [], charges: { ...NO_CHARGES }, dividends: 0, interest: 0, investmentGain: 0, unitsStart: cls.units, unitsIssued: 0, unitsRedeemed: 0,
        holdings: [], holdingsValue: 0, accountValue: capital, computedValue: capital, brokerValue: null, income: 0, fees: 0,
        tradeCount: 0, monthReturn: 0, unitPrice: cls.startPrice, units: cls.units, classNav: round(capital), missingPrices: [], unofficialPrices: [], missingFx: [], unexplained: 0, tradeFx: {},
        final: false, finalReasons: ['No IBKR account activity for this class yet.'], changeInNav: null,
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
    return series.reduce((best, cur) => (Math.abs(Date.parse(cur[0]) - target) < Math.abs(Date.parse(best[0]) - target) ? cur : best))[1];
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

  const ibkrDaily = new Map<string, Map<string, number>>();
  own.forEach((u) => {
    const p = u.statement_data.ibkr_prices;
    if (p) ibkrDaily.set(p.as_of.slice(0, 7), new Map(Object.entries(p.prices)));
  });

  const priceFor = (symbol: string, assetCategory: string, date: string, statementPrices: Map<string, number> | null): [number, PriceSource] => {
    const k = markKey(symbol, date);
    if (statementPrices?.has(symbol)) return [statementPrices.get(symbol)!, 'statement'];
    const daily = ibkrDaily.get(date.slice(0, 7));
    if (daily?.has(symbol)) return [daily.get(symbol)!, 'ibkr'];
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
      const [price, priceSource] = priceFor(symbol, p.assetCategory, date, statementPrices);
      const currency = ccyOf(symbol);
      const fxRate = fxFor(currency, date, stmtRates);
      holdings.push({
        symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory, currency, fxRate,
        price, priceSource, marketValue: round(p.quantity * p.multiplier * price * fxRate),
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
  if (opening?.nav != null && Math.abs(units * unitPrice - opening.nav) > 1) {
    notes.push(`The class started with ${units.toLocaleString('en-US')} units at ${unitPrice}, but the broker's opening value is ${round(opening.nav).toLocaleString('en-US')} USD. Units were set to match the broker so every unit starts at ${unitPrice}.`);
    units = opening.nav / unitPrice;
  }
  const results: MonthResult[] = [];

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
      const cur = positions.get(t.instrument) ?? { quantity: 0, multiplier: mult, assetCategory };
      cur.quantity += signed;
      cur.multiplier = mult;
      positions.set(t.instrument, cur);
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
      const reversed = e.type === 'fee' && e.amount > 0 ? reversedCharge(e) : undefined;
      if (reversed) {
        const cat = chargeCategory(reversed.description);
        fees -= amount;
        charges[reversed.date.slice(0, 7) === mk ? cat : 'adjustments'] -= amount;
        movements.push({
          key: `${cls.id}:fee:${e.date}:${e.amount.toFixed(2)}`, date: e.date, kind: 'cash', amount: round(amount), suggested: 'fee', label: 'fee', confirmed: true,
          reason: `Fee credit: reverses the ${usdText(-reversed.amount)} "${reversed.description}" charge on ${reversed.date}, so only the net fee counts.`,
          description: `${e.description} (${e.amount.toLocaleString('en-US')} ${e.currency || 'USD'})`,
        });
        return;
      }
      const feeCredit = e.type === 'fee' && e.amount > 0;
      if (e.type === 'deposit' || e.type === 'withdrawal' || feeCredit) {
        const key = feeCredit ? `${cls.id}:fee:${e.date}:${e.amount.toFixed(2)}` : `${cls.id}:cash:${e.date}:${e.currency || 'USD'}:${e.amount.toFixed(2)}`;
        const peer = feeCredit ? undefined : cashMirrorOf(e);
        const auto = !feeCredit && (!!peer || !!e.internal || paired.has(i));
        const suggested: MovementLabel = feeCredit ? 'fee' : auto ? 'internal' : e.amount < 0 && /disburse/i.test(e.description) ? 'fee' : 'investor';
        const why = feeCredit
          ? `a fee credit of ${usdText(e.amount)} with no matching earlier charge on file. Is it a fee refund, or money paid in?`
          : peer
            ? `Class switch: matches the ${usdText(peer.amount)} ${peer.amount > 0 ? 'deposit into' : 'withdrawal from'} ${nameOf(peer.classId)} on ${peer.date}.`
            : paired.has(i)
              ? 'Cancelled out by an equal and opposite entry in the same account.'
              : e.internal
                ? 'IBKR marks this as an internal transfer between our own accounts.'
                : e.amount < 0 && /disburse/i.test(e.description)
                  ? 'a payment out of the account, which looks like an adviser fee payment.'
                  : `no matching entry in another class account, so it looks like investor money ${e.amount > 0 ? 'in' : 'out'}.`;
        const { label, confirmed, reason } = classify(key, suggested, auto, why);
        movements.push({ key, date: e.date, kind: 'cash', amount: round(amount), suggested, label, confirmed, reason, description: `${e.description || (e.amount < 0 ? 'Withdrawal' : 'Deposit')} (${e.amount.toLocaleString('en-US')} ${e.currency || 'USD'})` });
        if (label === 'fee') {
          fees += -amount;
          charges[amount < 0 ? 'subadvisor' : 'adjustments'] += -amount;
          return;
        }
        flows += amount;
        if (label === 'internal') internalFlows += amount;
      } else if (e.type === 'fee') {
        fees += -amount;
        charges[chargeCategory(e.description)] += -amount;
      } else {
        income += amount;
        if (e.type === 'interest') interest += amount;
        else dividends += amount;
      }
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
      unexplained += impliedCash - cash;
      cash = impliedCash;
      unitemisedCash = closing.cash != null ? impliedCash - closing.cash : 0;
    }
    const brokerValue = closing?.nav ?? null;
    const accountValue = brokerValue ?? computedValue;
    const denom = prevValue + flows;
    const monthReturn = denom > 0.01 ? (accountValue - prevValue - flows) / denom : 0;

    if (mk >= inceptionMonth) {
      // Units for money in or out are dealt at the price the month opened at, which keeps units x price equal to the account value.
      const unitsStart = units;
      const startPrice = unitPrice;
      const dailyNav = data?.daily_nav ?? {};
      const navDays = Object.keys(dailyNav).sort();
      const dealt = movements.filter((x) => x.label !== 'fee');
      const unpricedDays: string[] = [];
      let price = unitPrice;
      let valueAfter = prevValue;
      let issued = 0;
      let redeemed = 0;
      // Units for each day's money in or out are dealt at that day's IBKR close, excluding the day's own flows.
      [...new Set(dealt.map((x) => x.date))].sort().forEach((d) => {
        const dayMoves = dealt.filter((x) => x.date === d);
        const dayFlow = dayMoves.reduce((s, x) => s + x.amount, 0);
        const prior = navDays.filter((x) => x < d).pop();
        const navBefore = dailyNav[d] != null ? dailyNav[d] - dayFlow : prior ? dailyNav[prior] : null;
        if (navBefore != null && valueAfter > 0.01) price *= navBefore / valueAfter;
        else if (valueAfter > 0.01) unpricedDays.push(d);
        dayMoves.forEach((x) => {
          x.dealPrice = round(price, 6);
          x.units = round(x.amount / price, 4);
          if (x.amount > 0) issued += x.amount / price;
          else redeemed -= x.amount / price;
        });
        valueAfter = (navBefore != null && valueAfter > 0.01 ? navBefore : valueAfter) + dayFlow;
      });
      units = unitsStart + issued - redeemed;
      unitPrice = valueAfter > 0.01 ? price * accountValue / valueAfter : price;
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
      if (unpricedDays.length) finalReasons.push(`No IBKR daily value for ${unpricedDays.join(', ')}, so units moved that day could not be priced at the day's close. Make sure the IBKR report's NAV section is daily.`);
      results.push({
        month: mk, date, openingValue: round(prevValue), flows: round(flows), internalFlows: round(internalFlows), cash: round(cash), unitemisedCash: round(unitemisedCash), holdings, holdingsValue,
        movements, charges, dividends: round(dividends), interest: round(interest),
        investmentGain: round(accountValue - prevValue - flows - income + fees),
        unitsStart: round(unitsStart, 4), unitsIssued: round(issued, 4), unitsRedeemed: round(redeemed, 4),
        accountValue: round(accountValue), computedValue, brokerValue, income: round(income), fees: round(fees),
        tradeCount: monthItems.length, monthReturn: startPrice > 0 ? unitPrice / startPrice - 1 : monthReturn, unitPrice: round(unitPrice, 6), units: round(units, 4),
        classNav: round(unitPrice * units), missingPrices: holdings.filter((h) => h.priceSource === 'missing').map((h) => h.symbol),
        unofficialPrices: unofficial,
        missingFx: [...missingFx], unexplained: round(unexplained), tradeFx,
        final: finalReasons.length === 0, finalReasons, changeInNav,
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
}

export async function loadFundData(fundId: string): Promise<FundData> {
  const { data: fund, error: fErr } = await supabase.from('funds').select('id, inception_date').eq('id', fundId).maybeSingle();
  if (fErr || !fund) throw new Error(fErr?.message || 'Fund not found');
  const { data: sc, error: scErr } = await supabase.from('share_classes').select('id, class_code, class_name').eq('fund_id', fundId).order('class_code');
  if (scErr) throw new Error(scErr.message);
  const { data: accts, error: aErr } = await supabase.from('capital_accounts').select('share_class_id, shares_owned').eq('fund_id', fundId);
  if (aErr) throw new Error(aErr.message);
  const { data: openings } = await supabase.from('nav_calculations').select('share_class_id, nav_per_share, total_shares, nav_date').eq('fund_id', fundId).eq('calculation_method', 'opening');
  const { data: labelRows, error: lErr } = await supabase.from('fund_movement_labels').select('movement_key, label').eq('fund_id', fundId);
  if (lErr) throw new Error(lErr.message);
  const { data: uploads, error: uErr } = await supabase.from('trade_uploads')
    .select('id, share_class_id, upload_year, upload_month, statement_data')
    .eq('fund_id', fundId).eq('status', 'confirmed').not('share_class_id', 'is', null);
  if (uErr) throw new Error(uErr.message);
  const ids = (uploads ?? []).map((u) => u.id);
  let items: ItemRow[] = [];
  if (ids.length) {
    const { data: it, error: iErr } = await supabase.from('trade_upload_items')
      .select('id, upload_id, trade_date, instrument, direction, quantity, price, fees, proceeds, multiplier, asset_category, currency, notes')
      .in('upload_id', ids);
    if (iErr) throw new Error(iErr.message);
    items = (it ?? []) as ItemRow[];
  }
  const { data: marks, error: mErr } = await supabase.from('fund_price_marks').select('symbol, price_date, price, source').eq('fund_id', fundId);
  if (mErr) throw new Error(mErr.message);

  const classes: ClassInfo[] = (sc ?? []).map((c) => {
    const open = openings?.find((o) => o.share_class_id === c.id);
    return {
      id: c.id,
      class_code: c.class_code,
      class_name: c.class_name,
      units: open?.total_shares != null ? Number(open.total_shares) : (accts ?? []).filter((a) => a.share_class_id === c.id).reduce((s, a) => s + Number(a.shares_owned || 0), 0),
      startPrice: Number(open?.nav_per_share ?? 1),
    };
  });
  const inception = fund.inception_date ?? `${new Date().getFullYear()}-01-01`;
  const labels = Object.fromEntries((labelRows ?? []).map((l) => [l.movement_key, l.label as MovementLabel]));
  return { classes, uploads: (uploads ?? []) as UploadRow[], items, marks: (marks ?? []) as PriceMark[], labels, inceptionMonth: inception.slice(0, 7) };
}

export function valueFund(d: FundData): ClassValuation[] {
  const monthsWithData = [...new Set(d.uploads.map((u) => `${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`))].sort();
  const fallback = monthsWithData.length ? monthsBetween(`${d.inceptionMonth}-01`, `${monthsWithData[monthsWithData.length - 1]}-01`) : [];
  const classNames = Object.fromEntries(d.classes.map((c) => [c.id, c.class_name]));
  return d.classes.map((c) => valueClass(c, d.uploads, d.items, d.marks, d.inceptionMonth, fallback, d.labels, classNames));
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

export async function setManualPrice(tenantId: string, fundId: string, symbol: string, date: string, price: number | null) {
  if (price == null) {
    const { error } = await supabase.from('fund_price_marks').delete().eq('fund_id', fundId).eq('symbol', symbol).eq('price_date', date).eq('source', 'manual');
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('fund_price_marks').upsert(
    { tenant_id: tenantId, fund_id: fundId, symbol, price_date: date, price, source: 'manual', updated_at: new Date().toISOString() },
    { onConflict: 'fund_id,symbol,price_date' },
  );
  if (error) throw new Error(error.message);
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
  for (const v of valuations) {
    for (const m of v.months) {
      const { data: existing, error: exErr } = await supabase.from('nav_calculations')
        .select('id, status, calculation_data, nav_per_share, net_asset_value, total_shares').eq('fund_id', fundId).eq('share_class_id', v.classId).eq('nav_date', m.date)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing?.status === 'approved') { skippedApproved++; continue; }
      const signature = JSON.stringify([m.unitPrice, m.units, m.cash, m.accountValue, m.unexplained, m.final, m.finalReasons, v.notes.length, m.movements.map((x) => [x.key, x.label]), m.holdings.map((h) => [h.symbol, h.quantity, h.price, h.priceSource, h.marketValue])]);
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
          unexplained: m.unexplained, movements: m.movements,
          final: m.final, final_reasons: m.finalReasons, change_in_nav: m.changeInNav,
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

export async function approveClassMonth(fundId: string, classId: string, date: string, userId: string) {
  const { data, error } = await supabase.from('nav_calculations')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('fund_id', fundId).eq('share_class_id', classId).eq('nav_date', date).in('status', ['draft', 'pending_approval'])
    .eq('calculation_data->>final', 'true').select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
