import { supabase } from './supabase';
import { monthsBetween, type CashEvent, type ChangeInNav, type ParsedStatement, type ParsedTrade, type PositionRow } from './statementParser';

export interface PositionSnapshot {
  symbol: string;
  quantity: number;
  multiplier: number;
  assetCategory: string;
  currency?: string;
  price?: number;
}

export interface StatementMonthData {
  account: string;
  month: string;
  cash_events: CashEvent[];
  opening?: { as_of: string; cash: number | null; nav: number | null; positions: PositionSnapshot[] };
  closing?: { as_of: string; cash: number | null; nav: number | null; positions: PositionSnapshot[]; has_positions?: boolean; nav_breakdown?: Record<string, number>; cash_by_currency?: Record<string, number> };
  period: { start: string; end: string };
  fx_rates?: Record<string, number>;
  ibkr_prices?: { as_of: string; prices: Record<string, number>; dates?: Record<string, string> };
  change_in_nav?: ChangeInNav;
  daily_nav?: Record<string, number>;
}

export interface MonthlyBatch {
  account: string;
  shareClassId: string;
  year: number;
  month: number;
  trades: ParsedTrade[];
  data: StatementMonthData;
}

function dayBefore(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function snapshot(rows: PositionRow[]): PositionSnapshot[] {
  return rows.map((p) => ({ symbol: p.symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory, currency: p.currency, price: p.closePrice }));
}

function deriveOpening(trades: ParsedTrade[], closing: PositionRow[]): PositionSnapshot[] {
  const map = new Map<string, PositionSnapshot>();
  closing.forEach((p) => map.set(p.symbol, { symbol: p.symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory, currency: p.currency }));
  trades.forEach((t) => {
    const cur = map.get(t.symbol) ?? { symbol: t.symbol, quantity: 0, multiplier: t.multiplier, assetCategory: t.assetCategory, currency: t.currency };
    cur.quantity -= t.direction === 'buy' ? t.quantity : -t.quantity;
    map.set(t.symbol, cur);
  });
  return [...map.values()].filter((p) => Math.abs(p.quantity) > 1e-9);
}

function monthFxRates(st: ParsedStatement, mk: string): Record<string, number> {
  const rates: Record<string, number> = {};
  Object.keys(st.fxRatesByDate ?? {}).filter((d) => d.startsWith(mk)).sort()
    .forEach((d) => Object.assign(rates, st.fxRatesByDate![d]));
  return rates;
}

export function buildMonthlyBatches(st: ParsedStatement, accountToClass: Record<string, string>): MonthlyBatch[] {
  if (!st.periodStart || !st.periodEnd) return [];
  const start = st.periodStart;
  const end = st.periodEnd;
  const months = monthsBetween(start, end);
  const batches: MonthlyBatch[] = [];

  st.accounts.forEach((account) => {
    const shareClassId = accountToClass[account];
    if (!shareClassId) return;
    const trades = st.trades.filter((t) => t.account === account);
    const cash = st.cashEvents.filter((c) => c.account === account);
    const positions = st.positions.filter((p) => p.account === account);
    const summary = st.summaries[account] ?? { account };
    const hasPositionsSection = st.format === 'ibkr_activity' || st.format === 'ibkr_flex';
    const navDates = Object.keys(summary.navByDate ?? {}).sort();
    const priceDates = Object.keys(summary.pricesByDate ?? {}).sort();

    months.forEach((mk, i) => {
      const data: StatementMonthData = {
        account,
        month: mk,
        cash_events: cash.filter((c) => c.date.startsWith(mk)),
        period: { start, end },
      };
      if (i === 0) {
        data.opening = {
          as_of: dayBefore(start),
          cash: summary.startingCash ?? null,
          nav: summary.priorNav ?? null,
          positions: hasPositionsSection ? deriveOpening(trades, positions) : [],
        };
      }
      if (i === months.length - 1 && hasPositionsSection) {
        data.closing = {
          as_of: end,
          cash: summary.endingCash ?? null,
          nav: summary.currentNav ?? null,
          positions: snapshot(positions),
          ...(summary.navBreakdown ? { nav_breakdown: summary.navBreakdown } : {}),
          ...(summary.cashByCurrency ? { cash_by_currency: summary.cashByCurrency } : {}),
        };
        if (Object.keys(st.fxRates).length) data.fx_rates = st.fxRates;
      } else {
        const last = navDates.filter((d) => d.startsWith(mk)).pop();
        if (last) data.closing = { as_of: last, nav: summary.navByDate![last], cash: summary.cashByDate?.[last] ?? null, positions: [], has_positions: false };
      }
      const monthRates = monthFxRates(st, mk);
      if (Object.keys(monthRates).length) data.fx_rates = { ...(data.fx_rates ?? {}), ...monthRates };
      const monthPriceDays = priceDates.filter((d) => d.startsWith(mk));
      if (monthPriceDays.length) {
        const asOf = monthPriceDays[monthPriceDays.length - 1];
        const prices: Record<string, number> = {};
        const dates: Record<string, string> = {};
        monthPriceDays.forEach((d) => Object.entries(summary.pricesByDate![d]).forEach(([sym, px]) => { prices[sym] = px; dates[sym] = d; }));
        Object.keys(dates).forEach((sym) => { if (dates[sym] === asOf) delete dates[sym]; });
        data.ibkr_prices = { as_of: asOf, prices, ...(Object.keys(dates).length ? { dates } : {}) };
      }
      if (summary.changeInNav?.to.startsWith(mk)) data.change_in_nav = summary.changeInNav;
      const monthNavs = navDates.filter((d) => d.startsWith(mk));
      if (monthNavs.length) data.daily_nav = Object.fromEntries(monthNavs.map((d) => [d, summary.navByDate![d]]));
      batches.push({
        account,
        shareClassId,
        year: +mk.slice(0, 4),
        month: +mk.slice(5, 7),
        trades: trades.filter((t) => t.date.startsWith(mk)),
        data,
      });
    });
  });
  return batches;
}

const saveFail = (step: string, cause: unknown): never => {
  console.error(`statement save failed: ${step}`, cause);
  throw new Error('The statement could not be saved. Nothing was changed. Please try again.');
};

export async function storeSourceFile(tenantId: string, file: Blob, filename: string): Promise<string | null> {
  const safe = filename.replace(/[^\w.-]+/g, '_').slice(-120);
  const path = `${tenantId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from('broker-statements').upload(path, file, { upsert: false });
  if (error) { console.error('could not keep the original statement file', error); return null; }
  return path;
}

interface SaveArgs {
  tenantId: string;
  fundId: string;
  userId: string;
  filename: string;
  sourcePath?: string | null;
  statement: ParsedStatement;
  batches: MonthlyBatch[];
  accountToClass: Record<string, string>;
}

async function carryOver(fundId: string, b: MonthlyBatch, first: boolean) {
  const { data: prev } = await supabase.from('trade_uploads').select('statement_data')
    .eq('fund_id', fundId).eq('share_class_id', b.shareClassId).eq('upload_year', b.year).eq('upload_month', b.month).eq('status', 'confirmed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  const old = prev?.statement_data as StatementMonthData | undefined;
  if (!old) return;
  // A new file may cover fewer checkpoints than what is on file; keep the broker values already known.
  if (!b.data.closing && old.closing?.nav != null) b.data.closing = { ...old.closing, positions: [], has_positions: false };
  if (!b.data.ibkr_prices && old.ibkr_prices) b.data.ibkr_prices = old.ibkr_prices;
  if (!b.data.change_in_nav && old.change_in_nav) b.data.change_in_nav = old.change_in_nav;
  if (old.daily_nav) b.data.daily_nav = { ...old.daily_nav, ...b.data.daily_nav };
  if (first && old.opening?.nav != null && b.data.opening && b.data.opening.nav == null) b.data.opening = { ...b.data.opening, nav: old.opening.nav, cash: b.data.opening.cash ?? old.opening.cash };
}

export async function saveStatementBatches({ tenantId, fundId, userId, filename, sourcePath = null, statement, batches, accountToClass }: SaveArgs) {
  const broker = statement.format === 'generic' ? 'generic' : 'ibkr';
  const mappings = Object.entries(accountToClass)
    .filter(([, cls]) => cls)
    .map(([account_id, share_class_id]) => ({ tenant_id: tenantId, fund_id: fundId, broker, account_id, share_class_id }));
  const fail = saveFail;
  for (const b of batches) await carryOver(fundId, b, !!b.data.opening);

  const created: { id: string; batch: MonthlyBatch }[] = [];
  const undo = async () => {
    if (created.length) await supabase.from('trade_uploads').delete().in('id', created.map((c) => c.id));
  };

  for (const b of batches) {
    const { data: upload, error: upErr } = await supabase
      .from('trade_uploads')
      .insert({
        tenant_id: tenantId,
        fund_id: fundId,
        share_class_id: b.shareClassId,
        broker_account: b.account,
        source_format: statement.format,
        period_start: statement.periodStart,
        period_end: statement.periodEnd,
        upload_month: b.month,
        upload_year: b.year,
        status: 'draft',
        filename,
        uploaded_by: userId,
        statement_data: b.data,
        source_file_path: sourcePath,
      })
      .select('id')
      .maybeSingle();
    if (upErr || !upload) { await undo(); fail('create upload', upErr); }
    created.push({ id: upload!.id, batch: b });

    if (b.trades.length) {
      const items = b.trades.map((t, i) => ({
        upload_id: upload!.id,
        trade_date: t.date,
        instrument: t.symbol,
        direction: t.direction,
        quantity: t.quantity,
        price: t.price,
        fees: Math.round(t.fees * 100) / 100,
        total_value: Math.round((t.proceeds - t.fees) * 100) / 100,
        proceeds: t.proceeds,
        realized_pl: t.realizedPl,
        multiplier: t.multiplier,
        asset_category: t.assetCategory,
        currency: t.currency,
        notes: t.action === 'transfer' || t.action === 'corporate_action' ? t.action : t.assetCategory || null,
        sort_order: i + 1,
      }));
      const { error: itemsErr } = await supabase.from('trade_upload_items').insert(items);
      if (itemsErr) { await undo(); fail('save trades', itemsErr); }
    }
  }

  // Only after every month is stored do older versions get replaced, so a failure above leaves them untouched.
  for (const { id, batch: b } of created) {
    const { error: supErr } = await supabase
      .from('trade_uploads')
      .update({ status: 'superseded' })
      .eq('fund_id', fundId)
      .eq('share_class_id', b.shareClassId)
      .eq('upload_year', b.year)
      .eq('upload_month', b.month)
      .eq('status', 'confirmed');
    if (supErr) fail('replace previous month', supErr);
    const { error: cErr } = await supabase
      .from('trade_uploads')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', id);
    if (cErr) fail('confirm month', cErr);
  }

  if (mappings.length) {
    const { error } = await supabase.from('fund_broker_accounts').upsert(mappings, { onConflict: 'fund_id,broker,account_id' });
    if (error) console.error('could not remember account matches', error);
  }
  return created.length;
}
