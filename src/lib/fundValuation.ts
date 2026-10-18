import { supabase } from './supabase';
import { monthEnd, monthsBetween } from './statementParser';
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

export type PriceSource = 'manual' | 'statement' | 'market' | 'trade' | 'missing';

export interface HoldingValue {
  symbol: string;
  quantity: number;
  multiplier: number;
  assetCategory: string;
  price: number;
  priceSource: PriceSource;
  marketValue: number;
}

export interface MonthResult {
  month: string;
  date: string;
  openingValue: number;
  flows: number;
  cash: number;
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
}

export interface ClassValuation {
  classId: string;
  months: MonthResult[];
  notes: string[];
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const markKey = (symbol: string, date: string) => `${symbol}|${date}`;

export function isMarketPriceable(assetCategory: string) {
  return !/option|future|bond|fop|warrant|cfd/i.test(assetCategory || '');
}

export function valueClass(
  cls: ClassInfo,
  uploads: UploadRow[],
  items: ItemRow[],
  marks: PriceMark[],
  inceptionMonth: string,
  fallbackMonths: string[],
): ClassValuation {
  const notes: string[] = [];
  const own = uploads.filter((u) => u.share_class_id === cls.id);
  const capital = cls.units * cls.startPrice;

  if (!own.length) {
    const months = fallbackMonths.filter((m) => m >= inceptionMonth);
    if (months.length) notes.push('No broker activity yet. Held as cash at the starting unit price.');
    return {
      classId: cls.id,
      notes,
      months: months.map((m) => ({
        month: m, date: monthEnd(+m.slice(0, 4), +m.slice(5, 7)), openingValue: capital, flows: 0, cash: capital,
        holdings: [], holdingsValue: 0, accountValue: capital, computedValue: capital, brokerValue: null, income: 0, fees: 0,
        tradeCount: 0, monthReturn: 0, unitPrice: cls.startPrice, units: cls.units, classNav: round(capital), missingPrices: [],
      })),
    };
  }

  const byMonth = new Map<string, UploadRow>();
  own.forEach((u) => byMonth.set(`${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`, u));
  const keys = [...byMonth.keys()].sort();
  const allMonths = monthsBetween(`${keys[0]}-01`, `${keys[keys.length - 1]}-01`);

  const manual = new Map<string, number>();
  const market = new Map<string, number>();
  marks.forEach((m) => (m.source === 'manual' ? manual : market).set(markKey(m.symbol, m.price_date), Number(m.price)));

  const first = byMonth.get(keys[0])!.statement_data;
  const opening = first.opening;
  const positions = new Map<string, { quantity: number; multiplier: number; assetCategory: string }>();
  opening?.positions.forEach((p) => positions.set(p.symbol, { quantity: p.quantity, multiplier: p.multiplier || 1, assetCategory: p.assetCategory }));
  const lastTrade = new Map<string, number>();

  const priceFor = (symbol: string, date: string, statementPrices: Map<string, number> | null): [number, PriceSource] => {
    const k = markKey(symbol, date);
    if (manual.has(k)) return [manual.get(k)!, 'manual'];
    if (statementPrices?.has(symbol)) return [statementPrices.get(symbol)!, 'statement'];
    if (market.has(k)) return [market.get(k)!, 'market'];
    if (lastTrade.has(symbol)) return [lastTrade.get(symbol)!, 'trade'];
    return [0, 'missing'];
  };

  const valueHoldings = (date: string, statementPrices: Map<string, number> | null) => {
    const holdings: HoldingValue[] = [];
    positions.forEach((p, symbol) => {
      if (Math.abs(p.quantity) < 1e-9) return;
      const [price, priceSource] = priceFor(symbol, date, statementPrices);
      holdings.push({ symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory, price, priceSource, marketValue: round(p.quantity * p.multiplier * price) });
    });
    holdings.sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));
    return holdings;
  };

  const hasBrokerCash = opening?.cash != null || opening?.nav != null;
  let cash = opening?.cash ?? (hasBrokerCash ? 0 : capital);
  if (!hasBrokerCash) notes.push('The file had no cash balance, so the class starting capital was used as opening cash.');

  let prevValue: number;
  if (opening?.nav != null) {
    prevValue = opening.nav;
  } else {
    const oh = valueHoldings(opening?.as_of ?? `${keys[0]}-01`, null);
    prevValue = cash + oh.reduce((s, h) => s + h.marketValue, 0);
  }

  let unitPrice = cls.startPrice;
  const results: MonthResult[] = [];

  allMonths.forEach((mk) => {
    const up = byMonth.get(mk);
    const data = up?.statement_data;
    const monthItems = up ? items.filter((i) => i.upload_id === up.id).sort((a, b) => a.trade_date.localeCompare(b.trade_date)) : [];
    let fees = 0;
    monthItems.forEach((t) => {
      const mult = Number(t.multiplier) || 1;
      const signed = t.direction === 'buy' ? Number(t.quantity) : -Number(t.quantity);
      const proceeds = t.proceeds != null ? Number(t.proceeds) : -signed * Number(t.price) * mult;
      cash += proceeds - Number(t.fees);
      fees += Number(t.fees);
      const cur = positions.get(t.instrument) ?? { quantity: 0, multiplier: mult, assetCategory: t.asset_category || '' };
      cur.quantity += signed;
      cur.multiplier = mult;
      positions.set(t.instrument, cur);
      if (Number(t.price) > 0) lastTrade.set(t.instrument, Number(t.price));
    });
    const events = data?.cash_events ?? [];
    let flows = 0;
    let income = 0;
    events.forEach((e) => {
      cash += e.amount;
      if (e.type === 'deposit' || e.type === 'withdrawal') flows += e.amount;
      else if (e.type === 'fee') fees += -e.amount;
      else income += e.amount;
    });

    const closing = data?.closing;
    const fullMonthEnd = monthEnd(+mk.slice(0, 4), +mk.slice(5, 7));
    const date = closing && closing.as_of < fullMonthEnd ? closing.as_of : fullMonthEnd;
    let statementPrices: Map<string, number> | null = null;
    if (closing) {
      statementPrices = new Map(closing.positions.filter((p) => p.price).map((p) => [p.symbol, p.price!]));
      positions.forEach((p, s) => {
        if (closing.positions.some((c) => c.symbol === s) || Math.abs(p.quantity) < 1e-6) return;
        notes.push(`${s}: rebuilt quantity ${p.quantity} is not held at the broker at ${closing.as_of}; treated as closed.`);
        p.quantity = 0;
      });
      closing.positions.forEach((p) => {
        const cur = positions.get(p.symbol);
        if (!cur || Math.abs(cur.quantity - p.quantity) > 1e-6) notes.push(`${p.symbol}: rebuilt quantity ${cur?.quantity ?? 0} differs from broker ${p.quantity} at ${closing.as_of}; broker figure used.`);
        positions.set(p.symbol, { quantity: p.quantity, multiplier: p.multiplier || 1, assetCategory: p.assetCategory });
      });
      if (closing.cash != null) {
        if (Math.abs(closing.cash - cash) > 1) notes.push(`Cash rebuilt from activity (${round(cash)}) differs from broker ending cash (${round(closing.cash)}); broker figure used.`);
        cash = closing.cash;
      }
    }

    const holdings = valueHoldings(date, statementPrices);
    const holdingsValue = round(holdings.reduce((s, h) => s + h.marketValue, 0));
    const computedValue = round(cash + holdingsValue);
    const brokerValue = closing?.nav ?? null;
    const accountValue = brokerValue ?? computedValue;
    const denom = prevValue + flows;
    const monthReturn = denom > 0.01 ? (accountValue - prevValue - flows) / denom : 0;

    if (mk >= inceptionMonth) {
      unitPrice = unitPrice * (1 + monthReturn);
      results.push({
        month: mk, date, openingValue: round(prevValue), flows: round(flows), cash: round(cash), holdings, holdingsValue,
        accountValue: round(accountValue), computedValue, brokerValue, income: round(income), fees: round(fees),
        tradeCount: monthItems.length, monthReturn, unitPrice: round(unitPrice, 6), units: cls.units,
        classNav: round(unitPrice * cls.units), missingPrices: holdings.filter((h) => h.priceSource === 'missing').map((h) => h.symbol),
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
  inceptionMonth: string;
}

export async function loadFundData(fundId: string): Promise<FundData> {
  const { data: fund, error: fErr } = await supabase.from('funds').select('id, inception_date').eq('id', fundId).maybeSingle();
  if (fErr || !fund) throw new Error(fErr?.message || 'Fund not found');
  const { data: sc, error: scErr } = await supabase.from('share_classes').select('id, class_code, class_name').eq('fund_id', fundId).order('class_code');
  if (scErr) throw new Error(scErr.message);
  const { data: accts, error: aErr } = await supabase.from('capital_accounts').select('share_class_id, shares_owned').eq('fund_id', fundId);
  if (aErr) throw new Error(aErr.message);
  const { data: openings } = await supabase.from('nav_calculations').select('share_class_id, nav_per_share, nav_date').eq('fund_id', fundId).eq('calculation_method', 'opening');
  const { data: uploads, error: uErr } = await supabase.from('trade_uploads')
    .select('id, share_class_id, upload_year, upload_month, statement_data')
    .eq('fund_id', fundId).eq('status', 'confirmed').not('share_class_id', 'is', null);
  if (uErr) throw new Error(uErr.message);
  const ids = (uploads ?? []).map((u) => u.id);
  let items: ItemRow[] = [];
  if (ids.length) {
    const { data: it, error: iErr } = await supabase.from('trade_upload_items')
      .select('id, upload_id, trade_date, instrument, direction, quantity, price, fees, proceeds, multiplier, asset_category')
      .in('upload_id', ids);
    if (iErr) throw new Error(iErr.message);
    items = (it ?? []) as ItemRow[];
  }
  const { data: marks, error: mErr } = await supabase.from('fund_price_marks').select('symbol, price_date, price, source').eq('fund_id', fundId);
  if (mErr) throw new Error(mErr.message);

  const classes: ClassInfo[] = (sc ?? []).map((c) => ({
    id: c.id,
    class_code: c.class_code,
    class_name: c.class_name,
    units: (accts ?? []).filter((a) => a.share_class_id === c.id).reduce((s, a) => s + Number(a.shares_owned || 0), 0),
    startPrice: Number(openings?.find((o) => o.share_class_id === c.id)?.nav_per_share ?? 1),
  }));
  const inception = fund.inception_date ?? `${new Date().getFullYear()}-01-01`;
  return { classes, uploads: (uploads ?? []) as UploadRow[], items, marks: (marks ?? []) as PriceMark[], inceptionMonth: inception.slice(0, 7) };
}

export function valueFund(d: FundData): ClassValuation[] {
  const monthsWithData = [...new Set(d.uploads.map((u) => `${u.upload_year}-${String(u.upload_month).padStart(2, '0')}`))].sort();
  const fallback = monthsWithData.length ? monthsBetween(`${d.inceptionMonth}-01`, `${monthsWithData[monthsWithData.length - 1]}-01`) : [];
  return d.classes.map((c) => valueClass(c, d.uploads, d.items, d.marks, d.inceptionMonth, fallback));
}

export async function refreshMarketPrices(tenantId: string, fundId: string, valuations: ClassValuation[], d: FundData) {
  const needs = new Map<string, Set<string>>();
  valuations.forEach((v) => v.months.forEach((m) => m.holdings.forEach((h) => {
    if ((h.priceSource === 'trade' || h.priceSource === 'missing') && isMarketPriceable(h.assetCategory)) {
      if (!needs.has(h.symbol)) needs.set(h.symbol, new Set());
      needs.get(h.symbol)!.add(m.date);
    }
  })));
  d.uploads.forEach((u) => u.statement_data.opening?.positions.forEach((p) => {
    if (u.statement_data.opening?.nav == null && isMarketPriceable(p.assetCategory)) {
      if (!needs.has(p.symbol)) needs.set(p.symbol, new Set());
      needs.get(p.symbol)!.add(u.statement_data.opening!.as_of);
    }
  }));
  if (!needs.size) return { updated: 0, failed: [] as string[] };

  const symbols = [...needs.keys()];
  const dates = [...new Set([...needs.values()].flatMap((s) => [...s]))];
  const { data, error } = await supabase.functions.invoke('market-prices', { body: { symbols, dates } });
  if (error) throw new Error('The price service could not be reached.');
  if (!data || typeof data.prices !== 'object') throw new Error('The price service returned an unexpected answer.');

  const manualKeys = new Set(d.marks.filter((m) => m.source === 'manual').map((m) => markKey(m.symbol, m.price_date)));
  const rows: Array<Record<string, unknown>> = [];
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
  const failed = Object.keys((data.errors ?? {}) as Record<string, string>);
  return { updated: rows.length, failed };
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

export interface SaveDraftResult { saved: number; skippedApproved: number }

export async function saveDrafts(fundId: string, userId: string, valuations: ClassValuation[]): Promise<SaveDraftResult> {
  let saved = 0;
  let skippedApproved = 0;
  for (const v of valuations) {
    for (const m of v.months) {
      const { data: existing, error: exErr } = await supabase.from('nav_calculations')
        .select('id, status').eq('fund_id', fundId).eq('share_class_id', v.classId).eq('nav_date', m.date)
        .order('version', { ascending: false }).limit(1).maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing?.status === 'approved') { skippedApproved++; continue; }
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
        total_fees: 0,
        calculated_by: userId,
        calculation_method: 'broker_statement',
        notes: v.notes.join('\n') || null,
        calculation_data: {
          month: m.month, month_return: m.monthReturn, opening_value: m.openingValue, flows: m.flows, cash: m.cash,
          holdings_value: m.holdingsValue, account_value: m.accountValue, computed_value: m.computedValue,
          broker_value: m.brokerValue, income: m.income, fees: m.fees, trade_count: m.tradeCount, missing_prices: m.missingPrices,
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
          source: h.priceSource, sort_order: i + 1, metadata: { multiplier: h.multiplier },
        })),
      ];
      const { error: detErr } = await supabase.from('nav_calculation_details').insert(details);
      if (detErr) throw new Error(detErr.message);
      saved++;
    }
  }
  return { saved, skippedApproved };
}

export async function approveMonth(fundId: string, date: string, userId: string) {
  const { data, error } = await supabase.from('nav_calculations')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('fund_id', fundId).eq('nav_date', date).in('status', ['draft', 'pending_approval']).select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
