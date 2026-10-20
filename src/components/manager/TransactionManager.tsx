import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAll } from '../../lib/fetchAll';
import { useTenantId } from '../../lib/useTenantId';
import TenantNotice from './TenantNotice';
import { FundSelect, PageHeader, useFunds } from './history/useFunds';
import { Button, Empty, Pill, Section, day, units, usd } from './onboarding/ui';

interface TxRow {
  id: string;
  transaction_type: string;
  transaction_date: string;
  amount: number | null;
  shares: number | null;
  price_per_share: number | null;
  status: string;
  reference_number: string | null;
  description: string | null;
  capital_account: { account_number: string | null; investor: { full_name: string } | null } | null;
}

const TYPE_LABELS: Record<string, string> = {
  contribution: 'Units issued', redemption: 'Units redeemed', transfer_in: 'Transfer in', transfer_out: 'Transfer out',
  fee: 'Fee (units cancelled)', adjustment: 'Rebate (units issued)', distribution: 'Distribution', capital_call: 'Capital call',
};

export default function TransactionManager() {
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fundId) return;
    setLoading(true);
    setError('');
    fetchAll<TxRow>(() => supabase.from('capital_transactions')
      .select('id, transaction_type, transaction_date, amount, shares, price_per_share, status, reference_number, description, capital_account:capital_accounts!capital_account_id(account_number, investor:client_profiles!investor_id(full_name))')
      .eq('fund_id', fundId).order('transaction_date', { ascending: false }).order('id'))
      .then(setRows)
      .catch(() => setError('Could not load the transaction history.'))
      .finally(() => setLoading(false));
  }, [fundId]);

  const types = useMemo(() => [...new Set(rows.map((r) => r.transaction_type))].sort(), [rows]);
  const shown = type === 'all' ? rows : rows.filter((r) => r.transaction_type === type);

  const exportCsv = () => {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Date', 'Reference', 'Investor', 'Type', 'Amount', 'Units', 'Price', 'Status', 'Description'].join(',')]
      .concat(shown.map((r) => [r.transaction_date, r.reference_number, r.capital_account?.investor?.full_name, TYPE_LABELS[r.transaction_type] ?? r.transaction_type,
        r.amount, r.shares, r.price_per_share, r.status, r.description].map(cell).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'transactions.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Transaction" strong="history"
        intro="Every unit deal recorded in the fund, newest first. Deals are created from Funds, Investors In & Out and Fees, always at the IBKR-confirmed month-end price, so this page is read-only.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
        <Button tone="quiet" onClick={exportCsv} disabled={!shown.length}><Download className="w-3.5 h-3.5" />Export</Button>
      </PageHeader>

      {(error || fundsError) && <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error || fundsError}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-cyan-400 animate-spin" /></div> : (
        <Section title="Transactions" hint={`${shown.length} shown`}
          action={types.length > 1 && (
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500">
              <option value="all">All types</option>
              {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
            </select>
          )}>
          {shown.length === 0 ? <Empty>{funds.length ? 'No transactions recorded yet.' : 'Create a fund first.'}</Empty> : (
            <div className="overflow-x-auto border-t border-slate-700/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    {['Date', 'Investor', 'Type', 'Amount', 'Units', 'Price', 'Status'].map((h, i) => (
                      <th key={h} className={`px-5 py-2.5 font-medium ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {shown.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-white">{day(r.transaction_date)}</p>
                        <p className="text-xs text-slate-500">{r.reference_number}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{r.capital_account?.investor?.full_name ?? '-'}</td>
                      <td className="px-5 py-3">
                        <p className="text-slate-200">{TYPE_LABELS[r.transaction_type] ?? r.transaction_type}</p>
                        {r.description && <p className="text-xs text-slate-500 max-w-xs truncate" title={r.description}>{r.description}</p>}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">{r.amount != null ? usd(Number(r.amount)) : '-'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-white">{r.shares != null ? units(Number(r.shares)) : '-'}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-300">{r.price_per_share != null ? Number(r.price_per_share).toFixed(4) : '-'}</td>
                      <td className="px-5 py-3"><Pill tone={r.status === 'settled' || r.status === 'completed' ? 'green' : r.status === 'cancelled' ? 'slate' : 'amber'}>{r.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
