import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Loader2, Send, Save, PenLine } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import {
  Invoice, InvoiceLineItemDraft, InvoiceSettings,
  calcLineTotal, calcTotals, formatCurrency, CURRENCIES,
} from './types';
import InvoicePreview from './InvoicePreview';

interface Props {
  invoice?: Invoice | null;
  settings: InvoiceSettings | null;
  tenantName?: string;
  onSaved: (inv: Invoice) => void;
  onCancel?: () => void;
  onBack?: () => void;
}

function newLine(sort: number): InvoiceLineItemDraft {
  return { id: crypto.randomUUID(), sort_order: sort, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 };
}

export default function InvoiceEditor({ invoice, settings, onSaved, onCancel, onBack }: Props) {
  const { currentTenant, user } = useAuth();

  const [form, setForm] = useState({
    to_name: invoice?.to_name ?? '',
    to_email: invoice?.to_email ?? '',
    to_phone: invoice?.to_phone ?? '',
    to_company: invoice?.to_company ?? '',
    to_address: invoice?.to_address ?? '',
    issue_date: invoice?.issue_date ?? new Date().toISOString().slice(0, 10),
    due_date: invoice?.due_date ?? (() => {
      const d = new Date();
      d.setDate(d.getDate() + (settings?.default_due_days ?? 30));
      return d.toISOString().slice(0, 10);
    })(),
    currency: invoice?.currency ?? (settings?.default_currency ?? 'USD'),
    notes: invoice?.notes ?? '',
    terms: invoice?.terms ?? (settings?.default_terms ?? ''),
    footer: invoice?.footer ?? (settings?.default_footer ?? ''),
    signature_required: invoice?.signature_required ?? false,
  });

  const [items, setItems] = useState<InvoiceLineItemDraft[]>(
    invoice?.line_items?.length
      ? invoice.line_items.map(li => ({
          id: li.id,
          sort_order: li.sort_order,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          tax_rate: li.tax_rate,
          discount_rate: li.discount_rate,
        }))
      : [newLine(0)]
  );

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = calcTotals(items);

  function setField(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function addLine() {
    setItems(prev => [...prev, newLine(prev.length)]);
  }

  function removeLine(id: string) {
    setItems(prev => prev.filter(i => i.id !== id).map((i, idx) => ({ ...i, sort_order: idx })));
  }

  function updateLine(id: string, field: keyof InvoiceLineItemDraft, value: string | number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  async function save(sendAfter = false) {
    if (!currentTenant?.id) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        tenant_id: currentTenant.id,
        ...totals,
        status: sendAfter ? 'sent' : (invoice?.status ?? 'draft'),
        sent_at: sendAfter ? new Date().toISOString() : (invoice?.sent_at ?? null),
        created_by: user?.id ?? null,
        signature_required: form.signature_required,
      };

      let savedInvoice: Invoice;

      if (invoice?.id) {
        // Update existing
        const { data, error: err } = await supabase
          .from('invoices')
          .update(payload)
          .eq('id', invoice.id)
          .select()
          .single();
        if (err) throw err;
        savedInvoice = data as Invoice;

        // Delete all old line items and re-insert
        await supabase.from('invoice_line_items').delete().eq('invoice_id', invoice.id);
      } else {
        // Allocate invoice number then insert
        const { data: numData, error: numErr } = await supabase
          .rpc('allocate_invoice_number', { p_tenant_id: currentTenant.id });
        if (numErr) throw numErr;

        const { data, error: err } = await supabase
          .from('invoices')
          .insert({ ...payload, invoice_number: numData })
          .select()
          .single();
        if (err) throw err;
        savedInvoice = data as Invoice;
      }

      // Insert line items
      if (items.length > 0) {
        const lineRows = items.map((item, idx) => ({
          invoice_id: savedInvoice.id,
          sort_order: idx,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount_rate: item.discount_rate,
          line_total: calcLineTotal(item),
        }));
        const { error: liErr } = await supabase.from('invoice_line_items').insert(lineRows);
        if (liErr) throw liErr;
      }

      // Log activity
      await supabase.from('invoice_activity').insert({
        invoice_id: savedInvoice.id,
        actor_id: user?.id ?? null,
        action: invoice?.id ? (sendAfter ? 'sent' : 'edited') : 'created',
        metadata: sendAfter ? { recipient: form.to_email } : null,
      });

      if (sendAfter) {
        setSending(true);
        try {
          await supabase.functions.invoke('send-invoice-email', {
            body: { invoice_id: savedInvoice.id },
          });
        } catch {
          // Non-fatal — invoice is saved, email may retry
        } finally {
          setSending(false);
        }
      }

      onSaved(savedInvoice);
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  const currencySymbol = CURRENCIES.find(c => c.code === form.currency)?.symbol ?? '$';

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0">
      {/* Form panel */}
      <div className="flex-1 space-y-6 overflow-y-auto pb-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{invoice ? 'Edit Invoice' : 'New Invoice'}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        {/* Recipient */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Bill To</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
              <input
                value={form.to_name}
                onChange={e => setField('to_name', e.target.value)}
                placeholder="Client or company name"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email *</label>
              <input
                type="email"
                value={form.to_email}
                onChange={e => setField('to_email', e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company</label>
              <input
                value={form.to_company}
                onChange={e => setField('to_company', e.target.value)}
                placeholder="Company name (optional)"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
              <input
                value={form.to_phone}
                onChange={e => setField('to_phone', e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Billing Address</label>
              <textarea
                value={form.to_address}
                onChange={e => setField('to_address', e.target.value)}
                rows={2}
                placeholder="123 Main St, City, State ZIP, Country"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Invoice details */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Issue Date</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={e => setField('issue_date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setField('due_date', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={e => setField('currency', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Line Items</h3>

          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_110px_70px_70px_36px] gap-2 px-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit Price</span>
            <span className="text-right">Tax %</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_70px_70px_36px] gap-2 items-center">
                <input
                  value={item.description}
                  onChange={e => updateLine(item.id, 'description', e.target.value)}
                  placeholder="Item description"
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantity}
                  onChange={e => updateLine(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm text-right focus:outline-none focus:border-cyan-500"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unit_price}
                    onChange={e => updateLine(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm text-right focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={item.tax_rate}
                  onChange={e => updateLine(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm text-right focus:outline-none focus:border-cyan-500"
                />
                <div className="text-right text-sm font-medium text-white px-1">
                  {formatCurrency(calcLineTotal(item), form.currency)}
                </div>
                <button
                  onClick={() => removeLine(item.id)}
                  disabled={items.length === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addLine}
            className="flex items-center gap-2 px-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>

          {/* Totals */}
          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal, form.currency)}</span>
              </div>
              {totals.discount_total > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>−{formatCurrency(totals.discount_total, form.currency)}</span>
                </div>
              )}
              {totals.tax_total > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span>{formatCurrency(totals.tax_total, form.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold pt-1.5 border-t border-slate-700 text-base">
                <span>Total</span>
                <span className="text-cyan-400">{formatCurrency(totals.total, form.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes / Terms / Footer */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Additional Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                rows={3}
                placeholder="Any notes for the client..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Terms &amp; Conditions</label>
              <textarea
                value={form.terms}
                onChange={e => setField('terms', e.target.value)}
                rows={3}
                placeholder="Payment terms and conditions..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Footer Text</label>
              <input
                value={form.footer}
                onChange={e => setField('footer', e.target.value)}
                placeholder="Thank you for your business!"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, signature_required: !prev.signature_required }))}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition-colors text-sm ${
                  form.signature_required
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                  form.signature_required ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'
                }`}>
                  {form.signature_required && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <PenLine className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Require Client Signature</div>
                  <div className="text-xs opacity-70 mt-0.5">Client will be prompted to sign when they view this invoice online</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel ?? onBack}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors disabled:opacity-50"
          >
            {saving && !sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || !form.to_email}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save &amp; Send
          </button>
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div className="lg:w-[440px] flex-shrink-0 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Preview</h3>
          <div className="scale-90 origin-top-left w-[calc(100%/0.9)]" style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
            <InvoicePreview
              invoice={{ ...form, invoice_number: invoice?.invoice_number }}
              items={items}
              settings={{
                logo_url: settings?.logo_url,
                accent_color: settings?.accent_color,
                number_prefix: settings?.number_prefix,
                payment_instructions: settings?.payment_instructions,
                business_name: settings?.business_name,
                business_address_line1: settings?.business_address_line1,
                business_address_line2: settings?.business_address_line2,
                business_city: settings?.business_city,
                business_state: settings?.business_state,
                business_zip: settings?.business_zip,
                business_country: settings?.business_country,
                business_phone: settings?.business_phone,
                business_email: settings?.business_email,
                business_tax_id: settings?.business_tax_id,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
