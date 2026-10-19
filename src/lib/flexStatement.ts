import { emptyStatement, normalizeDate, type CashEventType, type ParsedStatement } from './statementParser';

const num = (v: string | null | undefined) => {
  if (v == null || v === '') return NaN;
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const day = (v: string | null | undefined) => normalizeDate((v || '').split(/[;,\s]/)[0]);

function cashType(type: string, amount: number): CashEventType {
  const t = type.toLowerCase();
  if (/withholding/.test(t)) return 'withholding';
  if (/dividend|in lieu/.test(t)) return 'dividend';
  if (/interest/.test(t)) return 'interest';
  if (/deposit|withdraw/.test(t)) return amount >= 0 ? 'deposit' : 'withdrawal';
  return 'fee';
}

export function isFlexXml(text: string) {
  return /<FlexQueryResponse[\s>]/.test(text.slice(0, 4000));
}

export function parseFlexXml(xml: string): ParsedStatement {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('The IBKR data could not be read.');
  const out = emptyStatement('ibkr_flex');
  const accounts = new Set<string>();
  const nonBase = new Set<string>();
  const fxDates: Record<string, string> = {};

  doc.querySelectorAll('FlexStatement').forEach((st) => {
    const acct = st.getAttribute('accountId') || '';
    if (!acct) return;
    accounts.add(acct);
    const s = (out.summaries[acct] ??= { account: acct });
    const from = day(st.getAttribute('fromDate'));
    const to = day(st.getAttribute('toDate'));
    if (from && (!out.periodStart || from < out.periodStart)) out.periodStart = from;
    if (to && (!out.periodEnd || to > out.periodEnd)) out.periodEnd = to;
    const info = st.querySelector('AccountInformation');
    if (info?.getAttribute('name')) s.name = info.getAttribute('name')!;
    const attr = (el: Element, ...names: string[]) => names.map((n) => el.getAttribute(n)).find((v) => v != null && v !== '') ?? '';

    const navByDate: Record<string, number> = {};
    const cashByDate: Record<string, number> = {};
    st.querySelectorAll('EquitySummaryByReportDateInBase').forEach((e) => {
      const d = day(e.getAttribute('reportDate'));
      const total = num(e.getAttribute('total'));
      if (!d || Number.isNaN(total)) return;
      navByDate[d] = total;
      const c = num(e.getAttribute('cash'));
      if (!Number.isNaN(c)) cashByDate[d] = c;
    });
    const navDates = Object.keys(navByDate).sort();
    if (navDates.length) {
      s.navByDate = navByDate;
      s.cashByDate = cashByDate;
      const before = navDates.filter((d) => from && d < from).pop();
      if (before) s.priorNav = navByDate[before];
      s.currentNav = navByDate[navDates[navDates.length - 1]];
    }

    st.querySelectorAll('CashReportCurrency').forEach((c) => {
      if (!/BASE_SUMMARY/i.test(c.getAttribute('currency') || '')) return;
      const a = num(c.getAttribute('startingCash'));
      const b = num(c.getAttribute('endingCash'));
      if (!Number.isNaN(a)) s.startingCash = a;
      if (!Number.isNaN(b)) s.endingCash = b;
    });

    st.querySelectorAll('OpenPosition').forEach((p) => {
      const lvl = p.getAttribute('levelOfDetail');
      if (lvl && lvl !== 'SUMMARY') return;
      const qty = num(p.getAttribute('position'));
      const symbol = p.getAttribute('symbol') || '';
      if (!symbol || Number.isNaN(qty)) return;
      const mult = num(p.getAttribute('multiplier'));
      out.positions.push({
        account: acct, symbol, assetCategory: p.getAttribute('assetCategory') || '', currency: p.getAttribute('currency') || 'USD',
        quantity: qty, multiplier: Number.isNaN(mult) || mult === 0 ? 1 : mult,
        closePrice: num(p.getAttribute('markPrice')) || 0, value: num(p.getAttribute('positionValue')) || 0, costBasis: num(p.getAttribute('costBasisMoney')) || 0,
      });
    });

    const trades = [...st.querySelectorAll('Trade')];
    const level = ['ORDER', 'EXECUTION'].find((l) => trades.some((t) => t.getAttribute('levelOfDetail') === l));
    trades.filter((t) => !level || t.getAttribute('levelOfDetail') === level).forEach((t) => {
      const assetCategory = t.getAttribute('assetCategory') || '';
      if (/^cash$|forex/i.test(assetCategory)) return;
      const qty = num(t.getAttribute('quantity'));
      const date = day(attr(t, 'tradeDate', 'dateTime'));
      const symbol = t.getAttribute('symbol') || '';
      if (!date || !symbol || Number.isNaN(qty) || qty === 0) return;
      const price = num(t.getAttribute('tradePrice')) || 0;
      const mult = num(t.getAttribute('multiplier')) || 1;
      const proceeds = num(t.getAttribute('proceeds'));
      const comm = num(t.getAttribute('ibCommission'));
      const notes = (t.getAttribute('notes') || '').split(/[;,\s]+/);
      const oc = t.getAttribute('openCloseIndicator') || '';
      const currency = t.getAttribute('currency') || 'USD';
      if (currency !== 'USD') nonBase.add(currency);
      out.trades.push({
        account: acct, date, symbol, assetCategory, currency, direction: qty > 0 ? 'buy' : 'sell', quantity: Math.abs(qty), price,
        proceeds: Number.isNaN(proceeds) ? -qty * price * mult : proceeds, fees: Number.isNaN(comm) ? 0 : Math.abs(comm),
        realizedPl: num(t.getAttribute('fifoPnlRealized')) || 0, multiplier: mult,
        action: notes.includes('Ep') ? 'expired' : notes.includes('A') ? 'assigned' : notes.includes('Ex') ? 'exercised' : oc === 'O' ? 'open' : oc === 'C' ? 'close' : 'trade',
      });
    });

    const cashTx = [...st.querySelectorAll('CashTransaction')];
    const hasDetail = cashTx.some((c) => c.getAttribute('levelOfDetail') === 'DETAIL');
    cashTx.filter((c) => !hasDetail || c.getAttribute('levelOfDetail') === 'DETAIL').forEach((c) => {
      const amount = num(c.getAttribute('amount'));
      const date = day(attr(c, 'dateTime', 'reportDate', 'settleDate'));
      if (Number.isNaN(amount) || !date || amount === 0) return;
      const currency = c.getAttribute('currency') || 'USD';
      if (currency !== 'USD') nonBase.add(currency);
      out.cashEvents.push({ account: acct, date, type: cashType(c.getAttribute('type') || '', amount), description: c.getAttribute('description') || c.getAttribute('type') || 'Cash', currency, amount });
    });

    st.querySelectorAll('Transfer').forEach((t) => {
      const date = day(attr(t, 'date', 'reportDate', 'dateTime'));
      if (!date) return;
      const outgoing = /out/i.test(t.getAttribute('direction') || '');
      const internal = /internal/i.test(t.getAttribute('type') || '');
      const assetCategory = t.getAttribute('assetCategory') || '';
      const currency = t.getAttribute('currency') || 'USD';
      const qty = num(t.getAttribute('quantity'));
      const symbol = t.getAttribute('symbol') || '';
      if (symbol && symbol !== '--' && !/^cash$/i.test(assetCategory) && !Number.isNaN(qty) && qty !== 0) {
        const tp = num(t.getAttribute('transferPrice'));
        const amt = num(t.getAttribute('positionAmount'));
        out.trades.push({
          account: acct, date, symbol, assetCategory: assetCategory || 'STK', currency,
          direction: outgoing || qty < 0 ? 'sell' : 'buy', quantity: Math.abs(qty),
          price: tp > 0 ? tp : !Number.isNaN(amt) ? Math.abs(amt / qty) : 0, proceeds: 0, fees: 0, realizedPl: 0,
          multiplier: /opt/i.test(assetCategory) ? 100 : 1, action: 'transfer',
        });
        return;
      }
      const amount = num(attr(t, 'cashTransfer', 'positionAmount', 'quantity'));
      if (Number.isNaN(amount) || amount === 0) return;
      const signed = outgoing ? -Math.abs(amount) : amount;
      out.cashEvents.push({ account: acct, date, type: signed >= 0 ? 'deposit' : 'withdrawal', description: `${internal ? 'Internal transfer' : 'Transfer'} ${t.getAttribute('account') || ''}`.trim(), currency, amount: signed, internal });
    });

    st.querySelectorAll('CorporateAction').forEach((c) => {
      const symbol = c.getAttribute('symbol') || '';
      const qty = num(c.getAttribute('quantity'));
      const date = day(attr(c, 'reportDate', 'dateTime'));
      if (!symbol || !date || Number.isNaN(qty)) return;
      const value = num(c.getAttribute('value'));
      const proceeds = num(c.getAttribute('proceeds'));
      out.trades.push({
        account: acct, date, symbol, assetCategory: c.getAttribute('assetCategory') || 'STK', currency: c.getAttribute('currency') || 'USD',
        direction: qty >= 0 ? 'buy' : 'sell', quantity: Math.abs(qty), price: qty && !Number.isNaN(value) ? Math.abs(value / qty) : 0,
        proceeds: Number.isNaN(proceeds) ? 0 : proceeds, fees: 0, realizedPl: 0, multiplier: 1, action: 'corporate_action',
      });
    });

    st.querySelectorAll('ConversionRate').forEach((r) => {
      const from = (r.getAttribute('fromCurrency') || '').toUpperCase();
      const to = (r.getAttribute('toCurrency') || '').toUpperCase();
      const rate = num(r.getAttribute('rate'));
      const d = day(r.getAttribute('reportDate')) || '';
      if (to !== 'USD' || !/^[A-Z]{3}$/.test(from) || !(rate > 0)) return;
      if (!fxDates[from] || d >= fxDates[from]) { fxDates[from] = d; out.fxRates[from] = rate; }
    });
  });

  out.accounts = [...accounts];
  if (!out.accounts.length) throw new Error('The IBKR data did not contain any accounts. Check that the Flex query includes Account Information.');
  out.cashEvents.forEach((e) => {
    if ((e.type === 'deposit' || e.type === 'withdrawal') && !e.internal && out.accounts.some((a) => a !== e.account && e.description.includes(a))) e.internal = true;
  });
  if (!out.accounts.some((a) => out.summaries[a]?.navByDate)) {
    out.warnings.push('The Flex query has no daily account value section, so months are only checked against the broker at the end of the period. Add "Net Asset Value (NAV) in Base" to the query for a check every month.');
  }
  if (nonBase.size) out.warnings.push(`Some activity is in ${[...nonBase].join(', ')}. It is converted to US dollars using the broker's exchange rates.`);
  return out;
}
