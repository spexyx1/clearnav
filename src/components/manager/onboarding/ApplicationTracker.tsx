import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, FilePlus2, PenLine, RefreshCw, Send, X } from 'lucide-react';
import { applicantName, applicationAmounts, type ApplicationRow } from '../../../lib/onboarding';
import {
  FIELD_LABELS, aud, cancelApplication, decideChange, loadApplicationActivity, pendingChangeCounts, remindSigner, sendInvite,
  type ChangeRequest, type SignerRow,
} from '../../../lib/applicationSigning';
import PrepareApplicationModal from './PrepareApplicationModal';
import { Button, Empty, Modal, Pill, Section, day, input, type OnboardingCtx } from './ui';

type Tone = 'cyan' | 'green' | 'amber' | 'red' | 'slate';
export const STATUS: Record<string, [string, Tone]> = {
  draft: ['Draft', 'slate'], sent: ['Sent', 'cyan'], opened: ['Opened', 'cyan'], in_progress: ['In progress', 'cyan'],
  awaiting_witness: ['Awaiting witness', 'amber'], awaiting_second_signer: ['Awaiting second signer', 'amber'],
  signed: ['Signed', 'green'], paper_received: ['Paper copy received', 'green'], submitted: ['Submitted', 'green'],
  under_review: ['Under review', 'amber'], approved: ['Accepted', 'green'], rejected: ['Rejected', 'red'], cancelled: ['Cancelled', 'slate'],
};

export function StatusPill({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status, 'slate'];
  return <Pill tone={tone}>{label}</Pill>;
}

const IN_FLIGHT = ['draft', 'sent', 'opened', 'in_progress', 'awaiting_witness', 'awaiting_second_signer'];
const ROLE_LABEL: Record<SignerRow['role'], string> = { signer_1: 'Signer 1', signer_2: 'Signer 2', witness_1: 'Witness for signer 1', witness_2: 'Witness for signer 2' };

const expired = (a: ApplicationRow) => !!a.invite_expires_at && new Date(a.invite_expires_at) < new Date();
const show = (v: unknown) => v == null || v === '' ? '(blank)' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'number' ? aud(v) : String(v);

export default function ApplicationTracker({ ctx }: { ctx: OnboardingCtx }) {
  const apps = ctx.data.applications.filter((a) => IN_FLIGHT.includes(a.status));
  const [preparing, setPreparing] = useState<ApplicationRow | 'new' | null>(null);
  const [managing, setManaging] = useState<ApplicationRow | null>(null);
  const [changes, setChanges] = useState<Record<string, number>>({});

  const refreshChanges = useCallback(() => { pendingChangeCounts(ctx.tenantId).then(setChanges).catch(() => setChanges({})); }, [ctx.tenantId]);
  useEffect(refreshChanges, [refreshChanges, ctx.data]);

  const current = managing ? ctx.data.applications.find((a) => a.id === managing.id) ?? null : null;

  return (
    <Section title="Prepared and in-progress applications"
      hint="Prepare an application with the details you know, send the prospect a private link, and follow it through to signing."
      action={<Button onClick={() => setPreparing('new')}><FilePlus2 className="w-3.5 h-3.5" />Prepare application</Button>}>
      {apps.length === 0 ? <Empty>No applications are in progress. Prepare one to send to a prospect.</Empty> : (
        <ul className="divide-y divide-slate-700/60 border-t border-slate-700/60">
          {apps.map((a) => (
            <li key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 items-center px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{applicantName(a)}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {a.status === 'draft' ? `Prepared ${day(a.prepared_at ?? a.created_at)}`
                    : a.invite_sent_at ? `Sent ${day(a.invite_sent_at)}${a.last_reminder_at ? `, reminded ${day(a.last_reminder_at)}` : ''}`
                      : `Started ${day(a.created_at)}`}
                  {' - '}{applicationAmounts(a, ctx.classes).map((x) => `Class ${x.letter} ${aud(x.amount)}`).join(', ') || 'no class chosen'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusPill status={a.status} />
                {changes[a.id] ? <Pill tone="amber">{changes[a.id]} change{changes[a.id] > 1 ? 's' : ''} to review</Pill> : null}
                {a.status !== 'draft' && expired(a) && !a.locked_at && <Pill tone="red">Link expired</Pill>}
              </div>
              <Button tone="quiet" onClick={() => setManaging(a)}>Manage</Button>
            </li>
          ))}
        </ul>
      )}
      {preparing && <PrepareApplicationModal ctx={ctx} app={preparing === 'new' ? null : preparing} onClose={() => setPreparing(null)} />}
      {current && !preparing && (
        <ManageModal ctx={ctx} app={current} onClose={() => setManaging(null)} onEdit={() => setPreparing(current)} onChanged={refreshChanges} />
      )}
    </Section>
  );
}

function ManageModal({ ctx, app, onClose, onEdit, onChanged }: {
  ctx: OnboardingCtx; app: ApplicationRow; onClose: () => void; onEdit: () => void; onChanged: () => void;
}) {
  const [activity, setActivity] = useState<{ signers: SignerRow[]; changes: ChangeRequest[] } | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    loadApplicationActivity(app.id).then((r) => { setActivity(r); setError(''); }).catch((e: Error) => setError(e.message));
  }, [app.id]);
  useEffect(load, [load, app.status]);

  const act = async (key: string, action: () => Promise<string>, after?: () => void) => {
    const ok = await ctx.run(key, action);
    if (ok) { load(); onChanged(); after?.(); }
  };

  const pending = activity?.changes.filter((c) => c.status === 'pending') ?? [];
  const decided = activity?.changes.filter((c) => c.status === 'approved' || c.status === 'declined') ?? [];
  const email = app.invite_email || app.contact_email;
  const signing = app.status === 'awaiting_witness' || app.status === 'awaiting_second_signer';

  return (
    <Modal title={applicantName(app)} onClose={onClose}>
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={app.status} />
        <span className="text-xs text-slate-400 break-all">{email}</span>
      </div>

      <ol className="text-xs text-slate-400 space-y-1 border-l border-slate-700 pl-3">
        {app.prepared_at && <li>Prepared {day(app.prepared_at)}</li>}
        {app.invite_sent_at && <li>Link sent {day(app.invite_sent_at)}</li>}
        {app.last_reminder_at && <li>Last reminder {day(app.last_reminder_at)}</li>}
        {app.opened_at && <li>Opened by the prospect {day(app.opened_at)}</li>}
        {app.locked_at && <li>Locked for signing {day(app.locked_at)} ({app.sign_method === 'paper' ? 'print and sign' : 'electronic'})</li>}
        {app.invite_expires_at && app.status !== 'draft' && (
          <li className={expired(app) ? 'text-red-300' : ''}>Link {expired(app) ? 'expired' : 'expires'} {day(app.invite_expires_at)}</li>
        )}
      </ol>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {pending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-300">Changes the prospect asked for</h4>
          {pending.map((c) => (
            <div key={c.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <p className="text-sm text-white">{FIELD_LABELS[c.field] ?? c.field}</p>
              <p className="text-xs text-slate-400">
                <span className="line-through">{show(c.prepared_value)}</span> <span className="text-slate-500 mx-1">to</span>
                <span className="text-amber-200">{show(c.requested_value)}</span>
              </p>
              <input value={notes[c.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                placeholder="Note to keep on file (optional)" className={input} />
              <div className="flex justify-end gap-2">
                <Button tone="danger" disabled={!!ctx.busy} loading={ctx.busy === `decline-${c.id}`}
                  onClick={() => act(`decline-${c.id}`, async () => { await decideChange(c.id, false, notes[c.id] ?? ''); return 'Change declined. The prepared value stays.'; })}>
                  <X className="w-3.5 h-3.5" />Decline
                </Button>
                <Button disabled={!!ctx.busy} loading={ctx.busy === `approve-${c.id}`}
                  onClick={() => act(`approve-${c.id}`, async () => { await decideChange(c.id, true, notes[c.id] ?? ''); return 'Change approved and applied.'; })}>
                  <Check className="w-3.5 h-3.5" />Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-200">Earlier change requests ({decided.length})</summary>
          <ul className="mt-2 space-y-1">
            {decided.map((c) => (
              <li key={c.id}>{FIELD_LABELS[c.field] ?? c.field}: {show(c.requested_value)} - <span className={c.status === 'approved' ? 'text-emerald-300' : 'text-red-300'}>{c.status}</span>
                {c.decision_note ? ` (${c.decision_note})` : ''}</li>
            ))}
          </ul>
        </details>
      )}

      {activity && activity.signers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signing</h4>
          <ul className="rounded-lg border border-slate-700 divide-y divide-slate-700/60">
            {activity.signers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{s.name} <span className="text-xs text-slate-500">{ROLE_LABEL[s.role]}</span></p>
                  <p className="text-xs text-slate-400 truncate">
                    {s.signed_at ? `Signed ${day(s.signed_at)}` : s.email_verified_at ? 'Email verified, not signed yet' : `Invited ${day(s.invited_at)}`} - {s.email}
                  </p>
                </div>
                {!s.signed_at && (
                  <Button tone="quiet" disabled={!!ctx.busy} loading={ctx.busy === `remind-${s.id}`}
                    onClick={() => act(`remind-${s.id}`, async () => { await remindSigner(s.id); return `New signing link sent to ${s.email}.`; })}>
                    <RefreshCw className="w-3.5 h-3.5" />Remind
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button tone="danger" disabled={!!ctx.busy} loading={ctx.busy === `cancel-app-${app.id}`}
          onClick={() => {
            if (!window.confirm(`Cancel ${applicantName(app)}'s application? Every link already sent will stop working.`)) return;
            act(`cancel-app-${app.id}`, async () => { await cancelApplication(app.id); return 'Application cancelled and links disabled.'; }, onClose);
          }}>
          <Ban className="w-3.5 h-3.5" />Cancel application
        </Button>
        {app.status === 'draft' && app.prepared_at && <Button tone="quiet" onClick={onEdit}><PenLine className="w-3.5 h-3.5" />Edit</Button>}
        {!signing && !app.locked_at && (app.status !== 'draft' || app.prepared_at) && (
          <Button disabled={!!ctx.busy} loading={ctx.busy === `invite-${app.id}`}
            onClick={() => act(`invite-${app.id}`, async () => {
              await sendInvite(app.id);
              return app.status === 'draft' ? `Application sent to ${email}.` : `Reminder sent to ${email}. The earlier link no longer works.`;
            })}>
            <Send className="w-3.5 h-3.5" />{app.status === 'draft' ? 'Send to prospect' : 'Send reminder with new link'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
