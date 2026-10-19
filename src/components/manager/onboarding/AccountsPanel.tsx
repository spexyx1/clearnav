import { useState } from 'react';
import { History, Landmark } from 'lucide-react';
import { setOfficialAccount, type ClassRef } from '../../../lib/onboarding';
import { Button, Field, Pill, Section, card, day, input, type OnboardingCtx } from './ui';

const nextMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7);
};

export default function AccountsPanel({ ctx }: { ctx: OnboardingCtx }) {
  return (
    <Section title="Official IBKR accounts"
      hint="Each class gets its own Arkline Trust IBKR account. From its start month, unit prices come only from that account. Earlier months from your current accounts stay as the pre-launch track record.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-5 pb-5">
        {ctx.classes.map((c) => <ClassAccount key={c.id} ctx={ctx} cls={c} />)}
      </div>
    </Section>
  );
}

function ClassAccount({ ctx, cls }: { ctx: OnboardingCtx; cls: ClassRef }) {
  const accounts = ctx.data.brokerAccounts.filter((a) => a.share_class_id === cls.id);
  const official = accounts.find((a) => a.account_role === 'official');
  const history = accounts.filter((a) => a.account_role !== 'official');
  const [editing, setEditing] = useState(!official);
  const [account, setAccount] = useState(official?.account_id ?? '');
  const [from, setFrom] = useState(official?.official_from?.slice(0, 7) ?? nextMonth());
  const key = `acct-${cls.id}`;

  const save = () => ctx.run(key, async () => {
    await setOfficialAccount(ctx.tenantId, ctx.fundId, cls.id, account, from);
    setEditing(false);
    return `${cls.class_name} now uses ${account.trim().toUpperCase()} from ${new Date(`${from}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`;
  });

  return (
    <div className={`${card} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-white font-medium">{cls.class_name}</p>
        {official ? <Pill tone="green">Official</Pill> : <Pill tone="amber">Not set</Pill>}
      </div>
      {official && !editing ? (
        <div className="flex items-start gap-3">
          <Landmark className="w-4 h-4 text-cyan-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-slate-200 font-mono">{official.account_id}</p>
            <p className="text-xs text-slate-400 mt-0.5">Live from {day(official.official_from)}</p>
          </div>
        </div>
      ) : (
        <>
          <Field label="IBKR account number">
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="U12345678" className={`${input} font-mono`} />
          </Field>
          <Field label="First month" hint="The first month-end the class is valued from this account. Units start at 1.00.">
            <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
          </Field>
        </>
      )}
      {history.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-slate-400">
          <History className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Track record: <span className="font-mono text-slate-300">{history.map((h) => h.account_id).join(', ')}</span></span>
        </div>
      )}
      <div className="mt-auto flex justify-end gap-2">
        {official && editing && <Button tone="quiet" onClick={() => setEditing(false)}>Cancel</Button>}
        {editing
          ? <Button onClick={save} disabled={!account.trim() || !/^\d{4}-\d{2}$/.test(from) || !!ctx.busy} loading={ctx.busy === key}>Save</Button>
          : <Button tone="quiet" onClick={() => setEditing(true)}>Change</Button>}
      </div>
    </div>
  );
}
