import React, { createContext, useContext } from 'react';
import { Plus, BadgeCheck, Clock, XCircle, CheckCircle } from 'lucide-react';
import { WEALTH_SOURCE_LABELS, WealthSource } from './applicationFormTypes';
import { GOLD, GREEN, CREAM, SERIF, inputCls, inputStyle, labelCls, labelStyle } from './applicationTheme';

export interface FieldChange {
  status: 'pending' | 'approved' | 'declined' | 'withdrawn';
  decision_note: string | null;
}

export interface PreparedInfo {
  fields: Set<string>;
  changes: Record<string, FieldChange>;
}

export const PreparedContext = createContext<PreparedInfo>({ fields: new Set(), changes: {} });

export function PreparedBadge({ name }: { name: string }) {
  const { fields } = useContext(PreparedContext);
  if (!fields.has(name)) return null;
  return (
    <span
      className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-sm normal-case tracking-normal font-semibold"
      style={{ fontSize: 10, color: GOLD, backgroundColor: 'rgba(184,147,74,0.12)', border: `1px solid ${GOLD}44` }}
      title="Arkline filled this in for you. If it is wrong, change it and Arkline will review the change."
    >
      <BadgeCheck size={10} /> Prepared by Arkline
    </span>
  );
}

export function ChangeNote({ name }: { name: string }) {
  const { fields, changes } = useContext(PreparedContext);
  const c = changes[name];
  if (!fields.has(name) || !c || c.status === 'withdrawn') return null;
  const view = {
    pending: { icon: Clock, color: GOLD, text: 'Change requested. Arkline will review it before you can sign.' },
    approved: { icon: CheckCircle, color: '#86efac', text: 'Arkline approved your change.' },
    declined: { icon: XCircle, color: '#fca5a5', text: `Arkline kept the original value${c.decision_note ? `: ${c.decision_note}` : '.'}` },
  }[c.status];
  const Icon = view.icon;
  return (
    <p className="flex items-start gap-1.5 text-xs mt-1.5 leading-relaxed" style={{ color: view.color }}>
      <Icon size={12} className="mt-0.5 flex-shrink-0" /> {view.text}
    </p>
  );
}

export function Field({
  label, required, children, name,
}: { label: string; required?: boolean; children: React.ReactNode; name?: string }) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>
        {label}{required && <span style={{ color: GOLD }}> *</span>}
        {name && <PreparedBadge name={name} />}
      </label>
      {children}
      {name && <ChangeNote name={name} />}
    </div>
  );
}

export function Input({
  value, onChange, placeholder, type = 'text', disabled,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
      style={inputStyle}
    />
  );
}

export function Select({
  value, onChange, children, disabled,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={inputCls}
      style={{ ...inputStyle, backgroundImage: 'none' }}
    >
      {children}
    </select>
  );
}

export function Textarea({
  value, onChange, rows = 3, placeholder,
}: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={inputCls}
      style={inputStyle}
    />
  );
}

export function RadioGroup({
  label, name, value, options, onChange,
}: {
  label: string; name: string; value: string | boolean | null;
  options: { value: string | boolean; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className={labelCls} style={labelStyle}>{label}</p>
      <div className="flex flex-wrap gap-4">
        {options.map(opt => (
          <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange(String(opt.value))}
              style={{ accentColor: GOLD }}
            />
            <span style={{ color: CREAM }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function CheckboxGroup({
  label, options, selected, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    selected.includes(v) ? onChange(selected.filter(s => s !== v)) : onChange([...selected, v]);
  return (
    <div>
      <p className={labelCls} style={labelStyle}>{label}</p>
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ color: CREAM }}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function SectionHeading({ letter, title }: { letter: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: GOLD, color: GREEN, fontFamily: SERIF, fontSize: 16 }}
      >
        {letter}
      </div>
      <h3 className="text-xl font-semibold" style={{ fontFamily: SERIF, color: CREAM }}>
        {title}
      </h3>
    </div>
  );
}

export function Divider() {
  return <div className="my-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />;
}

// ─── TIN block ─────────────────────────────────────────────────────────────────
export function TinBlock({
  hasTin, tinCountries, noTinReason, onHasTin, onTinCountries, onNoTinReason, prefix,
}: {
  hasTin: boolean | null;
  tinCountries: { country: string; tin: string }[];
  noTinReason: string;
  onHasTin: (v: boolean | null) => void;
  onTinCountries: (v: { country: string; tin: string }[]) => void;
  onNoTinReason: (v: string) => void;
  prefix: string;
}) {
  return (
    <div className="space-y-4">
      <RadioGroup
        label="Do you have a Tax Identification Number (TIN)?"
        name={`${prefix}_has_tin`}
        value={hasTin}
        options={[
          { value: 'true', label: 'Yes — please provide TIN for each country' },
          { value: 'false', label: 'No' },
        ]}
        onChange={v => onHasTin(v === 'true')}
      />
      {hasTin === true && (
        <div className="space-y-3 pl-4 border-l-2" style={{ borderColor: `${GOLD}55` }}>
          {tinCountries.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Field label="Country"><Input value={e.country} onChange={v => {
                const updated = [...tinCountries]; updated[i] = { ...e, country: v };
                onTinCountries(updated);
              }} /></Field>
              <Field label="TIN"><Input value={e.tin} onChange={v => {
                const updated = [...tinCountries]; updated[i] = { ...e, tin: v };
                onTinCountries(updated);
              }} /></Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onTinCountries([...tinCountries, { country: '', tin: '' }])}
            className="text-xs flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ color: GOLD }}
          >
            <Plus size={12} /> Add country
          </button>
        </div>
      )}
      {hasTin === false && (
        <div className="pl-4 border-l-2 space-y-2" style={{ borderColor: `${GOLD}55` }}>
          <p className={labelCls} style={labelStyle}>Reason</p>
          {[
            ['not_issued', 'The country of tax residency does not issue TINs'],
            ['no_tin', 'I have not been issued with a TIN'],
            ['not_required', 'The country of tax residency does not require the TIN to be disclosed'],
          ].map(([val, lbl]) => (
            <label key={val} className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input
                type="radio"
                name={`${prefix}_no_tin_reason`}
                checked={noTinReason === val}
                onChange={() => onNoTinReason(val)}
                style={{ accentColor: GOLD }}
              />
              <span style={{ color: CREAM }}>{lbl}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wealth sources ─────────────────────────────────────────────────────────────
export function WealthSources({
  selected, otherText, onSelected, onOther, prefix,
}: {
  selected: WealthSource[]; otherText: string;
  onSelected: (v: WealthSource[]) => void;
  onOther: (v: string) => void;
  prefix: string;
}) {
  const toggle = (v: WealthSource) =>
    selected.includes(v)
      ? onSelected(selected.filter(s => s !== v))
      : onSelected([...selected, v]);

  return (
    <div>
      <p className={labelCls} style={labelStyle}>Source of Assets / Wealth Used for Investment</p>
      <div className="flex flex-col gap-2">
        {(Object.keys(WEALTH_SOURCE_LABELS) as WealthSource[]).map(k => (
          <label key={k} className="flex items-center gap-2.5 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selected.includes(k)}
              onChange={() => toggle(k)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ color: CREAM }}>{WEALTH_SOURCE_LABELS[k]}</span>
          </label>
        ))}
      </div>
      {selected.includes('other') && (
        <div className="mt-3">
          <Field label="Please specify">
            <Input value={otherText} onChange={onOther} placeholder="Describe your source of wealth" />
          </Field>
        </div>
      )}
    </div>
  );
}

// ─── Address block ──────────────────────────────────────────────────────────────
export function AddressBlock({
  address, suburb, state, postcode, country,
  onAddress, onSuburb, onState, onPostcode, onCountry,
  label = 'Address',
}: {
  address: string; suburb: string; state: string; postcode: string; country: string;
  onAddress: (v: string) => void; onSuburb: (v: string) => void;
  onState: (v: string) => void; onPostcode: (v: string) => void;
  onCountry: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-3">
      <Field label={label}><Input value={address} onChange={onAddress} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Suburb / City"><Input value={suburb} onChange={onSuburb} /></Field>
        <Field label="State / Province"><Input value={state} onChange={onState} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Postcode / ZIP"><Input value={postcode} onChange={onPostcode} /></Field>
        <Field label="Country"><Input value={country} onChange={onCountry} /></Field>
      </div>
    </div>
  );
}
