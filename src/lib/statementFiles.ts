import { emptyStatement, parseIbkrStatement, parsePeriod, parseStatementText, type ParseResult, type ParsedStatement } from './statementParser';
import { isFlexXml, parseFlexXml } from './flexStatement';

export const ACCEPTED_FILES = '.csv,.txt,.tsv,.htm,.html,.pdf,.xml';

const SECTIONS = [
  'Statement', 'Account Information', 'Net Asset Value', 'Change in NAV', 'Mark-to-Market Performance Summary',
  'Realized & Unrealized Performance Summary', 'Cash Report', 'Open Positions', 'Trades', 'Corporate Actions', 'Transfers',
  'Deposits & Withdrawals', 'Dividends', 'Withholding Tax', 'Interest Accruals', 'Interest', 'Other Fees', 'Transaction Fees', 'Fees',
  'Base Currency Exchange Rate', 'Change in Dividend Accruals', 'Financial Instrument Information', 'Codes',
].sort((a, b) => b.length - a.length);
const ASSET_CATEGORIES = /^(stocks|equity and index options|options|futures|bonds|warrants|forex|cfds|mutual funds|treasury bills|etfs?)$/i;

const cellText = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim();

export function htmlToRows(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows: string[][] = [];
  const period = (doc.body.textContent || '').match(/([A-Z][a-z]+ \d{1,2}, \d{4})\s*-\s*([A-Z][a-z]+ \d{1,2}, \d{4})/)
    ?? (doc.body.textContent || '').match(/Activity Statement\s+([A-Z][a-z]+ \d{1,2}, \d{4})/);
  rows.push(['Statement', 'Header', 'Field Name', 'Field Value']);
  if (period) rows.push(['Statement', 'Data', 'Period', period[2] ? `${period[1]} - ${period[2]}` : period[1]]);

  let section = '';
  doc.querySelectorAll('.sectionHeading, h1, h2, h3, h4, table').forEach((el) => {
    if (el.tagName !== 'TABLE') {
      const text = cellText(el);
      const known = SECTIONS.find((s) => text.toLowerCase().startsWith(s.toLowerCase()));
      if (known) section = known;
      return;
    }
    if (!section || el.querySelector('table')) return;
    const trs = [...el.querySelectorAll('tr')];
    const headTr = trs.find((tr) => tr.querySelector('th'));
    let header = headTr ? [...headTr.querySelectorAll('th, td')].map(cellText) : [];
    if (!header.length) {
      const first = trs.find((tr) => tr.querySelectorAll('td').length >= 2);
      if (first?.querySelectorAll('td').length === 2) header = ['Field Name', 'Field Value'];
      else return;
    }
    const addAsset = !header.includes('Asset Category') && !header.includes('Asset Class');
    const addCcy = !header.includes('Currency');
    const fullHeader = [...header, ...(addAsset ? ['Asset Category'] : []), ...(addCcy ? ['Currency'] : [])];
    rows.push([section, 'Header', ...fullHeader]);
    let asset = '';
    let ccy = '';
    trs.forEach((tr) => {
      if (tr === headTr) return;
      const cells = [...tr.querySelectorAll('td')].map(cellText);
      if (!cells.length) return;
      if (cells.filter(Boolean).length === 1 && cells.length < header.length) {
        const t = cells.find(Boolean)!;
        if (ASSET_CATEGORIES.test(t)) asset = t;
        else if (/^[A-Z]{3}$/.test(t)) ccy = t;
        else if (/base currency summary/i.test(t)) ccy = 'Base Currency Summary';
        return;
      }
      const padded = header.map((_, i) => cells[i] ?? '');
      rows.push([section, 'Data', ...padded, ...(addAsset ? [asset] : []), ...(addCcy ? [ccy] : [])]);
    });
  });
  return rows;
}

const NUM_RE = /\(?-?[\d,]+\.\d+\)?/g;
const toNum = (s: string) => {
  const neg = s.startsWith('(') || s.startsWith('-');
  const v = Number(s.replace(/[(),-]/g, ''));
  return neg ? -v : v;
};

async function pdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const byY = new Map<number, { x: number; s: string }[]>();
    content.items.forEach((it) => {
      if (!('str' in it) || !it.str.trim()) return;
      const y = Math.round(it.transform[5]);
      const key = [...byY.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      byY.set(key, [...(byY.get(key) ?? []), { x: it.transform[4], s: it.str.trim() }]);
    });
    [...byY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, parts]) => lines.push(parts.sort((a, b) => a.x - b.x).map((x) => x.s).join(' ')));
  }
  return lines;
}

export function navFromPdfLines(lines: string[]): ParsedStatement {
  const out = emptyStatement('nav_only');
  const text = lines.join('\n');
  const period = text.match(/([A-Z][a-z]+ \d{1,2}, \d{4})\s*-\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
  const single = text.match(/Activity Statement\s*\n?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/);
  const p = period ? parsePeriod(`${period[1]} - ${period[2]}`) : single ? parsePeriod(single[1]) : {};
  out.periodStart = p.start;
  out.periodEnd = p.end;
  let account = '';
  let inNav = false;
  lines.forEach((line) => {
    const acct = line.match(/^Account\s*:?\s*(U\d{5,})/) ?? (!account ? line.match(/\b(U\d{6,})\b/) : null);
    if (acct) account = acct[1];
    if (/^Net Asset Value\b/i.test(line)) { inNav = true; return; }
    if (!inNav || !/^Total\b/i.test(line) || !account) return;
    inNav = false;
    const n = (line.match(NUM_RE) ?? []).map(toNum);
    if (n.length < 2) return;
    const prior = n[0];
    const change = n[n.length - 1];
    const current = n.slice(1, -1).find((v) => Math.abs(v - (prior + change)) < 0.05) ?? n[n.length - 2];
    out.summaries[account] = { account, priorNav: prior, currentNav: current };
    if (!out.accounts.includes(account)) out.accounts.push(account);
  });
  if (!out.periodEnd || !out.accounts.length) {
    throw new Error("We couldn't find the period and account value in this PDF. Please upload the CSV or HTML version of the statement instead.");
  }
  out.warnings.push('From a PDF only the account value at the start and end of the period is read. Trades and cash movements come from the CSV, HTML or automatic IBKR feed.');
  return out;
}

export async function readStatementFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return { kind: 'parsed', statement: navFromPdfLines(await pdfLines(file)) };
  const text = await file.text();
  if (name.endsWith('.xml') || isFlexXml(text)) return { kind: 'parsed', statement: parseFlexXml(text) };
  if (/\.html?$/.test(name) || /^\s*<(!doctype|html)/i.test(text)) {
    const rows = htmlToRows(text);
    if (rows.length < 4) throw new Error("This web page doesn't look like an IBKR statement.");
    return { kind: 'parsed', statement: parseIbkrStatement(rows) };
  }
  return parseStatementText(text);
}
