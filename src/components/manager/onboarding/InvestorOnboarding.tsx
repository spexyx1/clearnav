import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, BookOpen, CheckCircle, ClipboardList, Landmark, Loader2, LogOut, Scale } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { loadDealingTerms, scheduleFrom, type DealingTerms } from '../../../lib/dealingTerms';
import { loadFundData, valueFund, type ClassValuation } from '../../../lib/fundValuation';
import { loadOnboarding, unmatchedMoneyIn, type ClassRef } from '../../../lib/onboarding';
import ApplicationsPanel from './ApplicationsPanel';
import MoneyInPanel from './MoneyInPanel';
import DealingPanel from './DealingPanel';
import WithdrawalsPanel from './WithdrawalsPanel';
import AccountsPanel from './AccountsPanel';
import RegisterPanel from './RegisterPanel';
import { loadUnitRegister, type UnitRegister } from '../../../lib/unitRegister';
import type { OnboardingCtx, OnboardingData } from './ui';

type View = 'applications' | 'money' | 'dealing' | 'withdrawals' | 'register' | 'accounts';

interface Props { tenantId: string; funds: { id: string; fund_name: string }[] }

export default function InvestorOnboarding({ tenantId, funds }: Props) {
  const { user } = useAuth();
  const [fundId, setFundId] = useState(funds[0]?.id ?? '');
  const [view, setView] = useState<View>('applications');
  const [data, setData] = useState<OnboardingData | null>(null);
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [valuations, setValuations] = useState<ClassValuation[]>([]);
  const [terms, setTerms] = useState<DealingTerms>({});
  const [register, setRegister] = useState<UnitRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fundId) return;
    const [onb, fund, t, reg] = await Promise.all([loadOnboarding(tenantId, fundId), loadFundData(fundId), loadDealingTerms(fundId), loadUnitRegister(fundId)]);
    setData(onb);
    setRegister(reg);
    setClasses(fund.classes.map((c) => ({ id: c.id, class_code: c.class_code, class_name: c.class_name })));
    setValuations(valueFund(fund));
    setTerms(t?.terms ?? {});
  }, [tenantId, fundId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    load().catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [load]);

  const run = useCallback(async (key: string, action: () => Promise<string | void>) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      const msg = await action();
      await load();
      if (msg) setNotice(msg);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(null);
    }
  }, [load]);

  const schedule = useMemo(() => scheduleFrom(terms), [terms]);

  const counts = useMemo(() => {
    if (!data) return {} as Partial<Record<View, number>>;
    const official = new Set(data.brokerAccounts.filter((a) => a.account_role === 'official').map((a) => a.share_class_id));
    return {
      applications: data.applications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length,
      money: unmatchedMoneyIn(valuations, data.subscriptions, official).length,
      dealing: data.subscriptions.filter((s) => s.status === 'money_received').length
        + data.redemptions.filter((r) => r.status === 'approved' || r.status === 'processing').length,
      register: (register?.checks.filter((c) => c.status === 'mismatch').length ?? 0) + (register?.accounts.filter((a) => !a.balanceMatches).length ?? 0),
    };
  }, [data, valuations, register]);

  if (!funds.length) return <p className="text-sm text-slate-400">Create the fund first, then manage investors here.</p>;

  const ctx: OnboardingCtx | null = data && user ? { tenantId, fundId, userId: user.id, classes, data, valuations, schedule, busy, run } : null;

  const tabs: { id: View; label: string; icon: typeof Scale }[] = [
    { id: 'applications', label: 'Applications', icon: ClipboardList },
    { id: 'money', label: 'Money in', icon: ArrowDownToLine },
    { id: 'dealing', label: 'Dealing', icon: Scale },
    { id: 'withdrawals', label: 'Withdrawals', icon: LogOut },
    { id: 'register', label: 'Unit register', icon: BookOpen },
    { id: 'accounts', label: 'IBKR accounts', icon: Landmark },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Investors in and out</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Approve applications, confirm money as it lands in IBKR, then issue or redeem units at the final month-end price.
          </p>
        </div>
        {funds.length > 1 && (
          <select value={fundId} onChange={(e) => setFundId(e.target.value)}
            className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
          </select>
        )}
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1 -mb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${view === id ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}>
            <Icon className="w-4 h-4" />
            {label}
            {!!counts[id] && <span className="text-xs rounded-full px-1.5 py-0.5 bg-amber-500/20 text-amber-200 tabular-nums">{counts[id]}</span>}
          </button>
        ))}
      </nav>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-200">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {notice}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-cyan-400 animate-spin" /></div>
      ) : ctx && (
        <>
          {view === 'applications' && <ApplicationsPanel ctx={ctx} />}
          {view === 'money' && <MoneyInPanel ctx={ctx} onOpenAccounts={() => setView('accounts')} />}
          {view === 'dealing' && <DealingPanel ctx={ctx} />}
          {view === 'withdrawals' && <WithdrawalsPanel ctx={ctx} />}
          {view === 'register' && register && <RegisterPanel ctx={ctx} register={register} />}
          {view === 'accounts' && <AccountsPanel ctx={ctx} />}
        </>
      )}
    </div>
  );
}
