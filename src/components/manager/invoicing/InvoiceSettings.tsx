import { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Palette, FileText, DollarSign, Bell, CreditCard,
  Loader2, AlertCircle, CheckCircle, X, Info, Building2, Landmark,
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

const BLANK = {
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
  // business
  business_name: '',
  business_tax_id: '',
  business_address_line1: '',
  business_address_line2: '',
  business_city: '',
  business_state: '',
  business_zip: '',
  business_country: 'US',
  business_phone: '',
  business_email: '',
  business_website: '',
  // bank
  bank_account_name: '',
  bank_name: '',
  bank_account_number: '',
  bank_routing_number: '',
  bank_swift_bic: '',
  bank_iban: '',
  bank_extra_instructions: '',
};

export default function InvoiceSettingsPanel({ settings, tenantName, onSaved, onBack }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(BLANK);

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
        business_name: settings.business_name || '',
        business_tax_id: settings.business_tax_id || '',
        business_address_line1: settings.business_address_line1 || '',
        business_address_line2: settings.business_address_line2 || '',
        business_city: settings.business_city || '',
        business_state: settings.business_state || '',
        business_zip: settings.business_zip || '',
        business_country: settings.business_country || 'US',
        business_phone: settings.business_phone || '',
        business_email: settings.business_email || '',
        business_website: settings.business_website || '',
        bank_account_name: settings.bank_account_name || '',
        bank_name: settings.bank_name || '',
        bank_account_number: settings.bank_account_number || '',
        bank_routing_number: settings.bank_routing_number || '',
        bank_swift_bic: settings.bank_swift_bic || '',
        bank_iban: settings.bank_iban || '',
        bank_extra_instructions: settings.bank_extra_instructions || '',
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
          business_name: form.business_name || null,
          business_tax_id: form.business_tax_id || null,
          business_address_line1: form.business_address_line1 || null,
          business_address_line2: form.business_address_line2 || null,
          business_city: form.business_city || null,
          business_state: form.business_state || null,
          business_zip: form.business_zip || null,
          business_country: form.business_country || null,
          business_phone: form.business_phone || null,
          business_email: form.business_email || null,
          business_website: form.business_website || null,
          bank_account_name: form.bank_account_name || null,
          bank_name: form.bank_name || null,
          bank_account_number: form.bank_account_number || null,
          bank_routing_number: form.bank_routing_number || null,
          bank_swift_bic: form.bank_swift_bic || null,
          bank_iban: form.bank_iban || null,
          bank_extra_instructions: form.bank_extra_instructions || null,
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
            <p className="text-sm text-slate-400">Configure your business profile, bank details, and invoice defaults</p>
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

      {/* Your Business */}
      <Section icon={<Building2 className="w-4 h-4" />} title="Your Business">
        <p className="text-xs text-slate-500 mb-4">This information appears in the "From" section of every invoice and PDF.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Business Name</label>
            <input
              value={form.business_name}
              onChange={e => set('business_name', e.target.value)}
              placeholder={tenantName}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tax ID / EIN / VAT / ABN</label>
            <input
              value={form.business_tax_id}
              onChange={e => set('business_tax_id', e.target.value)}
              placeholder="e.g. 12-3456789"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Address Line 1</label>
            <input
              value={form.business_address_line1}
              onChange={e => set('business_address_line1', e.target.value)}
              placeholder="123 Main Street, Suite 100"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Address Line 2 (optional)</label>
            <input
              value={form.business_address_line2}
              onChange={e => set('business_address_line2', e.target.value)}
              placeholder="PO Box, Floor, Building..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">City</label>
            <input value={form.business_city} onChange={e => set('business_city', e.target.value)} placeholder="New York" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">State / Province</label>
            <input value={form.business_state} onChange={e => set('business_state', e.target.value)} placeholder="NY" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">ZIP / Postal Code</label>
            <input value={form.business_zip} onChange={e => set('business_zip', e.target.value)} placeholder="10001" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Country</label>
            <input value={form.business_country} onChange={e => set('business_country', e.target.value)} placeholder="US" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
            <input value={form.business_phone} onChange={e => set('business_phone', e.target.value)} placeholder="+1 212 000 0000" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input type="email" value={form.business_email} onChange={e => set('business_email', e.target.value)} placeholder="billing@yourfirm.com" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Website</label>
            <input value={form.business_website} onChange={e => set('business_website', e.target.value)} placeholder="https://yourfirm.com" className={inputCls} />
          </div>
        </div>
      </Section>

      {/* Bank & Payment Details */}
      <Section icon={<Landmark className="w-4 h-4" />} title="Bank & Payment Details">
        <p className="text-xs text-slate-500 mb-4">Printed in full on every invoice so clients can make an immediate bank transfer.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Holder Name</label>
            <input value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} placeholder="Your Company LLC" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bank Name</label>
            <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Chase, Citibank, ANZ..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Account Number</label>
            <input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="000123456789" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Routing / BSB Number</label>
            <input value={form.bank_routing_number} onChange={e => set('bank_routing_number', e.target.value)} placeholder="021000021" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">SWIFT / BIC</label>
            <input value={form.bank_swift_bic} onChange={e => set('bank_swift_bic', e.target.value)} placeholder="CHASUS33" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">IBAN</label>
            <input value={form.bank_iban} onChange={e => set('bank_iban', e.target.value)} placeholder="GB29 NWBK 6016 1331 9268 19" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Additional Instructions</label>
            <textarea
              value={form.bank_extra_instructions}
              onChange={e => set('bank_extra_instructions', e.target.value)}
              rows={2}
              placeholder="e.g. Please include your invoice number as the payment reference."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </Section>

      {/* Numbering */}
      <Section icon={<FileText className="w-4 h-4" />} title="Invoice Numbering">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Number Prefix</label>
            <input
              value={form.number_prefix}
              onChange={e => set('number_prefix', e.target.value)}
              placeholder="INV-"
              className={inputCls}
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
              className={inputCls}
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
              className={inputCls}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Terms (days)</label>
            <input
              type="number" min={0}
              value={form.default_due_days}
              onChange={e => set('default_due_days', parseInt(e.target.value) || 0)}
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">0 = due on receipt</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Tax Rate (%)</label>
            <input
              type="number" min={0} max={100} step={0.01}
              value={form.default_tax_rate}
              onChange={e => set('default_tax_rate', parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Terms &amp; Conditions</label>
          <textarea
            value={form.default_terms}
            onChange={e => set('default_terms', e.target.value)}
            rows={4}
            placeholder="e.g. Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly fee."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Footer</label>
          <input
            value={form.default_footer}
            onChange={e => set('default_footer', e.target.value)}
            placeholder="e.g. Thank you for your business!"
            className={inputCls}
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Additional Payment Instructions (free text)</label>
          <textarea
            value={form.payment_instructions}
            onChange={e => set('payment_instructions', e.target.value)}
            rows={2}
            placeholder="Any extra notes shown below the totals..."
            className={`${inputCls} resize-none`}
          />
          <p className="text-xs text-slate-500 mt-1">The structured bank details above are already printed automatically.</p>
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
              className={inputCls}
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
                className={`flex-1 ${inputCls} font-mono`}
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
              type="number" min={0}
              value={form.reminder_days_before}
              onChange={e => set('reminder_days_before', parseInt(e.target.value) || 0)}
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">0 = disabled</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Follow-up After Overdue (days)</label>
            <input
              type="number" min={0}
              value={form.reminder_days_after}
              onChange={e => set('reminder_days_after', parseInt(e.target.value) || 0)}
              className={inputCls}
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
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500';

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
