import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Eye, EyeOff, Loader2, Send, Save, PenLine,
  ArrowLeft, ChevronDown, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Invoice, InvoiceLineItemDraft, InvoiceSettings,
  calcLineTotal, calcTotals, formatCurrency, CURRENCIES,
} from '../manager/invoicing/types';
import InvoicePreview from '../manager/invoicing/InvoicePreview';
import { SavedClient, SavedProduct, TermsTemplate } from './types';

interface Props {
  userId: string;
  invoiceId?: string;
  onSaved: (id: string) => void;
  onBack: () => void;
}

function newLine(sort: number): InvoiceLineItemDraft {
  return {
    id: crypto.randomUUID(),
    sort_order: sort,
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    discount_rate: 0,
  };
}

export default function InvoiceAppEditor({ userId, invoiceId, onSaved, onBack }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<TermsTemplate[]>([]);
  const [loading, setLoading] = useState(!!invoiceId);

  const [form, setForm] = useState({
    to_name: '',
    to_email: '',
    to_phone: '',
    to_company: '',
    to_address: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    })(),
    currency: 'USD',
    notes: '',
    terms: '',
    footer: '',
    signature_required: false,
  });
  const [items, setItems] = useState<InvoiceLineItemDraft[]>([newLine(0)]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [clientQuery, setClientQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showTermsDropdown, setShowTermsDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBaseData();
  }, [userId]);

  async function loadBaseData() {
    const [settingsRes, clientsRes, productsRes, templatesRes] = await Promise.all([
      supabase.from('invoice_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('invoice_saved_clients').select('*').eq('user_id', userId).order('name'),
      supabase.from('invoice_saved_products').select('*').eq('user_id', userId).order('description'),
      supabase.from('invoice_terms_templates').select('*').eq('user_id', userId).order('name'),
    ]);

    const s = settingsRes.data as InvoiceSettings | null;
    setSettings(s);
    setSavedClients(clientsRes.data ?? []);
    setSavedProducts(productsRes.data ?? []);
    setTermsTemplates(templatesRes.data ?? []);

    if (s) {
      const dueDays = s.default_due_days ?? 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);
      setForm(prev => ({
        ...prev,
        currency: s.default_currency ?? 'USD',
        terms: s.default_terms ?? '',
        footer: s.default_footer ?? '',
        due_date: dueDate.toISOString().slice(0, 10),
      }));
    }

    if (invoiceId) {
      await loadInvoice(invoiceId);
    } else {
      // Check for prefill client from sessionStorage
      const prefillClientId = sessionStorage.getItem('invoice_prefill_client');
      if (prefillClientId) {
        sessionStorage.removeItem('invoice_prefill_client');
        const client = (clientsRes.data ?? []).find(c => c.id === prefillClientId);
        if (client) applyClient(client);
      }
    }

    setLoading(false);
  }

  async function loadInvoice(id: string) {
    const { data, error: err } = await supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (err || !data) return;
    const inv = data as Invoice;
    setInvoice(inv);
    setForm({
      to_name: inv.to_name ?? '',
      to_email: inv.to_email ?? '',
      to_phone: inv.to_phone ?? '',
      to_company: inv.to_company ?? '',
      to_address: inv.to_address ?? '',
      issue_date: inv.issue_date ?? new Date().toISOString().slice(0, 10),
      due_date: inv.due_date ?? '',
      currency: inv.currency ?? 'USD',
      notes: inv.notes ?? '',
      terms: inv.terms ?? '',
      footer: inv.footer ?? '',
      signature_required: inv.signature_required ?? false,
    });
    setClientQuery(inv.to_name ?? '');
    if (inv.line_items?.length) {
      setItems(inv.line_items.map(li => ({
        id: li.id,
        sort_order: li.sort_order,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        tax_rate: li.tax_rate,
        discount_rate: li.discount_rate,
      })));
    }
  }

  function applyClient(client: SavedClient) {
    setClientQuery(client.name);
    setForm(prev => ({
      ...prev,
      to_name: client.name,
      to_email: client.email ?? prev.to_email,
      to_phone: client.phone ?? prev.to_phone,
      to_company: client.company ?? prev.to_company,
      to_address: client.address ?? prev.to_address,
    }));
    setShowClientDropdown(false);
  }

  function setField(k: keyof typeof form, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function addLine() {
    setItems(prev => [...prev, newLine(prev.length)]);
  }

  function removeLine(id: string) {
    setItems(prev =>
      prev.filter(i => i.id !== id).map((i, idx) => ({ ...i, sort_order: idx }))
    );
  }

  function updateLine(id: string, field: keyof InvoiceLineItemDraft, value: string | number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  function applyProduct(lineId: string, product: SavedProduct) {
    setItems(prev => prev.map(i =>
      i.id === lineId
        ? {
            ...i,
            description: product.description,
            unit_price: product.default_price,
            tax_rate: product.default_tax_rate,
            quantity: product.default_quantity,
          }
        : i
    ));
  }

  const totals = calcTotals(items);

  async function save(sendAfter = false) {
    if (!form.to_name.trim()) {
      setError('Please enter a recipient name.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        user_id: userId,
        tenant_id: null,
        ...totals,
        status: sendAfter ? 'sent' : (invoice?.status ?? 'draft'),
        sent_at: sendAfter ? new Date().toISOString() : (invoice?.sent_at ?? null),
        created_by: userId,
      };

      let savedInvoice: Invoice;

      if (invoice?.id) {
        const { data, error: err } = await supabase
          .from('invoices')
          .update(payload)
          .eq('id', invoice.id)
          .select()
          .single();
        if (err) throw err;
        savedInvoice = data as Invoice;
        await supabase.from('invoice_line_items').delete().eq('invoice_id', invoice.id);
      } else {
        const { data: numData, error: numErr } = await supabase
          .rpc('allocate_invoice_number_for_user', { p_user_id: userId });
        if (numErr) throw numErr;

        const { data, error: err } = await supabase
          .from('invoices')
          .insert({ ...payload, invoice_number: numData })
          .select()
          .single();
        if (err) throw err;
        savedInvoice = data as Invoice;
      }

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

      await supabase.from('invoice_activity').insert({
        invoice_id: savedInvoice.id,
        actor_id: userId,
        action: invoice?.id ? (sendAfter ? 'sent' : 'edited') : 'created',
        metadata: sendAfter ? { recipient: form.to_email } : null,
      });

      if (sendAfter) {
        setSending(true);
        try {
          await supabase.functions.invoke('send-invoice-email', {
            body: { invoice_id: savedInvoice.id, source: 'invoice_app' },
          });
        } catch {
          // Non-fatal
        } finally {
          setSending(false);
        }
      }

      onSaved(savedInvoice.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  const currencySymbol = CURRENCIES.find(c => c.code === form.currency)?.symbol ?? '$';
  const filteredClients = savedClients.filter(c =>
    c.name.toLowerCase().includes(clientQuery.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(clientQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {invoice ? `Edit ${invoice.invoice_number}` : 'New Invoice'}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Form */}
        <div className="flex-1 space-y-5 min-w-0">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Bill To */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bill To</h3>

            {/* Client autocomplete */}
            <div ref={clientRef} className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input
                value={clientQuery}
                onChange={e => {
                  setClientQuery(e.target.value);
                  setField('to_name', e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                placeholder="Client or company name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {filteredClients.slice(0, 6).map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => applyClient(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      {(c.company || c.email) && (
                        <div className="text-xs text-gray-500">
                          {[c.company, c.email].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.to_email}
                  onChange={e => setField('to_email', e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  value={form.to_phone}
                  onChange={e => setField('to_phone', e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                <input
                  value={form.to_company}
                  onChange={e => setField('to_company', e.target.value)}
                  placeholder="Company name (optional)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Billing Address</label>
                <input
                  value={form.to_address}
                  onChange={e => setField('to_address', e.target.value)}
                  placeholder="123 Main St, City, ZIP"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Invoice Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={e => setField('issue_date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setField('due_date', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setField('currency', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Line Items</h3>

            <div className="hidden sm:grid grid-cols-[1fr_70px_110px_65px_65px_36px] gap-2 px-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Tax %</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  currency={form.currency}
                  currencySymbol={currencySymbol}
                  products={savedProducts}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                  onApplyProduct={applyProduct}
                  canRemove={items.length > 1}
                />
              ))}
            </div>

            <button
              onClick={addLine}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>

            {/* Totals */}
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal, form.currency)}</span>
                </div>
                {totals.discount_total > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatCurrency(totals.discount_total, form.currency)}</span>
                  </div>
                )}
                {totals.tax_total > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span>
                    <span>{formatCurrency(totals.tax_total, form.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 font-bold pt-1.5 border-t border-gray-200 text-base">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(totals.total, form.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Terms / Footer */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Additional Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  placeholder="Any notes for the client..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">Terms &amp; Conditions</label>
                  {termsTemplates.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowTermsDropdown(v => !v)}
                        onBlur={() => setTimeout(() => setShowTermsDropdown(false), 150)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        Use template <ChevronDown className="w-3 h-3" />
                      </button>
                      {showTermsDropdown && (
                        <div className="absolute z-20 right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {termsTemplates.map(t => (
                            <button
                              key={t.id}
                              onMouseDown={() => { setField('terms', t.body); setShowTermsDropdown(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <textarea
                  value={form.terms}
                  onChange={e => setField('terms', e.target.value)}
                  rows={3}
                  placeholder="Payment terms and conditions..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Footer Text</label>
                <input
                  value={form.footer}
                  onChange={e => setField('footer', e.target.value)}
                  placeholder="Thank you for your business!"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setField('signature_required', !form.signature_required)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors text-sm ${
                    form.signature_required
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                    form.signature_required ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {form.signature_required && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <PenLine className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">Require Client Signature</div>
                    <div className="text-xs opacity-60 mt-0.5">
                      Client will be prompted to sign when viewing this invoice online
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-4">
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm transition-colors disabled:opacity-50"
            >
              {saving && !sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving || !form.to_email}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Save &amp; Send
            </button>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="xl:w-[480px] shrink-0">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h3>
            <div style={{ transform: 'scale(0.82)', transformOrigin: 'top left', width: 'calc(100%/0.82)' }}>
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
    </div>
  );
}

// Extracted line item row with product autocomplete
interface LineItemRowProps {
  item: InvoiceLineItemDraft;
  currency: string;
  currencySymbol: string;
  products: SavedProduct[];
  onUpdate: (id: string, field: keyof InvoiceLineItemDraft, value: string | number) => void;
  onRemove: (id: string) => void;
  onApplyProduct: (lineId: string, product: SavedProduct) => void;
  canRemove: boolean;
}

function LineItemRow({ item, currency, currencySymbol, products, onUpdate, onRemove, onApplyProduct, canRemove }: LineItemRowProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = products.filter(p =>
    p.description.toLowerCase().includes(item.description.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_70px_110px_65px_65px_36px] gap-2 items-start">
      <div className="relative">
        <input
          value={item.description}
          onChange={e => { onUpdate(item.id, 'description', e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Item description"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {filtered.slice(0, 5).map(p => (
              <button
                key={p.id}
                onMouseDown={() => { onApplyProduct(item.id, p); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="text-sm text-gray-900">{p.description}</div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(p.default_price, currency)}{p.unit ? ` / ${p.unit}` : ''}{p.default_tax_rate > 0 ? ` · ${p.default_tax_rate}% tax` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="number" min="0" step="any"
        value={item.quantity}
        onChange={e => onUpdate(item.id, 'quantity', parseFloat(e.target.value) || 0)}
        className="px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
        <input
          type="number" min="0" step="any"
          value={item.unit_price}
          onChange={e => onUpdate(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
          className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>
      <input
        type="number" min="0" max="100" step="any"
        value={item.tax_rate}
        onChange={e => onUpdate(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
        className="px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
      <div className="text-right text-sm font-medium text-gray-800 px-1 py-2.5">
        {formatCurrency(calcLineTotal(item), currency)}
      </div>
      <button
        onClick={() => onRemove(item.id)}
        disabled={!canRemove}
        className="flex items-center justify-center w-9 h-9 mt-0.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
