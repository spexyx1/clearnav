import { useState } from 'react';
import { MANUAL_CATEGORY_LABELS, type ClassValuation, type ManualCategory, type ManualKind, type Movement } from '../../../lib/fundValuation';
import { KIND_LABELS, addCharge, linkPayment, type ChargeRow } from '../../../lib/manualCharges';
import type { RegisterAccount } from '../../../lib/unitRegister';
import { Button, Field, Modal, input, usd } from '../onboarding/ui';

export interface FeeCtx {
  tenantId: string;
  fundId: string;
  classes: { id: string; class_name: string }[];
  accounts: RegisterAccount[];
  valuations: ClassValuation[];
  openMonths: (classId: string) => string[];
  linkedKeys: Set<string>;
  subscriptionKeys: Set<string>;
  busy: string | null;
  run: (key: string, action: () => Promise<string | void>) => Promise<boolean>;
}

const KIND_HINTS: Record<ManualKind, string> = {
  class_charge: 'Shared by everyone in the class. It lowers the unit price for that month.',
  investor_fee: 'Charged to one investor only. Units worth the fee are cancelled at the final IBKR price.',
  manager_rebate: 'Arkline pays the investor back. It shows as owed until Arkline\'s payment arrives in IBKR, then units are issued at the final price.',
};

export const monthName = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function ChargeModal({ ctx, correcting, onClose }: { ctx: FeeCtx; correcting?: ChargeRow; onClose: () => void }) {
  const [kind, setKind] = useState<ManualKind>(correcting?.kind ?? 'class_charge');
  const [classId, setClassId] = useState(correcting?.classId ?? ctx.classes[0]?.id ?? '');
  const [accountId, setAccountId] = useState(correcting?.accountId ?? '');
  const [category, setCategory] = useState<ManualCategory>(correcting?.category ?? 'admin');
  const months = ctx.openMonths(classId);
  const [month, setMonth] = useState(months[0] ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState(correcting ? `Correction to ${monthName(correcting.month)}: ${correcting.note}` : '');
  const num = Number(amount.replace(/,/g, ''));
  const investors = ctx.accounts.filter((a) => a.classId === classId && a.units > 0);
  const negativeOk = !!correcting && kind === 'class_charge';
  const valid = !!classId && months.includes(month) && Number.isFinite(num) && num !== 0 && (num > 0 || negativeOk)
    && (kind === 'class_charge' || !!accountId) && note.trim().length > 2;

  const save = async () => {
    const ok = await ctx.run('add', async () => {
      await addCharge({ tenantId: ctx.tenantId, fundId: ctx.fundId, classId, accountId: accountId || null, kind, category, amount: num, month, note, correctsId: correcting?.id ?? null });
      return `${KIND_LABELS[kind]} saved for ${monthName(month)}. Save the month again in Fund Value so the unit price includes it.`;
    });
    if (ok) onClose();
  };

  return (
    <Modal title={correcting ? 'Correct a charge' : 'New charge or rebate'} onClose={onClose}>
      {!correcting && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(KIND_LABELS) as ManualKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${kind === k ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 leading-relaxed">{KIND_HINTS[kind]}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Class">
          <select value={classId} disabled={!!correcting} onChange={(e) => { setClassId(e.target.value); setAccountId(''); setMonth(ctx.openMonths(e.target.value)[0] ?? ''); }} className={input}>
            {ctx.classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </Field>
        <Field label="Month" hint={months.length ? 'Only months not yet approved can be used.' : undefined}>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={input}>
            {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </Field>
      </div>
      {!months.length && <p className="text-xs text-amber-300">This class has no open month yet. Set its official IBKR account first.</p>}
      {kind !== 'class_charge' && (
        <Field label="Investor">
          <select value={accountId} disabled={!!correcting} onChange={(e) => setAccountId(e.target.value)} className={input}>
            <option value="">Choose an investor</option>
            {investors.map((a) => <option key={a.id} value={a.id}>{a.investorName}</option>)}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type of charge">
          <select value={category} disabled={!!correcting} onChange={(e) => setCategory(e.target.value as ManualCategory)} className={input}>
            {(Object.keys(MANUAL_CATEGORY_LABELS) as ManualCategory[]).map((c) => <option key={c} value={c}>{MANUAL_CATEGORY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Amount (USD)" hint={negativeOk ? 'Use a minus sign to give the class a credit.' : undefined}>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className={input} />
        </Field>
      </div>
      <Field label="Note" hint="Shown to investors next to the charge on their statement.">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button tone="quiet" onClick={onClose}>Close</Button>
        <Button onClick={save} disabled={!valid || !!ctx.busy} loading={ctx.busy === 'add'}>Save</Button>
      </div>
    </Modal>
  );
}

export function LinkModal({ ctx, charge, onClose }: { ctx: FeeCtx; charge: ChargeRow; onClose: () => void }) {
  const wantsDeposit = charge.kind === 'manager_rebate';
  const open = new Set(ctx.openMonths(charge.classId));
  const options = (ctx.valuations.find((v) => v.classId === charge.classId)?.months ?? [])
    .filter((m) => open.has(m.month) && !m.trackRecord && m.month >= charge.month)
    .flatMap((m) => m.movements.filter((x) => x.kind === 'cash' && (wantsDeposit ? x.amount > 0 : x.amount < 0)
      && (!ctx.linkedKeys.has(x.key) || x.key === charge.movementKey) && !ctx.subscriptionKeys.has(x.key)).map((x) => ({ month: m.month, mv: x })));
  const [picked, setPicked] = useState<{ month: string; mv: Movement } | null>(null);
  const target = Math.abs(charge.amount);

  const save = async (key: string | null, month: string | null) => {
    const ok = await ctx.run('link', async () => {
      await linkPayment(charge.id, key, month);
      return key ? 'IBKR payment linked. Save the month again in Fund Value so it is counted once.' : 'Link removed.';
    });
    if (ok) onClose();
  };

  return (
    <Modal title={wantsDeposit ? "Link Arkline's payment" : 'Link the IBKR payment'} onClose={onClose}>
      <p className="text-sm text-slate-400 leading-relaxed">
        {wantsDeposit
          ? `Pick the deposit Arkline made into the class account for this ${usd(target)} rebate. Units are issued at the final price of the month it arrived.`
          : `If this ${usd(target)} charge was paid out of the IBKR account, pick the payment so it is not counted as a second fee.`}
      </p>
      {options.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No unlinked {wantsDeposit ? 'deposits' : 'payments'} in open months from {monthName(charge.month)} on. Import the latest IBKR statement first.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
          {options.map((o) => {
            const exact = Math.abs(Math.abs(o.mv.amount) - target) < 0.005;
            const active = picked?.mv.key === o.mv.key || (!picked && charge.movementKey === o.mv.key);
            return (
              <li key={o.mv.key}>
                <button onClick={() => setPicked(o)} className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${active ? 'bg-cyan-500/10' : 'hover:bg-slate-800/60'}`}>
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-200 truncate">{o.mv.description}</span>
                    <span className="block text-xs text-slate-500">{o.mv.date}{exact ? ' - matches the amount' : ''}</span>
                  </span>
                  <span className={`tabular-nums text-sm ${exact ? 'text-emerald-300' : 'text-slate-300'}`}>{usd(o.mv.amount)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {picked && wantsDeposit && Math.abs(picked.mv.amount - target) >= 0.005 && (
        <p className="text-xs text-amber-300">This deposit does not equal the rebate. The month will not be final until they match.</p>
      )}
      <div className="flex justify-between gap-2 pt-2">
        {charge.movementKey ? <Button tone="danger" onClick={() => save(null, null)} disabled={!!ctx.busy}>Remove link</Button> : <span />}
        <div className="flex gap-2">
          <Button tone="quiet" onClick={onClose}>Close</Button>
          <Button onClick={() => picked && save(picked.mv.key, picked.month)} disabled={!picked || !!ctx.busy} loading={ctx.busy === 'link'}>Link payment</Button>
        </div>
      </div>
    </Modal>
  );
}
