import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Lock, Users, Activity, Eye, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface SecurityMetrics {
  activeAlerts: number;
  resolvedToday: number;
  failedLogins24h: number;
  activeSessions: number;
  mfaEnabled: number;
  auditEvents24h: number;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_id?: string;
}

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ip_address: string;
  is_suspicious: boolean;
  risk_score: number;
  attempted_at: string;
}

export default function SecurityDashboard() {
  const { currentTenant } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    activeAlerts: 0,
    resolvedToday: 0,
    failedLogins24h: 0,
    activeSessions: 0,
    mfaEnabled: 0,
    auditEvents24h: 0,
  });
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'logins' | 'sessions'>('overview');

  useEffect(() => {
    if (currentTenant) {
      loadSecurityData();
    }
  }, [currentTenant]);

  const loadSecurityData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get active security alerts
      const { data: activeAlertsData } = await supabase
        .from('security_alerts')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'open');

      // Get resolved alerts today
      const { data: resolvedTodayData } = await supabase
        .from('security_alerts')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'resolved')
        .gte('resolved_at', today.toISOString());

      // Get failed login attempts in last 24h
      const { data: failedLoginsData } = await supabase
        .from('login_attempts')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('success', false)
        .gte('attempted_at', twentyFourHoursAgo);

      // Get active sessions count
      const { data: activeSessionsData } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true);

      // Get MFA enabled users count
      const { data: mfaEnabledData } = await supabase
        .from('mfa_settings')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('mfa_enabled', true);

      // Get audit events in last 24h
      const { data: auditEventsData } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .gte('timestamp', twentyFourHoursAgo);

      // Get recent security alerts
      const { data: alertsData } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent login attempts
      const { data: attemptsData } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('attempted_at', { ascending: false })
        .limit(20);

      setMetrics({
        activeAlerts: activeAlertsData?.length || 0,
        resolvedToday: resolvedTodayData?.length || 0,
        failedLogins24h: failedLoginsData?.length || 0,
        activeSessions: activeSessionsData?.length || 0,
        mfaEnabled: mfaEnabledData?.length || 0,
        auditEvents24h: auditEventsData?.length || 0,
      });

      setAlerts(alertsData || []);
      setRecentAttempts(attemptsData || []);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    }
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('security_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (!error) {
      loadSecurityData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-cyan-500"></div>
          <p className="text-slate-400 mt-4">Loading security data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-white">Security Dashboard</h1>
          <p className="text-slate-400 mt-1">Monitor security events, alerts, and system health</p>
        </div>
        <button
          onClick={loadSecurityData}
          className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors flex items-center space-x-2"
        >
          <Activity className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security Score Banner */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Security Health Score</h3>
            <p className="text-slate-300">
              {metrics.activeAlerts === 0 ? 'All systems operational' : `${metrics.activeAlerts} active alert${metrics.activeAlerts !== 1 ? 's' : ''} requiring attention`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-cyan-400">
              {Math.max(0, 100 - metrics.activeAlerts * 10)}
            </div>
            <div className="text-slate-400 text-sm mt-1">Health Score</div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.activeAlerts}</div>
          <div className="text-slate-400 text-sm">Active Security Alerts</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <Clock className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.resolvedToday}</div>
          <div className="text-slate-400 text-sm">Resolved Today</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-orange-500" />
            </div>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.failedLogins24h}</div>
          <div className="text-slate-400 text-sm">Failed Logins (24h)</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-500" />
            </div>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.activeSessions}</div>
          <div className="text-slate-400 text-sm">Active Sessions</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-500" />
            </div>
            <Shield className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.mfaEnabled}</div>
          <div className="text-slate-400 text-sm">MFA Enabled Users</div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-500" />
            </div>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.auditEvents24h}</div>
          <div className="text-slate-400 text-sm">Audit Events (24h)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex space-x-8">
          {['overview', 'alerts', 'logins', 'sessions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`pb-4 text-sm font-medium transition-colors ${
                selectedTab === tab
                  ? 'text-cyan-500 border-b-2 border-cyan-500'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'alerts' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Recent Security Alerts</h3>
          </div>
          <div className="divide-y divide-slate-700">
            {alerts.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No security alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-slate-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-white font-medium mb-1">{alert.title}</h4>
                      <p className="text-slate-400 text-sm">{alert.description}</p>
                    </div>
                    {alert.status === 'open' && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-4 px-4 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedTab === 'logins' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Recent Login Attempts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-750">
                <tr>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Email</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">IP Address</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Risk Score</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-750 transition-colors">
                    <td className="p-4 text-white">{attempt.email}</td>
                    <td className="p-4">
                      {attempt.success ? (
                        <span className="flex items-center text-green-400">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center text-red-400">
                          <XCircle className="w-4 h-4 mr-2" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-300">{attempt.ip_address}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        attempt.risk_score > 70 ? 'bg-red-500/20 text-red-400' :
                        attempt.risk_score > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {attempt.risk_score}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(attempt.attempted_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
