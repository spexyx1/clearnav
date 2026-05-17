import { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Palette, FileText, DollarSign, Bell, CreditCard,
  Loader2, AlertCircle, CheckCircle, Upload, X, Info,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { InvoiceSettings, CURRENCIES } from './types';

interface Props {
  settings: InvoiceSettings | null;
  tenantName: string;
  onSaved: (s: InvoiceSettings) => void;
  onBack: () => void;
}

export default function InvoiceSettingsPanel({ settings, tenantName, onSaved, onBack }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    number_prefix: 'INV-',
    next_sequence: 1,
    default_currency: 'USD',
    default_due_days: 30,
    default_tax_rate: 0,
    default_terms: '',
    default_footer: '',
    payment_instructions: '',
    logo_url: '',
    accent_color: '#0891b2',
    reminder_days_before: 3,
    reminder_days_after: 7,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        number_prefix: settings.number_prefix || 'INV-',
        next_sequence: settings.next_sequence || 1,
        default_currency: settings.default_currency || 'USD',
        default_due_days: settings.default_due_days ?? 30,
        default_tax_rate: settings.default_tax_rate ?? 0,
        default_terms: settings.default_terms || '',
        default_footer: settings.default_footer || '',
        payment_instructions: settings.payment_instructions || '',
        logo_url: settings.logo_url || '',
        accent_color: settings.accent_color || '#0891b2',
        reminder_days_before: settings.reminder_days_before ?? 3,
        reminder_days_after: settings.reminder_days_after ?? 7,
      });
    }
  }, [settings]);

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!user || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('invoice_settings')
        .update({
          number_prefix: form.number_prefix.trim() || 'INV-',
          next_sequence: Math.max(1, form.next_sequence),
          default_currency: form.default_currency,
          default_due_days: form.default_due_days,
          default_tax_rate: form.default_tax_rate,
          default_terms: form.default_terms,
          default_footer: form.default_footer,
          payment_instructions: form.payment_instructions,
          logo_url: form.logo_url || null,
          accent_color: form.accent_color,
          reminder_days_before: form.reminder_days_before,
          reminder_days_after: form.reminder_days_after,
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved(data as InvoiceSettings);
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Invoice Settings</h2>
            <p className="text-sm text-slate-400">Configure defaults and branding for your invoices</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Numbering */}
      <Section icon={<FileText className="w-4 h-4" />} title="Invoice Numbering">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Number Prefix</label>
            <input
              value={form.number_prefix}
              onChange={e => set('number_prefix', e.target.value)}
              placeholder="INV-"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">e.g. INV-, #{tenantName.slice(0,3).toUpperCase()}-</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Next Invoice Number</label>
            <input
              type="number"
              min={1}
              value={form.next_sequence}
              onChange={e => set('next_sequence', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">Preview: {form.number_prefix}{String(form.next_sequence).padStart(4, '0')}</p>
          </div>
        </div>
      </Section>

      {/* Defaults */}
      <Section icon={<DollarSign className="w-4 h-4" />} title="Default Values">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Currency</label>
            <select
              value={form.default_currency}
              onChange={e => set('default_currency', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Terms (days)</label>
            <input
              type="number"
              min={0}
              value={form.default_due_days}
              onChange={e => set('default_due_days', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">0 = due on receipt</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.default_tax_rate}
              onChange={e => set('default_tax_rate', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Terms</label>
          <textarea
            value={form.default_terms}
            onChange={e => set('default_terms', e.target.value)}
            rows={3}
            placeholder="e.g. Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly fee."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 resize-none"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Footer</label>
          <input
            value={form.default_footer}
            onChange={e => set('default_footer', e.target.value)}
            placeholder="e.g. Thank you for your business!"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Instructions</label>
          <textarea
            value={form.payment_instructions}
            onChange={e => set('payment_instructions', e.target.value)}
            rows={3}
            placeholder="e.g. Bank: XYZ Bank&#10;Account: 123456789&#10;Routing: 021000021"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 resize-none"
          />
          <p className="text-xs text-slate-500 mt-1">Appears on every invoice below the totals.</p>
        </div>
      </Section>

      {/* Branding */}
      <Section icon={<Palette className="w-4 h-4" />} title="Branding">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo URL</label>
            <input
              value={form.logo_url}
              onChange={e => set('logo_url', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
            {form.logo_url && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="h-8 object-contain rounded border border-slate-600"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button onClick={() => set('logo_url', '')} className="text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accent_color}
                onChange={e => set('accent_color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-600 bg-slate-900 cursor-pointer p-0.5"
              />
              <input
                value={form.accent_color}
                onChange={e => set('accent_color', e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Used for invoice header and totals highlighting.</p>
          </div>
        </div>
      </Section>

      {/* Reminders */}
      <Section icon={<Bell className="w-4 h-4" />} title="Automatic Reminders">
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">Automatic email reminders require an email integration to be configured.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Reminder Before Due (days)</label>
            <input
              type="number"
              min={0}
              value={form.reminder_days_before}
              onChange={e => set('reminder_days_before', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">0 = disabled</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Follow-up After Overdue (days)</label>
            <input
              type="number"
              min={0}
              value={form.reminder_days_after}
              onChange={e => set('reminder_days_after', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">0 = disabled</p>
          </div>
        </div>
      </Section>

      {/* Stripe Connect placeholder */}
      <Section icon={<CreditCard className="w-4 h-4" />} title="Online Payments">
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-blue-300 font-medium">Stripe Connect — Coming Soon</p>
            <p className="text-xs text-blue-400 mt-0.5">
              Connect your Stripe account to let clients pay invoices directly online with credit card or ACH.
              This feature will be available in a future update.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
        <span className="text-cyan-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
