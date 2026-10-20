import { supabase } from './supabase';
import { loadFundData, valueFund } from './fundValuation';
import { monthEnd } from './statementParser';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface ReportHolding { symbol: string; quantity: number; price: number; value: number; weight: number; currency?: string }
export interface ReportTrade { date: string; symbol: string; direction: 'buy' | 'sell'; quantity: number; price: number; amount: number; currency?: string; local_amount?: number }

export interface ReportClass {
  class_id: string;
  code: string;
  name: string;
  unit_price: number;
  prev_unit_price: number;
  month_return: number;
  ytd_return: number;
  since_inception: number;
  nav: number;
  units: number;
  cash: number;
  opening_value?: number;
  flows?: number;
  income?: number;
  fees?: number;
  month_gain?: number;
  status: 'approved' | 'draft' | 'unsaved';
  holdings: ReportHolding[];
  trades: ReportTrade[];
  history: { month: string; unit_price: number }[];
}

export interface ReportContent {
  version: 2;
  fund_name: string;
  period: { year: number; month: number; label: string; start: string; end: string };
  generated_at: string;
  classes: ReportClass[];
  commentary: string;
  market_insights: string;
  class_notes: Record<string, string>;
  position_notes: Record<string, Record<string, string>>;
}

export interface InvestorLine {
  name: string;
  email: string;
  lines: { code: string; name: string; units: number; value: number; month_gain: number; invested: number; total_gain: number }[];
  total: number;
  month_gain: number;
  total_gain: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export async function buildReportNumbers(fundId: string, fundName: string, year: number, month: number) {
  const mk = `${year}-${String(month).padStart(2, '0')}`;
  const data = await loadFundData(fundId);
  const valuations = valueFund(data);
  const { data: navs, error } = await supabase.from('nav_calculations')
    .select('share_class_id, nav_date, status').eq('fund_id', fundId).neq('calculation_method', 'opening');
  if (error) throw new Error(error.message);

  const classes: ReportClass[] = [];
  for (const cls of data.classes) {
    const v = valuations.find((x) => x.classId === cls.id);
    const hist = (v?.months ?? []).filter((m) => m.month <= mk);
    const cur = hist[hist.length - 1];
    if (!cur || cur.month !== mk) continue;
    const prev = hist[hist.length - 2];
    const yearStart = hist.filter((m) => m.month < `${year}-01`).pop();
    const ytdBase = yearStart?.unitPrice ?? cls.startPrice;
    const rows = (navs ?? []).filter((n) => n.share_class_id === cls.id && n.nav_date === cur.date);
    const status = rows.some((n) => n.status === 'approved') ? 'approved' : rows.length ? 'draft' : 'unsaved';
    const uploadIds = data.uploads.filter((u) => u.share_class_id === cls.id && u.upload_year === year && u.upload_month === month).map((u) => u.id);
    const trades: ReportTrade[] = data.items
      .filter((i) => uploadIds.includes(i.upload_id))
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .map((i) => {
        const local = Math.abs(i.proceeds != null ? Number(i.proceeds) : Number(i.quantity) * Number(i.price) * (Number(i.multiplier) || 1));
        const currency = (i.currency || cur.holdings.find((h) => h.symbol === i.instrument)?.currency || 'USD').toUpperCase();
        const fx = (i.id ? cur.tradeFx[i.id] : undefined) ?? (currency === 'USD' ? 1 : 0);
        return {
          date: i.trade_date, symbol: i.instrument, direction: i.direction, quantity: Number(i.quantity), price: Number(i.price),
          amount: r2(local * fx), currency, local_amount: r2(local),
        };
      });
    const total = cur.accountValue || 1;
    classes.push({
      class_id: cls.id,
      code: cls.class_code,
      name: cls.class_name,
      unit_price: cur.unitPrice,
      prev_unit_price: prev?.unitPrice ?? cls.startPrice,
      month_return: cur.monthReturn,
      ytd_return: cur.unitPrice / ytdBase - 1,
      since_inception: cur.unitPrice / cls.startPrice - 1,
      nav: cur.classNav,
      units: cur.units,
      cash: cur.cash,
      opening_value: cur.openingValue,
      flows: cur.flows,
      income: cur.income,
      fees: cur.fees,
      month_gain: r2(cur.accountValue - cur.openingValue - cur.flows),
      status,
      holdings: cur.holdings.map((h) => ({ symbol: h.symbol, quantity: h.quantity, price: h.price, value: h.marketValue, weight: h.marketValue / total, currency: h.currency })),
      trades,
      history: hist.map((m) => ({ month: m.month, unit_price: m.unitPrice })),
    });
  }
  return {
    fund_name: fundName,
    period: { year, month, label: `${MONTH_NAMES[month - 1]} ${year}`, start: `${mk}-01`, end: monthEnd(year, month) },
    generated_at: new Date().toISOString(),
    classes,
  };
}

export function emptyNarrative(): Pick<ReportContent, 'commentary' | 'market_insights' | 'class_notes' | 'position_notes'> {
  return { commentary: '', market_insights: '', class_notes: {}, position_notes: {} };
}

export async function loadInvestors(fundId: string, content: ReportContent): Promise<InvestorLine[]> {
  const { data: accts, error } = await supabase.from('capital_accounts').select('investor_id, share_class_id, shares_owned, cost_basis')
    .eq('fund_id', fundId).eq('status', 'active').gt('shares_owned', 0);
  if (error) throw new Error(error.message);
  const ids = [...new Set((accts ?? []).map((a) => a.investor_id).filter(Boolean))];
  if (!ids.length) return [];
  const { data: people, error: pErr } = await supabase.from('client_profiles').select('id, full_name, email').in('id', ids);
  if (pErr) throw new Error(pErr.message);
  return (people ?? []).filter((p) => p.email).map((p) => {
    const lines = (accts ?? []).filter((a) => a.investor_id === p.id).flatMap((a) => {
      const c = content.classes.find((x) => x.class_id === a.share_class_id);
      if (!c) return [];
      const units = Number(a.shares_owned || 0);
      const value = r2(units * c.unit_price);
      const invested = Number(a.cost_basis || 0);
      return [{ code: c.code, name: c.name, units, value, month_gain: r2(units * (c.unit_price - c.prev_unit_price)), invested, total_gain: r2(value - invested) }];
    });
    const sum = (k: 'value' | 'month_gain' | 'total_gain') => r2(lines.reduce((s, l) => s + l[k], 0));
    return { name: p.full_name || 'Investor', email: p.email, lines, total: sum('value'), month_gain: sum('month_gain'), total_gain: sum('total_gain') };
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const usd = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const signedUsd = (v: number) => `${v >= 0 ? '+' : '-'}${usd(Math.abs(v))}`;

export function reportEmailHtml(content: ReportContent, investor: InvestorLine | null) {
  const rows = content.classes.map((c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e7e2d6;color:#1f2a24">${esc(c.name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e7e2d6;text-align:right;color:#1f2a24">$${c.unit_price.toFixed(4)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e7e2d6;text-align:right;color:${c.month_return >= 0 ? '#1d6b3f' : '#b42318'}">${pct(c.month_return)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e7e2d6;text-align:right;color:${c.ytd_return >= 0 ? '#1d6b3f' : '#b42318'}">${pct(c.ytd_return)}</td>
    </tr>`).join('');
  const gainCell = (v: number) => `<span style="color:${v >= 0 ? '#1d6b3f' : '#b42318'}">${signedUsd(v)}</span>`;
  const holding = investor && investor.lines.length ? `
    <p style="margin:24px 0 8px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#8a7433">Your holding</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:4px 0;color:#7b847f;font-size:12px"></td><td style="padding:4px 0;text-align:right;color:#7b847f;font-size:12px">Value</td><td style="padding:4px 0;text-align:right;color:#7b847f;font-size:12px">This month</td><td style="padding:4px 0;text-align:right;color:#7b847f;font-size:12px">Since you invested</td></tr>
      ${investor.lines.map((l) => `<tr><td style="padding:6px 0;color:#1f2a24">${esc(l.name)}<br/><span style="font-size:12px;color:#7b847f">${l.units.toLocaleString('en-US', { maximumFractionDigits: 4 })} units</span></td><td style="padding:6px 0;text-align:right;color:#1f2a24">${usd(l.value)}</td><td style="padding:6px 0;text-align:right">${gainCell(l.month_gain)}</td><td style="padding:6px 0;text-align:right">${gainCell(l.total_gain)}</td></tr>`).join('')}
      <tr><td style="padding:8px 0;border-top:1px solid #e7e2d6;font-weight:bold;color:#1f2a24">Total</td><td style="padding:8px 0;border-top:1px solid #e7e2d6;text-align:right;font-weight:bold;color:#1f2a24">${usd(investor.total)}</td><td style="padding:8px 0;border-top:1px solid #e7e2d6;text-align:right;font-weight:bold">${gainCell(investor.month_gain)}</td><td style="padding:8px 0;border-top:1px solid #e7e2d6;text-align:right;font-weight:bold">${gainCell(investor.total_gain)}</td></tr>
    </table>` : '';
  const intro = content.commentary.trim().split(/\n\s*\n/)[0] ?? '';
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
    <tr><td style="background:#1a3c2a;padding:32px 36px">
      <div style="width:56px;height:3px;background:#c9a84c;margin-bottom:18px"></div>
      <div style="font-size:24px;letter-spacing:3px;color:#ffffff">ARKLINE TRUST</div>
      <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;margin-top:8px">Monthly Update &middot; ${esc(content.period.label)}</div>
    </td></tr>
    <tr><td style="padding:32px 36px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#33403a">
      <p style="margin:0 0 16px">Dear ${esc(investor?.name ?? 'Investor')},</p>
      <p style="margin:0 0 16px">${intro ? esc(intro) : `Please find attached the ${esc(content.fund_name)} update for ${esc(content.period.label)}.`}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
        <tr style="background:#f7f4ec"><th style="padding:10px 12px;text-align:left;color:#55615a;font-weight:normal">Class</th><th style="padding:10px 12px;text-align:right;color:#55615a;font-weight:normal">Unit price</th><th style="padding:10px 12px;text-align:right;color:#55615a;font-weight:normal">Month</th><th style="padding:10px 12px;text-align:right;color:#55615a;font-weight:normal">Year to date</th></tr>
        ${rows}
      </table>
      ${holding}
      <p style="margin:24px 0 0">The full report is attached and is also available in your investor vault.</p>
      <p style="margin:24px 0 0">Kind regards,<br/>Arkline Trust</p>
    </td></tr>
    <tr><td style="padding:20px 36px;background:#f7f4ec;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#7b847f">
      This message is confidential and intended solely for the addressee. Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal.
    </td></tr>
  </table></td></tr></table></body></html>`;
}
