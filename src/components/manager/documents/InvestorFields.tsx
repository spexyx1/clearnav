import { Quote } from 'lucide-react';
import { useState } from 'react';
import { INVESTOR_FIELDS, investorTotal, type InvestorDraft, type InvestorField, type InvestorKey, type ExistingApplication } from '../../../lib/investorForm';
import type { TermEntry } from '../../../lib/dealingTerms';
import { Button, Pill, day, input, usd } from '../onboarding/ui';

function FieldInput({ field, entry, onChange, disabled }: { field: InvestorField; entry?: TermEntry; onChange: (v: TermEntry['value']) => void; disabled: boolean }) {
  const v = entry?.value;
  if (field.kind === 'boolean') {
    return (
      <select disabled={disabled} className={input} value={v === true || v === 'true' ? 'yes' : v === false || v === 'false' ? 'no' : ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'yes')}>
        <option value="">Not stated</option><option value="yes">Yes</option><option value="no">No</option>
      </select>
    );
  }
  if (field.kind === 'select') {
    return (
      <select disabled={disabled} className={input} value={typeof v === 'string' ? v : ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Choose</option>
        {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input disabled={disabled} className={input} type={field.kind === 'number' ? 'number' : 'text'} step="any" min={field.kind === 'number' ? 0 : undefined}
      value={v === null || v === undefined ? '' : String(v)} placeholder={field.kind === 'number' ? '0' : 'Not found'}
      onChange={(e) => onChange(e.target.value === '' ? null : field.kind === 'number' ? Number(e.target.value) : e.target.value)} />
  );
}

function Source({ entry }: { entry?: TermEntry }) {
  const [open, setOpen] = useState(false);
  if (!entry?.quote && !entry?.page) return <span className="text-[11px] text-slate-600">Entered by hand</span>;
  return (
    <span className="block">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-[11px] text-cyan-300/80 hover:text-cyan-200">
        <Quote className="w-3 h-3" />{entry.page ? `Page ${entry.page}` : 'Note'}{entry.clause ? `, ${entry.clause}` : ''}
      </button>
      {open && entry.quote && <span className="block mt-1 text-[11px] text-slate-400 italic leading-relaxed">"{entry.quote}"</span>}
    </span>
  );
}

const GROUPS = ['Investor', 'Address', 'Investment', 'Tax', 'Bank'] as const;
const GROUP_HINT: Partial<Record<(typeof GROUPS)[number], string>> = {
  Investment: 'Amounts the investor is applying for, in each class.',
  Tax: 'Tax details are stored with the application and only visible to fund staff.',
};

export function InvestorFields({ draft, onChange, disabled }: { draft: InvestorDraft; onChange: (key: InvestorKey, entry: TermEntry) => void; disabled: boolean }) {
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400">{g}</h4>
            {g === 'Investment' && <span className="text-xs text-slate-400">Total {usd(investorTotal(draft))}</span>}
          </div>
          {GROUP_HINT[g] && <p className="text-xs text-slate-500 mb-2">{GROUP_HINT[g]}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INVESTOR_FIELDS.filter((f) => f.group === g).map((f) => (
              <label key={f.key} className="block space-y-1">
                <span className="text-xs text-slate-300">{f.label}</span>
                <FieldInput field={f} entry={draft[f.key]} disabled={disabled}
                  onChange={(value) => onChange(f.key, { ...draft[f.key], value, set_manually: true })} />
                <Source entry={draft[f.key]} />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DuplicateNotice({ email, applications, existingInvestor, busy, onLink, onCreate, onCancel }: {
  email: string;
  applications: ExistingApplication[];
  existingInvestor: string | null;
  busy: boolean;
  onLink: (id: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
      <p className="text-amber-200 font-medium">{email} already has {applications.length === 1 ? 'an application' : `${applications.length} applications`} in Onboarding</p>
      <p className="text-sm text-slate-300">Link this form to the existing application instead of creating a second one, unless this is genuinely a new application.</p>
      {existingInvestor && <p className="text-sm text-slate-400">This email also belongs to an existing investor, {existingInvestor}.</p>}
      <div className="space-y-2">
        {applications.map((a) => (
          <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
            <span className="text-sm text-white">{a.name} <span className="text-slate-500">· submitted {day(a.submitted_at)}</span> <Pill tone="slate">{a.status.replace('_', ' ')}</Pill></span>
            <Button tone="quiet" disabled={busy} onClick={() => onLink(a.id)}>Link to this application</Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button tone="quiet" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button loading={busy} onClick={onCreate}>Create a new application anyway</Button>
      </div>
    </div>
  );
}
