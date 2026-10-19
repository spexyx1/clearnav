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
  closing?: { as_of: string; cash: number | null; nav: number | null; positions: PositionSnapshot[]; has_positions?: boolean; nav_breakdown?: Record<string, number> };
  period: { start: string; end: string };
  fx_rates?: Record<string, number>;
  ibkr_prices?: { as_of: string; prices: Record<string, number> };
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
        };
        if (Object.keys(st.fxRates).length) data.fx_rates = st.fxRates;
      } else {
        const last = navDates.filter((d) => d.startsWith(mk)).pop();
        if (last) data.closing = { as_of: last, nav: summary.navByDate![last], cash: summary.cashByDate?.[last] ?? null, positions: [], has_positions: false };
      }
      const priceDay = priceDates.filter((d) => d.startsWith(mk)).pop();
      if (priceDay) data.ibkr_prices = { as_of: priceDay, prices: summary.pricesByDate![priceDay] };
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

export function buildNavAnchors(st: ParsedStatement, accountToClass: Record<string, string>): MonthlyBatch[] {
  if (!st.periodEnd) return [];
  const out: MonthlyBatch[] = [];
  const isMonthEnd = (d: string) => monthEndOf(d) === d;
  st.accounts.forEach((account) => {
    const shareClassId = accountToClass[account];
    const s = st.summaries[account];
    if (!shareClassId || !s) return;
    const add = (date: string, nav: number) => {
      const mk = date.slice(0, 7);
      out.push({
        account, shareClassId, year: +mk.slice(0, 4), month: +mk.slice(5, 7), trades: [],
        data: { account, month: mk, cash_events: [], period: { start: st.periodStart ?? date, end: date }, closing: { as_of: date, nav, cash: null, positions: [], has_positions: false } },
      });
    };
    if (s.currentNav != null) add(st.periodEnd!, s.currentNav);
    if (s.priorNav != null && st.periodStart) {
      const before = dayBefore(st.periodStart);
      if (isMonthEnd(before)) add(before, s.priorNav);
    }
  });
  return out;
}

function monthEndOf(date: string) {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

const saveFail = (step: string, cause: unknown): never => {
  console.error(`statement save failed: ${step}`, cause);
  throw new Error('The statement could not be saved. Nothing was changed. Please try again.');
};

/** Adds broker month-end values to the months already on file without touching their trades. */
export async function saveNavAnchors(tenantId: string, fundId: string, userId: string, filename: string, anchors: MonthlyBatch[], sourcePath: string | null) {
  let saved = 0;
  for (const a of anchors) {
    const { data: cur, error } = await supabase.from('trade_uploads').select('id, statement_data')
      .eq('fund_id', fundId).eq('share_class_id', a.shareClassId).eq('upload_year', a.year).eq('upload_month', a.month).eq('status', 'confirmed')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) saveFail('load month', error);
    const anchor = a.data.closing!;
    if (cur) {
      const sd = cur.statement_data as StatementMonthData;
      const keepPositions = sd.closing && sd.closing.has_positions !== false && sd.closing.as_of === anchor.as_of;
      const closing = keepPositions ? { ...sd.closing!, nav: anchor.nav } : anchor;
      const { error: uErr } = await supabase.from('trade_uploads').update({ statement_data: { ...sd, closing } }).eq('id', cur.id);
      if (uErr) saveFail('add month-end value', uErr);
    } else {
      const { error: iErr } = await supabase.from('trade_uploads').insert({
        tenant_id: tenantId, fund_id: fundId, share_class_id: a.shareClassId, broker_account: a.account, source_format: 'nav_only',
        period_start: a.data.period.start, period_end: a.data.period.end, upload_month: a.month, upload_year: a.year,
        status: 'confirmed', confirmed_at: new Date().toISOString(), filename, uploaded_by: userId, statement_data: a.data, source_file_path: sourcePath,
      });
      if (iErr) saveFail('save month-end value', iErr);
    }
    saved++;
  }
  return saved;
}

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
