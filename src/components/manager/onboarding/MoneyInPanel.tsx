import { useMemo, useState } from 'react';
import { Banknote, Link2 } from 'lucide-react';
import { confirmMoneyReceived, dealingDayFor, unmatchedMoneyIn, type MoneyIn } from '../../../lib/onboarding';
import { cutoffFor } from '../../../lib/dealingTerms';
import { Button, Empty, Field, Modal, Pill, Section, day, input, usd, type OnboardingCtx } from './ui';

export default function MoneyInPanel({ ctx, onOpenAccounts }: { ctx: OnboardingCtx; onOpenAccounts: () => void }) {
  const { data, classes, valuations } = ctx;
  const [matching, setMatching] = useState<MoneyIn | null>(null);
  const className = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.class_name])), [classes]);
  const official = useMemo(() => new Set(data.brokerAccounts.filter((a) => a.account_role === 'official').map((a) => a.share_class_id)), [data.brokerAccounts]);
  const incoming = useMemo(() => unmatchedMoneyIn(valuations, data.subscriptions, official), [valuations, data.subscriptions, official]);

  if (official.size === 0) {
    return (
      <Section title="Money arrived in IBKR" hint="Deposits and share transfers into the official Arkline Trust accounts show up here once the monthly IBKR statement is pulled.">
        <div className="mx-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-200">No official IBKR account has been set up yet. Your current accounts are treated as the pre-launch track record.</p>
          <Button onClick={onOpenAccounts}>Set up official accounts</Button>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Money arrived in IBKR"
      hint="Each deposit or share transfer into an official account must be matched to an investor before units can be issued. Until then it is held aside and not counted in the class value.">
      {incoming.length === 0 ? <Empty>Nothing new. Every deposit in the official accounts has been matched.</Empty> : (
        <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
          {incoming.map((m) => {
            const best = m.suggestions[0];
            return (
              <li key={m.movement.key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="tabular-nums">{usd(m.movement.amount)}</span>
                    <span className="text-slate-400 font-normal">into {className[m.classId]} on {day(m.movement.date)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate" title={m.movement.description}>{m.movement.description}</p>
                </div>
                {best ? <Pill tone="cyan" title="Suggested from the amount, name and type">Looks like {best.investor_name}</Pill> : <Pill tone="amber">No obvious match</Pill>}
                <Button onClick={() => setMatching(m)} disabled={!!ctx.busy}><Link2 className="w-3.5 h-3.5" />Match</Button>
              </li>
            );
          })}
        </ul>
      )}
      {matching && <MatchModal ctx={ctx} money={matching} className={className[matching.classId]} onClose={() => setMatching(null)} />}
    </Section>
  );
}

function MatchModal({ ctx, money, className, onClose }: { ctx: OnboardingCtx; money: MoneyIn; className: string; onClose: () => void }) {
  const waiting = ctx.data.subscriptions.filter((s) => s.status === 'awaiting_funds' && s.share_class_id === money.classId);
  const [subId, setSubId] = useState(money.suggestions[0]?.id ?? '');
  const sub = waiting.find((s) => s.id === subId);
  const dealing = sub ? dealingDayFor(ctx.schedule, sub.kind, money.movement.date) : null;
  const kindMismatch = sub && (sub.kind === 'in_kind') !== (money.movement.kind === 'shares');

  const confirm = async () => {
    if (!sub) return;
    const ok = await ctx.run(`match-${money.movement.key}`, async () => {
      const d = await confirmMoneyReceived(ctx.tenantId, ctx.fundId, sub, money.movement, ctx.schedule, ctx.userId);
      return `Matched to ${sub.investor_name}. Units will be issued at the ${day(d)} final IBKR price.`;
    });
    if (ok) onClose();
  };

  return (
    <Modal title="Confirm who sent this" onClose={onClose}>
      <div className="rounded-lg border border-slate-700 p-4">
        <p className="text-2xl text-white font-semibold tabular-nums">{usd(money.movement.amount)}</p>
        <p className="text-sm text-slate-400 mt-1">{money.movement.kind === 'shares' ? 'Shares transferred' : 'Cash deposited'} into {className} on {day(money.movement.date)}</p>
        <p className="text-xs text-slate-500 mt-2 break-words">{money.movement.description}</p>
      </div>
      {waiting.length === 0 ? (
        <p className="text-sm text-amber-300">No one in {className} is awaiting funds. Approve their application or add a subscription first.</p>
      ) : (
        <Field label="Investor">
          <select value={subId} onChange={(e) => setSubId(e.target.value)} className={input}>
            <option value="">Choose who sent it</option>
            {waiting.map((s) => (
              <option key={s.id} value={s.id}>
                {s.investor_name}{s.expected_amount != null ? ` - expecting ${usd(Number(s.expected_amount))}` : ''}{s.kind === 'in_kind' ? ' (share transfer)' : ''}
              </option>
            ))}
          </select>
        </Field>
      )}
      {sub && dealing && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-100 space-y-1">
          <p>Units will be issued at the <span className="font-medium text-white">{day(dealing)}</span> month-end price, once IBKR confirms it as final.</p>
          {sub.kind === 'cash' && <p className="text-xs text-cyan-200/70">Cut-off for that month was {day(cutoffFor(ctx.schedule, dealing))}.</p>}
          {sub.expected_amount != null && Math.abs(Number(sub.expected_amount) - money.movement.amount) >= 1 && (
            <p className="text-xs text-amber-300">This differs from the expected {usd(Number(sub.expected_amount))}. The amount actually received is what gets invested.</p>
          )}
        </div>
      )}
      {kindMismatch && <p className="text-xs text-amber-300">This was a {money.movement.kind === 'shares' ? 'share transfer' : 'cash deposit'}, but the subscription expects {sub!.kind === 'in_kind' ? 'shares' : 'cash'}.</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Close</Button>
        <Button onClick={confirm} disabled={!sub || !!ctx.busy} loading={ctx.busy === `match-${money.movement.key}`}>Confirm money received</Button>
      </div>
    </Modal>
  );
}
