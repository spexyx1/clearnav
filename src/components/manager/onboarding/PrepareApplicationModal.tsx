import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, Send } from 'lucide-react';
import { classForLetter, type ApplicationRow } from '../../../lib/onboarding';
import { INVESTOR_TYPES, findDuplicates, type ExistingApplication } from '../../../lib/investorForm';
import { MIN_PER_CLASS, aud, prepareApplication, previewApplicationPdf, sendInvite, type PreparedFields } from '../../../lib/applicationSigning';
import { Button, Field, Modal, Warning, input, type OnboardingCtx } from './ui';

const LETTERS = ['a', 'b', 'c'] as const;
const TYPES = INVESTOR_TYPES.filter((t) => t.value !== 'other');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Draft = {
  title: string; given: string; surname: string; email: string; phone: string; type: string; reinvest: boolean;
  picked: Record<'a' | 'b' | 'c', boolean>; amount: Record<'a' | 'b' | 'c', string>;
};

function fromApp(app?: ApplicationRow | null): Draft {
  return {
    title: app?.contact_title ?? '', given: app?.contact_given_names ?? '', surname: app?.contact_surname ?? '',
    email: app?.contact_email ?? '', phone: app?.contact_phone ?? '', type: app?.investor_type ?? 'individual', reinvest: app?.bank_reinvest ?? false,
    picked: { a: !!app?.invest_class_a, b: !!app?.invest_class_b, c: !!app?.invest_class_c },
    amount: {
      a: app?.amount_class_a != null ? String(app.amount_class_a) : '',
      b: app?.amount_class_b != null ? String(app.amount_class_b) : '',
      c: app?.amount_class_c != null ? String(app.amount_class_c) : '',
    },
  };
}

const parse = (s: string) => {
  const n = Number(s.replace(/[,\s$]/g, ''));
  return s.trim() && Number.isFinite(n) ? n : null;
};

export default function PrepareApplicationModal({ ctx, app, onClose }: { ctx: OnboardingCtx; app?: ApplicationRow | null; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => fromApp(app));
  const [id, setId] = useState<string | null>(app?.id ?? null);
  const [step, setStep] = useState<'edit' | 'preview' | 'sent'>('edit');
  const [preview, setPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [dupes, setDupes] = useState<{ applications: ExistingApplication[]; existingInvestor: string | null } | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const email = d.email.trim().toLowerCase();
  useEffect(() => {
    if (!EMAIL.test(email)) { setDupes(null); return; }
    const t = setTimeout(() => {
      findDuplicates(ctx.tenantId, email)
        .then((r) => setDupes({ applications: r.applications.filter((a) => a.id !== id), existingInvestor: r.existingInvestor }))
        .catch(() => setDupes(null));
    }, 400);
    return () => clearTimeout(t);
  }, [email, ctx.tenantId, id]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chosen = LETTERS.filter((l) => d.picked[l]);
  const belowMin = chosen.filter((l) => (parse(d.amount[l]) ?? 0) < MIN_PER_CLASS);
  const badAmount = chosen.some((l) => { const n = parse(d.amount[l]); return n == null || n <= 0; });
  const blockers = [
    !EMAIL.test(email) && 'Enter a valid email address.',
    !d.given.trim() && !d.surname.trim() && 'Enter the prospect\'s name.',
    badAmount && 'Enter an amount for every class you selected.',
  ].filter(Boolean) as string[];

  const fields = useMemo<PreparedFields>(() => ({
    contact_title: d.title.trim(), contact_given_names: d.given.trim(), contact_surname: d.surname.trim(), contact_email: email,
    contact_phone: d.phone.trim(), investor_type: d.type, bank_reinvest: d.reinvest,
    invest_class_a: d.picked.a, amount_class_a: d.picked.a ? parse(d.amount.a) : null,
    invest_class_b: d.picked.b, amount_class_b: d.picked.b ? parse(d.amount.b) : null,
    invest_class_c: d.picked.c, amount_class_c: d.picked.c ? parse(d.amount.c) : null,
  }), [d, email]);

  const saveAndPreview = async () => {
    let savedId = id;
    const ok = await ctx.run('prepare-save', async () => {
      savedId = await prepareApplication(ctx.tenantId, id, fields);
      setId(savedId);
      return 'Draft saved.';
    });
    if (!ok || !savedId) return;
    setStep('preview');
    setPreviewError('');
    setPreview(null);
    previewApplicationPdf(savedId).then(setPreview).catch((e: Error) => setPreviewError(e.message));
  };

  const send = async () => {
    if (!id) return;
    const ok = await ctx.run('prepare-send', async () => {
      await sendInvite(id);
      return `Application sent to ${email}.`;
    });
    if (ok) setStep('sent');
  };

  const name = [d.title, d.given, d.surname].filter((s) => s.trim()).join(' ');

  if (step === 'sent') {
    return (
      <Modal title="Application sent" onClose={onClose}>
        <p className="text-sm text-slate-300 leading-relaxed">
          {name || email} has been emailed a private link to review, complete and sign their application. The link expires in 30 days.
          You can follow their progress, send reminders or cancel the link from the applications list.
        </p>
        <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
      </Modal>
    );
  }

  if (step === 'preview') {
    return (
      <Modal title="Preview before sending" onClose={onClose}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-slate-500">Prospect</dt><dd className="text-slate-200">{name || '-'}</dd></div>
          <div><dt className="text-xs text-slate-500">Email</dt><dd className="text-slate-200 break-all">{email}</dd></div>
          <div><dt className="text-xs text-slate-500">Investor type</dt><dd className="text-slate-200">{TYPES.find((t) => t.value === d.type)?.label}</dd></div>
          <div><dt className="text-xs text-slate-500">Distributions</dt><dd className="text-slate-200">{d.reinvest ? 'Reinvested' : 'Paid out'}</dd></div>
          {chosen.map((l) => (
            <div key={l}><dt className="text-xs text-slate-500">{classForLetter(l, ctx.classes)?.class_name ?? `Class ${l.toUpperCase()}`}</dt>
              <dd className="text-slate-200 tabular-nums">{aud(parse(d.amount[l]) ?? 0)}</dd></div>
          ))}
        </dl>
        <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden h-[50vh] flex items-center justify-center">
          {preview ? <iframe title="Application preview" src={preview} className="w-full h-full bg-white" />
            : previewError ? <p className="text-sm text-red-300 p-4 text-center">{previewError}</p>
              : <p className="text-sm text-slate-400 animate-pulse">Building the pre-filled form...</p>}
        </div>
        {chosen.length === 0 && <Warning>No class is selected. The prospect will have to choose one before they can sign.</Warning>}
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button tone="quiet" onClick={() => setStep('edit')}><ArrowLeft className="w-3.5 h-3.5" />Back to edit</Button>
          <Button onClick={send} loading={ctx.busy === 'prepare-send'} disabled={!!ctx.busy}><Send className="w-3.5 h-3.5" />Send to prospect</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={app ? 'Edit prepared application' : 'Prepare application'} onClose={onClose}>
      <p className="text-xs text-slate-400 leading-relaxed">
        Fill in what you know. The prospect sees these as <span className="text-cyan-300">Prepared by Arkline</span>; if they change one, you'll be asked to approve it.
        They complete identity, tax, bank, beneficial owner and FATCA/CRS details themselves.
      </p>
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <Field label="Title"><input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Mr" className={input} /></Field>
        <Field label="Given names"><input value={d.given} onChange={(e) => set('given', e.target.value)} className={input} /></Field>
      </div>
      <Field label="Surname"><input value={d.surname} onChange={(e) => set('surname', e.target.value)} className={input} /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Email"><input type="email" value={d.email} onChange={(e) => set('email', e.target.value)} className={input} /></Field>
        <Field label="Phone"><input type="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} className={input} /></Field>
      </div>
      {dupes && (dupes.applications.length > 0 || dupes.existingInvestor) && (
        <Warning>
          {dupes.existingInvestor && <span className="block">{dupes.existingInvestor} is already an investor with this email.</span>}
          {dupes.applications.map((a) => <span key={a.id} className="block">Another application for {a.name} uses this email ({a.status.replace(/_/g, ' ')}).</span>)}
        </Warning>
      )}
      <Field label="Investor type" hint="Joint and company applications get a separate signing link for the second signer.">
        <select value={d.type} onChange={(e) => set('type', e.target.value)} className={input}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <div>
        <span className="block text-xs font-medium text-slate-300 mb-1.5">Units applied for (AUD, minimum {aud(MIN_PER_CLASS)} per class)</span>
        <div className="rounded-lg border border-slate-700 divide-y divide-slate-700/60">
          {LETTERS.map((l) => (
            <div key={l} className="flex items-center gap-3 p-3">
              <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                <input type="checkbox" checked={d.picked[l]} onChange={(e) => set('picked', { ...d.picked, [l]: e.target.checked })} className="accent-cyan-500 w-4 h-4" />
                <span className="text-sm text-slate-200 truncate">{classForLetter(l, ctx.classes)?.class_name ?? `Class ${l.toUpperCase()}`}</span>
              </label>
              <input value={d.amount[l]} onChange={(e) => set('amount', { ...d.amount, [l]: e.target.value })} disabled={!d.picked[l]}
                inputMode="decimal" placeholder="500,000" className={`${input} w-36 text-right tabular-nums disabled:opacity-40`} />
            </div>
          ))}
        </div>
      </div>
      {chosen.length === 0 && <Warning>No class is selected yet.</Warning>}
      {belowMin.length > 0 && !badAmount && (
        <Warning>{belowMin.map((l) => `Class ${l.toUpperCase()}`).join(', ')} {belowMin.length > 1 ? 'are' : 'is'} below the {aud(MIN_PER_CLASS)} minimum in the application form.</Warning>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={d.reinvest} onChange={(e) => set('reinvest', e.target.checked)} className="accent-cyan-500 w-4 h-4" />
        <span className="text-sm text-slate-200">Reinvest distributions</span>
      </label>
      {blockers.length > 0 && <ul className="text-xs text-slate-400 list-disc pl-4 space-y-0.5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Close</Button>
        <Button onClick={saveAndPreview} loading={ctx.busy === 'prepare-save'} disabled={!!ctx.busy || blockers.length > 0}>
          <Eye className="w-3.5 h-3.5" />Save draft and preview
        </Button>
      </div>
    </Modal>
  );
}
