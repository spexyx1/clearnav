import { useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { redemptionDealingDay } from '../../../lib/dealingTerms';
import { recordWithdrawal, type OfficialHolding } from '../../../lib/onboarding';
import { Button, Empty, Field, Modal, Pill, Section, day, input, today, units, usd, type OnboardingCtx } from './ui';

export default function WithdrawalsPanel({ ctx }: { ctx: OnboardingCtx }) {
  const { data, classes } = ctx;
  const [withdrawing, setWithdrawing] = useState<OfficialHolding | null>(null);
  const className = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.class_name])), [classes]);
  const holdings = data.holdings.filter((h) => h.shares_owned > 0);
  const holdingById = useMemo(() => Object.fromEntries(data.holdings.map((h) => [h.id, h])), [data.holdings]);
  const requests = data.redemptions.filter((r) => holdingById[r.capital_account_id]);
  const pendingFor = (id: string) => requests.some((r) => r.capital_account_id === id && r.status !== 'completed');

  return (
    <div className="space-y-6">
      <Section title="Investor holdings" hint={`Withdrawals need ${ctx.schedule.noticeDays} days' notice and are paid at the first month-end price after the notice period ends.`}>
        {holdings.length === 0 ? <Empty>No investor holds units yet. Units appear here once they are issued.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {holdings.map((h) => (
              <li key={h.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{h.investor_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{className[h.share_class_id]}</p>
                </div>
                <span className="text-sm text-slate-200 tabular-nums">{units(h.shares_owned)} units</span>
                <Button tone="quiet" disabled={pendingFor(h.id) || !!ctx.busy} title={pendingFor(h.id) ? 'A withdrawal is already in progress' : undefined}
                  onClick={() => setWithdrawing(h)}><LogOut className="w-3.5 h-3.5" />Withdraw</Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Withdrawal requests">
        {requests.length === 0 ? <Empty>No withdrawals have been requested.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {requests.map((r) => {
              const h = holdingById[r.capital_account_id];
              const ask = r.redemption_type === 'full' ? 'All units' : r.shares_requested ? `${units(Number(r.shares_requested))} units` : usd(Number(r.amount_requested ?? 0));
              return (
                <li key={r.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 items-center px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{h.investor_name} <span className="text-slate-400">- {className[h.share_class_id]}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">{ask} - notice {day(r.request_date)} - dealing day {day(r.redemption_date)}</p>
                  </div>
                  {r.status === 'completed' ? <Pill tone="green">Redeemed</Pill> : <Pill tone="amber">Notice period</Pill>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {withdrawing && <WithdrawModal ctx={ctx} holding={withdrawing} className={className[withdrawing.share_class_id]} onClose={() => setWithdrawing(null)} />}
    </div>
  );
}

function WithdrawModal({ ctx, holding, className, onClose }: { ctx: OnboardingCtx; holding: OfficialHolding; className: string; onClose: () => void }) {
  const [noticeDate, setNoticeDate] = useState(today());
  const [mode, setMode] = useState<'full' | 'units' | 'amount'>('full');
  const [value, setValue] = useState('');
  const num = Number(value.replace(/,/g, ''));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(noticeDate) && noticeDate <= today() && (mode === 'full' || num > 0) && (mode !== 'units' || num <= holding.shares_owned);
  const dealing = /^\d{4}-\d{2}-\d{2}$/.test(noticeDate) ? redemptionDealingDay(ctx.schedule, noticeDate) : null;

  const save = async () => {
    const ok = await ctx.run('withdraw', async () => {
      const d = await recordWithdrawal({ tenantId: ctx.tenantId, fundId: ctx.fundId, holding, noticeDate, mode, value: num, schedule: ctx.schedule, userId: ctx.userId });
      return `Withdrawal recorded. It will be paid at the ${day(d)} final IBKR price.`;
    });
    if (ok) onClose();
  };

  return (
    <Modal title={`Withdrawal for ${holding.investor_name}`} onClose={onClose}>
      <p className="text-sm text-slate-400">{className} - holds <span className="text-white tabular-nums">{units(holding.shares_owned)}</span> units</p>
      <Field label="Date notice was received" hint="Notice cannot be dated in the future.">
        <input type="date" value={noticeDate} max={today()} onChange={(e) => setNoticeDate(e.target.value)} className={input} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {([['full', 'Everything'], ['units', 'Units'], ['amount', 'Dollar amount']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${mode === k ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {mode !== 'full' && (
        <Field label={mode === 'units' ? 'Units to redeem' : 'Amount (USD)'}
          hint={mode === 'amount' ? 'Converted to units at the dealing day price.' : undefined}>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className={input} />
        </Field>
      )}
      {mode === 'units' && num > holding.shares_owned && <p className="text-xs text-red-300">More than the investor holds.</p>}
      {dealing && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-100">
          After the {ctx.schedule.noticeDays}-day notice period, this is paid at the <span className="font-medium text-white">{day(dealing)}</span> month-end price, once IBKR confirms it as final.
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Close</Button>
        <Button onClick={save} disabled={!valid || !!ctx.busy} loading={ctx.busy === 'withdraw'}>Record withdrawal</Button>
      </div>
    </Modal>
  );
}
