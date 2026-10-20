import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAll } from '../../lib/fetchAll';
import { useTenantId } from '../../lib/useTenantId';
import { MANUAL_CATEGORY_LABELS, type ManualLine } from '../../lib/fundValuation';
import TenantNotice from './TenantNotice';
import { FundSelect, PageHeader, useFunds } from './history/useFunds';
import { Empty, Pill, Section, day, units, usd } from './onboarding/ui';

interface PriceRow {
  id: string;
  share_class_id: string | null;
  nav_date: string;
  version: number | null;
  status: string;
  net_asset_value: number | null;
  total_shares: number | null;
  nav_per_share: number | null;
  total_fees: number | null;
  calculation_method: string | null;
  notes: string | null;
  calculation_data: { final?: boolean; track_record?: boolean; manual_charges?: ManualLine[] } | null;
}

export default function NAVDashboard() {
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [classes, setClasses] = useState<{ id: string; class_name: string }[]>([]);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!fundId) return;
    setLoading(true);
    setError('');
    Promise.all([
      supabase.from('share_classes').select('id, class_name').eq('fund_id', fundId).order('class_name'),
      fetchAll<PriceRow>(() => supabase.from('nav_calculations')
        .select('id, share_class_id, nav_date, version, status, net_asset_value, total_shares, nav_per_share, total_fees, calculation_method, notes, calculation_data')
        .eq('fund_id', fundId).order('nav_date', { ascending: false }).order('id')),
    ]).then(([cls, navs]) => {
      if (cls.error) throw new Error('Could not load the share classes.');
      setClasses(cls.data ?? []);
      setRows(navs);
    }).catch((e: Error) => setError(e.message || 'Could not load the price history.'))
      .finally(() => setLoading(false));
  }, [fundId]);

  const byClass = useMemo(() => {
    const latest = new Map<string, PriceRow>();
    for (const r of rows) {
      const key = `${r.share_class_id}|${r.nav_date}`;
      const cur = latest.get(key);
      if (!cur || (r.version ?? 0) > (cur.version ?? 0)) latest.set(key, r);
    }
    const out = new Map<string, PriceRow[]>();
    for (const r of latest.values()) out.set(r.share_class_id ?? '', [...(out.get(r.share_class_id ?? '') ?? []), r]);
    for (const list of out.values()) list.sort((a, b) => b.nav_date.localeCompare(a.nav_date));
    return out;
  }, [rows]);

  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Unit price" strong="history"
        intro="Every monthly unit price, read straight from the saved valuations. Prices are worked out and approved on the Fund Value page from IBKR statements; this page is a read-only record.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
      </PageHeader>

      {(error || fundsError) && <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error || fundsError}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-cyan-400 animate-spin" /></div>
        : classes.length === 0 ? <Empty>{funds.length ? 'This fund has no share classes yet.' : 'Create a fund first.'}</Empty>
        : classes.map((c) => {
          const list = byClass.get(c.id) ?? [];
          return (
            <Section key={c.id} title={c.class_name} hint={list.length ? `${list.length} month${list.length === 1 ? '' : 's'} on record` : undefined}>
              {list.length === 0 ? <Empty>No prices saved for this class yet.</Empty> : (
                <div className="overflow-x-auto border-t border-slate-700/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-slate-500">
                        {['Month end', 'Price per unit', 'Class value', 'Units in issue', 'Fees', 'Status', ''].map((h, i) => (
                          <th key={h || i} className={`px-5 py-2.5 font-medium ${i > 0 && i < 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {list.map((r) => <PriceRowView key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          );
        })}
    </div>
  );
}

function statusOf(r: PriceRow) {
  if (r.calculation_method !== 'broker_statement') return <Pill tone="slate">Entered by hand (old)</Pill>;
  if (r.calculation_data?.track_record) return <Pill tone="slate">Track record</Pill>;
  if (r.status === 'approved' && r.calculation_data?.final) return <Pill tone="green">Final, IBKR confirmed</Pill>;
  if (r.status === 'approved') return <Pill tone="cyan">Approved</Pill>;
  if (r.status === 'superseded') return <Pill tone="slate">Replaced</Pill>;
  return <Pill tone="amber">Draft</Pill>;
}

function PriceRowView({ r, open, onToggle }: { r: PriceRow; open: boolean; onToggle: () => void }) {
  const manual = r.calculation_data?.manual_charges ?? [];
  const hasDetail = manual.length > 0 || !!r.notes;
  return (
    <>
      <tr className={`hover:bg-slate-800/40 transition-colors ${hasDetail ? 'cursor-pointer' : ''}`} onClick={hasDetail ? onToggle : undefined}>
        <td className="px-5 py-3 text-white">{day(r.nav_date)}</td>
        <td className="px-5 py-3 text-right tabular-nums text-white">{r.nav_per_share != null ? Number(r.nav_per_share).toFixed(4) : '-'}</td>
        <td className="px-5 py-3 text-right tabular-nums text-slate-300">{r.net_asset_value != null ? usd(Number(r.net_asset_value)) : '-'}</td>
        <td className="px-5 py-3 text-right tabular-nums text-slate-300">{r.total_shares != null ? units(Number(r.total_shares)) : '-'}</td>
        <td className="px-5 py-3 text-right tabular-nums text-slate-300">{r.total_fees ? usd(Number(r.total_fees)) : '-'}</td>
        <td className="px-5 py-3">{statusOf(r)}</td>
        <td className="px-5 py-3 text-right">{hasDetail && <ChevronDown className={`w-4 h-4 text-slate-500 inline transition-transform ${open ? 'rotate-180' : ''}`} />}</td>
      </tr>
      {open && (
        <tr className="bg-slate-900/40">
          <td colSpan={7} className="px-5 py-4 space-y-2">
            {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
            {manual.map((m) => (
              <div key={m.id} className="flex justify-between gap-4 text-xs">
                <span className="text-slate-300">{MANUAL_CATEGORY_LABELS[m.category]}: {m.note}{m.name ? ` (${m.name})` : ''}{m.status === 'owed' ? ' - owed by Arkline' : ''}</span>
                <span className={`tabular-nums ${m.kind === 'manager_rebate' ? 'text-emerald-300' : 'text-slate-300'}`}>{m.kind === 'manager_rebate' ? '+' : '-'}{usd(Math.abs(m.amount))}</span>
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
