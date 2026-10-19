import { useState } from 'react';
import { Quote, Trash2, Plus } from 'lucide-react';
import {
  TERM_FIELDS, CLASS_TERM_FIELDS, formatTermValue, hasValue,
  type DealingTerms, type TermEntry, type TermField, type TermKey, type DocumentClass,
} from '../../../lib/dealingTerms';

export interface ExistingClass {
  id: string;
  class_code: string;
  class_name: string;
  management_fee_pct: number | null;
  performance_fee_pct: number | null;
  hurdle_rate_pct: number | null;
  minimum_investment: number | null;
}

const inputCls =
  'w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors';

function ValueInput({ field, entry, onChange }: { field: TermField; entry?: TermEntry; onChange: (v: TermEntry['value']) => void }) {
  const v = entry?.value;
  if (field.kind === 'boolean') {
    return (
      <select className={inputCls} value={v === true || v === 'true' ? 'yes' : v === false || v === 'false' ? 'no' : ''}
        onChange={e => onChange(e.target.value === '' ? null : e.target.value === 'yes')}>
        <option value="">Not set</option><option value="yes">Yes</option><option value="no">No</option>
      </select>
    );
  }
  if (field.kind === 'select') {
    return (
      <select className={inputCls} value={typeof v === 'string' ? v : ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">Not set</option>
        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input className={inputCls} type={field.kind === 'number' ? 'number' : 'text'} step="any"
      value={v === null || v === undefined ? '' : String(v)} placeholder="Not set"
      onChange={e => onChange(e.target.value === '' ? null : field.kind === 'number' ? Number(e.target.value) : e.target.value)} />
  );
}

function SourceCell({ entry, onChange }: { entry?: TermEntry; onChange: (patch: Partial<TermEntry>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input className={inputCls} placeholder="Clause" value={entry?.clause ?? ''} onChange={e => onChange({ clause: e.target.value || null })} />
        <input className={`${inputCls} w-20`} placeholder="Page" type="number" value={entry?.page ?? ''}
          onChange={e => onChange({ page: e.target.value === '' ? null : Number(e.target.value) })} />
        <button type="button" onClick={() => setOpen(o => !o)} title="Quoted wording"
          className={`px-2 rounded-lg border transition-colors ${entry?.quote ? 'border-cyan-500/50 text-cyan-300' : 'border-slate-700 text-slate-500'} hover:text-white`}>
          <Quote className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && (
        <textarea className={`${inputCls} h-16`} placeholder="Exact wording from the document"
          value={entry?.quote ?? ''} onChange={e => onChange({ quote: e.target.value || null })} />
      )}
    </div>
  );
}

export function TermsTable({ terms, current, onChange }: {
  terms: DealingTerms;
  current: DealingTerms;
  onChange: (key: TermKey, entry: TermEntry) => void;
}) {
  const groups = ['Dealing', 'Investing', 'Fees'] as const;
  return (
    <div className="space-y-6">
      {groups.map(g => (
        <div key={g}>
          <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">{g}</h4>
          <div className="rounded-xl border border-slate-700 divide-y divide-slate-700/70 overflow-hidden">
            {TERM_FIELDS.filter(f => f.group === g).map(f => {
              const entry = terms[f.key];
              const cur = current[f.key];
              const changed = hasValue(entry) && hasValue(cur) && String(entry.value) !== String(cur.value);
              const update = (patch: Partial<TermEntry>) => onChange(f.key, { value: entry?.value ?? null, ...entry, ...patch });
              return (
                <div key={f.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
                  <div className="md:col-span-3">
                    <p className="text-sm text-white">{f.label}</p>
                    <p className={`text-xs mt-0.5 ${changed ? 'text-amber-300' : 'text-slate-500'}`}>
                      Now: {formatTermValue(f, cur)}
                    </p>
                  </div>
                  <div className="md:col-span-3"><ValueInput field={f} entry={entry} onChange={value => update({ value })} /></div>
                  <div className="md:col-span-6"><SourceCell entry={entry} onChange={update} /></div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClassMappingTable({ docClasses, existing, mapping, onClassesChange, onMappingChange }: {
  docClasses: DocumentClass[];
  existing: ExistingClass[];
  mapping: Record<string, string>;
  onClassesChange: (c: DocumentClass[]) => void;
  onMappingChange: (m: Record<string, string>) => void;
}) {
  const setClass = (i: number, patch: Partial<DocumentClass>) =>
    onClassesChange(docClasses.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const rename = (i: number, name: string) => {
    const old = docClasses[i].name;
    if (mapping[old] !== undefined) {
      const { [old]: target, ...rest } = mapping;
      onMappingChange({ ...rest, [name]: target });
    }
    setClass(i, { name });
  };
  const remove = (i: number) => {
    const { [docClasses[i].name]: _, ...rest } = mapping;
    onMappingChange(rest);
    onClassesChange(docClasses.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-3">
      {docClasses.length === 0 && (
        <p className="text-sm text-slate-400">No class-specific terms yet. Fund-wide fees above will apply to every class you link.</p>
      )}
      {docClasses.map((c, i) => {
        const target = existing.find(e => e.id === mapping[c.name]);
        return (
          <div key={i} className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input className={inputCls} value={c.name} placeholder="Class name in the document" onChange={e => rename(i, e.target.value)} />
              <select className={inputCls} value={mapping[c.name] ?? ''}
                onChange={e => {
                  const { [c.name]: _, ...rest } = mapping;
                  onMappingChange(e.target.value ? { ...rest, [c.name]: e.target.value } : rest);
                }}>
                <option value="">Do not apply to a class</option>
                {existing.map(e => <option key={e.id} value={e.id}>{e.class_name} ({e.class_code})</option>)}
              </select>
              <button type="button" onClick={() => remove(i)} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Remove">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CLASS_TERM_FIELDS.map(f => (
                <label key={f.key} className="block">
                  <span className="text-xs text-slate-400">{f.label}</span>
                  <input className={inputCls} type="number" step="any" value={c[f.key]?.value as number ?? ''} placeholder="Use fund-wide"
                    onChange={e => setClass(i, { [f.key]: { ...c[f.key], value: e.target.value === '' ? null : Number(e.target.value) } })} />
                  {target && (
                    <span className="text-[11px] text-slate-500">Now: {target[f.key] ?? 'not set'}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <button type="button" onClick={() => onClassesChange([...docClasses, { name: `Class ${docClasses.length + 1}` }])}
        className="flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200 transition-colors">
        <Plus className="w-4 h-4" /> Add class from document
      </button>
    </div>
  );
}
