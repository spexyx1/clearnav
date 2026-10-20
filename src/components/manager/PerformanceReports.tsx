import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Calculator, CheckCircle2, Clock, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { useTenantId } from '../../lib/useTenantId';
import { formatPct } from '../../lib/format';
import { STATE_LABEL, loadPerformance, monthLabel, savePerformance, type PerformanceData, type PeriodResult, type Series } from '../../lib/performance';
import TenantNotice from './TenantNotice';
import { PanelLoader } from '../shared/Spinner';
import { FundSelect, PageHeader, Stat, useFunds } from './history/useFunds';
import { Button, Empty, Pill, Section, card, usd } from './onboarding/ui';

type PeriodView = 'monthly' | 'quarterly' | 'yearly';
const VIEWS: { id: PeriodView; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Financial year' },
];

const pct = (v: number | null | undefined) => (v == null ? '—' : formatPct(v * 100));
const tone = (v: number | null | undefined) => (v == null ? 'text-slate-400' : v >= 0 ? 'text-emerald-300' : 'text-red-300');

export default function PerformanceReports() {
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('trust');
  const [view, setView] = useState<PeriodView>('monthly');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!fundId) return;
    setLoading(true);
    setError('');
    try {
      setData(await loadPerformance(fundId));
    } catch (e) {
      setError((e as Error).message || 'Could not load the price history.');
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => { load(); }, [load]);

  const calculate = async () => {
    if (!tenantId || !fundId) return;
    setSaving(true);
    setMessage(null);
    try {
      const fresh = await loadPerformance(fundId);
      setData(fresh);
      const saved = await savePerformance(tenantId, fundId, fresh);
      const waiting = fresh.classes.filter((c) => c.awaiting.length).length;
      setMessage(saved
        ? { ok: true, text: `Results recalculated and saved from IBKR-confirmed months.${waiting ? ' Some months are still awaiting IBKR confirmation and were left out.' : ''}` }
        : { ok: false, text: 'Nothing to save yet. No month has a final, IBKR-confirmed price.' });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message || 'Could not calculate. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const all = useMemo(() => (data ? [data.trust, ...data.classes] : []), [data]);
  const series = all.find((s) => s.key === selected) ?? all[0];

  if (state === 'loading') return <PanelLoader />;
  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Fund" strong="Performance"
        intro="Returns for each unit class and for the whole trust, worked out only from month-end prices that IBKR has confirmed as final. Months still waiting on IBKR are listed separately and left out of every figure.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
        <Button onClick={calculate} loading={saving} disabled={!fundId || loading}>
          <Calculator className="w-3.5 h-3.5" />Calculate and save
        </Button>
      </PageHeader>

      {(fundsError || error) && <Banner ok={false} text={fundsError || error} />}
      {message && <Banner ok={message.ok} text={message.text} />}
      {!fundsError && !funds.length && <div className={`${card} p-6 text-sm text-slate-400`}>No active fund found. Set up a fund in Fund Management first.</div>}

      {loading && !data ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading prices</div>
      ) : data && series ? (
        <>
          <div className="flex flex-wrap gap-2">
            {all.map((s) => (
              <button key={s.key} onClick={() => setSelected(s.key)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${s.key === series.key ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                {s.name}
                {s.awaiting.length > 0 && <span className="ml-2 text-xs text-amber-300">{s.awaiting.length} waiting</span>}
              </button>
            ))}
          </div>

          <SeriesView series={series} view={view} setView={setView} />
          <Comparison all={all} />
        </>
      ) : null}
    </div>
  );
}

function Banner({ ok, text }: { ok: boolean; text: string }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200' : 'border-amber-500/30 bg-amber-500/5 text-amber-200'}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />{text}
    </div>
  );
}

function SeriesView({ series, view, setView }: { series: Series; view: PeriodView; setView: (v: PeriodView) => void }) {
  const st = series.stats;
  const periods = series.periods.filter((p) => p.type === view).sort((a, b) => b.endDate.localeCompare(a.endDate));
  const asAt = st.asAt ? `To ${monthLabel(st.asAt.slice(0, 7))}` : 'Awaiting IBKR confirmation';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat icon={TrendingUp} label="Since inception" value={pct(st.sinceInception)} note={asAt} warn={st.sinceInception == null} />
        <Stat icon={Activity} label="Annualised" value={pct(st.annualised)} note={st.annualised == null ? 'Needs 12 confirmed months' : `${st.confirmedMonths} months`} />
        <Stat icon={ArrowUpRight} label="Best month" value={pct(st.best?.ret)} note={st.best ? monthLabel(st.best.month) : 'No confirmed months'} />
        <Stat icon={ArrowDownRight} label="Worst month" value={pct(st.worst?.ret)} note={st.worst ? monthLabel(st.worst.month) : 'No confirmed months'} />
        <Stat icon={Activity} label="Volatility" value={pct(st.volatility)} note={st.volatility == null ? 'Needs 2 confirmed months' : 'Yearly, from monthly returns'} />
        <Stat icon={TrendingDown} label="Max drawdown" value={pct(st.maxDrawdown)} note="Largest fall from a peak" />
      </div>

      <Section title={`${series.name} returns`} hint={series.classId ? 'Each return is the change in the confirmed unit price from one month-end to the next.' : 'Each class weighted by its value at the start of the month. A month only counts once every class is confirmed.'}
        action={
          <div className="flex rounded-lg border border-slate-700 p-0.5">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${view === v.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{v.label}</button>
            ))}
          </div>
        }>
        {periods.length ? <PeriodTable periods={periods} currency={series.currency} /> : <Empty>No confirmed {VIEWS.find((v) => v.id === view)?.label.toLowerCase()} results yet.</Empty>}
      </Section>

      <Section title="Awaiting IBKR confirmation" hint="These months are not used in any figure above until IBKR confirms the price and it is marked final in Fund Value.">
        {series.awaiting.length ? (
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {series.awaiting.map((m) => (
              <Pill key={m.month} tone={m.state === 'missing' ? 'slate' : 'amber'} title={STATE_LABEL[m.state]}>
                <Clock className="w-3 h-3" />{monthLabel(m.month)} · {STATE_LABEL[m.state]}
              </Pill>
            ))}
          </div>
        ) : <Empty>Every month is confirmed.</Empty>}
      </Section>
    </div>
  );
}

function PeriodTable({ periods, currency }: { periods: PeriodResult[]; currency: string }) {
  const money = (v: number | null) => (v == null ? '—' : currency === 'USD' ? usd(v) : `${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-y border-slate-800">
            <th className="px-5 py-2 font-medium">Period</th>
            <th className="px-5 py-2 font-medium text-right">Return</th>
            <th className="px-5 py-2 font-medium text-right">Value at start</th>
            <th className="px-5 py-2 font-medium text-right">Value at end</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {periods.map((p) => (
            <tr key={`${p.type}-${p.endDate}`} className="hover:bg-slate-800/40 transition-colors">
              <td className="px-5 py-2.5 text-slate-200">{p.label}{p.partial && <span className="ml-2 text-xs text-slate-500">so far</span>}</td>
              <td className={`px-5 py-2.5 text-right tabular-nums ${tone(p.ret)}`}>{pct(p.ret)}</td>
              <td className="px-5 py-2.5 text-right tabular-nums text-slate-400">{money(p.beginNav)}</td>
              <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">{money(p.endNav)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Comparison({ all }: { all: Series[] }) {
  return (
    <Section title="Side by side" hint="Since-inception figures use only the unbroken run of confirmed months from the start.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-y border-slate-800">
              <th className="px-5 py-2 font-medium">Class</th>
              <th className="px-5 py-2 font-medium text-right">Confirmed months</th>
              <th className="px-5 py-2 font-medium text-right">Since inception</th>
              <th className="px-5 py-2 font-medium text-right">Volatility</th>
              <th className="px-5 py-2 font-medium text-right">Max drawdown</th>
              <th className="px-5 py-2 font-medium text-right">Waiting</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {all.map((s) => (
              <tr key={s.key} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-5 py-2.5 text-slate-200">{s.name}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">{s.stats.confirmedMonths}</td>
                <td className={`px-5 py-2.5 text-right tabular-nums ${tone(s.stats.sinceInception)}`}>{pct(s.stats.sinceInception)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">{pct(s.stats.volatility)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">{pct(s.stats.maxDrawdown)}</td>
                <td className="px-5 py-2.5 text-right">{s.awaiting.length ? <Pill tone="amber">{s.awaiting.length}</Pill> : <Pill tone="green">None</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
