import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Search, RefreshCw, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, Shield, Users, Building2, AtSign,
} from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;

interface TenantEmailRow {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_email_address: string | null;
  email_verified: boolean;
  email_claimed_at: string | null;
  accounts: EmailAccountRow[];
}

interface EmailAccountRow {
  id: string;
  email_address: string;
  display_name: string;
  account_type: string;
  is_active: boolean;
  access_count: number;
}

type SortField = 'tenant_name' | 'email_claimed_at' | 'email_verified';
type SortDir = 'asc' | 'desc';

function StatusBadge({ verified, claimed }: { verified: boolean; claimed: boolean }) {
  if (!claimed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        <XCircle className="h-3 w-3" />
        Unclaimed
      </span>
    );
  }
  if (!verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle className="h-3 w-3" />
      Verified
    </span>
  );
}

function AccountTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    personal: 'bg-blue-50 text-blue-700 border-blue-200',
    shared: 'bg-amber-50 text-amber-700 border-amber-200',
    department: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${styles[type] || styles.department}`}>
      {type}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TenantEmailOversight() {
  const [rows, setRows] = useState<TenantEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('tenant_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<'all' | 'claimed' | 'verified' | 'unclaimed'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: tenants, error: tErr } = await supabase
        .from('platform_tenants')
        .select('id, name, slug, tenant_email_address, email_verified, email_claimed_at')
        .neq('slug', 'clearnav')
        .order('name');

      if (tErr) throw tErr;

      const { data: accounts, error: aErr } = await supabase
        .from('email_accounts')
        .select('id, tenant_id, email_address, display_name, account_type, is_active')
        .neq('tenant_id', '00000000-0000-0000-0000-000000000001');

      if (aErr) throw aErr;

      const { data: accessData } = await supabase
        .from('email_account_access')
        .select('account_id');

      const accessCounts: Record<string, number> = {};
      (accessData || []).forEach((a: any) => {
        accessCounts[a.account_id] = (accessCounts[a.account_id] || 0) + 1;
      });

      const accountsByTenant: Record<string, EmailAccountRow[]> = {};
      (accounts || []).forEach((a: any) => {
        if (!accountsByTenant[a.tenant_id]) accountsByTenant[a.tenant_id] = [];
        accountsByTenant[a.tenant_id].push({
          id: a.id,
          email_address: a.email_address,
          display_name: a.display_name,
          account_type: a.account_type,
          is_active: a.is_active,
          access_count: accessCounts[a.id] || 0,
        });
      });

      const result: TenantEmailRow[] = (tenants || []).map((t: any) => ({
        tenant_id: t.id,
        tenant_name: t.name,
        tenant_slug: t.slug,
        tenant_email_address: t.tenant_email_address,
        email_verified: t.email_verified ?? false,
        email_claimed_at: t.email_claimed_at,
        accounts: accountsByTenant[t.id] || [],
      }));

      setRows(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = rows
    .filter((r) => {
      const q = search.toLowerCase();
      if (q && !r.tenant_name.toLowerCase().includes(q) && !r.tenant_email_address?.toLowerCase().includes(q)) return false;
      if (filter === 'claimed' && !r.email_claimed_at) return false;
      if (filter === 'verified' && !r.email_verified) return false;
      if (filter === 'unclaimed' && !!r.email_claimed_at) return false;
      return true;
    })
    .sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortField === 'tenant_name') { va = a.tenant_name; vb = b.tenant_name; }
      else if (sortField === 'email_claimed_at') { va = a.email_claimed_at || ''; vb = b.email_claimed_at || ''; }
      else if (sortField === 'email_verified') { va = a.email_verified ? 1 : 0; vb = b.email_verified ? 1 : 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const stats = {
    total: rows.length,
    claimed: rows.filter((r) => !!r.email_claimed_at).length,
    verified: rows.filter((r) => r.email_verified).length,
    totalAccounts: rows.reduce((s, r) => s + r.accounts.length, 0),
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3.5 w-3.5 text-slate-300 opacity-50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-blue-300" />
      : <ChevronDown className="h-3.5 w-3.5 text-blue-300" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tenant Email Oversight</h2>
          <p className="text-sm text-slate-500 mt-1">
            View and monitor email address claims and accounts across all tenants.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants', value: stats.total, icon: Building2, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Email Claimed', value: stats.claimed, icon: AtSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Verified', value: stats.verified, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Accounts', value: stats.totalAccounts, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
            <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenants or email addresses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1">
          {(['all', 'claimed', 'verified', 'unclaimed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-10 w-10 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 text-sm">No tenants match your filters</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('tenant_name')}
                    className="flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Tenant
                    <SortIcon field="tenant_name" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Claimed Address
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('email_verified')}
                    className="flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Status
                    <SortIcon field="email_verified" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('email_claimed_at')}
                    className="flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Claimed
                    <SortIcon field="email_claimed_at" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Accounts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const isExpanded = expanded.has(row.tenant_id);
                return (
                  <>
                    <tr
                      key={row.tenant_id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => row.accounts.length > 0 && toggleExpand(row.tenant_id)}
                    >
                      <td className="pl-4 py-3 text-slate-400">
                        {row.accounts.length > 0 ? (
                          isExpanded
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <span className="block w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-600">
                              {row.tenant_name[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{row.tenant_name}</p>
                            <p className="text-xs text-slate-400">{row.tenant_slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.tenant_email_address ? (
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                            {row.tenant_email_address}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge verified={row.email_verified} claimed={!!row.email_claimed_at} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(row.email_claimed_at)}
                      </td>
                      <td className="px-4 py-3">
                        {row.accounts.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {row.accounts.length} account{row.accounts.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && row.accounts.map((acct) => (
                      <tr key={acct.id} className="bg-slate-50/70">
                        <td />
                        <td colSpan={2} className="pl-12 pr-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="font-mono text-xs text-slate-600">{acct.email_address}</span>
                            <span className="text-xs text-slate-400">— {acct.display_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <AccountTypeBadge type={acct.account_type} />
                        </td>
                        <td className="px-4 py-2.5">
                          {acct.is_active ? (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Inactive</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Shield className="h-3 w-3" />
                            {acct.access_count} user{acct.access_count !== 1 ? 's' : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>

          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {rows.length} tenants
            </p>
            <p className="text-xs text-slate-400">
              Platform accounts (info@, compliance@) are excluded from this view
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
