import { roundTo as round } from './money';
import type { Movement } from './fundValuation';

export interface UnitSeries {
  n: number;
  start: string;
  startPrice: number;
  units: number;
  price: number;
  hwm: number;
  issued: number;
  redeemed: number;
}

export interface SeriesValue {
  n: number;
  start: string;
  startPrice: number;
  units: number;
  price: number;
  value: number;
  hwm: number;
  issued: number;
  redeemed: number;
}

export const seriesValue = (s: UnitSeries): SeriesValue => ({
  n: s.n, start: s.start, startPrice: s.startPrice, units: round(s.units, 4), price: round(s.price, 6), value: round(s.units * s.price),
  hwm: round(s.hwm, 6), issued: round(s.issued, 4), redeemed: round(s.redeemed, 4),
});

interface DealContext {
  month: string;
  prevValue: number;
  flows: number;
  accountValue: number;
  launchPrice: number;
  consolidate: boolean;
  nextN: () => number;
}

const money = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Investor money is dealt at month-end: existing series earn the class return, then
// withdrawals cancel units oldest series first, then new money opens a new series at the launch price.
export function dealSeries(current: UnitSeries[], moves: Movement[], ctx: DealContext) {
  const series = current.map((s) => ({ ...s, issued: 0, redeemed: 0 }));
  const problems: string[] = [];
  const notes: string[] = [];
  let issued = 0;
  let redeemed = 0;
  const monthReturn = series.length && ctx.prevValue > 0.01 ? (ctx.accountValue - ctx.prevValue - ctx.flows) / ctx.prevValue : 0;
  series.forEach((s) => { s.price *= 1 + monthReturn; });

  if (!series.length) {
    if (ctx.flows > 0.01) {
      const u = ctx.flows / ctx.launchPrice;
      series.push({ n: ctx.nextN(), start: ctx.month, startPrice: ctx.launchPrice, units: u, price: ctx.accountValue / u, hwm: ctx.launchPrice, issued: u, redeemed: 0 });
      issued = u;
      moves.forEach((x) => { x.dealPrice = ctx.launchPrice; x.units = round(x.amount / ctx.launchPrice, 4); });
    } else if (ctx.accountValue > 0.01) {
      problems.push(`The class holds ${money(ctx.accountValue)} but no investor money has been recorded, so no units exist yet.`);
    }
    return { series, issued, redeemed, monthReturn, problems, notes };
  }

  moves.filter((x) => x.amount < 0).forEach((x) => {
    let left = -x.amount;
    let cancelled = 0;
    for (const s of series) {
      if (left <= 1e-9) break;
      if (s.price <= 0 || s.units <= 1e-9) continue;
      const v = Math.min(left, s.units * s.price);
      const u = v / s.price;
      s.units -= u;
      s.redeemed += u;
      cancelled += u;
      left -= v;
    }
    if (left > 0.01) problems.push(`${money(-x.amount)} left the class on ${x.date}, which is more than the units on issue were worth.`);
    x.units = -round(cancelled, 4);
    x.dealPrice = cancelled > 0 ? round((-x.amount - left) / cancelled, 6) : undefined;
    redeemed += cancelled;
  });

  const ins = moves.filter((x) => x.amount > 0);
  const newMoney = ins.reduce((s, x) => s + x.amount, 0);
  if (newMoney > 0.005) {
    const u = newMoney / ctx.launchPrice;
    series.push({ n: ctx.nextN(), start: ctx.month, startPrice: ctx.launchPrice, units: u, price: ctx.launchPrice, hwm: ctx.launchPrice, issued: u, redeemed: 0 });
    issued += u;
    ins.forEach((x) => { x.dealPrice = ctx.launchPrice; x.units = round(x.amount / ctx.launchPrice, 4); });
  }

  if (ctx.month.endsWith('-12')) {
    const lead = series.find((s) => s.units > 1e-6);
    if (ctx.consolidate && lead && lead.price >= lead.hwm - 1e-9) {
      series.filter((s) => s !== lead && s.units > 1e-6 && s.start !== ctx.month && s.price >= s.hwm - 1e-9).forEach((s) => {
        const add = (s.units * s.price) / lead.price;
        notes.push(`Year-end ${ctx.month.slice(0, 4)}: Series ${s.n} (${s.units.toFixed(4)} units at ${s.price.toFixed(6)}) was above its high-water mark and was merged into Series ${lead.n} as ${add.toFixed(4)} units. Its value did not change.`);
        redeemed += s.units;
        s.redeemed += s.units;
        s.units = 0;
        lead.units += add;
        lead.issued += add;
        issued += add;
      });
    }
    series.forEach((s) => { s.hwm = Math.max(s.hwm, s.price); });
  }

  return { series: series.filter((s) => s.units > 1e-6), issued, redeemed, monthReturn, problems, notes };
}
