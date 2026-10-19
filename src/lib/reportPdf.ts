import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ReportContent } from './monthlyReport';

const GREEN = rgb(0.102, 0.235, 0.165);
const GOLD = rgb(0.788, 0.659, 0.298);
const INK = rgb(0.13, 0.17, 0.15);
const MUTED = rgb(0.42, 0.47, 0.44);
const LINE = rgb(0.9, 0.88, 0.83);
const TINT = rgb(0.97, 0.96, 0.93);
const POS = rgb(0.11, 0.42, 0.25);
const NEG = rgb(0.7, 0.14, 0.09);
const SERIES = [rgb(0.102, 0.235, 0.165), rgb(0.788, 0.659, 0.298), rgb(0.22, 0.45, 0.62)];

const W = 595, H = 842, M = 48;
const DISCLAIMER = 'This report is prepared by Arkline Trust for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal. Figures for months not yet approved are provisional. This document is confidential and intended solely for the use of the investor to whom it is addressed.';

const clean = (s: string) => s
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\u2022/g, '-')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const signedUsd = (v: number) => `${v >= 0 ? '+' : '-'}${usd(Math.abs(v))}`;
const localPrice = (v: number, ccy?: string) => {
  const code = (ccy || 'USD').toUpperCase();
  const n = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return code === 'USD' ? `${n}` : `${code} ${n}`;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function renderReportPdf(c: ReportContent): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Arkline Trust - Monthly Update - ${c.period.label}`);
  doc.setAuthor('Arkline Trust');
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const newPage = () => {
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: GREEN });
    y = H - M;
  };
  const ensure = (h: number) => { if (y - h < M + 30) newPage(); };
  const text = (s: string, x: number, size: number, font: PDFFont, color = INK) => page.drawText(clean(s), { x, y, size, font, color });
  const right = (s: string, xr: number, size: number, font: PDFFont, color = INK) => {
    const t = clean(s);
    page.drawText(t, { x: xr - font.widthOfTextAtSize(t, size), y, size, font, color });
  };
  const wrap = (s: string, font: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    clean(s).split('\n').forEach((para) => {
      let line = '';
      para.split(/\s+/).filter(Boolean).forEach((w) => {
        const next = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = w; } else line = next;
      });
      lines.push(line);
    });
    return lines;
  };
  const paragraph = (s: string, size = 10.5, font = sans, color = INK, x = M, width = W - 2 * M) => {
    wrap(s, font, size, width).forEach((l) => { ensure(size * 1.5); text(l, x, size, font, color); y -= size * 1.5; });
  };
  const heading = (s: string) => {
    ensure(48);
    y -= 10;
    page.drawRectangle({ x: M, y: y + 2, width: 3, height: 14, color: GOLD });
    text(s, M + 10, 15, serifBold, GREEN);
    y -= 22;
  };
  const table = (cols: { label: string; w: number; align?: 'right' }[], rows: { cells: string[]; colors?: (ReturnType<typeof rgb> | undefined)[] }[]) => {
    const rowH = 18;
    const drawHead = () => {
      ensure(rowH * 2);
      page.drawRectangle({ x: M, y: y - 5, width: W - 2 * M, height: rowH, color: TINT });
      let x = M + 6;
      cols.forEach((col) => {
        if (col.align === 'right') right(col.label, x + col.w - 12, 8.5, sansBold, MUTED); else text(col.label, x, 8.5, sansBold, MUTED);
        x += col.w;
      });
      y -= rowH;
    };
    drawHead();
    rows.forEach((r) => {
      if (y - rowH < M + 30) { newPage(); drawHead(); }
      let x = M + 6;
      cols.forEach((col, i) => {
        const color = r.colors?.[i] ?? INK;
        if (col.align === 'right') right(r.cells[i], x + col.w - 12, 9.5, sans, color); else text(r.cells[i], x, 9.5, sans, color);
        x += col.w;
      });
      page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.5, color: LINE });
      y -= rowH;
    });
    y -= 6;
  };

  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: GREEN });
  page.drawRectangle({ x: 0, y: H - 154, width: W, height: 4, color: GOLD });
  page.drawRectangle({ x: M, y: H - 52, width: 48, height: 2.5, color: GOLD });
  y = H - 88;
  text('ARKLINE TRUST', M, 28, serif, rgb(1, 1, 1));
  y -= 24;
  text(`MONTHLY UPDATE  -  ${c.period.label.toUpperCase()}`, M, 10, sansBold, GOLD);
  y -= 16;
  text(c.fund_name, M, 9.5, sans, rgb(0.78, 0.86, 0.8));
  y = H - 190;

  heading('Performance summary');
  table(
    [{ label: 'Share class', w: 110 }, { label: 'Unit price', w: 62, align: 'right' }, { label: 'Month', w: 55, align: 'right' }, { label: 'Gain (month)', w: 76, align: 'right' }, { label: 'YTD', w: 55, align: 'right' }, { label: 'Since start', w: 60, align: 'right' }, { label: 'Class value', w: 81, align: 'right' }],
    c.classes.map((k) => ({
      cells: [k.name + (k.status === 'approved' ? '' : ' *'), `${k.unit_price.toFixed(4)}`, pct(k.month_return), k.month_gain != null ? signedUsd(k.month_gain) : '', pct(k.ytd_return), pct(k.since_inception), usd(k.nav)],
      colors: [undefined, undefined, k.month_return >= 0 ? POS : NEG, (k.month_gain ?? 0) >= 0 ? POS : NEG, k.ytd_return >= 0 ? POS : NEG, k.since_inception >= 0 ? POS : NEG, undefined],
    })),
  );
  if (c.classes.some((k) => k.status !== 'approved')) { paragraph('* Provisional figure, pending approval.', 8, sans, MUTED); }

  const months = [...new Set(c.classes.flatMap((k) => k.history.map((h) => h.month)))].sort();
  if (months.length > 1) {
    ensure(170);
    y -= 8;
    const cx = M + 30, cw = W - 2 * M - 40, ch = 120, cy = y - ch;
    const vals = c.classes.flatMap((k) => k.history.map((h) => h.unit_price)).concat(1);
    const lo = Math.min(...vals) * 0.995, hi = Math.max(...vals) * 1.005;
    const px = (i: number) => cx + (i * cw) / (months.length - 1);
    const py = (v: number) => cy + ((v - lo) / (hi - lo || 1)) * ch;
    page.drawLine({ start: { x: cx, y: py(1) }, end: { x: cx + cw, y: py(1) }, thickness: 0.5, color: LINE, dashArray: [3, 3] });
    page.drawText('$1.00', { x: M - 4, y: py(1) - 3, size: 7.5, font: sans, color: MUTED });
    months.forEach((m, i) => page.drawText(MONTHS[+m.slice(5, 7) - 1], { x: px(i) - 7, y: cy - 14, size: 7.5, font: sans, color: MUTED }));
    c.classes.forEach((k, si) => {
      const color = SERIES[si % SERIES.length];
      const pts = k.history.map((h) => ({ x: px(months.indexOf(h.month)), y: py(h.unit_price) }));
      pts.forEach((p, i) => { if (i) page.drawLine({ start: pts[i - 1], end: p, thickness: 1.6, color }); page.drawCircle({ x: p.x, y: p.y, size: 2.2, color }); });
      page.drawRectangle({ x: cx + si * 140, y: cy - 32, width: 8, height: 8, color });
      page.drawText(clean(k.name), { x: cx + si * 140 + 12, y: cy - 31, size: 8, font: sans, color: INK });
    });
    y = cy - 48;
  }

  if (c.commentary.trim()) { heading('Letter from the manager'); paragraph(c.commentary); }
  if (c.market_insights.trim()) { heading('Market insights'); paragraph(c.market_insights); }

  c.classes.forEach((k) => {
    heading(k.name);
    const note = c.class_notes[k.code];
    if (note?.trim()) { paragraph(note); y -= 4; }
    if (k.holdings.length) {
      table(
        [{ label: 'Holding', w: 150 }, { label: 'Quantity', w: 90, align: 'right' }, { label: 'Price', w: 90, align: 'right' }, { label: 'Value', w: 95, align: 'right' }, { label: 'Weight', w: 74, align: 'right' }],
        [...k.holdings.map((h) => ({ cells: [h.symbol, h.quantity.toLocaleString('en-US'), localPrice(h.price, h.currency), usd(h.value), `${(h.weight * 100).toFixed(1)}%`] })),
          { cells: ['Cash', '', '', usd(k.cash), `${((k.cash / (k.nav || 1)) * 100).toFixed(1)}%`], colors: [MUTED] }],
      );
    } else {
      paragraph(`Held fully in cash (${usd(k.cash)}).`, 10, sans, MUTED);
    }
    const notes = c.position_notes[k.code] ?? {};
    Object.entries(notes).filter(([, v]) => v.trim()).forEach(([sym, v]) => {
      ensure(40);
      y -= 4;
      text(sym, M, 10.5, sansBold, GREEN);
      y -= 15;
      paragraph(v, 10, sans, INK);
    });
    if (k.trades.length) {
      ensure(40);
      y -= 6;
      text('Trading activity this month', M, 10, sansBold, MUTED);
      y -= 16;
      const shown = k.trades.slice(0, 40);
      table(
        [{ label: 'Date', w: 80 }, { label: 'Holding', w: 110 }, { label: 'Side', w: 60 }, { label: 'Quantity', w: 80, align: 'right' }, { label: 'Price', w: 85, align: 'right' }, { label: 'Amount', w: 84, align: 'right' }],
        shown.map((t) => ({
          cells: [t.date, t.symbol, t.direction === 'buy' ? 'Buy' : 'Sell', t.quantity.toLocaleString('en-US'), localPrice(t.price, t.currency), usd(t.amount)],
          colors: [undefined, undefined, t.direction === 'buy' ? POS : NEG],
        })),
      );
      if (k.trades.length > shown.length) paragraph(`Plus ${k.trades.length - shown.length} further trades.`, 8.5, sans, MUTED);
    }
  });

  ensure(90);
  y -= 16;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
  y -= 14;
  paragraph(DISCLAIMER, 7.5, sans, MUTED);

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(clean(`Arkline Trust  |  ${c.period.label}`), { x: M, y: 24, size: 7.5, font: sans, color: MUTED });
    const label = `${i + 1} / ${pages.length}`;
    p.drawText(label, { x: W - M - sans.widthOfTextAtSize(label, 7.5), y: 24, size: 7.5, font: sans, color: MUTED });
  });
  return doc.save();
}
