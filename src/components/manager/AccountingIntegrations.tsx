import React, { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, CheckCircle, XCircle, AlertCircle, Settings,
  Link as LinkIcon, Trash2, Calendar, DollarSign, TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlatformContext } from '../../lib/platformContext';

interface AccountingIntegration {
  id: string;
  platform: string;
  status: string;
  organization_name: string;
  connected_at: string;
  last_sync_at: string;
  last_error: string | null;
  error_count: number;
  sync_transactions: boolean;
  sync_contacts: boolean;
  sync_invoices: boolean;
  auto_sync_enabled: boolean;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  error_message: string | null;
}

export default function AccountingIntegrations() {
  const { tenant } = usePlatformContext();
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const platformDetails = {
    xero: { name: 'Xero', color: 'bg-blue-500', icon: '🔵' },
    quickbooks: { name: 'QuickBooks', color: 'bg-green-500', icon: '🟢' },
    freshbooks: { name: 'FreshBooks', color: 'bg-indigo-500', icon: '🔷' },
    wave: { name: 'Wave', color: 'bg-purple-500', icon: '🟣' },
    sage: { name: 'Sage', color: 'bg-emerald-500', icon: '🟩' }
  };

  useEffect(() => {
    if (tenant?.id) {
      loadIntegrations();
      loadSyncLogs();
    }
  }, [tenant?.id]);

  const loadIntegrations = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('accounting_integrations')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('connected_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncLogs = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('accounting_sync_log')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  const handleManualSync = async (integrationId: string) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      const { error: logError } = await supabase
        .from('accounting_sync_log')
        .insert({
          integration_id: integrationId,
          tenant_id: tenant?.id,
          sync_type: 'manual',
          status: 'started'
        });

      if (logError) throw logError;

      alert(`Manual sync initiated for ${integration.organization_name}. This will run in the background.`);
      loadSyncLogs();
    } catch (error) {
      console.error('Error starting manual sync:', error);
      alert('Failed to start manual sync');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? Historical data will be preserved.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounting_integrations')
        .update({ status: 'disconnected' })
        .eq('id', integrationId);

      if (error) throw error;

      loadIntegrations();
      alert('Integration disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect integration');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'disconnected':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const platformOptions = Object.entries(platformDetails).filter(
    ([key]) => !integrations.some(i => i.platform === key && i.status === 'connected')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounting Integrations</h2>
          <p className="text-gray-600 mt-1">
            Connect and manage your accounting platform integrations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {integrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Accounting Integrations Connected
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your accounting platform to automatically sync transactions, contacts, and invoices
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Connect Your First Platform
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration) => {
            const details = platformDetails[integration.platform as keyof typeof platformDetails];

            return (
              <div key={integration.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${details.color} rounded-lg flex items-center justify-center text-2xl`}>
                      {details.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{details.name}</h3>
                        {getStatusIcon(integration.status)}
                      </div>
                      <p className="text-sm text-gray-600">{integration.organization_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleManualSync(integration.id)}
                      disabled={integration.status !== 'connected'}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Manual Sync"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedIntegration(integration.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Disconnect"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${
                      integration.status === 'connected' ? 'text-green-600' :
                      integration.status === 'error' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {integration.status === 'connected' ? 'Connected' :
                       integration.status === 'error' ? 'Error' : 'Disconnected'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Connected</span>
                    <span className="text-gray-900">{formatDate(integration.connected_at)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Sync</span>
                    <span className="text-gray-900">{formatDate(integration.last_sync_at)}</span>
                  </div>

                  {integration.last_error && (
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">Last Error:</span>
                      <p className="text-red-600 mt-1">{integration.last_error}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Syncing:</div>
                    <div className="flex flex-wrap gap-2">
                      {integration.sync_transactions && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Transactions
                        </span>
                      )}
                      {integration.sync_contacts && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          Contacts
                        </span>
                      )}
                      {integration.sync_invoices && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          Invoices
                        </span>
                      )}
                      {integration.auto_sync_enabled && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Auto-Sync
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {syncLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Sync Activity
          </h3>
          <div className="space-y-3">
            {syncLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  {log.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.sync_type.charAt(0).toUpperCase() + log.sync_type.slice(1)} Sync
                    </p>
                    <p className="text-xs text-gray-600">{formatDate(log.started_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {log.status === 'completed' && (
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">{log.records_processed} records</span>
                      <div className="text-xs text-gray-600">
                        {log.records_created} created, {log.records_updated} updated
                      </div>
                    </div>
                  )}
                  {log.error_message && (
                    <p className="text-sm text-red-600">{log.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Accounting Integration</h3>

            {platformOptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">All supported platforms are already connected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {platformOptions.map(([key, details]) => (
                  <button
                    key={key}
                    onClick={() => {
                      alert(`OAuth flow for ${details.name} will be implemented with actual API keys`);
                      setShowAddModal(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className={`w-12 h-12 ${details.color} rounded-lg flex items-center justify-center text-2xl`}>
                      {details.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-900">{details.name}</h4>
                      <p className="text-sm text-gray-600">Connect your {details.name} account</p>
                    </div>
                    <LinkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
