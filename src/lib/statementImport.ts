import { supabase } from './supabase';
import { monthsBetween, type CashEvent, type ParsedStatement, type ParsedTrade, type PositionRow } from './statementParser';

export interface PositionSnapshot {
  symbol: string;
  quantity: number;
  multiplier: number;
  assetCategory: string;
  price?: number;
}

export interface StatementMonthData {
  account: string;
  month: string;
  cash_events: CashEvent[];
  opening?: { as_of: string; cash: number | null; nav: number | null; positions: PositionSnapshot[] };
  closing?: { as_of: string; cash: number | null; nav: number | null; positions: PositionSnapshot[] };
  period: { start: string; end: string };
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
  return rows.map((p) => ({ symbol: p.symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory, price: p.closePrice }));
}

function deriveOpening(trades: ParsedTrade[], closing: PositionRow[]): PositionSnapshot[] {
  const map = new Map<string, PositionSnapshot>();
  closing.forEach((p) => map.set(p.symbol, { symbol: p.symbol, quantity: p.quantity, multiplier: p.multiplier, assetCategory: p.assetCategory }));
  trades.forEach((t) => {
    const cur = map.get(t.symbol) ?? { symbol: t.symbol, quantity: 0, multiplier: t.multiplier, assetCategory: t.assetCategory };
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
    const hasPositionsSection = st.format === 'ibkr_activity';

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
        };
      }
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

interface SaveArgs {
  tenantId: string;
  fundId: string;
  userId: string;
  filename: string;
  statement: ParsedStatement;
  batches: MonthlyBatch[];
  accountToClass: Record<string, string>;
}

export async function saveStatementBatches({ tenantId, fundId, userId, filename, statement, batches, accountToClass }: SaveArgs) {
  const broker = statement.format === 'ibkr_activity' ? 'ibkr' : 'generic';
  const mappings = Object.entries(accountToClass)
    .filter(([, cls]) => cls)
    .map(([account_id, share_class_id]) => ({ tenant_id: tenantId, fund_id: fundId, broker, account_id, share_class_id }));
  if (mappings.length) {
    const { error } = await supabase.from('fund_broker_accounts').upsert(mappings, { onConflict: 'fund_id,broker,account_id' });
    if (error) throw new Error(`Could not remember account matches: ${error.message}`);
  }

  let saved = 0;
  for (const b of batches) {
    const { error: supErr } = await supabase
      .from('trade_uploads')
      .update({ status: 'superseded' })
      .eq('fund_id', fundId)
      .eq('share_class_id', b.shareClassId)
      .eq('upload_year', b.year)
      .eq('upload_month', b.month)
      .eq('status', 'confirmed');
    if (supErr) throw new Error(supErr.message);

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
      })
      .select('id')
      .maybeSingle();
    if (upErr || !upload) throw new Error(upErr?.message || 'Could not save the upload.');

    if (b.trades.length) {
      const items = b.trades.map((t, i) => ({
        upload_id: upload.id,
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
        notes: t.assetCategory || null,
        sort_order: i + 1,
      }));
      const { error: itemsErr } = await supabase.from('trade_upload_items').insert(items);
      if (itemsErr) throw new Error(itemsErr.message);
    }

    const { error: cErr } = await supabase
      .from('trade_uploads')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', upload.id);
    if (cErr) throw new Error(cErr.message);
    saved++;
  }
  return saved;
}
