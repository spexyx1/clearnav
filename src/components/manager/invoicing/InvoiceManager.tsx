import { useState, useEffect, useCallback } from 'react';
import { lazy, Suspense } from 'react';
import {
  Plus, Search, Filter, Download, RefreshCw, Receipt,
  ChevronDown, X, ArrowUpDown, Settings,
  Loader2, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Invoice, InvoiceSettings, InvoiceStatus, formatCurrency } from './types';
import InvoiceStatusBadge from './InvoiceStatusBadge';

const InvoiceEditor = lazy(() => import('./InvoiceEditor'));
const InvoiceDetail = lazy(() => import('./InvoiceDetail'));
const InvoiceSettingsPanel = lazy(() => import('./InvoiceSettings'));

type View = 'list' | 'editor' | 'detail' | 'settings';
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
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function InvoiceManager() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [tenantName, setTenantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [sortField, setSortField] = useState<SortField>('issue_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Detail/Edit state
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Get tenant_id
      const { data: profile } = await supabase
        .from('staff_accounts')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let tenantId = profile?.tenant_id;
      if (!tenantId) {
        const { data: pt } = await supabase
          .from('platform_tenants')
          .select('id, name')
          .eq('owner_user_id', user.id)
          .maybeSingle();
        tenantId = pt?.id;
        if (pt?.name) setTenantName(pt.name);
      }
      if (!tenantId) { setError('No tenant found.'); setLoading(false); return; }

      if (!tenantName) {
        const { data: pt2 } = await supabase
          .from('platform_tenants')
          .select('name')
          .eq('id', tenantId)
          .maybeSingle();
        if (pt2?.name) setTenantName(pt2.name);
      }

      const [invRes, settingsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, line_items:invoice_line_items(*)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoice_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]);

      if (invRes.error) throw invRes.error;
      setInvoices(invRes.data as Invoice[]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as InvoiceSettings);
      } else {
        // Bootstrap default settings
        const { data: newSettings } = await supabase
          .from('invoice_settings')
          .insert({ tenant_id: tenantId })
          .select()
          .single();
        if (newSettings) setSettings(newSettings as InvoiceSettings);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtered + sorted
  const filtered = invoices.filter(inv => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !inv.invoice_number?.toLowerCase().includes(q) &&
        !inv.to_name?.toLowerCase().includes(q) &&
        !inv.to_company?.toLowerCase().includes(q) &&
        !inv.to_email?.toLowerCase().includes(q)
      ) return false;
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

  // Stats
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

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  }

  async function exportCSV() {
    const rows = [
      ['Invoice #', 'To', 'Company', 'Email', 'Issue Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'],
      ...filtered.map(i => [
        i.invoice_number, i.to_name, i.to_company || '', i.to_email,
        i.issue_date, i.due_date || '', i.status,
        i.subtotal, i.tax_total, i.total, i.amount_paid, i.balance_due,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (view === 'editor') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>}>
        <InvoiceEditor
          invoice={activeInvoice || undefined}
          settings={settings}
          tenantName={tenantName}
          onSaved={(inv) => { setActiveInvoice(inv); setView('detail'); loadData(); }}
          onBack={() => { setActiveInvoice(null); setView('list'); }}
        />
      </Suspense>
    );
  }

  if (view === 'detail' && activeInvoice) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>}>
        <InvoiceDetail
          invoice={activeInvoice}
          settings={settings}
          tenantName={tenantName}
          onBack={() => { setActiveInvoice(null); setView('list'); loadData(); }}
          onEdit={() => setView('editor')}
          onRefresh={(inv) => setActiveInvoice(inv)}
        />
      </Suspense>
    );
  }

  if (view === 'settings') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>}>
        <InvoiceSettingsPanel
          settings={settings}
          tenantName={tenantName}
          onSaved={(s) => { setSettings(s); setView('list'); }}
          onBack={() => setView('list')}
        />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-400" />
            Invoices
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Create, send, and track client invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('settings')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => { setActiveInvoice(null); setView('editor'); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstandingTotal, currency)}
          sub={`${outstanding.length} invoice${outstanding.length !== 1 ? 's' : ''}`}
          color="text-amber-400"
        />
        <StatCard
          label="Paid This Month"
          value={formatCurrency(paidTotal, currency)}
          sub={`${paidThisMonth.length} invoice${paidThisMonth.length !== 1 ? 's' : ''}`}
          color="text-emerald-400"
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          sub={overdueCount > 0 ? 'Needs attention' : 'All current'}
          color={overdueCount > 0 ? 'text-red-400' : 'text-slate-400'}
        />
        <StatCard
          label="Drafts"
          value={String(draftCount)}
          sub="Not yet sent"
          color="text-slate-300"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as '' | InvoiceStatus)}
            className="pl-9 pr-8 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 appearance-none"
          >
            {STATUS_FILTERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {selected.size > 0 && (
            <span className="text-xs text-slate-400">{selected.size} selected</span>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Receipt className="w-12 h-12 mb-3 opacity-30" />
            <div className="font-medium text-slate-300">
              {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
            </div>
            <p className="text-sm mt-1 text-slate-500">
              {invoices.length === 0
                ? 'Create your first invoice to get started'
                : 'Try adjusting your search or filters'}
            </p>
            {invoices.length === 0 && (
              <button
                onClick={() => { setActiveInvoice(null); setView('editor'); }}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
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
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('invoice_number')}
                  >
                    <span className="flex items-center gap-1">
                      Invoice # <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Client</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('issue_date')}
                  >
                    <span className="flex items-center gap-1">
                      Issue Date <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('due_date')}
                  >
                    <span className="flex items-center gap-1">
                      Due Date <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('total')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Amount <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-white select-none"
                    onClick={() => toggleSort('status')}
                  >
                    <span className="flex items-center gap-1">
                      Status <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => { setActiveInvoice(inv); setView('detail'); }}
                    className="hover:bg-slate-700/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(inv.id); }}>
                      <input
                        type="checkbox"
                        checked={selected.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-cyan-400 group-hover:text-cyan-300 font-medium">
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{inv.to_name}</div>
                      {inv.to_company && <div className="text-xs text-slate-400">{inv.to_company}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{inv.issue_date || '—'}</td>
                    <td className="px-4 py-3">
                      {inv.due_date ? (
                        <span className={
                          inv.status === 'overdue'
                            ? 'text-red-400 font-medium'
                            : 'text-slate-300'
                        }>
                          {inv.due_date}
                        </span>
                      ) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-white">{formatCurrency(inv.total, inv.currency)}</div>
                      {inv.balance_due > 0 && inv.balance_due < inv.total && (
                        <div className="text-xs text-amber-400">{formatCurrency(inv.balance_due, inv.currency)} due</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer totals */}
            {filtered.length > 1 && (
              <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/30 flex items-center justify-between text-xs text-slate-400">
                <span>{filtered.length} invoices</span>
                <span className="font-semibold text-white">
                  Total: {formatCurrency(filtered.reduce((s, i) => s + i.total, 0), currency)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
