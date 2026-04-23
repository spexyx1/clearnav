import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Globe, CheckCircle, XCircle, AlertCircle, Trash2,
  RefreshCw, ExternalLink, Copy, Shield, Wifi, Server, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface VercelResult {
  success: boolean;
  vercel_verified?: boolean;
  vercel_redirect?: string | null;
  vercel_misconfigured?: boolean;
  dns_config?: any;
  configured?: boolean;
  message?: string;
  error?: string;
}

async function callVercel(action: string, method: string, body?: object): Promise<VercelResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    const isGet = method === 'GET';
    const domainParam = body && 'domain' in body ? `&domain=${encodeURIComponent((body as any).domain)}` : '';
    const url = `${SUPABASE_URL}/functions/v1/vercel-domain-manager?action=${action}${isGet ? domainParam : ''}`;

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Apikey: SUPABASE_ANON_KEY,
      },
      body: isGet ? undefined : JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, configured: data.configured, error: data.error || 'Vercel API error', message: data.message };
    }
    return { success: true, ...data };
  } catch {
    return { success: false, error: 'Failed to contact Vercel API' };
  }
}

interface Domain {
  id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  ssl_enabled: boolean;
  deployment_status: string;
  last_deployed_at: string | null;
  vercel_project_id: string | null;
  vercel_status: string | null;
  vercel_redirect_target: string | null;
  vercel_last_checked_at: string | null;
  vercel_misconfigured: boolean | null;
}

interface DomainStatus {
  dns: 'ok' | 'error' | 'unknown';
  vercel: 'ok' | 'redirect' | 'missing' | 'unknown';
  ssl: 'ok' | 'pending' | 'error';
  label: string;
  color: string;
}

function getDomainStatus(domain: Domain): DomainStatus {
  const hasVercelData = !!domain.vercel_last_checked_at;

  if (!hasVercelData) {
    return { dns: 'unknown', vercel: 'unknown', ssl: 'pending', label: 'Not Checked', color: 'gray' };
  }

  const dnsOk = !domain.vercel_misconfigured;
  const vercelOk = domain.vercel_status === 'verified' && !domain.vercel_redirect_target;
  const isRedirect = !!domain.vercel_redirect_target;
  const sslOk = domain.ssl_enabled && domain.is_verified;

  if (vercelOk && dnsOk && sslOk) {
    return { dns: 'ok', vercel: 'ok', ssl: 'ok', label: 'Active', color: 'green' };
  }
  if (isRedirect) {
    return { dns: dnsOk ? 'ok' : 'error', vercel: 'redirect', ssl: 'error', label: 'Redirect Conflict', color: 'red' };
  }
  if (!vercelOk && domain.vercel_status === 'pending') {
    return { dns: dnsOk ? 'ok' : 'error', vercel: 'missing', ssl: 'pending', label: 'DNS Pending', color: 'yellow' };
  }
  return { dns: dnsOk ? 'ok' : 'error', vercel: 'unknown', ssl: 'pending', label: 'Incomplete', color: 'yellow' };
}

function LayerBadge({ label, status }: { label: string; status: 'ok' | 'error' | 'redirect' | 'missing' | 'pending' | 'unknown' }) {
  const colors: Record<string, string> = {
    ok: 'bg-green-100 text-green-700 border-green-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    redirect: 'bg-red-100 text-red-700 border-red-200',
    missing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    unknown: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const icons: Record<string, React.ReactNode> = {
    ok: <CheckCircle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
    redirect: <XCircle className="w-3 h-3" />,
    missing: <AlertCircle className="w-3 h-3" />,
    pending: <AlertCircle className="w-3 h-3" />,
    unknown: <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${colors[status]}`}>
      {icons[status]} {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function DomainManagement() {
  const { tenantId } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [dnsConfig, setDnsConfig] = useState<Record<string, any>>({});
  const [checkingDomain, setCheckingDomain] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vercelUnconfigured, setVercelUnconfigured] = useState(false);

  const loadDomains = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_domains')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      setDomains(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadDomains(); }, [loadDomains]);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    setError(null);
    setVercelUnconfigured(false);
    try {
      const domainName = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      const { data, error: insertErr } = await supabase
        .from('tenant_domains')
        .insert({
          tenant_id: tenantId,
          domain: domainName,
          is_primary: domains.length === 0,
          is_verified: false,
          ssl_enabled: false,
          deployment_status: 'pending',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Register with Vercel (clears redirect if domain was previously a redirect alias)
      const result = await callVercel('add', 'POST', { domain: domainName });
      if (!result.success && result.configured === false) {
        setVercelUnconfigured(true);
      } else if (result.success && result.dns_config) {
        setDnsConfig(prev => ({ ...prev, [domainName]: result.dns_config }));
        setExpandedDomain(data.id);
      }

      setNewDomain('');
      setShowAddDomain(false);
      loadDomains();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const checkStatus = async (domain: Domain) => {
    setCheckingDomain(domain.id);
    setError(null);
    try {
      const result = await callVercel('inspect', 'GET', { domain: domain.domain });
      if (result.success && result.dns_config) {
        setDnsConfig(prev => ({ ...prev, [domain.domain]: result.dns_config }));
      }
      if (!result.success) {
        if (result.configured === false) setVercelUnconfigured(true);
        else setError(result.error || 'Check failed');
      }
      loadDomains();
    } finally {
      setCheckingDomain(null);
    }
  };

  const verifyDomain = async (domain: Domain) => {
    setCheckingDomain(domain.id);
    setError(null);
    try {
      const result = await callVercel('verify', 'POST', { domain: domain.domain });
      if (!result.success) {
        if (result.configured === false) setVercelUnconfigured(true);
        else setError(result.error || 'Verification failed');
      }
      loadDomains();
    } finally {
      setCheckingDomain(null);
    }
  };

  const deleteDomain = async (domain: Domain) => {
    if (!confirm(`Remove ${domain.domain}? This will also remove it from Vercel.`)) return;
    setError(null);
    try {
      await supabase.from('tenant_domains').delete().eq('id', domain.id);
      await callVercel('remove', 'DELETE', { domain: domain.domain });
      if (expandedDomain === domain.id) setExpandedDomain(null);
      loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getDnsInstructions = (domain: Domain) => {
    const config = dnsConfig[domain.domain];
    if (!config) return null;

    const records: Array<{ type: string; name: string; value: string }> = [];

    if (config.cnames?.length) {
      config.cnames.forEach((c: string) => records.push({ type: 'CNAME', name: domain.domain, value: c }));
    }
    if (config.aValues?.length) {
      config.aValues.forEach((a: string) => records.push({ type: 'A', name: domain.domain, value: a }));
    }
    if (!records.length) {
      records.push({ type: 'CNAME', name: domain.domain, value: 'cname.vercel-dns.com' });
      records.push({ type: 'A', name: domain.domain, value: '76.76.21.21' });
    }
    return records;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tenant Context</h3>
          <p className="text-gray-500">A tenant context is required to manage custom domains.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Custom Domains</h2>
          <p className="text-sm text-gray-500 mt-1">Connect your own domain for a fully branded experience</p>
        </div>
        <button
          onClick={() => setShowAddDomain(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Domain
        </button>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Vercel unconfigured warning */}
      {vercelUnconfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Vercel API Not Configured</h4>
              <p className="text-sm text-amber-800 mb-2">
                The domain was saved, but auto-registration with Vercel requires these secrets on your Supabase Edge Functions:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 mb-3 list-disc list-inside">
                <li><code className="bg-amber-100 px-1 rounded">VERCEL_API_TOKEN</code></li>
                <li><code className="bg-amber-100 px-1 rounded">VERCEL_PROJECT_ID</code></li>
              </ul>
              <p className="text-sm text-amber-800">Until configured, add domains manually in Vercel under Settings &gt; Domains, then click "Check Status" here.</p>
              <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium hover:text-amber-900 mt-2">
                Get Vercel API Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add domain form */}
      {showAddDomain && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Add Custom Domain</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="yourdomain.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              autoFocus
            />
            <button
              onClick={addDomain}
              disabled={adding || !newDomain.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
            >
              {adding && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Add
            </button>
            <button
              onClick={() => { setShowAddDomain(false); setNewDomain(''); }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Domain list */}
      <div className="space-y-3">
        {domains.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No domains yet</h3>
            <p className="text-sm text-gray-500 mb-4">Add a custom domain to brand your investor portal</p>
            <button onClick={() => setShowAddDomain(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Add Domain
            </button>
          </div>
        ) : (
          domains.map(domain => {
            const status = getDomainStatus(domain);
            const isExpanded = expandedDomain === domain.id;
            const isChecking = checkingDomain === domain.id;
            const dnsRecords = getDnsInstructions(domain);
            const needsAction = status.vercel !== 'ok' || status.dns !== 'ok';

            return (
              <div key={domain.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Main row */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        status.color === 'green' ? 'bg-green-100' :
                        status.color === 'red' ? 'bg-red-100' :
                        status.color === 'yellow' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <Globe className={`w-4 h-4 ${
                          status.color === 'green' ? 'text-green-600' :
                          status.color === 'red' ? 'text-red-600' :
                          status.color === 'yellow' ? 'text-yellow-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{domain.domain}</h3>
                          {domain.is_primary && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Primary</span>
                          )}
                        </div>
                        {/* 3-layer status badges */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Wifi className="w-3 h-3" />
                            <span>DNS</span>
                          </div>
                          <LayerBadge label={status.dns === 'ok' ? 'Pointing to Vercel' : status.dns === 'unknown' ? 'Not checked' : 'Misconfigured'} status={status.dns} />

                          <div className="flex items-center gap-1 text-xs text-gray-500 ml-1">
                            <Server className="w-3 h-3" />
                            <span>Vercel</span>
                          </div>
                          <LayerBadge
                            label={
                              status.vercel === 'ok' ? 'Registered' :
                              status.vercel === 'redirect' ? `Redirect → ${domain.vercel_redirect_target}` :
                              status.vercel === 'missing' ? 'Pending DNS' : 'Not checked'
                            }
                            status={status.vercel}
                          />

                          <div className="flex items-center gap-1 text-xs text-gray-500 ml-1">
                            <Shield className="w-3 h-3" />
                            <span>SSL</span>
                          </div>
                          <LayerBadge label={status.ssl === 'ok' ? 'Active' : 'Pending'} status={status.ssl} />
                        </div>
                        {domain.vercel_last_checked_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            Last checked: {new Date(domain.vercel_last_checked_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {domain.is_verified && (
                        <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Open site">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => checkStatus(domain)}
                        disabled={isChecking}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Check status"
                      >
                        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                      </button>
                      {needsAction && !domain.is_verified && (
                        <button
                          onClick={() => verifyDomain(domain)}
                          disabled={isChecking}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'Show DNS records'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {!domain.is_primary && (
                        <button
                          onClick={() => deleteDomain(domain)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove domain"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: DNS instructions + redirect warning */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                    {/* Redirect conflict alert */}
                    {domain.vercel_redirect_target && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Redirect Conflict</p>
                          <p className="text-sm text-red-700 mt-0.5">
                            This domain is currently configured as a redirect alias pointing to{' '}
                            <strong>{domain.vercel_redirect_target}</strong> in Vercel.
                            Click "Check Status" to automatically clear the redirect, or remove and re-add the domain.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* DNS records */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Required DNS Records</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Add these records at your DNS provider. Changes can take up to 48 hours to propagate.
                      </p>
                      <div className="space-y-2">
                        {(dnsRecords || [
                          { type: 'CNAME', name: domain.domain, value: 'cname.vercel-dns.com' },
                          { type: 'A', name: domain.domain, value: '76.76.21.21' },
                        ]).map((record, i) => (
                          <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono font-bold rounded">
                                {record.type}
                              </span>
                            </div>
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                              <span className="text-gray-500 font-medium">Name</span>
                              <div className="flex items-center">
                                <code className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded font-mono break-all">{record.name}</code>
                                <CopyButton value={record.name} />
                              </div>
                              <span className="text-gray-500 font-medium">Value</span>
                              <div className="flex items-center">
                                <code className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded font-mono break-all">{record.value}</code>
                                <CopyButton value={record.value} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!domain.is_verified && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => verifyDomain(domain)}
                          disabled={isChecking}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          {isChecking && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                          Check & Verify DNS
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
