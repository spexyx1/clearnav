import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle, Plus, XCircle } from 'lucide-react';
import {
  addSubscription, applicantName, applicationAmounts, approveApplication, cancelSubscription, loadClients, rejectApplication,
  type ApplicationRow, type SubscriptionRow,
} from '../../../lib/onboarding';
import { Button, Empty, Field, Modal, Pill, Section, day, input, usd, type OnboardingCtx } from './ui';

export function SubscriptionStatus({ sub }: { sub: SubscriptionRow }) {
  if (sub.status === 'awaiting_funds') return <Pill tone="amber">{sub.kind === 'in_kind' ? 'Awaiting share transfer' : 'Awaiting funds'}</Pill>;
  if (sub.status === 'money_received') return <Pill tone="cyan">Received - dealt {day(sub.dealing_date)}</Pill>;
  if (sub.status === 'units_issued') return <Pill tone="green">Units issued</Pill>;
  return <Pill tone="slate">Cancelled</Pill>;
}

export default function ApplicationsPanel({ ctx }: { ctx: OnboardingCtx }) {
  const { data, classes, busy, run } = ctx;
  const [reviewing, setReviewing] = useState<ApplicationRow | null>(null);
  const [adding, setAdding] = useState(false);
  const className = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.class_name])), [classes]);
  const pending = data.applications.filter((a) => a.status === 'submitted' || a.status === 'under_review');
  const subs = data.subscriptions.filter((s) => s.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <Section title="Applications to review" hint="Approving an application opens a subscription for each class the investor chose. It then waits for their money to arrive in that class's official IBKR account.">
        {pending.length === 0 ? <Empty>No applications are waiting for review.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {pending.map((a) => (
              <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{applicantName(a)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Submitted {day(a.submitted_at)} - {applicationAmounts(a, classes).map((x) => `${x.cls?.class_name ?? `Class ${x.letter}`} ${usd(x.amount)}`).join(', ') || 'no amount entered'}
                  </p>
                </div>
                <Button onClick={() => setReviewing(a)}>Review</Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Subscriptions" hint="Every investor waiting to receive units, and where they are in the process."
        action={<Button tone="quiet" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Add subscription or seed transfer</Button>}>
        {subs.length === 0 ? <Empty>No subscriptions yet. Approve an application or add the seed investor's share transfer.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {subs.map((s) => (
              <li key={s.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate flex items-center gap-2">
                    {s.kind === 'in_kind' && <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                    {s.investor_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {className[s.share_class_id] ?? 'Class'} - {s.received_amount != null ? `${usd(Number(s.received_amount))} received ${day(s.money_received_date)}`
                      : s.expected_amount != null ? `expecting ${usd(Number(s.expected_amount))}` : s.kind === 'in_kind' ? 'shares transferred in' : 'amount not set'}
                  </p>
                </div>
                <SubscriptionStatus sub={s} />
                <div className="sm:w-20 sm:text-right">
                  {s.status === 'awaiting_funds' && (
                    <Button tone="danger" loading={busy === `cancel-${s.id}`} disabled={!!busy}
                      onClick={() => { if (window.confirm(`Cancel ${s.investor_name}'s subscription?`)) run(`cancel-${s.id}`, () => cancelSubscription(s.id)); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {reviewing && <ReviewModal ctx={ctx} app={reviewing} onClose={() => setReviewing(null)} />}
      {adding && <AddModal ctx={ctx} onClose={() => setAdding(false)} />}
    </div>
  );
}

function ReviewModal({ ctx, app, onClose }: { ctx: OnboardingCtx; app: ApplicationRow; onClose: () => void }) {
  const [notes, setNotes] = useState(app.reviewer_notes ?? '');
  const amounts = applicationAmounts(app, ctx.classes);
  const unmatched = amounts.some((a) => !a.cls);
  const decide = async (approve: boolean) => {
    const ok = await ctx.run(`review-${app.id}`, async () => {
      if (approve) await approveApplication(app, ctx.classes, ctx.fundId, ctx.userId, notes);
      else await rejectApplication(app, ctx.userId, notes);
      return approve ? `${applicantName(app)} approved. Their subscriptions are now awaiting funds.` : `${applicantName(app)} rejected.`;
    });
    if (ok) onClose();
  };
  return (
    <Modal title={applicantName(app)} onClose={onClose}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-slate-500">Email</dt><dd className="text-slate-200 break-all">{app.contact_email ?? '-'}</dd></div>
        <div><dt className="text-xs text-slate-500">Investor type</dt><dd className="text-slate-200 capitalize">{app.investor_type?.replace(/_/g, ' ') ?? '-'}</dd></div>
      </dl>
      <div className="rounded-lg border border-slate-700 divide-y divide-slate-700/60">
        {amounts.length === 0 ? <p className="p-3 text-sm text-amber-300">No amount was entered for any class.</p> : amounts.map((a) => (
          <div key={a.letter} className="flex justify-between p-3 text-sm">
            <span className={a.cls ? 'text-slate-300' : 'text-amber-300'}>{a.cls?.class_name ?? `Class ${a.letter} (not found in this fund)`}</span>
            <span className="text-white tabular-nums">{usd(a.amount)}</span>
          </div>
        ))}
      </div>
      <Field label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={input} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="danger" onClick={() => decide(false)} disabled={!!ctx.busy}><XCircle className="w-3.5 h-3.5" />Reject</Button>
        <Button onClick={() => decide(true)} loading={ctx.busy === `review-${app.id}`} disabled={!!ctx.busy || !amounts.length || unmatched}>
          <CheckCircle className="w-3.5 h-3.5" />Approve
        </Button>
      </div>
    </Modal>
  );
}

function AddModal({ ctx, onClose }: { ctx: OnboardingCtx; onClose: () => void }) {
  const [clients, setClients] = useState<{ id: string; full_name: string | null; email: string | null }[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [clientId, setClientId] = useState('');
  const [classId, setClassId] = useState(ctx.classes[0]?.id ?? '');
  const [kind, setKind] = useState<'cash' | 'in_kind'>('in_kind');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadClients(ctx.tenantId).then(setClients).catch((e: Error) => setLoadError(e.message));
  }, [ctx.tenantId]);

  const client = clients?.find((c) => c.id === clientId);
  const value = amount.trim() ? Number(amount.replace(/,/g, '')) : null;
  const valid = !!client && !!classId && (value == null ? kind === 'in_kind' : value > 0);

  const save = async () => {
    if (!client) return;
    const ok = await ctx.run('add-sub', async () => {
      await addSubscription({
        tenantId: ctx.tenantId, fundId: ctx.fundId, classId, clientId: client.id, name: client.full_name || client.email || 'Investor',
        email: client.email, kind, amount: value,
      });
      return `Subscription added for ${client.full_name || client.email}.`;
    });
    if (ok) onClose();
  };

  return (
    <Modal title="Add subscription" onClose={onClose}>
      {loadError && <p className="text-sm text-red-300">{loadError}</p>}
      <Field label="Investor" hint="Investors must already exist on the Clients page so they can see their units in the portal.">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={input} disabled={!clients}>
          <option value="">{clients ? 'Choose an investor' : 'Loading...'}</option>
          {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
        </select>
      </Field>
      <Field label="Class">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={input}>
          {ctx.classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {([['in_kind', 'Share transfer', 'Seed investor moves existing shares into the account'], ['cash', 'Cash', 'Money sent to the IBKR account']] as const).map(([k, label, hint]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`text-left rounded-lg border p-3 transition-colors ${kind === k ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
            <span className="block text-sm text-white">{label}</span>
            <span className="block text-xs text-slate-400 mt-1 leading-snug">{hint}</span>
          </button>
        ))}
      </div>
      <Field label={kind === 'in_kind' ? 'Expected value (optional)' : 'Expected amount (USD)'}
        hint={kind === 'in_kind' ? 'Shares are valued at the IBKR closing price on launch day, and units start at 1.00.' : 'Used to match the deposit when it shows up in IBKR.'}>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={input} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Close</Button>
        <Button onClick={save} disabled={!valid || !!ctx.busy} loading={ctx.busy === 'add-sub'}>Add subscription</Button>
      </div>
    </Modal>
  );
}
