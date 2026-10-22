import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle, FileCheck2, FileText, Mail, Plus, RefreshCw, XCircle } from 'lucide-react';
import {
  AWAITING_REVIEW, addSubscription, applicantName, applicationAmounts, approveApplication, cancelSubscription, loadClients, readyToApprove,
  rejectApplication, type ApplicationRow, type PaymentDetails, type SubscriptionRow,
} from '../../../lib/onboarding';
import { aud, markPaperChecked, openApplicationFile, retryFinalize, sendAcceptance } from '../../../lib/applicationSigning';
import ApplicationTracker, { StatusPill } from './ApplicationTracker';
import { Button, Empty, Field, Modal, Pill, Section, Warning, day, input, usd, type OnboardingCtx } from './ui';

export function SubscriptionStatus({ sub }: { sub: SubscriptionRow }) {
  if (sub.status === 'awaiting_funds') return <Pill tone="amber">{sub.kind === 'in_kind' ? 'Awaiting share transfer' : 'Awaiting funds'}</Pill>;
  if (sub.status === 'money_received') return <Pill tone="cyan">Received - dealt {day(sub.dealing_date)}</Pill>;
  if (sub.status === 'units_issued') return <Pill tone="green">Units issued</Pill>;
  return <Pill tone="slate">Cancelled</Pill>;
}

export default function ApplicationsPanel({ ctx }: { ctx: OnboardingCtx }) {
  const { data, classes, busy, run } = ctx;
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const className = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.class_name])), [classes]);
  const pending = data.applications.filter((a) => AWAITING_REVIEW.includes(a.status) || (a.status === 'approved' && !a.accepted_email_sent_at));
  const reviewing = data.applications.find((a) => a.id === reviewingId) ?? null;
  const accepting = data.applications.find((a) => a.id === acceptingId) ?? null;
  const lastPayment = data.applications.find((a) => a.acceptance_payment_details)?.acceptance_payment_details ?? null;
  const subs = data.subscriptions.filter((s) => s.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <ApplicationTracker ctx={ctx} />

      <Section title="Applications to review" hint="Accepting a signed application opens a subscription for each class and emails written confirmation with payment details. Units are only issued at the monthly dealing date, at the IBKR-confirmed price.">
        {pending.length === 0 ? <Empty>No signed applications are waiting for review.</Empty> : (
          <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
            {pending.map((a) => (
              <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{applicantName(a)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {a.signed_at ? `Signed ${day(a.signed_at)}` : a.paper_received_at ? `Paper copy received ${day(a.paper_received_at)}` : `Submitted ${day(a.submitted_at)}`}
                    {' - '}{applicationAmounts(a, classes).map((x) => `${x.cls?.class_name ?? `Class ${x.letter}`} ${aud(x.amount)}`).join(', ') || 'no amount entered'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={a.status} />
                  {a.status === 'approved'
                    ? <Button onClick={() => setAcceptingId(a.id)}><Mail className="w-3.5 h-3.5" />Send confirmation</Button>
                    : <Button onClick={() => setReviewingId(a.id)}>Review</Button>}
                </div>
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

      {reviewing && <ReviewModal ctx={ctx} app={reviewing} onClose={() => setReviewingId(null)} onApproved={() => { setReviewingId(null); setAcceptingId(reviewing.id); }} />}
      {accepting && <AcceptanceModal ctx={ctx} app={accepting} last={accepting.acceptance_payment_details ?? lastPayment} onClose={() => setAcceptingId(null)} />}
      {adding && <AddModal ctx={ctx} onClose={() => setAdding(false)} />}
    </div>
  );
}

function ReviewModal({ ctx, app, onClose, onApproved }: { ctx: OnboardingCtx; app: ApplicationRow; onClose: () => void; onApproved: () => void }) {
  const [notes, setNotes] = useState(app.reviewer_notes ?? '');
  const [rejecting, setRejecting] = useState(false);
  const amounts = applicationAmounts(app, ctx.classes);
  const unmatched = amounts.some((a) => !a.cls);
  const ready = readyToApprove(app);
  const finalizeFailed = app.status === 'signed' && !app.signed_pdf_path;
  const open = (kind: 'signed' | 'paper') => ctx.run(`file-${kind}`, async () => { await openApplicationFile(app.id, kind); });
  const decide = async (approve: boolean) => {
    const ok = await ctx.run(`review-${app.id}`, async () => {
      if (approve) await approveApplication(app, ctx.classes, ctx.fundId, ctx.userId, notes);
      else await rejectApplication(app, ctx.userId, notes);
      return approve ? `${applicantName(app)} accepted. Now send their written confirmation.` : `${applicantName(app)} rejected.`;
    });
    if (ok) { if (approve) onApproved(); else onClose(); }
  };
  return (
    <Modal title={applicantName(app)} onClose={onClose}>
      <div className="flex items-center justify-between gap-2"><StatusPill status={app.status} /><span className="text-xs text-slate-400 break-all">{app.contact_email}</span></div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-slate-500">Investor type</dt><dd className="text-slate-200 capitalize">{app.investor_type?.replace(/_/g, ' ') ?? '-'}</dd></div>
        <div><dt className="text-xs text-slate-500">Signed</dt><dd className="text-slate-200">{app.signed_at ? `${day(app.signed_at)}, electronically` : app.paper_received_at ? `Paper copy, received ${day(app.paper_received_at)}` : day(app.submitted_at)}</dd></div>
      </dl>
      <div className="rounded-lg border border-slate-700 divide-y divide-slate-700/60">
        {amounts.length === 0 ? <p className="p-3 text-sm text-amber-300">No amount was entered for any class.</p> : amounts.map((a) => (
          <div key={a.letter} className="flex justify-between p-3 text-sm">
            <span className={a.cls ? 'text-slate-300' : 'text-amber-300'}>{a.cls?.class_name ?? `Class ${a.letter} (not found in this fund)`}</span>
            <span className="text-white tabular-nums">{aud(a.amount)}</span>
          </div>
        ))}
      </div>

      {app.signed_pdf_path && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <p className="text-sm text-emerald-200 flex items-center gap-2"><FileCheck2 className="w-4 h-4" />Locked signed copy with signing record</p>
          {app.signed_pdf_sha256 && <p className="text-[11px] text-slate-400 font-mono break-all">SHA-256 {app.signed_pdf_sha256}</p>}
          <Button tone="quiet" onClick={() => open('signed')} loading={ctx.busy === 'file-signed'} disabled={!!ctx.busy}><FileText className="w-3.5 h-3.5" />Open signed PDF</Button>
        </div>
      )}
      {finalizeFailed && (
        <Warning>
          Everyone has signed, but the locked PDF has not been produced yet.
          <div className="mt-2"><Button tone="quiet" disabled={!!ctx.busy} loading={ctx.busy === 'finalize'}
            onClick={() => ctx.run('finalize', async () => { await retryFinalize(app.id); return 'Signed copy produced and emailed.'; })}>
            <RefreshCw className="w-3.5 h-3.5" />Produce signed copy</Button></div>
        </Warning>
      )}
      {app.paper_scan_path && (
        <div className="rounded-lg border border-slate-700 p-3 space-y-2">
          <p className="text-sm text-slate-200">Scanned paper copy</p>
          <p className="text-xs text-slate-400">{app.paper_checked_at ? `Checked ${day(app.paper_checked_at)}.` : 'Open the scan and check every page is signed and witnessed before marking it checked.'}</p>
          <div className="flex flex-wrap gap-2">
            <Button tone="quiet" onClick={() => open('paper')} loading={ctx.busy === 'file-paper'} disabled={!!ctx.busy}><FileText className="w-3.5 h-3.5" />Open scan</Button>
            {!app.paper_checked_at && (
              <Button tone="quiet" disabled={!!ctx.busy} loading={ctx.busy === 'paper-check'}
                onClick={() => ctx.run('paper-check', async () => { await markPaperChecked(app.id); return 'Paper copy marked as checked.'; })}>
                <CheckCircle className="w-3.5 h-3.5" />Mark as checked</Button>
            )}
          </div>
        </div>
      )}

      <Field label={rejecting ? 'Reason for rejecting (required; the applicant sees this if they reopen their link)' : 'Notes (optional)'}>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={input} />
      </Field>
      {!ready && !finalizeFailed && app.status === 'paper_received' && <p className="text-xs text-amber-300">Check the paper copy before accepting.</p>}
      <div className="flex justify-end gap-2 pt-2">
        {rejecting ? (
          <>
            <Button tone="quiet" onClick={() => setRejecting(false)}>Back</Button>
            <Button tone="danger" onClick={() => decide(false)} loading={ctx.busy === `review-${app.id}`} disabled={!!ctx.busy || !notes.trim()}>
              <XCircle className="w-3.5 h-3.5" />Confirm rejection</Button>
          </>
        ) : (
          <>
            <Button tone="danger" onClick={() => setRejecting(true)} disabled={!!ctx.busy}><XCircle className="w-3.5 h-3.5" />Reject</Button>
            <Button onClick={() => decide(true)} loading={ctx.busy === `review-${app.id}`} disabled={!!ctx.busy || !ready || !amounts.length || unmatched}>
              <CheckCircle className="w-3.5 h-3.5" />Accept</Button>
          </>
        )}
      </div>
    </Modal>
  );
}

const EMPTY_PAYMENT: PaymentDetails = { bank: '', account_name: '', bsb: '', account_number: '', swift: '' };

function AcceptanceModal({ ctx, app, last, onClose }: { ctx: OnboardingCtx; app: ApplicationRow; last: PaymentDetails | null; onClose: () => void }) {
  const [p, setP] = useState<PaymentDetails>(() => ({ ...EMPTY_PAYMENT, ...(last ?? {}), reference: undefined }));
  const set = (k: keyof PaymentDetails, v: string) => setP((x) => ({ ...x, [k]: v }));
  const valid = !!(p.bank.trim() && p.account_name.trim() && p.bsb.trim() && p.account_number.trim());
  const send = async () => {
    const ok = await ctx.run('acceptance', async () => {
      await sendAcceptance(app.id, { bank: p.bank.trim(), account_name: p.account_name.trim(), bsb: p.bsb.trim(), account_number: p.account_number.trim(), swift: p.swift?.trim() });
      return `Written confirmation and payment details sent to ${app.contact_email}.`;
    });
    if (ok) onClose();
  };
  return (
    <Modal title="Send written confirmation" onClose={onClose}>
      <p className="text-xs text-slate-400 leading-relaxed">
        {applicantName(app)} will be emailed confirmation that their application is accepted, with these payment details. The payment reference is their full legal name.
        The email states that units are only issued at the next monthly dealing date, at the unit price confirmed by IBKR.
      </p>
      {app.accepted_email_sent_at && <Warning>A confirmation was already sent on {day(app.accepted_email_sent_at)}. Sending again emails it a second time.</Warning>}
      <Field label="Bank"><input value={p.bank} onChange={(e) => set('bank', e.target.value)} placeholder="National Australia Bank" className={input} /></Field>
      <Field label="Account name"><input value={p.account_name} onChange={(e) => set('account_name', e.target.value)} className={input} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="BSB"><input value={p.bsb} onChange={(e) => set('bsb', e.target.value)} className={input} /></Field>
        <Field label="Account number"><input value={p.account_number} onChange={(e) => set('account_number', e.target.value)} className={input} /></Field>
      </div>
      <Field label="SWIFT (optional, for overseas transfers)"><input value={p.swift ?? ''} onChange={(e) => set('swift', e.target.value)} className={input} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Later</Button>
        <Button onClick={send} disabled={!valid || !!ctx.busy} loading={ctx.busy === 'acceptance'}><Mail className="w-3.5 h-3.5" />Send confirmation</Button>
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
