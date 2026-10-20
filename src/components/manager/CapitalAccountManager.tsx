import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Users, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAll } from '../../lib/fetchAll';
import { useTenantId } from '../../lib/useTenantId';
import TenantNotice from './TenantNotice';
import { FundSelect, PageHeader, Stat, useFunds } from './history/useFunds';
import { Empty, Pill, Section, day, units, usd } from './onboarding/ui';

interface AccountRow {
  id: string;
  account_number: string | null;
  commitment_amount: number | null;
  capital_contributed: number | null;
  capital_returned: number | null;
  shares_owned: number | null;
  inception_date: string | null;
  status: string;
  metadata: { official?: boolean | string } | null;
  investor: { full_name: string; email: string } | null;
  share_class: { class_name: string } | null;
}

export default function CapitalAccountManager() {
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fundId) return;
    setLoading(true);
    setError('');
    fetchAll<AccountRow>(() => supabase.from('capital_accounts')
      .select('id, account_number, commitment_amount, capital_contributed, capital_returned, shares_owned, inception_date, status, metadata, investor:client_profiles!investor_id(full_name, email), share_class:share_classes!share_class_id(class_name)')
      .eq('fund_id', fundId).order('created_at', { ascending: false }).order('id'))
      .then(setAccounts)
      .catch(() => setError('Could not load the investor accounts.'))
      .finally(() => setLoading(false));
  }, [fundId]);

  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;

  const isOfficial = (a: AccountRow) => String(a.metadata?.official) === 'true';
  const official = accounts.filter(isOfficial);
  const sum = (f: (a: AccountRow) => number | null) => accounts.reduce((s, a) => s + Number(f(a) ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Investor" strong="accounts"
        intro="A read-only overview of every investor account in the fund. New accounts, deposits and withdrawals are handled under Funds, Investors In & Out, so every unit is dealt at an IBKR-confirmed price.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
      </PageHeader>

      {(error || fundsError) && <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error || fundsError}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-cyan-400 animate-spin" /></div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat icon={Users} label="Accounts" value={String(accounts.length)} note={`${official.length} on the official register`} />
            <Stat icon={Wallet} label="Total committed" value={usd(sum((a) => a.commitment_amount))} />
            <Stat icon={Wallet} label="Total invested" value={usd(sum((a) => a.capital_contributed))} note={`${usd(sum((a) => a.capital_returned))} returned`} />
          </div>

          <Section title="Accounts">
            {accounts.length === 0 ? <Empty>{funds.length ? 'No investor accounts in this fund yet.' : 'Create a fund first.'}</Empty> : (
              <div className="overflow-x-auto border-t border-slate-700/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-slate-500">
                      {['Investor', 'Class', 'Opened', 'Committed', 'Invested', 'Returned', 'Units', 'Register'].map((h, i) => (
                        <th key={h} className={`px-5 py-2.5 font-medium ${i >= 3 && i <= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {accounts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-white">{a.investor?.full_name ?? 'Investor'}</p>
                          <p className="text-xs text-slate-500">{a.account_number ?? a.investor?.email}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-300">{a.share_class?.class_name ?? '-'}</td>
                        <td className="px-5 py-3 text-slate-300">{day(a.inception_date)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">{usd(Number(a.commitment_amount ?? 0))}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">{usd(Number(a.capital_contributed ?? 0))}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-300">{usd(Number(a.capital_returned ?? 0))}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-white">{units(Number(a.shares_owned ?? 0))}</td>
                        <td className="px-5 py-3">{isOfficial(a) ? <Pill tone="green">Official</Pill> : <Pill tone="slate">Old record</Pill>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
