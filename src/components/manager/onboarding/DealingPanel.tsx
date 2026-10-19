import { useMemo, type ReactNode } from 'react';
import { CheckCircle, Clock, Lock, Undo2 } from 'lucide-react';
import type { Dealt } from '../../../lib/fundValuation';
import { issueUnits, redeemUnits, undoMoneyReceived } from '../../../lib/onboarding';
import { Button, Empty, Pill, Section, day, units, usd, type OnboardingCtx } from './ui';

interface QueueState { final: boolean; reasons: string[]; dealt?: Dealt; waiting: boolean }

function stateFor(ctx: OnboardingCtx, classId: string, dealingDate: string, ref: string): QueueState {
  const month = ctx.valuations.find((v) => v.classId === classId)?.months.find((m) => m.month === dealingDate.slice(0, 7));
  if (!month) return { final: false, reasons: [], waiting: true };
  return { final: month.final, reasons: month.finalReasons, dealt: month.dealt.find((d) => d.ref === ref), waiting: false };
}

function StateBadge({ s, date }: { s: QueueState; date: string }) {
  if (s.waiting) return <Pill tone="slate" title="The IBKR statement for this month-end has not been pulled yet."><Clock className="w-3 h-3" />Waiting for {day(date)}</Pill>;
  if (!s.final) return <Pill tone="amber" title={s.reasons.join('\n')}><Lock className="w-3 h-3" />Not final</Pill>;
  if (!s.dealt) return <Pill tone="amber" title="Save the month again in Fund Value so it includes this item, then approve it.">Re-save the month</Pill>;
  return <Pill tone="green"><CheckCircle className="w-3 h-3" />Final - ready</Pill>;
}

function Preview({ s }: { s: QueueState }) {
  if (!s.dealt) return <span className="text-xs text-slate-500">Price set at month-end</span>;
  return <span className="text-xs text-slate-300 tabular-nums">{units(s.dealt.units)} units at {s.dealt.price.toFixed(4)} = {usd(s.dealt.amount)}</span>;
}

export default function DealingPanel({ ctx }: { ctx: OnboardingCtx }) {
  const { data, classes, busy, run } = ctx;
  const byId = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c])), [classes]);
  const holdingById = useMemo(() => Object.fromEntries(data.holdings.map((h) => [h.id, h])), [data.holdings]);
  const subs = data.subscriptions.filter((s) => s.status === 'money_received' && s.dealing_date);
  const reds = data.redemptions.filter((r) => (r.status === 'approved' || r.status === 'processing') && r.redemption_date && holdingById[r.capital_account_id]);
  const blockers = [...new Set([...subs.map((s) => stateFor(ctx, s.share_class_id, s.dealing_date!, `sub:${s.id}`)),
    ...reds.map((r) => stateFor(ctx, holdingById[r.capital_account_id].share_class_id, r.redemption_date!, `red:${r.id}`))]
    .filter((s) => !s.final && !s.waiting).flatMap((s) => s.reasons))];

  const row = (key: string, name: string, classId: string, date: string, s: QueueState, action: ReactNode, extra?: ReactNode) => (
    <li key={key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{name} <span className="text-slate-400">- {byId[classId]?.class_name}</span></p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          <span className="text-xs text-slate-400">Dealing day {day(date)}</span>
          <Preview s={s} />
        </div>
      </div>
      <StateBadge s={s} date={date} />
      <div className="flex gap-2 sm:justify-end">{extra}{action}</div>
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-sm text-cyan-100">
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-300" />
        <p>Units are only issued or redeemed once the dealing month is <span className="font-medium">Final - ties to IBKR</span> and approved on the Fund Value page. Any other price is refused.</p>
      </div>

      {blockers.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-medium text-amber-200">Why some months are not final yet</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/90 list-disc pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}

      <Section title="Units to issue" hint="Investors whose money has been confirmed, waiting for their dealing day's final price.">
        {subs.length === 0 ? <Empty>No one is waiting for units.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {subs.map((sub) => {
              const s = stateFor(ctx, sub.share_class_id, sub.dealing_date!, `sub:${sub.id}`);
              return row(sub.id, sub.investor_name, sub.share_class_id, sub.dealing_date!, s,
                <Button disabled={!s.final || !s.dealt || !!busy} loading={busy === `issue-${sub.id}`}
                  onClick={() => run(`issue-${sub.id}`, async () => {
                    const d = await issueUnits(ctx.tenantId, ctx.fundId, sub, byId[sub.share_class_id], ctx.userId);
                    return `${units(d.units)} units issued to ${sub.investor_name}.`;
                  })}>Issue units</Button>,
                <Button tone="quiet" disabled={!!busy} title="Unmatch this deposit" loading={busy === `undo-${sub.id}`}
                  onClick={() => run(`undo-${sub.id}`, async () => { await undoMoneyReceived(sub); return 'Match removed. The deposit is back in the Money in list.'; })}>
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>);
            })}
          </ul>
        )}
      </Section>

      <Section title="Units to redeem" hint="Withdrawals whose notice period has been met, waiting for their dealing day's final price.">
        {reds.length === 0 ? <Empty>No withdrawals are due.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {reds.map((r) => {
              const h = holdingById[r.capital_account_id];
              const s = stateFor(ctx, h.share_class_id, r.redemption_date!, `red:${r.id}`);
              return row(r.id, h.investor_name, h.share_class_id, r.redemption_date!, s,
                <Button disabled={!s.final || !s.dealt || !!busy} loading={busy === `redeem-${r.id}`}
                  onClick={() => run(`redeem-${r.id}`, async () => {
                    const d = await redeemUnits(ctx.tenantId, ctx.fundId, r, h, byId[h.share_class_id], ctx.userId);
                    return `${units(d.units)} units redeemed for ${h.investor_name}. ${usd(d.amount)} is payable.`;
                  })}>Redeem units</Button>);
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
