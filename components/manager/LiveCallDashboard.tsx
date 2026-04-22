import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Clock, TrendingUp, Users, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';

interface CallSession {
  id: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  caller_name: string | null;
  status: string;
  initiated_at: string;
  answered_at: string | null;
  duration_seconds: number | null;
  sentiment_current: string | null;
  intent_detected: string | null;
  agent_config_id: string;
}

export default function LiveCallDashboard() {
  const { currentTenant } = useAuth();
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
  const [stats, setStats] = useState({
    totalActiveCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    avgDuration: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id) {
      loadActiveCalls();
      const interval = setInterval(loadActiveCalls, 5000);
      return () => clearInterval(interval);
    }
  }, [currentTenant?.id]);

  async function loadActiveCalls() {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('voice_call_sessions')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .in('status', ['ringing', 'answered', 'in_progress'])
        .order('initiated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setActiveCalls(data);
        updateStats(data);
      }
    } catch (error) {
      console.error('Error loading active calls:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateStats(calls: CallSession[]) {
    const inbound = calls.filter(c => c.direction === 'inbound').length;
    const outbound = calls.filter(c => c.direction === 'outbound').length;

    const durations = calls
      .filter(c => c.duration_seconds)
      .map(c => c.duration_seconds!);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    setStats({
      totalActiveCalls: calls.length,
      inboundCalls: inbound,
      outboundCalls: outbound,
      avgDuration,
    });
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getSentimentColor(sentiment: string | null): string {
    switch (sentiment) {
      case 'positive':
      case 'satisfied':
        return 'text-green-600 bg-green-50';
      case 'negative':
      case 'frustrated':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Phone className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Call Dashboard</h1>
            <p className="text-gray-600">Monitor active voice agent calls in real-time</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalActiveCalls}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inbound</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.inboundCalls}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <PhoneIncoming className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outbound</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.outboundCalls}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <PhoneOutgoing className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatDuration(stats.avgDuration)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Calls</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sentiment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Intent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <PhoneOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No active calls</p>
                  </td>
                </tr>
              ) : (
                activeCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {call.direction === 'inbound' ? (
                          <PhoneIncoming className="h-4 w-4 text-green-600 mr-2" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4 text-orange-600 mr-2" />
                        )}
                        <span className="text-sm text-gray-900 capitalize">
                          {call.direction}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {call.direction === 'inbound' ? call.from_number : call.to_number}
                      </div>
                      {call.caller_name && (
                        <div className="text-xs text-gray-500">{call.caller_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          call.status === 'in_progress'
                            ? 'bg-green-100 text-green-800'
                            : call.status === 'ringing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {call.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {call.sentiment_current ? (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(
                            call.sentiment_current
                          )}`}
                        >
                          {call.sentiment_current}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.intent_detected || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
