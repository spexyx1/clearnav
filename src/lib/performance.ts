import { supabase } from './supabase';
import { fetchAll } from './fetchAll';

export interface ClassInfo { id: string; class_code: string | null; class_name: string; currency: string | null }

interface NavRow {
  id: string;
  share_class_id: string | null;
  nav_date: string;
  version: number | null;
  status: string;
  net_asset_value: number | null;
  nav_per_share: number | null;
  calculation_method: string | null;
  calculation_data: { final?: boolean; track_record?: boolean } | null;
}

export type MonthState = 'confirmed' | 'approved_not_final' | 'draft' | 'missing';

export interface MonthPoint {
  month: string;
  date: string | null;
  state: MonthState;
  price: number | null;
  nav: number | null;
  ret: number | null;
}

export interface PeriodResult {
  type: 'monthly' | 'quarterly' | 'yearly' | 'inception_to_date';
  label: string;
  endDate: string;
  months: string[];
  ret: number;
  beginNav: number | null;
  endNav: number | null;
  partial: boolean;
}

export interface SeriesStats {
  confirmedMonths: number;
  sinceInception: number | null;
  asAt: string | null;
  annualised: number | null;
  best: { month: string; ret: number } | null;
  worst: { month: string; ret: number } | null;
  volatility: number | null;
  maxDrawdown: number | null;
}

export interface Series {
  key: string;
  classId: string | null;
  name: string;
  currency: string;
  months: MonthPoint[];
  periods: PeriodResult[];
  stats: SeriesStats;
  awaiting: MonthPoint[];
}

export interface PerformanceData { classes: Series[]; trust: Series; monthList: string[] }

const monthEnd = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
};

const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

const isConfirmed = (r: NavRow) => r.status === 'approved' && r.calculation_data?.final === true && r.calculation_data?.track_record !== true;

function stateOf(r: NavRow | undefined): MonthState {
  if (!r) return 'missing';
  if (isConfirmed(r)) return 'confirmed';
  if (r.status === 'approved') return 'approved_not_final';
  return 'draft';
}

const compound = (rets: number[]) => rets.reduce((acc, r) => acc * (1 + r), 1) - 1;

function quarterOf(m: string) {
  const q = Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1;
  return { key: `${m.slice(0, 4)}-Q${q}`, label: `Q${q} ${m.slice(0, 4)}`, end: monthEnd(`${m.slice(0, 4)}-${String(q * 3).padStart(2, '0')}`) };
}

function financialYearOf(m: string) {
  const y = Number(m.slice(0, 4));
  const fy = Number(m.slice(5, 7)) >= 7 ? y + 1 : y;
  return { key: `FY${fy}`, label: `FY${fy} (Jul ${fy - 1} to Jun ${fy})`, end: `${fy}-06-30` };
}

function buildPeriods(points: MonthPoint[], allMonths: string[], openingNav: number | null): PeriodResult[] {
  const out: PeriodResult[] = [];
  const lastMonth = allMonths[allMonths.length - 1];
  const navBefore = (i: number) => (i > 0 ? points[i - 1].nav : openingNav);

  points.forEach((p, i) => {
    if (p.ret == null || !p.date) return;
    out.push({ type: 'monthly', label: monthLabel(p.month), endDate: p.date, months: [p.month], ret: p.ret, beginNav: navBefore(i), endNav: p.nav, partial: false });
  });

  for (const [type, groupOf] of [['quarterly', quarterOf], ['yearly', financialYearOf]] as const) {
    const groups = new Map<string, { label: string; end: string; idx: number[] }>();
    points.forEach((p, i) => {
      const g = groupOf(p.month);
      const cur = groups.get(g.key) ?? { label: g.label, end: g.end, idx: [] };
      cur.idx.push(i);
      groups.set(g.key, cur);
    });
    for (const g of groups.values()) {
      const pts = g.idx.map((i) => points[i]);
      if (pts.some((p) => p.ret == null)) continue;
      const last = pts[pts.length - 1];
      out.push({
        type, label: g.label, endDate: g.end, months: pts.map((p) => p.month), ret: compound(pts.map((p) => p.ret as number)),
        beginNav: navBefore(g.idx[0]), endNav: last.nav, partial: last.month === lastMonth && last.date !== g.end,
      });
    }
  }

  const run: MonthPoint[] = [];
  for (const p of points) { if (p.ret == null) break; run.push(p); }
  if (run.length) {
    const last = run[run.length - 1];
    out.push({
      type: 'inception_to_date', label: `Since inception to ${monthLabel(last.month)}`, endDate: last.date as string,
      months: run.map((p) => p.month), ret: compound(run.map((p) => p.ret as number)), beginNav: openingNav, endNav: last.nav, partial: false,
    });
  }
  return out;
}

function statsOf(points: MonthPoint[], periods: PeriodResult[]): SeriesStats {
  const rets = points.filter((p) => p.ret != null) as (MonthPoint & { ret: number })[];
  const itd = periods.find((p) => p.type === 'inception_to_date') ?? null;
  const best = rets.length ? rets.reduce((a, b) => (b.ret > a.ret ? b : a)) : null;
  const worst = rets.length ? rets.reduce((a, b) => (b.ret < a.ret ? b : a)) : null;

  let volatility: number | null = null;
  if (rets.length >= 2) {
    const mean = rets.reduce((s, p) => s + p.ret, 0) / rets.length;
    const variance = rets.reduce((s, p) => s + (p.ret - mean) ** 2, 0) / (rets.length - 1);
    volatility = Math.sqrt(variance) * Math.sqrt(12);
  }

  let maxDrawdown: number | null = null;
  if (itd) {
    let index = 1, peak = 1, dd = 0;
    for (const m of itd.months) {
      const p = points.find((x) => x.month === m);
      index *= 1 + (p?.ret ?? 0);
      peak = Math.max(peak, index);
      dd = Math.min(dd, index / peak - 1);
    }
    maxDrawdown = dd;
  }

  const n = itd?.months.length ?? 0;
  return {
    confirmedMonths: rets.length,
    sinceInception: itd?.ret ?? null,
    asAt: itd?.endDate ?? null,
    annualised: itd && n >= 12 ? (1 + itd.ret) ** (12 / n) - 1 : null,
    best: best ? { month: best.month, ret: best.ret } : null,
    worst: worst ? { month: worst.month, ret: worst.ret } : null,
    volatility,
    maxDrawdown,
  };
}

export async function loadPerformance(fundId: string): Promise<PerformanceData> {
  const [clsRes, fundRes, rows] = await Promise.all([
    supabase.from('share_classes').select('id, class_code, class_name, currency').eq('fund_id', fundId).order('class_code'),
    supabase.from('funds').select('base_currency').eq('id', fundId).maybeSingle(),
    fetchAll<NavRow>(() => supabase.from('nav_calculations')
      .select('id, share_class_id, nav_date, version, status, net_asset_value, nav_per_share, calculation_method, calculation_data')
      .eq('fund_id', fundId).in('calculation_method', ['opening', 'broker_statement']).neq('status', 'superseded')
      .order('nav_date').order('id')),
  ]);
  if (clsRes.error) throw new Error('Could not load the share classes.');
  const classes = (clsRes.data ?? []) as ClassInfo[];
  const fundCurrency = (fundRes.data as { base_currency?: string } | null)?.base_currency || 'USD';

  const latest = new Map<string, NavRow>();
  const opening = new Map<string, NavRow>();
  for (const r of rows) {
    if (!r.share_class_id) continue;
    if (r.calculation_method === 'opening') {
      const cur = opening.get(r.share_class_id);
      if (!cur || r.nav_date < cur.nav_date) opening.set(r.share_class_id, r);
      continue;
    }
    if (r.calculation_data?.track_record === true) continue;
    const key = `${r.share_class_id}|${r.nav_date.slice(0, 7)}`;
    const cur = latest.get(key);
    if (!cur || (r.version ?? 0) > (cur.version ?? 0) || ((r.version ?? 0) === (cur.version ?? 0) && r.nav_date > cur.nav_date)) latest.set(key, r);
  }

  const monthsSeen = [...latest.keys()].map((k) => k.split('|')[1]).sort();
  const openingMonths = [...opening.values()].map((r) => r.nav_date.slice(0, 7)).sort();
  const first = openingMonths[0] ?? monthsSeen[0];
  const last = monthsSeen[monthsSeen.length - 1];
  const monthList: string[] = [];
  if (first && last) for (let m = first; m <= last; m = nextMonth(m)) monthList.push(m);

  const classSeries: Series[] = classes.map((c) => {
    const open = opening.get(c.id);
    let prevPrice: number | null = open && open.nav_per_share != null ? Number(open.nav_per_share) : null;
    let prevConfirmed = !!open;
    const points: MonthPoint[] = monthList.map((m) => {
      const r = latest.get(`${c.id}|${m}`);
      const state = stateOf(r);
      const price = r?.nav_per_share != null ? Number(r.nav_per_share) : null;
      const ret = state === 'confirmed' && prevConfirmed && prevPrice && price != null ? price / prevPrice - 1 : null;
      prevConfirmed = state === 'confirmed';
      prevPrice = price;
      return { month: m, date: r?.nav_date ?? null, state, price, nav: r?.net_asset_value != null ? Number(r.net_asset_value) : null, ret };
    });
    const periods = buildPeriods(points, monthList, open?.net_asset_value != null ? Number(open.net_asset_value) : null);
    return {
      key: c.id, classId: c.id, name: c.class_code ? `${c.class_code} · ${c.class_name}` : c.class_name,
      currency: c.currency || fundCurrency, months: points, periods, stats: statsOf(points, periods),
      awaiting: points.filter((p) => p.state !== 'confirmed'),
    };
  });

  const openingTotal = classes.reduce((s, c) => s + Number(opening.get(c.id)?.net_asset_value ?? 0), 0);
  const trustPoints: MonthPoint[] = monthList.map((m, i) => {
    const pts = classSeries.map((s) => ({ s, p: s.months[i] }));
    const allConfirmed = pts.length > 0 && pts.every(({ p }) => p.state === 'confirmed');
    const nav = pts.reduce((sum, { p }) => sum + (p.nav ?? 0), 0);
    let ret: number | null = null;
    if (allConfirmed && pts.every(({ p }) => p.ret != null)) {
      const weights = pts.map(({ s, p }) => {
        const before = i > 0 ? s.months[i - 1].nav : Number(opening.get(s.classId as string)?.net_asset_value ?? 0);
        return { w: before ?? 0, r: p.ret as number };
      });
      const total = weights.reduce((sum, x) => sum + x.w, 0);
      ret = total > 0 ? weights.reduce((sum, x) => sum + x.w * x.r, 0) / total : null;
    }
    const dates = pts.map(({ p }) => p.date).filter(Boolean) as string[];
    const state: MonthState = allConfirmed ? 'confirmed'
      : pts.some(({ p }) => p.state === 'missing') ? 'missing'
      : pts.some(({ p }) => p.state === 'draft') ? 'draft' : 'approved_not_final';
    return { month: m, date: dates.length ? dates.sort()[dates.length - 1] : null, state, price: null, nav: dates.length ? nav : null, ret };
  });
  const trustPeriods = buildPeriods(trustPoints, monthList, openingTotal || null);
  const trust: Series = {
    key: 'trust', classId: null, name: 'Whole trust', currency: fundCurrency, months: trustPoints, periods: trustPeriods,
    stats: statsOf(trustPoints, trustPeriods), awaiting: trustPoints.filter((p) => p.state !== 'confirmed'),
  };

  return { classes: classSeries, trust, monthList };
}

export async function savePerformance(tenantId: string, fundId: string, data: PerformanceData): Promise<number> {
  const now = new Date().toISOString();
  const rows = [...data.classes, data.trust].flatMap((s) => s.periods.map((p) => ({
    tenant_id: tenantId,
    fund_id: fundId,
    share_class_id: s.classId,
    period_type: p.type,
    metric_date: p.endDate,
    beginning_nav: p.beginNav,
    ending_nav: p.endNav,
    total_return_percent: p.ret * 100,
    total_return_amount: p.beginNav != null ? p.beginNav * p.ret : null,
    volatility: p.type === 'inception_to_date' && s.stats.volatility != null ? s.stats.volatility * 100 : null,
    max_drawdown: p.type === 'inception_to_date' && s.stats.maxDrawdown != null ? s.stats.maxDrawdown * 100 : null,
    calculation_notes: { source: 'ibkr_final', months: p.months, partial: p.partial, label: p.label, calculated_at: now },
  })));
  if (!rows.length) return 0;
  const { error } = await supabase.from('performance_metrics').upsert(rows, { onConflict: 'fund_id,share_class_id,period_type,metric_date' });
  if (error) throw new Error('Could not save the results. Please try again.');
  return rows.length;
}

export const STATE_LABEL: Record<MonthState, string> = {
  confirmed: 'Final, IBKR confirmed',
  approved_not_final: 'Approved, awaiting IBKR confirmation',
  draft: 'Draft, awaiting IBKR confirmation',
  missing: 'No price yet',
};
