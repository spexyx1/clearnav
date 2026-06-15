import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, Send, Copy, CheckCircle, Trash2, DollarSign, Clock, Eye, EyeOff, Mail, Loader2, X, FileText, PenLine, PenTool, CreditCard as Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Invoice, InvoicePayment, InvoiceActivity, InvoiceSettings,
  formatCurrency, PaymentMethod,
} from '../manager/invoicing/types';
import InvoiceStatusBadge from '../manager/invoicing/InvoiceStatusBadge';
import InvoicePreview from '../manager/invoicing/InvoicePreview';
import InvoicePrintLayout from '../manager/invoicing/InvoicePrintLayout';

interface Props {
  userId: string;
  invoiceId: string;
  onEdit: (id: string) => void;
  onBack: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'manual', label: 'Manual / Other' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'ach', label: 'ACH' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'crypto', label: 'Crypto' },
];

function ActivityIcon({ action }: { action: string }) {
  if (action === 'created') return <FileText className="w-4 h-4 text-blue-500" />;
  if (action === 'sent') return <Send className="w-4 h-4 text-blue-400" />;
  if (action === 'viewed') return <Eye className="w-4 h-4 text-gray-400" />;
  if (action === 'paid') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (action === 'voided') return <X className="w-4 h-4 text-red-500" />;
  if (action === 'payment_recorded') return <DollarSign className="w-4 h-4 text-emerald-500" />;
  if (action === 'reminder_sent') return <Mail className="w-4 h-4 text-amber-500" />;
  if (action === 'signed') return <PenTool className="w-4 h-4 text-blue-500" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
}

export default function InvoiceAppDetail({ userId, invoiceId, onEdit, onBack }: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [activity, setActivity] = useState<InvoiceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [payment, setPayment] = useState({
    amount: 0,
    method: 'manual' as PaymentMethod,
    payment_date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadAll();
  }, [invoiceId]);

  async function loadAll() {
    setLoading(true);
    const [invRes, settingsRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*, line_items:invoice_line_items(*)')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('invoice_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (!invRes.data) { setLoading(false); return; }
    const inv = invRes.data as Invoice;
    setInvoice(inv);
    setSettings(settingsRes.data as InvoiceSettings | null);
    setPayment(prev => ({ ...prev, amount: inv.balance_due }));

    await loadPaymentsAndActivity(inv.id);
    setLoading(false);
  }

  async function loadPaymentsAndActivity(id: string) {
    setActivityLoading(true);
    const [{ data: pays }, { data: acts }] = await Promise.all([
      supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('created_at'),
      supabase.from('invoice_activity').select('*').eq('invoice_id', id).order('created_at'),
    ]);
    setPayments(pays ?? []);
    setActivity(acts ?? []);
    setActivityLoading(false);
  }

  async function recordPayment() {
    if (!invoice || !payment.amount || payment.amount <= 0) return;
    const { error } = await supabase.from('invoice_payments').insert({
      invoice_id: invoice.id,
      amount: payment.amount,
      currency: invoice.currency,
      payment_date: payment.payment_date,
      method: payment.method,
      reference: payment.reference || null,
      notes: payment.notes || null,
      recorded_by: userId,
    });
    if (error) return;

    const newPaid = invoice.amount_paid + payment.amount;
    const newStatus = newPaid >= invoice.total ? 'paid' : 'partial';
    const { data: updated } = await supabase
      .from('invoices')
      .update({
        amount_paid: newPaid,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', invoice.id)
      .select()
      .single();

    await supabase.from('invoice_activity').insert({
      invoice_id: invoice.id,
      actor_id: userId,
      action: 'payment_recorded',
      metadata: { amount: payment.amount, method: payment.method },
    });

    if (updated) setInvoice(updated as Invoice);
    setShowPaymentForm(false);
    await loadPaymentsAndActivity(invoice.id);
  }

  async function sendInvoice() {
    if (!invoice) return;
    setSending(true);
    try {
      await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: invoice.id, source: 'invoice_app' },
      });
      const { data } = await supabase
        .from('invoices')
        .update({
          status: invoice.status === 'draft' ? 'sent' : invoice.status,
          sent_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
        .select()
        .single();
      await supabase.from('invoice_activity').insert({
        invoice_id: invoice.id,
        actor_id: userId,
        action: 'sent',
        metadata: { recipient: invoice.to_email },
      });
      if (data) setInvoice(data as Invoice);
      await loadPaymentsAndActivity(invoice.id);
    } finally {
      setSending(false);
    }
  }

  async function voidInvoice() {
    if (!invoice) return;
    if (!confirm('Void this invoice? This cannot be undone.')) return;
    setVoiding(true);
    const { data } = await supabase
      .from('invoices')
      .update({ status: 'void', voided_at: new Date().toISOString() })
      .eq('id', invoice.id)
      .select()
      .single();
    await supabase.from('invoice_activity').insert({
      invoice_id: invoice.id,
      actor_id: userId,
      action: 'voided',
      metadata: null,
    });
    if (data) setInvoice(data as Invoice);
    setVoiding(false);
    await loadPaymentsAndActivity(invoice.id);
  }

  async function copyPublicLink() {
    if (!invoice) return;
    setCopying(true);
    const link = `${window.location.origin}/invoice/${invoice.public_view_token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setTimeout(() => setCopying(false), 1500);
  }

  function downloadPDF() {
    if (!printRef.current || !invoice) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
        } catch {
          return sheet.href ? `@import url('${sheet.href}');` : '';
        }
      })
      .join('\n');

    // Strip the embedded <style> tag (designed for in-page printing, not this dedicated window)
    const cleanHtml = printRef.current.innerHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>${styles}</style>
  <style>
    @page { size: A4 portrait; margin: 10mm 13mm; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    #invoice-print-root {
      zoom: 0.82;
      box-shadow: none !important;
      border-radius: 0 !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  ${cleanHtml}
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-24 text-gray-500">
        Invoice not found.
        <button onClick={onBack} className="ml-2 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  const isVoid = invoice.status === 'void';
  const isPaid = invoice.status === 'paid';
  const isSigned = !!invoice.signed_at;
  const needsSignature = invoice.signature_required && !isSigned;

  const previewSettings = {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <InvoiceStatusBadge status={invoice.status as any} />
              {isSigned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <PenTool className="w-3 h-3" />
                  Signed
                </span>
              )}
              {needsSignature && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <PenLine className="w-3 h-3" />
                  Awaiting Signature
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {invoice.to_name}
              {invoice.to_company ? ` · ${invoice.to_company}` : ''}
              {invoice.to_email ? ` · ${invoice.to_email}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isVoid && !isPaid && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm transition-colors border border-emerald-200"
            >
              <DollarSign className="w-4 h-4" />
              Record Payment
            </button>
          )}
          {!isVoid && (
            <button
              onClick={sendInvoice}
              disabled={sending || !invoice.to_email}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm transition-colors border border-blue-200 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {invoice.sent_at ? 'Resend' : 'Send'}
            </button>
          )}
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          <button
            onClick={copyPublicLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
          >
            {copying ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copying ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          {!isVoid && (invoice.status === 'draft' || invoice.status === 'sent') && (
            <button
              onClick={() => onEdit(invoice.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
          {!isVoid && !isPaid && (
            <button
              onClick={voidInvoice}
              disabled={voiding}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 text-sm transition-colors"
            >
              {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Void
            </button>
          )}
        </div>
      </div>

      {/* Signed banner */}
      {isSigned && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <PenTool className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-blue-800">Signed by {invoice.signed_by_name}</span>
            <span className="text-blue-600 ml-2">
              · {invoice.signed_at ? new Date(invoice.signed_at).toLocaleString() : ''}
            </span>
            {invoice.signed_by_choice && (
              <span className="text-blue-500 ml-2 capitalize">({invoice.signed_by_choice} signature)</span>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Invoice Total', value: formatCurrency(invoice.total, invoice.currency), color: 'text-gray-900' },
          { label: 'Amount Paid', value: formatCurrency(invoice.amount_paid, invoice.currency), color: 'text-emerald-600' },
          {
            label: 'Balance Due',
            value: formatCurrency(invoice.balance_due, invoice.currency),
            color: invoice.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600',
          },
          { label: 'Due Date', value: invoice.due_date ?? '—', color: 'text-gray-700' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line items */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Line Items</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Description</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Qty</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Unit</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.line_items ?? []).map(li => (
                <tr key={li.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-800">{li.description}</td>
                  <td className="py-2 text-right text-gray-500">{li.quantity}</td>
                  <td className="py-2 text-right text-gray-500">
                    {formatCurrency(li.unit_price, invoice.currency)}
                  </td>
                  <td className="py-2 text-right text-gray-900 font-medium">
                    {formatCurrency(li.line_total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-2 space-y-1 text-sm">
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>−{formatCurrency(invoice.discount_total, invoice.currency)}</span>
              </div>
            )}
            {invoice.tax_total > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>{formatCurrency(invoice.tax_total, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-900 font-bold pt-1 border-t border-gray-100">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
          {(invoice.notes || invoice.terms) && (
            <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
              {invoice.notes && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</div>
                  <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Terms</div>
                  <p className="text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payments + Activity */}
        <div className="space-y-4">
          {payments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Payments Recorded
              </h3>
              <div className="space-y-2">
                {payments.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(p.amount, p.currency)}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {p.method} · {p.payment_date}
                      </div>
                    </div>
                    {p.reference && (
                      <div className="text-xs text-gray-400">{p.reference}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Activity</h3>
            {activityLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-gray-400 text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map(act => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <ActivityIcon action={act.action} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 capitalize">
                        {act.action.replace(/_/g, ' ')}
                      </div>
                      {act.metadata?.recipient && (
                        <div className="text-xs text-gray-400">to {act.metadata.recipient}</div>
                      )}
                      {act.metadata?.amount && (
                        <div className="text-xs text-gray-400">
                          {formatCurrency(act.metadata.amount, invoice.currency)} via {act.metadata.method}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {new Date(act.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Invoice Preview</h3>
          <div className="max-w-2xl">
            <InvoicePreview
              invoice={invoice}
              items={(invoice.line_items ?? []).map(li => ({
                id: li.id,
                sort_order: li.sort_order,
                description: li.description,
                quantity: li.quantity,
                unit_price: li.unit_price,
                tax_rate: li.tax_rate,
                discount_rate: li.discount_rate,
              }))}
              settings={previewSettings}
            />
          </div>
        </div>
      )}

      {/* Hidden print node */}
      <div className="hidden" ref={printRef}>
        <InvoicePrintLayout
          data={{ invoice, items: invoice.line_items ?? [], settings, tenantName: settings?.business_name ?? '' }}
          forScreen={false}
        />
      </div>

      {/* Record payment modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                <input
                  type="number" step="any" min="0"
                  value={payment.amount}
                  onChange={e => setPayment(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <select
                  value={payment.method}
                  onChange={e => setPayment(p => ({ ...p, method: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payment.payment_date}
                  onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Check #</label>
                <input
                  value={payment.reference}
                  onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))}
                  placeholder="Optional reference"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  value={payment.notes}
                  onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                disabled={!payment.amount || payment.amount <= 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors disabled:opacity-50"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
