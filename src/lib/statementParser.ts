export type Direction = 'buy' | 'sell';
export type CashEventType = 'dividend' | 'withholding' | 'interest' | 'fee' | 'deposit' | 'withdrawal';
export type TradeAction = 'open' | 'close' | 'expired' | 'assigned' | 'exercised' | 'transfer' | 'corporate_action' | 'trade';

export const TRADE_ACTION_LABELS: Record<TradeAction, string> = {
  open: 'Opening trades',
  close: 'Closing trades',
  expired: 'Options expired',
  assigned: 'Options assigned',
  exercised: 'Options exercised',
  transfer: 'Position transfers',
  corporate_action: 'Corporate actions (splits, mergers, spin-offs)',
  trade: 'Other trades',
};

export interface ParsedTrade {
  account: string;
  date: string;
  symbol: string;
  assetCategory: string;
  currency: string;
  direction: Direction;
  quantity: number;
  price: number;
  proceeds: number;
  fees: number;
  realizedPl: number;
  multiplier: number;
  action: TradeAction;
}

export interface CashEvent {
  account: string;
  date: string;
  type: CashEventType;
  description: string;
  currency: string;
  amount: number;
  internal?: boolean;
}

export interface PositionRow {
  account: string;
  symbol: string;
  assetCategory: string;
  currency: string;
  quantity: number;
  multiplier: number;
  closePrice: number;
  value: number;
  costBasis: number;
}

export interface AccountSummary {
  account: string;
  name?: string;
  startingCash?: number;
  endingCash?: number;
  priorNav?: number;
  currentNav?: number;
  navBreakdown?: Record<string, number>;
  navByDate?: Record<string, number>;
  cashByDate?: Record<string, number>;
  pricesByDate?: Record<string, Record<string, number>>;
}

export interface SkippedRow {
  line: number;
  section: string;
  reason: string;
  text: string;
}

export interface ParsedStatement {
  format: 'ibkr_activity' | 'ibkr_flex' | 'nav_only' | 'generic';
  periodStart?: string;
  periodEnd?: string;
  accounts: string[];
  trades: ParsedTrade[];
  cashEvents: CashEvent[];
  positions: PositionRow[];
  summaries: Record<string, AccountSummary>;
  fxRates: Record<string, number>;
  skipped: SkippedRow[];
  warnings: string[];
}

export type GenericField =
  | 'date' | 'symbol' | 'direction' | 'quantity' | 'price' | 'fees'
  | 'proceeds' | 'account' | 'currency' | 'assetCategory';

export type ColumnMapping = Partial<Record<GenericField, number>>;

export const GENERIC_FIELD_LABELS: Record<GenericField, string> = {
  date: 'Trade date',
  symbol: 'Symbol / instrument',
  direction: 'Buy or sell',
  quantity: 'Quantity',
  price: 'Price',
  fees: 'Fees / commission',
  proceeds: 'Amount / proceeds',
  account: 'Account',
  currency: 'Currency',
  assetCategory: 'Asset type',
};

const FIELD_SYNONYMS: Record<GenericField, string[]> = {
  date: ['date', 'trade date', 'date/time', 'datetime', 'execution date', 'transaction date', 'trade time', 'time', 'settle date', 'settlement date', 'run date'],
  symbol: ['symbol', 'ticker', 'instrument', 'security', 'security name', 'asset', 'contract', 'stock', 'underlying', 'name', 'description'],
  direction: ['side', 'direction', 'action', 'buy/sell', 'b/s', 'transaction type', 'trade type', 'type', 'activity'],
  quantity: ['quantity', 'qty', 'shares', 'units', 'filled', 'volume', 'filled qty', 'no. of shares'],
  price: ['price', 't. price', 'trade price', 'execution price', 'fill price', 'avg price', 'average price', 'unit price', 'exec price'],
  fees: ['fees', 'fee', 'commission', 'commissions', 'comm', 'comm/fee', 'comm in usd', 'brokerage', 'charges'],
  proceeds: ['proceeds', 'net amount', 'amount', 'total', 'net', 'value', 'net proceeds', 'total value'],
  account: ['account', 'account id', 'account number', 'acct', 'portfolio'],
  currency: ['currency', 'ccy', 'cur'],
  assetCategory: ['asset category', 'asset class', 'asset type', 'security type', 'instrument type'],
};

export function tokenizeCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = !firstLine.includes(',') && firstLine.includes('\t') ? '\t' : firstLine.split(';').length > firstLine.split(',').length + 1 ? ';' : ',';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(cell.trim()); cell = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

export function parseNumber(raw: string | undefined): number {
  if (raw == null) return NaN;
  let s = String(raw).trim();
  if (!s || s === '--' || s === '-') return NaN;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  s = s.replace(/[$€£,\s]/g, '').replace(/[A-Z]{3}$/i, '');
  const n = parseFloat(s);
  if (Number.isNaN(n)) return NaN;
  return negative ? -n : n;
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function pad(n: number) { return String(n).padStart(2, '0'); }

export function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().split(/[,;T ]+(?=\d{1,2}:\d{2})/)[0].replace(/,\s*$/, '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let a = +m[1], b = +m[2];
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (a > 12 && b <= 12) [a, b] = [b, a];
    return `${y}-${pad(a)}-${pad(b)}`;
  }
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-](\d{2,4})/);
  if (m) {
    const mi = MONTH_NAMES.indexOf(m[2].toLowerCase());
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (mi >= 0) return `${y}-${pad(mi + 1)}-${pad(+m[1])}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return null;
}

export function parsePeriod(value: string): { start?: string; end?: string } {
  const parts = value.split(/\s+-\s+|\s+to\s+/i);
  const start = normalizeDate(parts[0]) ?? undefined;
  const end = normalizeDate(parts[1] ?? parts[0]) ?? undefined;
  return { start, end };
}

export function parseDirection(raw: string | undefined): Direction | null {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return null;
  if (/^(buy|bot|b|bought|long|purchase|buy to open|buy to close|bto|btc)\b/.test(s) || s.includes('buy')) return 'buy';
  if (/^(sell|sld|s|sold|short|sale|sell to open|sell to close|sto|stc)\b/.test(s) || s.includes('sell')) return 'sell';
  return null;
}

const IBKR_ROW_KINDS = new Set(['Header', 'Data', 'Total', 'SubTotal', 'Notes', 'MetaInfo']);

export function isIbkrActivityStatement(rows: string[][]): boolean {
  const sample = rows.slice(0, 40);
  const hits = sample.filter((r) => r.length >= 2 && IBKR_ROW_KINDS.has(r[1])).length;
  return hits >= Math.min(5, sample.length * 0.6);
}

export function emptyStatement(format: ParsedStatement['format']): ParsedStatement {
  return { format, accounts: [], trades: [], cashEvents: [], positions: [], summaries: {}, fxRates: {}, skipped: [], warnings: [] };
}

function inferMultiplier(qty: number, price: number, proceeds: number, assetCategory: string): number {
  const fallback = /option/i.test(assetCategory) ? 100 : 1;
  if (!qty || !price || !proceeds) return fallback;
  const m = Math.abs(proceeds) / (Math.abs(qty) * Math.abs(price));
  if (m > 1.5) return Math.round(m);
  return fallback === 100 && m < 0.5 ? fallback : 1;
}

function classifyTrade(code: string): TradeAction {
  const codes = code.split(/[;,\s]+/).filter(Boolean);
  if (codes.includes('Ep')) return 'expired';
  if (codes.includes('A')) return 'assigned';
  if (codes.includes('Ex')) return 'exercised';
  if (codes.includes('O')) return 'open';
  if (codes.includes('C')) return 'close';
  return 'trade';
}

export function parseIbkrStatement(rows: string[][]): ParsedStatement {
  const out = emptyStatement('ibkr_activity');
  const headers: Record<string, string[]> = {};
  const accountSet = new Set<string>();
  // Combined files repeat a full statement per account; the latest Account Information block owns the rows after it.
  let currentAccount = '';
  let pendingName = '';
  const unsupportedForex = { count: 0 };
  const nonBase = new Set<string>();
  const baseCash = new Set<string>();

  const summary = (acct: string) => (out.summaries[acct] ??= { account: acct });

  rows.forEach((row, idx) => {
    const line = idx + 1;
    const section = row[0];
    const kind = row[1];
    if (kind === 'Header') {
      headers[section] = row.slice(2);
      if (section === 'Statement') currentAccount = '';
      return;
    }
    if (kind !== 'Data') return;
    const head = headers[section];
    if (!head) return;
    const f: Record<string, string> = {};
    head.forEach((h, i) => { f[h] = row[i + 2] ?? ''; });
    const rowAccount = (f['Account'] || '').split(/\s/)[0];
    const acct = rowAccount && !/^total/i.test(rowAccount) ? rowAccount : currentAccount || 'MAIN';
    const skip = (reason: string) => out.skipped.push({ line, section, reason, text: row.slice(2).join(', ').slice(0, 160) });

    switch (section) {
      case 'Statement': {
        if (f['Field Name'] === 'Period') {
          const p = parsePeriod(f['Field Value'] || '');
          if (p.start && (!out.periodStart || p.start < out.periodStart)) out.periodStart = p.start;
          if (p.end && (!out.periodEnd || p.end > out.periodEnd)) out.periodEnd = p.end;
        }
        break;
      }
      case 'Account Information': {
        if (rowAccount) {
          accountSet.add(rowAccount);
          if (f['Name']) summary(rowAccount).name = f['Name'];
          break;
        }
        if (f['Field Name'] === 'Account') {
          const id = (f['Field Value'] || '').split(/\s/)[0];
          if (id) {
            currentAccount = id;
            accountSet.add(id);
            if (pendingName) { summary(id).name = pendingName; pendingName = ''; }
          }
        }
        if (f['Field Name'] === 'Name') {
          if (currentAccount) summary(currentAccount).name = f['Field Value'];
          else pendingName = f['Field Value'] || '';
        }
        break;
      }
      case 'Net Asset Value': {
        const assetClass = (f['Asset Class'] || '').trim();
        if (assetClass && assetClass.toLowerCase() !== 'total') {
          const v = parseNumber(f['Current Total']);
          if (!Number.isNaN(v)) { const s = summary(acct); s.navBreakdown = { ...(s.navBreakdown ?? {}), [assetClass]: v }; }
        }
        if (assetClass.toLowerCase() === 'total') {
          const s = summary(acct);
          const prior = parseNumber(f['Prior Total']);
          const cur = parseNumber(f['Current Total']);
          if (!Number.isNaN(prior)) s.priorNav = prior;
          if (!Number.isNaN(cur)) s.currentNav = cur;
          accountSet.add(acct);
        }
        break;
      }
      case 'Cash Report': {
        const label = (f['Currency Summary'] || '').toLowerCase();
        const ccy = f['Currency'] || '';
        // The base-currency summary row covers cash in every currency; the USD row is only a fallback.
        const isBase = ccy === 'Base Currency Summary';
        if (ccy && !isBase && ccy !== 'USD') break;
        if (!isBase && baseCash.has(acct)) break;
        const total = parseNumber(f['Total']);
        if (Number.isNaN(total)) break;
        if (isBase) baseCash.add(acct);
        const s = summary(acct);
        if (label === 'starting cash') s.startingCash = total;
        if (label === 'ending cash') s.endingCash = total;
        break;
      }
      case 'Trades': {
        const disc = f['DataDiscriminator'];
        if (disc && disc !== 'Order' && disc !== 'Trade') return;
        const assetCategory = f['Asset Category'] || '';
        if (/forex/i.test(assetCategory)) { unsupportedForex.count++; skip('Currency conversion (not a security trade)'); return; }
        const date = normalizeDate(f['Date/Time'] || f['TradeDate'] || f['Date']);
        const qty = parseNumber(f['Quantity']);
        const price = parseNumber(f['T. Price'] ?? f['TradePrice']);
        const symbol = f['Symbol'];
        if (!date || !symbol || Number.isNaN(qty) || qty === 0) { skip('Missing date, symbol or quantity'); return; }
        const proceedsRaw = parseNumber(f['Proceeds']);
        const commRaw = parseNumber(f['Comm/Fee'] ?? f['Comm in USD'] ?? f['Commission']);
        const p = Number.isNaN(price) ? 0 : price;
        const mult = inferMultiplier(qty, p, proceedsRaw, assetCategory);
        const currency = f['Currency'] || 'USD';
        if (currency !== 'USD') nonBase.add(currency);
        out.trades.push({
          account: acct,
          date,
          symbol,
          assetCategory,
          currency,
          direction: qty > 0 ? 'buy' : 'sell',
          quantity: Math.abs(qty),
          price: p,
          proceeds: Number.isNaN(proceedsRaw) ? -qty * p * mult : proceedsRaw,
          fees: Number.isNaN(commRaw) ? 0 : Math.abs(commRaw),
          realizedPl: parseNumber(f['Realized P/L']) || 0,
          multiplier: mult,
          action: classifyTrade(f['Code'] || ''),
        });
        accountSet.add(acct);
        break;
      }
      case 'Base Currency Exchange Rate': {
        const ccy = (f['Currency'] || '').toUpperCase();
        const rate = parseNumber(f['Rate']);
        if (/^[A-Z]{3}$/.test(ccy) && rate > 0) out.fxRates[ccy] = rate;
        break;
      }
      case 'Corporate Actions': {
        const desc = f['Description'] || '';
        const symbol = desc.split('(')[0].trim();
        const qty = parseNumber(f['Quantity']);
        const date = normalizeDate(f['Date/Time'] || f['Report Date']);
        if (!symbol || !date || Number.isNaN(qty)) { skip('Corporate action without symbol, date or quantity'); return; }
        const proceeds = parseNumber(f['Proceeds']);
        const value = parseNumber(f['Value']);
        out.trades.push({
          account: acct, date, symbol, assetCategory: f['Asset Category'] || 'Stocks', currency: f['Currency'] || 'USD',
          direction: qty >= 0 ? 'buy' : 'sell', quantity: Math.abs(qty),
          price: qty && !Number.isNaN(value) ? Math.abs(value / qty) : 0,
          proceeds: Number.isNaN(proceeds) ? 0 : proceeds, fees: 0,
          realizedPl: parseNumber(f['Realized P/L']) || 0, multiplier: 1, action: 'corporate_action',
        });
        accountSet.add(acct);
        break;
      }
      case 'Transfers': {
        const date = normalizeDate(f['Date']);
        const ccy = f['Currency'] || 'USD';
        if (!date || /^total/i.test(ccy)) return;
        const out_ = /out/i.test(f['Direction'] || '');
        const qty = parseNumber(f['Qty'] ?? f['Quantity']);
        const symbol = f['Symbol'] || '';
        const internal = !!f['Xfer Account'] && /^U\d+/.test(f['Xfer Account']);
        if (symbol && !Number.isNaN(qty) && qty !== 0 && !/cash/i.test(f['Asset Category'] || '')) {
          const mv = parseNumber(f['Market Value']);
          const xp = parseNumber(f['Xfer Price']);
          const price = xp > 0 ? xp : !Number.isNaN(mv) ? Math.abs(mv / qty) : 0;
          out.trades.push({
            account: acct, date, symbol, assetCategory: f['Asset Category'] || 'Stocks', currency: ccy,
            direction: out_ || qty < 0 ? 'sell' : 'buy', quantity: Math.abs(qty), price, proceeds: 0, fees: 0,
            realizedPl: 0, multiplier: /option/i.test(f['Asset Category'] || '') ? 100 : 1, action: 'transfer',
          });
        } else {
          const amount = parseNumber(f['Cash Amount'] ?? f['Amount']);
          if (Number.isNaN(amount) || amount === 0) { skip('Transfer without quantity or amount'); return; }
          const signed = out_ ? -Math.abs(amount) : amount;
          out.cashEvents.push({ account: acct, date, type: signed >= 0 ? 'deposit' : 'withdrawal', description: `Transfer ${f['Xfer Account'] || ''}`.trim(), currency: ccy, amount: signed, internal });
        }
        accountSet.add(acct);
        break;
      }
      case 'Open Positions': {
        const disc = f['DataDiscriminator'];
        if (disc && disc !== 'Summary') return;
        const qty = parseNumber(f['Quantity']);
        if (!f['Symbol'] || Number.isNaN(qty)) { skip('Position without symbol or quantity'); return; }
        const mult = parseNumber(f['Mult']);
        out.positions.push({
          account: acct,
          symbol: f['Symbol'],
          assetCategory: f['Asset Category'] || '',
          currency: f['Currency'] || 'USD',
          quantity: qty,
          multiplier: Number.isNaN(mult) || mult === 0 ? 1 : mult,
          closePrice: parseNumber(f['Close Price']) || 0,
          value: parseNumber(f['Value']) || 0,
          costBasis: parseNumber(f['Cost Basis']) || 0,
        });
        accountSet.add(acct);
        break;
      }
      case 'Dividends':
      case 'Withholding Tax':
      case 'Interest':
      case 'Fees':
      case 'Other Fees':
      case 'Transaction Fees':
      case 'Deposits & Withdrawals': {
        const ccy = f['Currency'] || '';
        if (/^total/i.test(ccy) || /^total/i.test(f['Subtitle'] || '')) return;
        const amount = parseNumber(f['Amount']);
        const date = normalizeDate(f['Date'] || f['Settle Date'] || f['Date/Time']);
        if (Number.isNaN(amount) || !date) { skip('Missing date or amount'); return; }
        let type: CashEventType = 'fee';
        if (section === 'Dividends') type = 'dividend';
        else if (section === 'Withholding Tax') type = 'withholding';
        else if (section === 'Interest') type = 'interest';
        else if (section === 'Deposits & Withdrawals') type = amount >= 0 ? 'deposit' : 'withdrawal';
        if (ccy && ccy !== 'USD') nonBase.add(ccy);
        out.cashEvents.push({ account: acct, date, type, description: f['Description'] || f['Symbol'] || section, currency: ccy || 'USD', amount });
        accountSet.add(acct);
        break;
      }
      default:
        break;
    }
  });

  out.accounts = [...accountSet].filter(Boolean);
  if (out.accounts.length > 1) out.accounts = out.accounts.filter((a) => a !== 'MAIN');
  out.cashEvents.forEach((e) => {
    if ((e.type === 'deposit' || e.type === 'withdrawal') && (/internal/i.test(e.description) || out.accounts.some((a) => a !== e.account && e.description.includes(a)))) e.internal = true;
  });
  if (unsupportedForex.count) out.warnings.push(`${unsupportedForex.count} currency exchange row(s) were recognised as conversions between your cash balances, not security trades.`);
  if (nonBase.size) {
    const known = [...nonBase].filter((c) => out.fxRates[c]);
    out.warnings.push(`Some activity is in ${[...nonBase].join(', ')}. It is converted to US dollars using ${known.length === nonBase.size ? "the statement's exchange rates" : 'month-end market exchange rates'}.`);
  }
  fillPeriod(out);
  return out;
}

function fillPeriod(st: ParsedStatement) {
  const dates = [...st.trades.map((t) => t.date), ...st.cashEvents.map((c) => c.date)].sort();
  if (!st.periodStart && dates.length) st.periodStart = dates[0];
  if (!st.periodEnd && dates.length) st.periodEnd = dates[dates.length - 1];
}

function normHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[_]/g, ' ');
}

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const norm = headers.map(normHeader);
  (Object.keys(FIELD_SYNONYMS) as GenericField[]).forEach((field) => {
    for (const syn of FIELD_SYNONYMS[field]) {
      const i = norm.findIndex((h, idx) => !used.has(idx) && h === syn);
      if (i >= 0) { mapping[field] = i; used.add(i); return; }
    }
  });
  (Object.keys(FIELD_SYNONYMS) as GenericField[]).forEach((field) => {
    if (mapping[field] !== undefined) return;
    for (const syn of FIELD_SYNONYMS[field]) {
      if (syn.length < 4) continue;
      const i = norm.findIndex((h, idx) => !used.has(idx) && h.includes(syn));
      if (i >= 0) { mapping[field] = i; used.add(i); return; }
    }
  });
  return mapping;
}

export function findHeaderRow(rows: string[][]): number {
  let best = 0;
  let bestScore = -1;
  rows.slice(0, 25).forEach((r, i) => {
    const score = Object.keys(guessMapping(r)).length;
    if (score > bestScore) { best = i; bestScore = score; }
  });
  return best;
}

export function isMappingUsable(m: ColumnMapping): boolean {
  return m.date !== undefined && m.symbol !== undefined && (m.quantity !== undefined || m.proceeds !== undefined);
}

export function parseGenericRows(rows: string[][], headerRow: number, mapping: ColumnMapping): ParsedStatement {
  const out = emptyStatement('generic');
  const accounts = new Set<string>();
  const get = (r: string[], f: GenericField) => (mapping[f] !== undefined ? r[mapping[f]!] : undefined);

  rows.slice(headerRow + 1).forEach((r, i) => {
    const line = headerRow + i + 2;
    const skip = (reason: string) => out.skipped.push({ line, section: 'Rows', reason, text: r.join(', ').slice(0, 160) });
    const date = normalizeDate(get(r, 'date'));
    const symbol = (get(r, 'symbol') || '').trim();
    if (!date && !symbol) return;
    if (!date) { skip('Date not recognised'); return; }
    if (!symbol) { skip('No symbol'); return; }
    if (/^total/i.test(symbol)) return;
    let qty = parseNumber(get(r, 'quantity'));
    const price = parseNumber(get(r, 'price'));
    const proceeds = parseNumber(get(r, 'proceeds'));
    const fees = parseNumber(get(r, 'fees'));
    let dir = parseDirection(get(r, 'direction'));
    if (Number.isNaN(qty) && !Number.isNaN(proceeds) && !Number.isNaN(price) && price) qty = proceeds / price;
    if (Number.isNaN(qty) || qty === 0) { skip('Quantity missing'); return; }
    if (!dir) dir = qty < 0 ? 'sell' : !Number.isNaN(proceeds) && proceeds > 0 ? 'sell' : 'buy';
    const absQty = Math.abs(qty);
    const p = Number.isNaN(price) ? (Number.isNaN(proceeds) ? 0 : Math.abs(proceeds) / absQty) : price;
    const signedProceeds = (dir === 'sell' ? 1 : -1) * Math.abs(Number.isNaN(proceeds) ? absQty * p : proceeds);
    const account = (get(r, 'account') || '').trim() || 'MAIN';
    accounts.add(account);
    out.trades.push({
      account,
      date,
      symbol,
      assetCategory: get(r, 'assetCategory') || 'Stocks',
      currency: get(r, 'currency') || 'USD',
      direction: dir,
      quantity: absQty,
      price: p,
      proceeds: signedProceeds,
      fees: Number.isNaN(fees) ? 0 : Math.abs(fees),
      realizedPl: 0,
      multiplier: 1,
      action: 'trade',
    });
  });

  out.accounts = [...accounts];
  fillPeriod(out);
  return out;
}

export type ParseResult =
  | { kind: 'parsed'; statement: ParsedStatement }
  | { kind: 'needs_mapping'; rows: string[][]; headerRow: number; headers: string[]; mapping: ColumnMapping };

export function parseStatementText(text: string): ParseResult {
  const rows = tokenizeCsv(text);
  if (!rows.length) throw new Error('The file is empty.');
  if (isIbkrActivityStatement(rows)) return { kind: 'parsed', statement: parseIbkrStatement(rows) };
  const headerRow = findHeaderRow(rows);
  const headers = rows[headerRow];
  const mapping = guessMapping(headers);
  if (!isMappingUsable(mapping)) return { kind: 'needs_mapping', rows, headerRow, headers, mapping };
  return { kind: 'parsed', statement: parseGenericRows(rows, headerRow, mapping) };
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthEnd(year: number, month: number) {
  const d = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(d)}`;
}

export function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let y = +start.slice(0, 4), m = +start.slice(5, 7);
  const ey = +end.slice(0, 4), em = +end.slice(5, 7);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${pad(m)}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
