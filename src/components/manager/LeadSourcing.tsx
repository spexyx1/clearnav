import React, { useState, useEffect } from 'react';
import {
  Search, Filter, UserPlus, CheckCircle, AlertCircle, Loader2,
  Building2, MapPin, Users, Briefcase, ChevronDown, ChevronUp,
  Import, ExternalLink, RefreshCw, Key, Info,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantInfo } from '../../lib/hooks';

interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string | null;
  linkedin_url: string | null;
  phone_numbers: { raw_number: string }[];
  organization?: {
    name: string;
    website_url: string | null;
    industry: string | null;
    num_employees: number | null;
    city: string | null;
    country: string | null;
  };
  city: string | null;
  state: string | null;
  country: string | null;
}

interface SearchFilters {
  keywords: string;
  titles: string;
  locations: string;
  employeeRanges: string;
  page: number;
}

const EMPLOYEE_RANGES = [
  { label: '1–10', value: '1,10' },
  { label: '11–50', value: '11,50' },
  { label: '51–200', value: '51,200' },
  { label: '201–500', value: '201,500' },
  { label: '501–1000', value: '501,1000' },
  { label: '1001–5000', value: '1001,5000' },
  { label: '5001+', value: '5001,1000000' },
];

export default function LeadSourcing() {
  const { tenantInfo } = useTenantInfo();
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ApolloContact[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = useState<Record<string, 'importing' | 'done' | 'error'>>({});
  const [importingAll, setImportingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');

  const [filters, setFilters] = useState<SearchFilters>({
    keywords: '',
    titles: 'fund manager, chief investment officer, hedge fund manager, portfolio manager, investment director, fund administrator, chief compliance officer',
    locations: '',
    employeeRanges: '',
    page: 1,
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      checkApiKey();
      loadCampaigns();
    }
  }, [tenantInfo?.id]);

  const checkApiKey = async () => {
    if (!tenantInfo?.id) return;
    const { data } = await supabase
      .from('tenant_integration_settings')
      .select('api_key, is_enabled')
      .eq('tenant_id', tenantInfo.id)
      .eq('integration_name', 'apollo')
      .maybeSingle();
    setApiKeyConfigured(!!(data?.api_key && data?.is_enabled));
  };

  const loadCampaigns = async () => {
    if (!tenantInfo?.id) return;
    const { data } = await supabase
      .from('ai_sales_campaigns')
      .select('id, campaign_name')
      .eq('tenant_id', tenantInfo.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (data) setCampaigns(data.map(c => ({ id: c.id, name: c.campaign_name })));
  };

  const search = async (page = 1) => {
    if (!tenantInfo?.id) return;
    setSearching(true);
    setError(null);
    setResults([]);
    setSelectedIds(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apollo-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'search_people',
            tenant_id: tenantInfo.id,
            payload: {
              keywords: filters.keywords || undefined,
              titles: filters.titles
                ? filters.titles.split(',').map(t => t.trim()).filter(Boolean)
                : [],
              locations: filters.locations
                ? filters.locations.split(',').map(l => l.trim()).filter(Boolean)
                : [],
              employee_ranges: filters.employeeRanges ? [filters.employeeRanges] : [],
              page,
              per_page: 25,
            },
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Search failed');

      setResults(json.people ?? []);
      setTotalResults(json.pagination?.total_entries ?? 0);
      setFilters(f => ({ ...f, page }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const importContact = async (contact: ApolloContact): Promise<boolean> => {
    if (!tenantInfo?.id) return false;
    setImportStatus(s => ({ ...s, [contact.id]: 'importing' }));

    try {
      const { error } = await supabase.from('ai_lead_queue').insert({
        tenant_id: tenantInfo.id,
        contact_email: contact.email ?? '',
        contact_name: contact.name,
        contact_company: contact.organization?.name ?? '',
        contact_phone: contact.phone_numbers?.[0]?.raw_number ?? '',
        queue_status: 'new',
        sales_stage: 'prospecting',
        priority_score: 50,
        lead_score: 50,
        engagement_score: 0,
        source: 'apollo',
        tags: ['apollo-import'],
        assigned_campaign_id: selectedCampaign || null,
        notes: [
          contact.title && `Title: ${contact.title}`,
          contact.organization?.industry && `Industry: ${contact.organization.industry}`,
          contact.organization?.num_employees && `Employees: ${contact.organization.num_employees.toLocaleString()}`,
          contact.linkedin_url && `LinkedIn: ${contact.linkedin_url}`,
        ].filter(Boolean).join('\n') || null,
      });

      if (error) throw error;
      setImportStatus(s => ({ ...s, [contact.id]: 'done' }));
      return true;
    } catch {
      setImportStatus(s => ({ ...s, [contact.id]: 'error' }));
      return false;
    }
  };

  const importSelected = async () => {
    const toImport = results.filter(c => selectedIds.has(c.id));
    setImportingAll(true);
    for (const contact of toImport) {
      await importContact(contact);
    }
    setImportingAll(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(c => c.id)));
    }
  };

  const importedCount = Object.values(importStatus).filter(s => s === 'done').length;
  const canImportSelected = selectedIds.size > 0 && !importingAll;

  if (apiKeyConfigured === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
          <Key className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Apollo API Key Required</h2>
        <p className="text-slate-400 max-w-sm mb-6">
          To search Apollo's 280M+ contact database, add your Apollo API key in{' '}
          <span className="text-white font-medium">AI Agents → Settings → Integrations</span>.
        </p>
        <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-4 max-w-sm text-left">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-300">
            Each tenant uses their own Apollo account. Get your API key from{' '}
            <span className="text-blue-400">apollo.io → Settings → API</span>.
          </p>
        </div>
      </div>
    );
  }

  if (apiKeyConfigured === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Sourcing</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Search Apollo's database of 280M+ contacts and import directly into your lead queue
          </p>
        </div>
        {importedCount > 0 && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">{importedCount} imported this session</span>
          </div>
        )}
      </div>

      {/* Search Panel */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5 space-y-4">
        {/* Keywords */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Keywords (e.g. hedge fund, Cayman, AUM)"
              value={filters.keywords}
              onChange={e => setFilters(f => ({ ...f, keywords: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && search(1)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 text-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => search(1)}
            disabled={searching}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Job Titles (comma-separated)</label>
              <input
                type="text"
                value={filters.titles}
                onChange={e => setFilters(f => ({ ...f, titles: e.target.value }))}
                placeholder="fund manager, portfolio manager"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Locations (comma-separated)</label>
              <input
                type="text"
                value={filters.locations}
                onChange={e => setFilters(f => ({ ...f, locations: e.target.value }))}
                placeholder="New York, London, Sydney"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Company Size</label>
              <select
                value={filters.employeeRanges}
                onChange={e => setFilters(f => ({ ...f, employeeRanges: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Any size</option>
                {EMPLOYEE_RANGES.map(r => (
                  <option key={r.value} value={r.value}>{r.label} employees</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Add to Campaign</label>
              <select
                value={selectedCampaign}
                onChange={e => setSelectedCampaign(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">No campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Showing {results.length} of <span className="text-white font-medium">{totalResults.toLocaleString()}</span> results
              </span>
              {selectedIds.size > 0 && (
                <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canImportSelected && (
                <button
                  onClick={importSelected}
                  disabled={importingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {importingAll
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Import className="w-4 h-4" />
                  }
                  Import {selectedIds.size} to Queue
                </button>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => search(filters.page - 1)}
                  disabled={filters.page <= 1 || searching}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400 px-2">Page {filters.page}</span>
                <button
                  onClick={() => search(filters.page + 1)}
                  disabled={results.length < 25 || searching}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700/50">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === results.length && results.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
                    />
                  </th>
                  <th className="p-3 text-left text-xs text-slate-400 font-medium">Contact</th>
                  <th className="p-3 text-left text-xs text-slate-400 font-medium hidden md:table-cell">Company</th>
                  <th className="p-3 text-left text-xs text-slate-400 font-medium hidden lg:table-cell">Location</th>
                  <th className="p-3 text-left text-xs text-slate-400 font-medium hidden xl:table-cell">Email</th>
                  <th className="p-3 text-right text-xs text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {results.map(contact => {
                  const status = importStatus[contact.id];
                  const isDone = status === 'done';
                  const isError = status === 'error';
                  const isImporting = status === 'importing';
                  return (
                    <tr key={contact.id} className={`hover:bg-slate-800/40 transition-colors ${isDone ? 'opacity-60' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          disabled={isDone}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500 disabled:opacity-40"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-white">{contact.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{contact.title}</div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-300">{contact.organization?.name ?? '—'}</span>
                        </div>
                        {contact.organization?.num_employees && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Users className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <span className="text-xs text-slate-500">{contact.organization.num_employees.toLocaleString()} employees</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {(contact.city || contact.country) ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-400 text-xs">{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        {contact.email
                          ? <span className="text-slate-300 text-xs">{contact.email}</span>
                          : <span className="text-slate-600 text-xs italic">Not available</span>
                        }
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          {contact.linkedin_url && (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 hover:text-blue-400 transition-colors"
                              title="View LinkedIn"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {isDone ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Imported
                            </span>
                          ) : isError ? (
                            <button
                              onClick={() => importContact(contact)}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Retry
                            </button>
                          ) : (
                            <button
                              onClick={() => importContact(contact)}
                              disabled={isImporting || importingAll}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              {isImporting
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <UserPlus className="w-3 h-3" />
                              }
                              {isImporting ? 'Adding…' : 'Add to Queue'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state after search */}
      {!searching && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm">
            Enter search criteria above and click <span className="text-white">Search</span> to find prospects.
          </p>
          <p className="text-slate-600 text-xs mt-1">Default filters target fund managers and investment professionals.</p>
        </div>
      )}
    </div>
  );
}
