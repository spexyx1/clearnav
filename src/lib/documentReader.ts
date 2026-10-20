import type { DealingTerms, DocumentClass, TermEntry, TermKey, TermValue } from './dealingTerms';

export interface ReadPage { page: number; lines: string[] }

export type ReadOutcome =
  | { kind: 'text'; pages: ReadPage[] }
  | { kind: 'manual'; reason: string };

export const MAX_UPLOAD_BYTES = 52428800;

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

export function extensionOf(name: string) {
  return name.toLowerCase().split('.').pop() ?? '';
}

export function contentTypeFor(name: string): string | null {
  return MIME_BY_EXT[extensionOf(name)] ?? null;
}

async function pdfPages(data: ArrayBuffer): Promise<ReadPage[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: ReadPage[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const byY = new Map<number, { x: number; s: string }[]>();
    content.items.forEach((it) => {
      if (!('str' in it) || !it.str.trim()) return;
      const y = Math.round(it.transform[5]);
      const key = [...byY.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      byY.set(key, [...(byY.get(key) ?? []), { x: it.transform[4], s: it.str.trim() }]);
    });
    const lines = [...byY.entries()].sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((x) => x.s).join(' ').replace(/\s+/g, ' ').trim());
    pages.push({ page: p, lines });
  }
  return pages;
}

export async function readDocument(file: Blob, fileName: string): Promise<ReadOutcome> {
  const ext = extensionOf(fileName);
  if (ext === 'doc' || ext === 'docx') {
    return { kind: 'manual', reason: 'Word files cannot be read in the app. Fill in the details by hand, or upload a PDF copy.' };
  }
  if (ext === 'txt') {
    const lines = (await file.text()).split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { kind: 'text', pages: [{ page: 1, lines }] };
  }
  if (ext !== 'pdf') return { kind: 'manual', reason: 'This file type cannot be read in the app. Fill in the details by hand.' };
  const pages = await pdfPages(await file.arrayBuffer());
  const chars = pages.reduce((n, p) => n + p.lines.join('').length, 0);
  if (chars < 40 * Math.max(1, pages.length)) {
    return { kind: 'manual', reason: 'This PDF looks like scanned pages with no readable text. Fill in the details by hand.' };
  }
  return { kind: 'text', pages };
}

const HEADING = /^(?:(?:clause|section|part|schedule)\s+)?(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+[A-Z(]/i;

function clauseAt(pages: ReadPage[], pi: number, li: number): string | null {
  for (let p = pi; p >= 0 && p >= pi - 2; p--) {
    const lines = pages[p].lines;
    for (let i = p === pi ? li : lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(HEADING);
      if (m && lines[i].length < 120) return `Clause ${m[1]}`;
    }
  }
  return null;
}

export interface Hit { match: RegExpMatchArray; entry: Omit<TermEntry, 'value'> }

export function findFirst(pages: ReadPage[], pattern: RegExp, near?: RegExp): Hit | null {
  for (let pi = 0; pi < pages.length; pi++) {
    const lines = pages[pi].lines;
    for (let li = 0; li < lines.length; li++) {
      const window = `${lines[li]}\n${lines[li + 1] ?? ''}`.trim();
      const match = window.match(pattern);
      if (!match || (match.index ?? 0) > lines[li].length) continue;
      if (near && !near.test(`${lines[li - 1] ?? ''} ${window}`)) continue;
      return {
        match,
        entry: { clause: clauseAt(pages, pi, li), page: pages[pi].page, quote: window.replace(/\n/g, ' ').slice(0, 220) },
      };
    }
  }
  return null;
}

export const money = (s: string) => Number(s.replace(/[,\s$]/g, ''));

type Rule = { key: TermKey; pattern: RegExp; near?: RegExp; value: (m: RegExpMatchArray) => TermValue };

const pct = (m: RegExpMatchArray) => Number(m[1]);
const text = (m: RegExpMatchArray) => m[1].trim().replace(/[;,]$/, '');

const TERM_RULES: Rule[] = [
  { key: 'dealing_frequency', pattern: /\b(monthly|quarterly)\b[^.]{0,40}\b(?:dealing|valuation|applications?|redemptions?|withdrawals?)\b/i, value: (m) => m[1].toLowerCase() },
  { key: 'dealing_frequency', pattern: /\b(?:dealing|valued|applications?|redemptions?)\b[^.]{0,60}\b(monthly|quarterly)\b/i, value: (m) => m[1].toLowerCase() },
  { key: 'valuation_point', pattern: /valuation (?:point|time|date|day)\s*(?:is|means|will be|:)?\s*([^.]{10,160})/i, value: text },
  { key: 'application_cutoff_business_days', pattern: /(\d{1,2})\s+business days?\s+(?:before|prior to)/i, near: /application|subscription/i, value: pct },
  { key: 'redemption_notice_days', pattern: /(\d{1,3})\s+(?:calendar\s+)?days'?\s+(?:prior\s+)?(?:written\s+)?notice/i, near: /redemption|redeem|withdraw/i, value: pct },
  { key: 'redemption_notice_days', pattern: /notice of (?:at least |not less than )?(\d{1,3})\s+days/i, near: /redemption|redeem|withdraw/i, value: pct },
  { key: 'redemption_gate_pct', pattern: /(\d{1,2}(?:\.\d+)?)\s*%/, near: /\bgate\b|redemption limit|withdrawal limit/i, value: pct },
  { key: 'launch_unit_price', pattern: /(?:initial|issue|launch|offer)\s+(?:unit\s+)?price[^.]{0,40}?\$\s?(\d+(?:\.\d+)?)/i, value: pct },
  { key: 'minimum_additional_investment', pattern: /minimum\s+(?:additional|subsequent|top-?up)\s+(?:investment|application|amount)[^.]{0,40}?\$\s?([\d,]+(?:\.\d+)?)/i, value: (m) => money(m[1]) },
  { key: 'minimum_initial_investment', pattern: /minimum\s+(?:initial\s+)?(?:investment|application|subscription)(?!\s+(?:additional|subsequent))[^.]{0,40}?\$\s?([\d,]+(?:\.\d+)?)/i, value: (m) => money(m[1]) },
  { key: 'management_fee_pct', pattern: /management fee[^.]{0,80}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i, value: pct },
  { key: 'performance_fee_pct', pattern: /performance fee[^.]{0,80}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i, value: pct },
  { key: 'fee_frequency', pattern: /fees?\b[^.]{0,60}(?:calculated|payable|paid|charged|accrued|deducted)[^.]{0,30}\b(monthly|quarterly|half-yearly|semi-annually|annually|yearly)\b/i,
    value: (m) => ({ 'half-yearly': 'semi-annually', yearly: 'annually' } as Record<string, string>)[m[1].toLowerCase()] ?? m[1].toLowerCase() },
  { key: 'hurdle_rate_pct', pattern: /hurdle(?:\s+rate)?[^.]{0,60}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i, value: pct },
  { key: 'high_water_mark', pattern: /\b(no\s+|without\s+(?:a\s+)?)?high[- ]water[- ]mark/i, value: (m) => !m[1] },
  { key: 'application_money_handling', pattern: /application (?:money|monies|funds)[^.]{0,20}?(?:will be |is |are |shall be )?(?:held|deposited|kept)\s+(?:in|on)\s+([^.]{5,140})/i, value: text },
  { key: 'units_issued_when', pattern: /units (?:will be|are|shall be) issued\s+([^.]{5,160})/i, value: text },
];

const CLASS_PATTERN = /\b(High Conviction|Opportunistic(?: Strategy)?|Quant(?:itative)? Value)(?: Portfolio| Class| Units)?\b|\bClass\s+([A-C])\b(?:\s*[-–—:]\s*([A-Z][A-Za-z ]{3,40}?(?:Portfolio|Strategy)))?/g;

function findClasses(pages: ReadPage[]): DocumentClass[] {
  const names = new Map<string, DocumentClass>();
  for (const p of pages) {
    for (const line of p.lines) {
      for (const m of line.matchAll(CLASS_PATTERN)) {
        const name = (m[1] ?? (m[3] ? `Class ${m[2]} - ${m[3].trim()}` : `Class ${m[2]}`)).trim();
        if (names.has(name) || names.size >= 8) continue;
        const fee = line.match(/management fee[^.]{0,40}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i);
        const perf = line.match(/performance fee[^.]{0,40}?(\d{1,2}(?:\.\d{1,3})?)\s*%/i);
        const src = { page: p.page, quote: line.slice(0, 220) };
        names.set(name, {
          name,
          management_fee_pct: fee ? { value: Number(fee[1]), ...src } : null,
          performance_fee_pct: perf ? { value: Number(perf[1]), ...src } : null,
        });
      }
    }
  }
  const named = [...names.values()].filter((c) => !/^Class [A-C]$/.test(c.name));
  return named.length ? named : [...names.values()];
}

export function extractTerms(pages: ReadPage[]): { terms: DealingTerms; classes: DocumentClass[] } {
  const terms: DealingTerms = {};
  for (const rule of TERM_RULES) {
    if (terms[rule.key]) continue;
    const hit = findFirst(pages, rule.pattern, rule.near);
    if (!hit) continue;
    const value = rule.value(hit.match);
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    terms[rule.key] = { value, ...hit.entry };
  }
  return { terms, classes: findClasses(pages) };
}

const CLASS_HINTS: { pattern: RegExp; code: RegExp }[] = [
  { pattern: /conviction|class\s*c\b/i, code: /^HC$|conviction/i },
  { pattern: /opportun|class\s*a\b/i, code: /^OPP$|opportun/i },
  { pattern: /quant|class\s*b\b/i, code: /^QV$|quant/i },
];

export function suggestClass<T extends { id: string; class_code: string; class_name: string }>(docName: string, existing: T[]): T | undefined {
  const hint = CLASS_HINTS.find((h) => h.pattern.test(docName));
  return hint ? existing.find((c) => hint.code.test(c.class_code) || hint.code.test(c.class_name)) : undefined;
}
