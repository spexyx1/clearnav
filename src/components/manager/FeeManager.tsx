import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, HandCoins, Link2, Loader2, Plus, Receipt, Undo2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useTenantId } from '../../lib/useTenantId';
import { monthsBetween } from '../../lib/statementParser';
import { MANUAL_CATEGORY_LABELS, loadFundData, valueFund, type ClassValuation, type FundData } from '../../lib/fundValuation';
import { KIND_LABELS, applyToRegister, cancelCharge, listCharges, unitRef, type ChargeRow } from '../../lib/manualCharges';
import { loadUnitRegister, type UnitRegister } from '../../lib/unitRegister';
import TenantNotice from './TenantNotice';
import { FundSelect, PageHeader, Stat, useFunds } from './history/useFunds';
import { Button, Empty, Pill, Section, usd } from './onboarding/ui';
import { ChargeModal, LinkModal, monthName, type FeeCtx } from './fees/FeeModals';

interface Loaded { fund: FundData; valuations: ClassValuation[]; charges: ChargeRow[]; register: UnitRegister }

export default function FeeManager() {
  const { user } = useAuth();
  const { tenantId, state: tenantState, retry } = useTenantId();
  const { funds, fundId, setFundId, error: fundsError } = useFunds(tenantId);
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [correcting, setCorrecting] = useState<ChargeRow | null>(null);
  const [linking, setLinking] = useState<ChargeRow | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const load = useCallback(async () => {
    if (!fundId) return;
    const [fund, charges, register] = await Promise.all([loadFundData(fundId), listCharges(fundId), loadUnitRegister(fundId)]);
    setData({ fund, valuations: valueFund(fund), charges, register });
  }, [fundId]);

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

  const derived = useMemo(() => {
    if (!data) return null;
    const approved = new Set(data.register.finals.map((f) => `${f.classId}|${f.date.slice(0, 7)}`));
    const isApproved = (classId: string, month: string | null) => !!month && approved.has(`${classId}|${month}`);
    const now = new Date().toISOString().slice(0, 7);
    const openMonths = (classId: string) => {
      const from = data.fund.officialAccounts[classId]?.fromMonth;
      if (!from) return [];
      const last = [now, ...(data.valuations.find((v) => v.classId === classId)?.months.map((m) => m.month) ?? [])].sort().pop()!;
      return monthsBetween(`${from}-01`, `${last}-01`).filter((m) => !approved.has(`${classId}|${m}`));
    };
    const references = new Set(data.register.accounts.flatMap((a) => a.transactions.map((t) => t.reference)));
    const accountById = new Map(data.register.accounts.map((a) => [a.id, a]));
    const active = data.charges.filter((c) => c.status === 'active');
    const owed = active.filter((c) => c.kind === 'manager_rebate' && !c.movementKey);
    const toApply = active.filter((c) => c.kind !== 'class_charge' && !references.has(unitRef(c))
      && isApproved(c.classId, c.kind === 'investor_fee' ? c.month : c.paidMonth));
    return { isApproved, openMonths, references, accountById, active, owed, toApply };
  }, [data]);

  if (tenantState !== 'ready') return <TenantNotice state={tenantState} retry={retry} />;

  const className = Object.fromEntries((data?.fund.classes ?? []).map((c) => [c.id, c.class_name]));
  const ctx: FeeCtx | null = data && derived && tenantId ? {
    tenantId, fundId, classes: data.fund.classes.filter((c) => data.fund.officialAccounts[c.id]), accounts: data.register.accounts,
    valuations: data.valuations, openMonths: derived.openMonths, busy, run,
    linkedKeys: new Set(derived.active.map((c) => c.movementKey).filter((k): k is string => !!k)),
    subscriptionKeys: new Set(data.fund.dealing.subscriptions.map((s) => s.key)),
  } : null;

  const apply = (c: ChargeRow) => {
    const account = c.accountId ? derived?.accountById.get(c.accountId) : undefined;
    if (!account || !tenantId || !user) return;
    run(`apply-${c.id}`, async () => {
      const deal = await applyToRegister(tenantId, fundId, c, account, className[c.classId], user.id);
      return `${deal.units.toLocaleString('en-US')} units ${c.kind === 'investor_fee' ? 'cancelled for' : 'issued to'} ${account.investorName} at ${deal.price}.`;
    });
  };

  const status = (c: ChargeRow) => {
    if (c.status === 'cancelled') return <Pill tone="slate">Cancelled</Pill>;
    if (!derived) return null;
    if (c.kind === 'class_charge') {
      return (
        <span className="flex flex-wrap gap-1.5 justify-end">
          <Pill tone={derived.isApproved(c.classId, c.month) ? 'green' : 'cyan'}>{derived.isApproved(c.classId, c.month) ? 'In the approved price' : 'Lowers the unit price'}</Pill>
          <Pill tone="slate">{c.movementKey ? 'Paid from IBKR' : 'Not paid out yet'}</Pill>
        </span>
      );
    }
    if (derived.references.has(unitRef(c))) return <Pill tone="green">{c.kind === 'investor_fee' ? 'Units cancelled' : 'Units issued'}</Pill>;
    if (c.kind === 'manager_rebate' && !c.movementKey) return <Pill tone="amber">Owed by Arkline</Pill>;
    if (derived.toApply.includes(c)) {
      return (
        <Button onClick={() => apply(c)} disabled={!!busy} loading={busy === `apply-${c.id}`}>
          {c.kind === 'investor_fee' ? 'Cancel units' : 'Issue units'}
        </Button>
      );
    }
    return <Pill tone="slate">Waiting for final month-end</Pill>;
  };

  const rows = (data?.charges ?? []).filter((c) => showCancelled || c.status === 'active');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = derived?.active.filter((c) => c.month === thisMonth && c.kind !== 'manager_rebate').reduce((s, c) => s + c.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" strong="and rebates"
        intro="IBKR's own fees are picked up automatically. Use this page only for charges IBKR does not work out, fees for a single investor, and rebates Arkline pays.">
        <FundSelect funds={funds} value={fundId} onChange={setFundId} />
        <Button onClick={() => setAdding(true)} disabled={!ctx || !ctx.classes.length}><Plus className="w-3.5 h-3.5" />New charge</Button>
      </PageHeader>

      {(error || fundsError) && <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error || fundsError}</div>}
      {notice && <div className="flex items-start gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-200"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> {notice}</div>}

      {loading || !data || !derived ? (
        <div className="flex justify-center py-16">{loading ? <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" /> : !funds.length && <p className="text-sm text-slate-400">Create a fund first.</p>}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat icon={Receipt} label={`Charged in ${monthName(thisMonth)}`} value={usd(monthTotal)} />
            <Stat icon={HandCoins} label="Rebates owed by Arkline" value={usd(derived.owed.reduce((s, c) => s + c.amount, 0))}
              note={derived.owed.length ? `${derived.owed.length} waiting for payment into IBKR` : 'Nothing owed'} warn={derived.owed.length > 0} />
            <Stat icon={Undo2} label="Unit changes to apply" value={String(derived.toApply.length)}
              note={derived.toApply.length ? 'Month approved, register not yet updated' : 'Register is up to date'} warn={derived.toApply.length > 0} />
          </div>
          {!ctx?.classes.length && <p className="text-sm text-amber-300">No class has an official IBKR account yet. Set one under Funds, Investors in and out, IBKR accounts.</p>}

          <Section title="Charges and rebates" hint="Saved entries cannot be edited. Cancel an entry while its month is open, or enter a correction in the next open month."
            action={<label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-cyan-500" />Show cancelled</label>}>
            {rows.length === 0 ? <Empty>Nothing entered yet.</Empty> : (
              <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
                {rows.map((c) => {
                  const who = c.accountId ? derived.accountById.get(c.accountId)?.investorName ?? 'Investor' : 'Everyone in the class';
                  const open = c.status === 'active' && !derived.isApproved(c.classId, c.month) && !derived.isApproved(c.classId, c.paidMonth);
                  const canLink = c.status === 'active' && c.kind !== 'investor_fee' && c.amount > 0 && !derived.isApproved(c.classId, c.paidMonth) && !derived.references.has(unitRef(c));
                  return (
                    <li key={c.id} className={`grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 lg:gap-6 items-center px-5 py-3.5 ${c.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{c.note}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {KIND_LABELS[c.kind]} - {MANUAL_CATEGORY_LABELS[c.category]} - {className[c.classId]} - {who} - {monthName(c.month)}
                          {c.correctsId && ' - correction'}
                        </p>
                      </div>
                      <span className={`text-sm tabular-nums lg:text-right ${c.kind === 'manager_rebate' || c.amount < 0 ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {c.kind === 'manager_rebate' ? '+' : c.amount < 0 ? '+' : '-'}{usd(Math.abs(c.amount))}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {status(c)}
                        {canLink && <Button tone="quiet" onClick={() => setLinking(c)} title="Link the IBKR payment"><Link2 className="w-3.5 h-3.5" />{c.movementKey ? 'Linked' : 'Link payment'}</Button>}
                        {c.status === 'active' && !c.correctsId && <Button tone="quiet" onClick={() => setCorrecting(c)}>Correct</Button>}
                        {open && <Button tone="danger" disabled={!!busy} loading={busy === `cancel-${c.id}`} onClick={() => run(`cancel-${c.id}`, async () => { await cancelCharge(c.id); return 'Entry cancelled. Save the month again in Fund Value.'; })}>Cancel</Button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      )}

      {ctx && adding && <ChargeModal ctx={ctx} onClose={() => setAdding(false)} />}
      {ctx && correcting && <ChargeModal ctx={ctx} correcting={correcting} onClose={() => setCorrecting(null)} />}
      {ctx && linking && <LinkModal ctx={ctx} charge={linking} onClose={() => setLinking(null)} />}
    </div>
  );
}
