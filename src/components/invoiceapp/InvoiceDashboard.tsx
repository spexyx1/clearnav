import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Filter, Download, RefreshCw, Receipt,
  ChevronDown, X, ArrowUpDown, Loader2, AlertCircle,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Invoice, InvoiceSettings, InvoiceStatus, formatCurrency } from '../manager/invoicing/types';
import InvoiceStatusBadge from '../manager/invoicing/InvoiceStatusBadge';

interface Props {
  userId: string;
  onNewInvoice: () => void;
  onOpenInvoice: (id: string) => void;
}

type SortField = 'invoice_number' | 'issue_date' | 'due_date' | 'total' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: { value: '' | InvoiceStatus; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'void', label: 'Void' },
];

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function InvoiceDashboard({ userId, onNewInvoice, onOpenInvoice }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [recordPaymentId, setRecordPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'manual', payment_date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, settingsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, line_items:invoice_line_items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoice_settings')
          .select('*')
          .eq('user_id', userId)
          .is('tenant_id', null)
          .maybeSingle(),
      ]);
      if (invRes.error) throw invRes.error;
      setInvoices(invRes.data as Invoice[]);
      if (settingsRes.data) setSettings(settingsRes.data as InvoiceSettings);
    } catch (e: any) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter(inv => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.to_name?.toLowerCase().includes(q) ||
        inv.to_company?.toLowerCase().includes(q) ||
        inv.to_email?.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    let av: any = a[sortField];
    let bv: any = b[sortField];
    if (sortField === 'total') { av = Number(av); bv = Number(bv); }
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const outstanding = invoices.filter(i => ['sent', 'viewed', 'partial', 'overdue'].includes(i.status));
  const outstandingTotal = outstanding.reduce((s, i) => s + (i.balance_due || 0), 0);
  const paidThisMonth = invoices.filter(i => {
    if (i.status !== 'paid' || !i.paid_at) return false;
    const d = new Date(i.paid_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const paidTotal = paidThisMonth.reduce((s, i) => s + (i.total || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const draftCount = invoices.filter(i => i.status === 'draft').length;
  const currency = settings?.default_currency || 'USD';

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  async function exportCSV() {
    const rows = [
      ['Invoice #', 'To', 'Company', 'Email', 'Issue Date', 'Due Date', 'Status', 'Total', 'Paid', 'Balance'],
      ...filtered.map(i => [i.invoice_number, i.to_name, i.to_company || '', i.to_email, i.issue_date, i.due_date || '', i.status, i.total, i.amount_paid, i.balance_due]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRecordPayment() {
    if (!recordPaymentId || !paymentForm.amount) return;
    const inv = invoices.find(i => i.id === recordPaymentId);
    if (!inv) return;
    setPaymentSaving(true);
    await supabase.from('invoice_payments').insert({
      invoice_id: recordPaymentId,
      amount: paymentForm.amount,
      currency: inv.currency,
      payment_date: paymentForm.payment_date,
      method: paymentForm.method,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null,
      recorded_by: userId,
    });
    const newPaid = inv.amount_paid + paymentForm.amount;
    const newStatus = newPaid >= inv.total ? 'paid' : 'partial';
    await supabase.from('invoices').update({
      amount_paid: newPaid,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
    }).eq('id', recordPaymentId);
    await supabase.from('invoice_activity').insert({
      invoice_id: recordPaymentId,
      actor_id: userId,
      action: 'payment_recorded',
      metadata: { amount: paymentForm.amount, method: paymentForm.method },
    });
    setRecordPaymentId(null);
    setPaymentSaving(false);
    load();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={onNewInvoice}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Outstanding" value={formatCurrency(outstandingTotal, currency)} sub={`${outstanding.length} invoice${outstanding.length !== 1 ? 's' : ''}`} color="text-amber-600" />
        <StatCard label="Paid This Month" value={formatCurrency(paidTotal, currency)} sub={`${paidThisMonth.length} invoice${paidThisMonth.length !== 1 ? 's' : ''}`} color="text-emerald-600" />
        <StatCard label="Overdue" value={String(overdueCount)} sub={overdueCount > 0 ? 'Needs attention' : 'All current'} color={overdueCount > 0 ? 'text-red-600' : 'text-gray-400'} />
        <StatCard label="Drafts" value={String(draftCount)} sub="Not yet sent" color="text-gray-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice #, client, email..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as '' | InvoiceStatus)}
            className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white appearance-none"
          >
            {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors bg-white">
          <Download className="w-4 h-4" />
          Export
        </button>
        <button onClick={load} className="p-2.5 text-gray-400 hover:text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors bg-white">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Receipt className="w-12 h-12 mb-3 opacity-30" />
            <div className="font-medium text-gray-600 text-lg">
              {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
            </div>
            <p className="text-sm mt-1 text-gray-400">
              {invoices.length === 0 ? 'Create your first invoice to get started' : 'Try adjusting your search or filters'}
            </p>
            {invoices.length === 0 && (
              <button
                onClick={onNewInvoice}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900" onClick={() => toggleSort('invoice_number')}>
                    <span className="flex items-center gap-1">Invoice # <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900" onClick={() => toggleSort('issue_date')}>
                    <span className="flex items-center gap-1">Issued <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900" onClick={() => toggleSort('due_date')}>
                    <span className="flex items-center gap-1">Due <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-900" onClick={() => toggleSort('total')}>
                    <span className="flex items-center gap-1 justify-end">Amount <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenInvoice(inv.id)}
                        className="font-mono text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{inv.to_name}</div>
                      {inv.to_company && <div className="text-xs text-gray-400">{inv.to_company}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{inv.issue_date || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {inv.due_date ? (
                        <span className={inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {inv.due_date}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(inv.total, inv.currency)}</div>
                      {inv.balance_due > 0 && inv.balance_due < inv.total && (
                        <div className="text-xs text-amber-600">{formatCurrency(inv.balance_due, inv.currency)} due</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status as any} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onOpenInvoice(inv.id)}
                          className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                          View
                        </button>
                        {!['paid', 'void'].includes(inv.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecordPaymentId(inv.id);
                              setPaymentForm({ amount: inv.balance_due, method: 'manual', payment_date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Record Payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>{filtered.length} invoices</span>
                <span className="font-semibold text-gray-800">Total: {formatCurrency(filtered.reduce((s, i) => s + i.total, 0), currency)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick payment modal */}
      {recordPaymentId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setRecordPaymentId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" step="any" min="0" value={paymentForm.amount}
                  onChange={e => setPaymentForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="manual">Manual / Other</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="ach">ACH</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input type="date" value={paymentForm.payment_date}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
                <input value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                  placeholder="Check #, transaction ID..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRecordPaymentId(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleRecordPayment} disabled={paymentSaving || !paymentForm.amount}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                {paymentSaving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
