import React, { useState, useEffect } from 'react';
import { Rocket, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface Deployment {
  id: string;
  deployment_id: string;
  deployment_url: string | null;
  status: 'pending' | 'building' | 'ready' | 'error' | 'canceled';
  build_logs: any[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  domain_id: string | null;
}

interface Domain {
  id: string;
  domain: string;
  is_verified: boolean;
  is_primary: boolean;
}

export default function DeploymentManager() {
  const { tenantId } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadDeployments();
      loadDomains();
    } else {
      setLoading(false);
    }
  }, [tenantId]);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vercel_deployments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDeployments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_domains')
        .select('id, domain, is_verified, is_primary')
        .eq('tenant_id', tenantId)
        .eq('is_verified', true);

      if (error) throw error;
      setDomains(data || []);
      // Pre-select primary domain
      const primary = data?.find((d) => d.is_primary) || data?.[0];
      if (primary) setSelectedDomain(primary.id);
    } catch (err: any) {
      console.error('Error loading domains:', err);
    }
  };

  const getPrimaryDomain = () => domains.find((d) => d.is_primary) || domains[0] || null;

  const triggerDeployment = async () => {
    if (!selectedDomain) {
      setError('Please select a domain');
      return;
    }

    try {
      setDeploying(true);
      setError(null);
      setSuccess(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/vercel-domain-manager?action=deploy`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ domain_id: selectedDomain, tenant_id: tenantId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      await loadDeployments();
      setSuccess('Deployment triggered successfully! Your site will be live shortly.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'building':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'canceled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-700';
      case 'building':
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'error': return 'bg-red-100 text-red-700';
      case 'canceled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return 'In progress…';
    const duration = Math.round((new Date(completed).getTime() - new Date(started).getTime()) / 1000);
    return `${duration}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-12 text-center max-w-md mx-auto">
        <div>
          <Rocket className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">No Tenant Context</h3>
          <p className="text-slate-300">A tenant context is required to manage deployments.</p>
        </div>
      </div>
    );
  }

  const primaryDomain = getPrimaryDomain();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Deployment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Publish your website so visitors can access it on your custom domain
          </p>
        </div>
        {primaryDomain && (
          <a
            href={`https://${primaryDomain.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <ExternalLink size={15} />
            View Live Site
          </a>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish Website</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Domain</label>
            {domains.length > 0 ? (
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              >
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain}{domain.is_primary ? ' (primary)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                No verified domains available. Please add and verify a custom domain in the{' '}
                <strong>Custom Domains</strong> tab first.
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 text-sm">What happens when you publish?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Your latest site design and content are saved</li>
              <li>2. The platform serves your site on your verified custom domain</li>
              <li>3. Visitors to your domain will see the updated site immediately</li>
            </ul>
          </div>

          <button
            onClick={triggerDeployment}
            disabled={deploying || domains.length === 0}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <Rocket className="w-5 h-5" />
            {deploying ? 'Publishing…' : 'Publish Now'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Deployment History</h3>
          <button
            onClick={loadDeployments}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {deployments.map((deployment) => (
            <div key={deployment.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getStatusIcon(deployment.status)}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        Deployment {deployment.deployment_id.split('_').pop()}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(deployment.status)}`}>
                        {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>Started: {new Date(deployment.started_at).toLocaleString()}</div>
                      {deployment.completed_at && (
                        <div>Duration: {formatDuration(deployment.started_at, deployment.completed_at)}</div>
                      )}
                      {deployment.deployment_url && (
                        <a
                          href={deployment.deployment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={11} />
                          {deployment.deployment_url}
                        </a>
                      )}
                      {deployment.error_message && (
                        <div className="text-red-600">{deployment.error_message}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {deployment.deployment_url && (
                    <a
                      href={deployment.deployment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                      title="View Site"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setShowLogs(showLogs === deployment.id ? null : deployment.id)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {showLogs === deployment.id ? 'Hide' : 'Show'} Logs
                  </button>
                </div>
              </div>

              {showLogs === deployment.id && deployment.build_logs && (
                <div className="mt-4 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs">
                  {deployment.build_logs.map((log: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {deployments.length === 0 && (
            <div className="text-center py-12">
              <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-700 mb-1">No deployments yet</h3>
              <p className="text-sm text-gray-500">Click "Publish Now" to deploy your website</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
