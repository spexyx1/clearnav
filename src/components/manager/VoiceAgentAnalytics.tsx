import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Phone, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function VoiceAgentAnalytics() {
  const { tenant } = useAuth();
  const [stats, setStats] = useState({
    totalCalls: 0,
    avgDuration: 0,
    successRate: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id) {
      loadAnalytics();
    }
  }, [tenant?.id]);

  async function loadAnalytics() {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('voice_agent_analytics')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) throw error;

      if (data) {
        const totalCalls = data.reduce((sum, d) => sum + d.total_calls, 0);
        const totalDuration = data.reduce((sum, d) => sum + d.total_duration_seconds, 0);
        const totalSuccess = data.reduce((sum, d) => sum + d.successful_outcomes, 0);
        const totalCost = data.reduce((sum, d) => sum + parseFloat(d.total_cost_usd || '0'), 0);

        setStats({
          totalCalls,
          avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
          successRate: totalCalls > 0 ? Math.round((totalSuccess / totalCalls) * 100) : 0,
          totalCost: Math.round(totalCost * 100) / 100,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center space-x-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Agent Analytics</h1>
          <p className="text-gray-600">Last 30 days performance metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCalls}</p>
            </div>
            <Phone className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {Math.floor(stats.avgDuration / 60)}m
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.successRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">${stats.totalCost}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Call Volume Over Time</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Chart visualization would appear here
        </div>
      </div>
    </div>
  );
}
