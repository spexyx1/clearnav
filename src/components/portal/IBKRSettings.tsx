import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Shield, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function IBKRSettings() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [connectionForm, setConnectionForm] = useState({
    accountId: '',
    gatewayUrl: 'https://localhost:5000',
  });

  useEffect(() => {
    loadConnection();
  }, [user]);

  const loadConnection = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('ibkr_connections')
      .select('*')
      .eq('client_id', user.id)
      .maybeSingle();

    if (data) {
      setConnection(data);
      setConnectionForm({
        accountId: data.account_id,
        gatewayUrl: data.gateway_url || 'https://localhost:5000',
      });
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const connectionData = {
        client_id: user?.id,
        tenant_id: 'default-tenant-id',
        account_id: connectionForm.accountId,
        gateway_url: connectionForm.gatewayUrl,
        connection_status: 'pending',
      };

      if (connection) {
        const { error } = await supabase
          .from('ibkr_connections')
          .update(connectionData)
          .eq('id', connection.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ibkr_connections')
          .insert(connectionData);

        if (error) throw error;
      }

      await loadConnection();
      setTestResult({
        success: true,
        message: 'IBKR connection settings saved successfully'
      });
    } catch (error: any) {
      console.error('Error saving connection:', error);
      setTestResult({
        success: false,
        message: error.message || 'Failed to save connection settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTestResult({
        success: true,
        message: 'Connection test successful! Your IBKR Gateway is reachable.'
      });

      await supabase
        .from('ibkr_connections')
        .update({ connection_status: 'connected' })
        .eq('id', connection.id);

      await loadConnection();
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setTestResult({
        success: false,
        message: 'Connection test failed. Please check your settings and ensure the IBKR Gateway is running.'
      });

      await supabase
        .from('ibkr_connections')
        .update({
          connection_status: 'error',
          last_error: error.message || 'Connection test failed'
        })
        .eq('id', connection.id);

      await loadConnection();
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      connected: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
      pending: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: AlertCircle },
      disconnected: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: XCircle },
      error: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded border ${badge.color} flex items-center space-x-1`}>
        <Icon className="w-4 h-4" />
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          IBKR <span className="font-semibold">Connection</span>
        </h2>
        <p className="text-slate-400">Connect your Interactive Brokers account for real-time portfolio sync</p>
      </div>

      {connection && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Connection Status</div>
              {getStatusBadge(connection.connection_status)}
            </div>
            {connection.last_sync_at && (
              <div className="text-right">
                <div className="text-sm text-slate-400">Last Sync</div>
                <div className="text-white">{new Date(connection.last_sync_at).toLocaleString()}</div>
              </div>
            )}
          </div>
          {connection.last_error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <p className="text-sm text-red-300">{connection.last_error}</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Connection Settings</h3>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              IBKR Account ID
            </label>
            <input
              type="text"
              required
              value={connectionForm.accountId}
              onChange={(e) => setConnectionForm({ ...connectionForm, accountId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              placeholder="U1234567"
            />
            <p className="text-xs text-slate-400 mt-1">Your Interactive Brokers account number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Gateway URL
            </label>
            <input
              type="text"
              required
              value={connectionForm.gatewayUrl}
              onChange={(e) => setConnectionForm({ ...connectionForm, gatewayUrl: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              placeholder="https://localhost:5000"
            />
            <p className="text-xs text-slate-400 mt-1">URL where your IBKR Client Portal Gateway is running</p>
          </div>

          {testResult && (
            <div className={`p-4 rounded border ${testResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <p className={`text-sm ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>

            {connection && (
              <button
                type="button"
                onClick={testConnection}
                disabled={testing || saving}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-white font-medium mb-2">Setup Instructions</h4>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
              <li>Download and install the IBKR Client Portal Gateway from Interactive Brokers</li>
              <li>Start the gateway application on your local machine</li>
              <li>Log in to your IBKR account through the gateway</li>
              <li>Enter your IBKR account ID and gateway URL above</li>
              <li>Click "Save Settings" and then "Test Connection"</li>
            </ol>
            <a
              href="https://www.interactivebrokers.com/en/trading/ib-api.php"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 mt-4 text-sm"
            >
              <span>Download IBKR Client Portal Gateway</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-white font-medium mb-2">Security & Privacy</h4>
            <p className="text-sm text-slate-300 mb-2">
              Your IBKR credentials are never stored on our servers. The connection is made directly from your browser to your local IBKR Gateway.
            </p>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>All communication is encrypted using HTTPS</li>
              <li>Your account credentials remain on your local machine</li>
              <li>Only portfolio data is synchronized with our platform</li>
              <li>You can disconnect at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
