import { useState } from 'react';
import { Phone, Settings, Trash2, PhoneForwarded, Clock, Voicemail, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Mic, Shield, CreditCard as Edit3, X, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  TenantPhoneNumber, BusinessHours, DEFAULT_BUSINESS_HOURS, TIMEZONES, formatDuration
} from './types';

interface Props {
  numbers: TenantPhoneNumber[];
  onRefresh: () => void;
  onNavigateToVoicemail: (numberId: string) => void;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

export default function MyNumbers({ numbers, onRefresh, onNavigateToVoicemail }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TenantPhoneNumber>>({});
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const active = numbers.filter(n => n.status === 'active');

  function startEdit(n: TenantPhoneNumber) {
    setEditing(n.id);
    setForm({
      label: n.label ?? '',
      forward_to: n.forward_to ?? '',
      forward_to_secondary: n.forward_to_secondary ?? '',
      forward_whisper_enabled: n.forward_whisper_enabled,
      forward_ring_timeout_secs: n.forward_ring_timeout_secs,
      business_hours_enabled: n.business_hours_enabled,
      business_hours: Object.keys(n.business_hours).length ? n.business_hours : DEFAULT_BUSINESS_HOURS,
      timezone: n.timezone,
      after_hours_action: n.after_hours_action,
      voicemail_enabled: n.voicemail_enabled,
      voicemail_greeting_text: n.voicemail_greeting_text,
      recording_enabled: n.recording_enabled,
    });
    setExpanded(n.id);
    setError(null);
    setSuccess(null);
  }

  async function saveSettings(id: string) {
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'update', id, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSuccess('Settings saved.');
      setEditing(null);
      onRefresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function release(id: string, label: string) {
    if (!confirm(`Release ${label}? This will cancel the number and cannot be undone.`)) return;
    setReleasing(id);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'release', id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Release failed');
      onRefresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReleasing(null);
    }
  }

  if (active.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Phone className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium text-slate-400">No phone numbers yet</p>
        <p className="text-xs mt-1">Search and purchase a number to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/30 border border-emerald-700/50 rounded-lg text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {active.map(num => {
        const isExpanded = expanded === num.id;
        const isEditing = editing === num.id;
        const displayLabel = num.label || num.phone_number;
        const bh: BusinessHours = (isEditing ? form.business_hours : num.business_hours) || DEFAULT_BUSINESS_HOURS;

        return (
          <div key={num.id} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {/* Header row */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white font-mono tracking-wide">{num.phone_number}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                      num.number_type === 'toll_free' ? 'bg-violet-500/20 text-violet-300' :
                      num.number_type === 'international' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {num.number_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {num.label && <span className="text-xs text-slate-400">{num.label}</span>}
                    {num.forward_to ? (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <PhoneForwarded className="w-3 h-3" />
                        Forwarding to {num.forward_to}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400">No forwarding number set</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right mr-2 hidden sm:block">
                  <div className="text-xs text-slate-400">${Number(num.monthly_cost_usd).toFixed(2)}/mo</div>
                  {num.next_renewal_date && (
                    <div className="text-[10px] text-slate-600">Renews {num.next_renewal_date}</div>
                  )}
                </div>
                <button
                  onClick={() => onNavigateToVoicemail(num.id)}
                  title="Voicemail"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Voicemail className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startEdit(num)}
                  title="Settings"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => release(num.id, displayLabel)}
                  disabled={releasing === num.id}
                  title="Release number"
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  {releasing === num.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setExpanded(isExpanded ? null : num.id)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Settings panel */}
            {isExpanded && (
              <div className="border-t border-slate-800 px-5 py-5 space-y-6">
                {/* Label */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      <Edit3 className="w-3 h-3 inline mr-1" />Number Label
                    </label>
                    <input
                      disabled={!isEditing}
                      value={isEditing ? (form.label ?? '') : (num.label ?? '')}
                      onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. Sales Line, Support"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Forwarding */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <PhoneForwarded className="w-3.5 h-3.5 text-cyan-400" />Call Forwarding
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Forward to (mobile number)</label>
                      <input
                        disabled={!isEditing}
                        value={isEditing ? (form.forward_to ?? '') : (num.forward_to ?? '')}
                        onChange={e => setForm(f => ({ ...f, forward_to: e.target.value }))}
                        placeholder="+15551234567"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fallback number (optional)</label>
                      <input
                        disabled={!isEditing}
                        value={isEditing ? (form.forward_to_secondary ?? '') : (num.forward_to_secondary ?? '')}
                        onChange={e => setForm(f => ({ ...f, forward_to_secondary: e.target.value }))}
                        placeholder="+15559876543"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Ring timeout (seconds)</label>
                      <input
                        type="number"
                        disabled={!isEditing}
                        value={isEditing ? (form.forward_ring_timeout_secs ?? 25) : num.forward_ring_timeout_secs}
                        onChange={e => setForm(f => ({ ...f, forward_ring_timeout_secs: Number(e.target.value) }))}
                        min={10}
                        max={60}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!isEditing}
                          checked={isEditing ? !!form.forward_whisper_enabled : num.forward_whisper_enabled}
                          onChange={e => setForm(f => ({ ...f, forward_whisper_enabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-checked:bg-cyan-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-4" />
                      </label>
                      <span className="text-sm text-slate-300">Whisper "Incoming business call" before connecting</span>
                    </div>
                  </div>
                </div>

                {/* Business hours */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />Business Hours
                  </h4>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={isEditing ? !!form.business_hours_enabled : num.business_hours_enabled}
                        onChange={e => setForm(f => ({ ...f, business_hours_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-checked:bg-cyan-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-4" />
                    </label>
                    <span className="text-sm text-slate-300">Enforce business hours schedule</span>
                  </div>

                  {(isEditing ? form.business_hours_enabled : num.business_hours_enabled) && (
                    <div className="space-y-2">
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Timezone</label>
                        <select
                          disabled={!isEditing}
                          value={isEditing ? (form.timezone || 'America/New_York') : num.timezone}
                          onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                        >
                          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>

                      {Object.entries(DAY_LABELS).map(([day, label]) => {
                        const schedule = bh[day as keyof BusinessHours] ?? { enabled: false, start: '09:00', end: '17:00' };
                        return (
                          <div key={day} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              disabled={!isEditing}
                              checked={schedule.enabled}
                              onChange={e => setForm(f => ({
                                ...f,
                                business_hours: { ...(f.business_hours || DEFAULT_BUSINESS_HOURS), [day]: { ...schedule, enabled: e.target.checked } },
                              }))}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="w-8 text-xs font-medium text-slate-400">{label}</span>
                            <input
                              type="time"
                              disabled={!isEditing || !schedule.enabled}
                              value={schedule.start}
                              onChange={e => setForm(f => ({
                                ...f,
                                business_hours: { ...(f.business_hours || DEFAULT_BUSINESS_HOURS), [day]: { ...schedule, start: e.target.value } },
                              }))}
                              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
                            />
                            <span className="text-xs text-slate-500">to</span>
                            <input
                              type="time"
                              disabled={!isEditing || !schedule.enabled}
                              value={schedule.end}
                              onChange={e => setForm(f => ({
                                ...f,
                                business_hours: { ...(f.business_hours || DEFAULT_BUSINESS_HOURS), [day]: { ...schedule, end: e.target.value } },
                              }))}
                              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-40"
                            />
                          </div>
                        );
                      })}

                      <div className="mt-3">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">After-hours action</label>
                        <select
                          disabled={!isEditing}
                          value={isEditing ? (form.after_hours_action || 'voicemail') : num.after_hours_action}
                          onChange={e => setForm(f => ({ ...f, after_hours_action: e.target.value as any }))}
                          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                        >
                          <option value="voicemail">Send to voicemail</option>
                          <option value="forward_secondary">Forward to fallback number</option>
                          <option value="do_not_disturb">Play message & hang up</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voicemail */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Voicemail className="w-3.5 h-3.5 text-cyan-400" />Voicemail
                  </h4>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={isEditing ? !!form.voicemail_enabled : num.voicemail_enabled}
                        onChange={e => setForm(f => ({ ...f, voicemail_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-checked:bg-cyan-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-4" />
                    </label>
                    <span className="text-sm text-slate-300">Enable voicemail when call is unanswered</span>
                  </div>
                  {(isEditing ? form.voicemail_enabled : num.voicemail_enabled) && (
                    <textarea
                      disabled={!isEditing}
                      value={isEditing ? (form.voicemail_greeting_text ?? '') : num.voicemail_greeting_text}
                      onChange={e => setForm(f => ({ ...f, voicemail_greeting_text: e.target.value }))}
                      rows={2}
                      placeholder="Voicemail greeting message..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 resize-none"
                    />
                  )}
                </div>

                {/* Recording */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />Call Recording
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded uppercase tracking-wider font-bold">Legal Notice Required</span>
                  </h4>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={isEditing ? !!form.recording_enabled : num.recording_enabled}
                        onChange={e => setForm(f => ({ ...f, recording_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-checked:bg-cyan-600 rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-4" />
                    </label>
                    <span className="text-sm text-slate-300">Record inbound calls</span>
                  </div>
                  {(isEditing ? form.recording_enabled : num.recording_enabled) && (
                    <p className="text-xs text-amber-400 mt-2 flex items-start gap-1.5">
                      <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Ensure you comply with applicable wiretapping and consent laws in your jurisdiction before enabling recording.
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => saveSettings(num.id)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Settings
                      </button>
                      <button
                        onClick={() => { setEditing(null); setError(null); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(num)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Settings
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
