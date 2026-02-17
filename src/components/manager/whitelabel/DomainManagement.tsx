import React, { useState, useEffect } from 'react';
import { Plus, Globe, CheckCircle, XCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface Domain {
  id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  ssl_enabled: boolean;
  deployment_status: string;
  last_deployed_at: string | null;
  vercel_project_id: string | null;
}

interface VerificationRecord {
  id: string;
  record_type: string;
  record_name: string;
  record_value: string;
  is_verified: boolean;
}

export default function DomainManagement() {
  const { tenantId } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [verificationRecords, setVerificationRecords] = useState<VerificationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadDomains();
    }
  }, [tenantId]);

  const loadDomains = async () => {
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
  };

  const loadVerificationRecords = async (domainId: string) => {
    try {
      const { data, error } = await supabase
        .from('domain_verification_records')
        .select('*')
        .eq('domain_id', domainId);

      if (error) throw error;
      setVerificationRecords(data || []);
    } catch (err: any) {
      console.error('Error loading verification records:', err);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;

    try {
      setError(null);
      const { data, error } = await supabase
        .from('tenant_domains')
        .insert({
          tenant_id: tenantId,
          domain: newDomain.trim().toLowerCase(),
          is_primary: domains.length === 0,
          is_verified: false,
          ssl_enabled: false,
          deployment_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('domain_verification_records').insert([
        {
          domain_id: data.id,
          record_type: 'CNAME',
          record_name: newDomain.trim().toLowerCase(),
          record_value: 'cname.vercel-dns.com',
          is_verified: false,
        },
        {
          domain_id: data.id,
          record_type: 'TXT',
          record_name: `_vercel.${newDomain.trim().toLowerCase()}`,
          record_value: `vc-domain-verify=${data.id}`,
          is_verified: false,
        },
      ]);

      setNewDomain('');
      setShowAddDomain(false);
      loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const verifyDomain = async (domainId: string) => {
    try {
      setError(null);

      const domain = domains.find(d => d.id === domainId);
      if (!domain) return;

      const { error } = await supabase
        .from('tenant_domains')
        .update({
          is_verified: true,
          ssl_enabled: true,
          deployment_status: 'ready',
        })
        .eq('id', domainId);

      if (error) throw error;

      await supabase
        .from('domain_verification_records')
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq('domain_id', domainId);

      loadDomains();
      if (selectedDomain?.id === domainId) {
        loadVerificationRecords(domainId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('tenant_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      loadDomains();
      if (selectedDomain?.id === domainId) {
        setSelectedDomain(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusIcon = (domain: Domain) => {
    if (domain.is_verified && domain.ssl_enabled) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (domain.deployment_status === 'error') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusText = (domain: Domain) => {
    if (domain.is_verified && domain.ssl_enabled) {
      return 'Active';
    }
    if (domain.deployment_status === 'error') {
      return 'Error';
    }
    return 'Pending Verification';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Custom Domains</h2>
          <p className="text-sm text-gray-600 mt-1">
            Connect your own domain to create a fully branded experience
          </p>
        </div>
        <button
          onClick={() => setShowAddDomain(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showAddDomain && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Add New Domain</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addDomain}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddDomain(false);
                setNewDomain('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {domains.map((domain) => (
          <div key={domain.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Globe className="w-6 h-6 text-gray-400 mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{domain.domain}</h3>
                    {domain.is_primary && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(domain)}
                    <span className="text-sm text-gray-600">{getStatusText(domain)}</span>
                  </div>
                  {domain.last_deployed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last deployed: {new Date(domain.last_deployed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!domain.is_verified && (
                  <button
                    onClick={() => {
                      setSelectedDomain(domain);
                      loadVerificationRecords(domain.id);
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    View DNS Records
                  </button>
                )}
                {!domain.is_verified && (
                  <button
                    onClick={() => verifyDomain(domain.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Verify Domain"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {!domain.is_primary && (
                  <button
                    onClick={() => deleteDomain(domain.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Domain"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {domains.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No domains yet</h3>
            <p className="text-gray-600 mb-4">Add your first custom domain to get started</p>
            <button
              onClick={() => setShowAddDomain(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Domain
            </button>
          </div>
        )}
      </div>

      {selectedDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              DNS Configuration for {selectedDomain.domain}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add the following DNS records to your domain provider to verify ownership:
            </p>
            <div className="space-y-3 mb-6">
              {verificationRecords.map((record) => (
                <div key={record.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-900">{record.record_type} Record</span>
                    {record.is_verified && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <code className="ml-2 px-2 py-1 bg-white border border-gray-200 rounded">
                        {record.record_name}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-500">Value:</span>
                      <code className="ml-2 px-2 py-1 bg-white border border-gray-200 rounded break-all">
                        {record.record_value}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedDomain(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={() => {
                  verifyDomain(selectedDomain.id);
                  setSelectedDomain(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Verify Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
