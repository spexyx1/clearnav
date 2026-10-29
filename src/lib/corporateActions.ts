import { supabase } from './supabase';
import type { CorporateActionRow, ParsedTrade } from './statementParser';

export type CorporateCategory = 'split' | 'reverse_split' | 'restructure' | 'spinoff' | 'cash_merger' | 'escrow' | 'other';
export type CorporateStatus = 'pending' | 'approved' | 'rejected';

export const CATEGORY_LABELS: Record<CorporateCategory, string> = {
  split: 'Split', reverse_split: 'Reverse split', restructure: 'Restructuring / new CUSIP', spinoff: 'Spinoff',
  cash_merger: 'Cash merger or tender', escrow: 'Escrow or rights', other: 'Other change',
};

export interface CorporateLeg {
  symbol: string;
  quantity: number;
  multiplier: number;
  assetCategory: string;
}

export interface CorporateEvent {
  key: string;
  account: string;
  date: string;
  symbol: string;
  category: CorporateCategory;
  description: string;
  ibkrText: string;
  detected: boolean;
  legs: CorporateLeg[];
  proceeds: number;
  fingerprint: string;
}

export interface CorporateDecision {
  id: string;
  share_class_id: string;
  event_key: string;
  fingerprint: string;
  action_date: string;
  symbol: string;
  category: CorporateCategory;
  description: string;
  detected: boolean;
  details: { legs?: CorporateLeg[]; proceeds?: number; ibkrText?: string };
  status: CorporateStatus;
  reason: string | null;
  decided_at: string | null;
}

export function hashText(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${text.length}-${(h >>> 0).toString(16)}`;
}

const qtyText = (n: number) => Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 4 });
const usd = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isEscrow = (s: string) => /\.ESC$|escrow/i.test(s);

const TYPE_CATEGORY: Record<string, CorporateCategory> = {
  FS: 'split', RS: 'reverse_split', SO: 'spinoff', CC: 'spinoff', TC: 'cash_merger', TO: 'cash_merger', BM: 'cash_merger',
  IC: 'restructure', PI: 'restructure', CH: 'restructure', CO: 'restructure', RI: 'escrow', SR: 'escrow', ED: 'escrow', DI: 'escrow',
};

function classify(rows: CorporateActionRow[], legs: CorporateLeg[], proceeds: number): CorporateCategory {
  const text = rows.map((r) => `${r.description} ${r.rawSymbol}`).join(' ');
  const byType = rows.map((r) => TYPE_CATEGORY[r.type.toUpperCase()]).find(Boolean);
  if (legs.some((l) => isEscrow(l.symbol)) && legs.length > 1 && /merg|restruct|reorg|chapter|bankrupt/i.test(text)) return 'restructure';
  if (byType) return byType;
  if (/reverse split/i.test(text)) return 'reverse_split';
  if (/split/i.test(text)) return 'split';
  if (/spin/i.test(text)) return 'spinoff';
  if (/tender|cash merger|acquired for cash/i.test(text) || (proceeds > 0 && legs.every((l) => l.quantity <= 0))) return 'cash_merger';
  if (/escrow|rights/i.test(text) || legs.some((l) => isEscrow(l.symbol))) return 'escrow';
  if (/merg|cusip|isin|restruct|reorg|name change/i.test(text) || rows.some((r) => r.rawSymbol.endsWith('.OLD'))) return 'restructure';
  return 'other';
}

function describe(category: CorporateCategory, legs: CorporateLeg[], proceeds: number) {
  const parts = [
    ...legs.filter((l) => l.quantity < 0).map((l) => `${qtyText(l.quantity)} ${l.symbol} removed`),
    ...legs.filter((l) => l.quantity > 0).map((l) => `${qtyText(l.quantity)} ${l.symbol} received`),
    ...(Math.abs(proceeds) >= 0.005 ? [`${usd(proceeds)} cash ${proceeds > 0 ? 'paid in' : 'paid out'}`] : []),
  ];
  return `${CATEGORY_LABELS[category]}: ${parts.length ? parts.join(', ') : 'no change in shares'}.`;
}

function netLegs(rows: Array<{ symbol: string; quantity: number; multiplier: number; assetCategory: string }>) {
  const map = new Map<string, CorporateLeg>();
  rows.forEach((r) => {
    const cur = map.get(r.symbol) ?? { symbol: r.symbol, quantity: 0, multiplier: r.multiplier, assetCategory: r.assetCategory };
    cur.quantity += r.quantity;
    map.set(r.symbol, cur);
  });
  return [...map.values()].filter((l) => Math.abs(l.quantity) > 1e-9);
}

export function eventsFromIbkr(rows: CorporateActionRow[]): CorporateEvent[] {
  const groups = new Map<string, CorporateActionRow[]>();
  rows.forEach((r) => {
    const g = `${r.account}|${r.date}|${r.actionId || `${r.type}:${r.description.slice(0, 40)}`}`;
    groups.set(g, [...(groups.get(g) ?? []), r]);
  });
  return [...groups.entries()].map(([key, list]) => {
    const legs = netLegs(list);
    const proceeds = list.reduce((s, r) => s + r.proceeds, 0);
    const category = classify(list, legs, proceeds);
    const ibkrText = [...new Set(list.map((r) => r.description).filter(Boolean))].join(' | ').slice(0, 600);
    const main = legs.find((l) => !isEscrow(l.symbol)) ?? legs[0];
    return {
      key, account: list[0].account, date: list[0].date, symbol: main?.symbol ?? list[0].symbol, category,
      description: describe(category, legs, proceeds), ibkrText, detected: false, legs, proceeds,
      fingerprint: hashText(JSON.stringify([legs.map((l) => [l.symbol, +l.quantity.toFixed(6)]), +proceeds.toFixed(2), list.map((r) => [r.cusip, r.value])])),
    };
  });
}

const SPLIT_RATIOS = [2, 3, 4, 5, 8, 10, 15, 20, 25, 30, 40, 50, 100];

export function detectUnlabeled(args: {
  account: string;
  date: string;
  previous: Array<{ symbol: string; quantity: number; multiplier: number; assetCategory: string; price?: number }>;
  closing: Array<{ symbol: string; quantity: number; multiplier: number; assetCategory: string; price?: number }>;
  trades: ParsedTrade[];
  labeled: CorporateEvent[];
}): CorporateEvent[] {
  const { account, date, previous, closing, trades, labeled } = args;
  const covered = new Set(labeled.flatMap((e) => [e.symbol, ...e.legs.map((l) => l.symbol)]));
  const prev = new Map(previous.map((p) => [p.symbol, p]));
  const now = new Map(closing.map((p) => [p.symbol, p]));
  const moved = new Map<string, number>();
  trades.forEach((t) => moved.set(t.symbol, (moved.get(t.symbol) ?? 0) + (t.direction === 'buy' ? t.quantity : -t.quantity)));
  const out: CorporateEvent[] = [];
  new Set([...prev.keys(), ...now.keys()]).forEach((symbol) => {
    if (covered.has(symbol)) return;
    const p = prev.get(symbol);
    const c = now.get(symbol);
    const ref = c ?? p!;
    const expected = (p?.quantity ?? 0) + (moved.get(symbol) ?? 0);
    const actual = c?.quantity ?? 0;
    const diff = actual - expected;
    if (Math.abs(diff) > 1e-6 && !(/opt/i.test(ref.assetCategory) && actual === 0)) {
      const what = !p || Math.abs(p.quantity) < 1e-9 ? 'appeared' : Math.abs(actual) < 1e-9 ? 'disappeared' : 'changed quantity';
      const legs = [{ symbol, quantity: diff, multiplier: ref.multiplier || 1, assetCategory: ref.assetCategory }];
      out.push({
        key: `${account}|${date}|detected:${symbol}`, account, date, symbol, category: 'other', detected: true, legs, proceeds: 0,
        description: `Not labelled by IBKR: ${symbol} ${what} with no trade (${diff > 0 ? '+' : '-'}${qtyText(diff)} shares).`,
        ibkrText: '', fingerprint: hashText(JSON.stringify([symbol, +diff.toFixed(6)])),
      });
      return;
    }
    if (p?.price && c?.price && Math.abs(actual) > 1e-9) {
      const r = c.price / p.price;
      const ratio = r >= 1 ? r : 1 / r;
      const near = SPLIT_RATIOS.find((x) => Math.abs(ratio / x - 1) < 0.03);
      if (near && ratio >= 1.9) {
        out.push({
          key: `${account}|${date}|price:${symbol}`, account, date, symbol, category: r < 1 ? 'split' : 'reverse_split', detected: true, legs: [], proceeds: 0,
          description: `Possible ${r < 1 ? 'split' : 'reverse split'}: ${symbol}'s IBKR price moved about ${near}x (${p.price} to ${c.price}) with no share change. Check whether a split was missed.`,
          ibkrText: '', fingerprint: hashText(JSON.stringify([symbol, p.price, c.price])),
        });
      }
    }
  });
  return out;
}

export async function syncCorporateActions(tenantId: string, fundId: string, items: Array<{ classId: string; events: CorporateEvent[] }>) {
  const all = items.flatMap((i) => i.events.map((e) => ({ classId: i.classId, e })));
  if (!all.length) return;
  const { data: existing, error } = await supabase.from('fund_corporate_actions').select('id, share_class_id, event_key, fingerprint, status').eq('fund_id', fundId);
  if (error) throw new Error('Could not load the corporate action list.');
  const known = new Map((existing ?? []).map((r) => [`${r.share_class_id}|${r.event_key}`, r]));
  for (const { classId, e } of all) {
    const row = {
      fingerprint: e.fingerprint, action_date: e.date, symbol: e.symbol, category: e.category, description: e.description,
      detected: e.detected, details: { legs: e.legs, proceeds: e.proceeds, ibkrText: e.ibkrText }, updated_at: new Date().toISOString(),
    };
    const cur = known.get(`${classId}|${e.key}`);
    if (!cur) {
      const { error: insErr } = await supabase.from('fund_corporate_actions').insert({ tenant_id: tenantId, fund_id: fundId, share_class_id: classId, event_key: e.key, status: 'pending', ...row });
      if (insErr) throw new Error('Could not save a corporate action for review.');
      continue;
    }
    if (cur.fingerprint === e.fingerprint) continue;
    // IBKR changed the details, so any earlier decision no longer applies.
    const { error: upErr } = await supabase.from('fund_corporate_actions')
      .update({ ...row, status: 'pending', reason: null, decided_by: null, decided_at: null }).eq('id', cur.id);
    if (upErr) throw new Error('Could not update a corporate action for review.');
  }
}

export async function loadCorporateActions(fundId: string): Promise<CorporateDecision[]> {
  const { data, error } = await supabase.from('fund_corporate_actions')
    .select('id, share_class_id, event_key, fingerprint, action_date, symbol, category, description, detected, details, status, reason, decided_at')
    .eq('fund_id', fundId).order('action_date');
  if (error) throw new Error('Could not load corporate actions.');
  return (data ?? []) as CorporateDecision[];
}

export async function decideCorporateAction(id: string, status: CorporateStatus, userId: string, reason = '') {
  if (status === 'rejected' && !reason.trim()) throw new Error('Give a reason for rejecting this event.');
  const { error } = await supabase.from('fund_corporate_actions').update({
    status, reason: status === 'rejected' ? reason.trim() : null,
    decided_by: status === 'pending' ? null : userId, decided_at: status === 'pending' ? null : new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error('Could not save your decision. Please try again.');
}
