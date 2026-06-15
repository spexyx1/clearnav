import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Download, Send, Copy, CheckCircle, Trash2, DollarSign,
  Clock, Eye, Mail, Loader2, X, FileText,
  PenLine, PenTool,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Invoice, InvoicePayment, InvoiceActivity, InvoiceSettings, formatCurrency, PaymentMethod } from './types';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import InvoicePreview from './InvoicePreview';
import InvoicePrintLayout from './InvoicePrintLayout';
import { buildInvoicePrintHTML } from './buildInvoicePrintHTML';

interface Props {
  invoice: Invoice;
  settings: InvoiceSettings | null;
  tenantName: string;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: (inv: Invoice) => void;
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
  if (action === 'created') return <FileText className="w-4 h-4 text-cyan-400" />;
  if (action === 'sent') return <Send className="w-4 h-4 text-blue-400" />;
  if (action === 'viewed') return <Eye className="w-4 h-4 text-slate-400" />;
  if (action === 'paid') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (action === 'voided') return <X className="w-4 h-4 text-red-400" />;
  if (action === 'payment_recorded') return <DollarSign className="w-4 h-4 text-emerald-400" />;
  if (action === 'reminder_sent') return <Mail className="w-4 h-4 text-amber-400" />;
  if (action === 'signed') return <PenTool className="w-4 h-4 text-cyan-400" />;
  return <Clock className="w-4 h-4 text-slate-500" />;
}

export default function InvoiceDetail({ invoice: initialInvoice, settings, tenantName, onBack, onEdit, onRefresh }: Props) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [activity, setActivity] = useState<InvoiceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [payment, setPayment] = useState({
    amount: invoice.balance_due,
    method: 'manual' as PaymentMethod,
    payment_date: new Date().toISOString().slice(0, 10),
    reference: '',
    notes: '',
  });

  useEffect(() => {
    load();
  }, [invoice.id]);

  async function load() {
    setLoading(true);
    const [{ data: pays }, { data: acts }] = await Promise.all([
      supabase.from('invoice_payments').select('*').eq('invoice_id', invoice.id).order('created_at'),
      supabase.from('invoice_activity').select('*').eq('invoice_id', invoice.id).order('created_at'),
    ]);
    setPayments(pays ?? []);
    setActivity(acts ?? []);
    setLoading(false);
  }

  async function recordPayment() {
    if (!payment.amount || payment.amount <= 0) return;
    const { error } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: invoice.id,
        amount: payment.amount,
        currency: invoice.currency,
        payment_date: payment.payment_date,
        method: payment.method,
        reference: payment.reference || null,
        notes: payment.notes || null,
        recorded_by: user?.id ?? null,
      })
      .select()
      .single();
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
      actor_id: user?.id ?? null,
      action: 'payment_recorded',
      metadata: { amount: payment.amount, method: payment.method },
    });

    if (updated) {
      setInvoice(updated as Invoice);
      onRefresh(updated as Invoice);
    }
    setShowPaymentForm(false);
    load();
  }

  async function sendInvoice() {
    setSending(true);
    try {
      await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: invoice.id } });
      const { data } = await supabase
        .from('invoices')
        .update({ status: invoice.status === 'draft' ? 'sent' : invoice.status, sent_at: new Date().toISOString() })
        .eq('id', invoice.id)
        .select()
        .single();
      await supabase.from('invoice_activity').insert({
        invoice_id: invoice.id,
        actor_id: user?.id ?? null,
        action: 'sent',
        metadata: { recipient: invoice.to_email },
      });
      if (data) { setInvoice(data as Invoice); onRefresh(data as Invoice); }
      load();
    } finally {
      setSending(false);
    }
  }

  async function voidInvoice() {
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
      actor_id: user?.id ?? null,
      action: 'voided',
      metadata: null,
    });
    if (data) { setInvoice(data as Invoice); onRefresh(data as Invoice); }
    setVoiding(false);
    load();
  }

  async function copyPublicLink() {
    setCopying(true);
    const link = `${window.location.origin}/invoice/${invoice.public_view_token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setTimeout(() => setCopying(false), 1500);
  }

  function downloadPDF() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(
      buildInvoicePrintHTML(invoice, invoice.line_items ?? [], settings, settings?.business_name ?? '')
    );
    printWindow.document.close();
  }

  const isVoid = invoice.status === 'void';
  const isPaid = invoice.status === 'paid';
  const isSigned = !!invoice.signed_at;
  const needsSignature = invoice.signature_required && !isSigned;

  const printData = {
    invoice,
    items: invoice.line_items ?? [],
    settings,
    tenantName,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white">{invoice.invoice_number}</h2>
              <InvoiceStatusBadge status={invoice.status as any} />
              {isSigned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <PenTool className="w-3 h-3" />
                  Signed
                </span>
              )}
              {needsSignature && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <PenLine className="w-3 h-3" />
                  Awaiting Signature
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              {invoice.to_name}{invoice.to_company ? ` · ${invoice.to_company}` : ''} · {invoice.to_email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isVoid && !isPaid && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm transition-colors border border-emerald-600/30"
            >
              <DollarSign className="w-4 h-4" />
              Record Payment
            </button>
          )}
          {!isVoid && (
            <button
              onClick={sendInvoice}
              disabled={sending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm transition-colors border border-blue-600/30"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {invoice.sent_at ? 'Resend' : 'Send'}
            </button>
          )}
          <button
            onClick={copyPublicLink}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
          >
            {copying ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copying ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          {!isVoid && invoice.status === 'draft' && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Edit
            </button>
          )}
          {!isVoid && !isPaid && (
            <button
              onClick={voidInvoice}
              disabled={voiding}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 text-sm transition-colors"
            >
              {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Void
            </button>
          )}
        </div>
      </div>

      {/* Signature status banner */}
      {isSigned && (
        <div className="flex items-start gap-3 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <PenTool className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold text-cyan-300">Signed by {invoice.signed_by_name}</span>
            <span className="text-cyan-400 ml-2">· {invoice.signed_at ? new Date(invoice.signed_at).toLocaleString() : ''}</span>
            {invoice.signed_by_choice && (
              <span className="text-cyan-500 ml-2 capitalize">({invoice.signed_by_choice} signature)</span>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Invoice Total', value: formatCurrency(invoice.total, invoice.currency), color: 'text-white' },
          { label: 'Amount Paid', value: formatCurrency(invoice.amount_paid, invoice.currency), color: 'text-emerald-400' },
          { label: 'Balance Due', value: formatCurrency(invoice.balance_due, invoice.currency), color: invoice.balance_due > 0 ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Due Date', value: invoice.due_date ?? '—', color: 'text-slate-200' },
        ].map(card => (
          <div key={card.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">{card.label}</div>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line items */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Line Items</h3>
            <button
              onClick={() => setShowPreview(v => !v)}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 text-xs font-medium text-slate-500">Description</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500">Qty</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500">Unit</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.line_items ?? []).map(li => (
                <tr key={li.id} className="border-b border-slate-800/50">
                  <td className="py-2 text-slate-200">{li.description}</td>
                  <td className="py-2 text-right text-slate-400">{li.quantity}</td>
                  <td className="py-2 text-right text-slate-400">{formatCurrency(li.unit_price, invoice.currency)}</td>
                  <td className="py-2 text-right text-white font-medium">{formatCurrency(li.line_total, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-2 space-y-1 text-sm">
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span><span>−{formatCurrency(invoice.discount_total, invoice.currency)}</span>
              </div>
            )}
            {invoice.tax_total > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax</span><span>{formatCurrency(invoice.tax_total, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-700">
              <span>Total</span><span className="text-cyan-400">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Activity + Payments */}
        <div className="space-y-4">
          {payments.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Payments Recorded</h3>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-800/50 last:border-0">
                    <div>
                      <div className="text-white font-medium">{formatCurrency(p.amount, p.currency)}</div>
                      <div className="text-slate-500 text-xs capitalize">{p.method} · {p.payment_date}</div>
                    </div>
                    {p.reference && <div className="text-slate-400 text-xs">{p.reference}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Activity</h3>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
            ) : activity.length === 0 ? (
              <p className="text-slate-500 text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map(act => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <ActivityIcon action={act.action} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-300 capitalize">{act.action.replace(/_/g, ' ')}</div>
                      {act.metadata?.recipient && (
                        <div className="text-xs text-slate-500">to {act.metadata.recipient}</div>
                      )}
                      {act.metadata?.amount && (
                        <div className="text-xs text-slate-500">
                          {formatCurrency(act.metadata.amount, invoice.currency)} via {act.metadata.method}
                        </div>
                      )}
                      {act.metadata?.signed_by_name && (
                        <div className="text-xs text-slate-500">by {act.metadata.signed_by_name}</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex-shrink-0">
                      {new Date(act.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice preview */}
      {showPreview && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Invoice Preview</h3>
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
              settings={{
                logo_url: settings?.logo_url,
                accent_color: settings?.accent_color,
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

      {/* Hidden print node */}
      <div className="hidden" ref={printRef}>
        <InvoicePrintLayout data={printData} forScreen={false} />
      </div>

      {/* Record payment modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Record Payment</h3>
              <button onClick={() => setShowPaymentForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Amount</label>
                <input
                  type="number" step="any" min="0"
                  value={payment.amount}
                  onChange={e => setPayment(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                <select
                  value={payment.method}
                  onChange={e => setPayment(p => ({ ...p, method: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payment.payment_date}
                  onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reference / Check #</label>
                <input
                  value={payment.reference}
                  onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))}
                  placeholder="Optional reference"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                <input
                  value={payment.notes}
                  onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPaymentForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={recordPayment}
                disabled={!payment.amount || payment.amount <= 0}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-colors disabled:opacity-50"
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
