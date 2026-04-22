import React, { useState, useEffect } from 'react';
import { Phone, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';

interface VoiceConfig {
  id?: string;
  agent_name: string;
  agent_type: 'sales_outbound' | 'sales_inbound' | 'support_inbound' | 'general';
  telnyx_api_key_encrypted: string;
  voice_gender: 'male' | 'female' | 'neutral';
  voice_speed: number;
  greeting_message: string;
  max_concurrent_calls: number;
  is_active: boolean;
}

export default function VoiceAgentSetup() {
  const { user, currentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configs, setConfigs] = useState<VoiceConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<VoiceConfig>({
    agent_name: 'AI Assistant',
    agent_type: 'sales_inbound',
    telnyx_api_key_encrypted: '',
    voice_gender: 'female',
    voice_speed: 1.0,
    greeting_message: 'Hello! How can I help you today?',
    max_concurrent_calls: 5,
    is_active: true,
  });

  useEffect(() => {
    loadConfigurations();
  }, [currentTenant?.id]);

  async function loadConfigurations() {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('voice_agent_configurations')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setConfigs(data);
        setSelectedConfig(data[0]);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
      setMessage({ type: 'error', text: 'Failed to load voice agent configurations' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!currentTenant?.id) return;

    setSaving(true);
    setMessage(null);

    try {
      const configData = {
        tenant_id: currentTenant.id,
        agent_name: selectedConfig.agent_name,
        agent_type: selectedConfig.agent_type,
        telnyx_api_key_encrypted: selectedConfig.telnyx_api_key_encrypted,
        voice_gender: selectedConfig.voice_gender,
        voice_speed: selectedConfig.voice_speed,
        greeting_message: selectedConfig.greeting_message,
        max_concurrent_calls: selectedConfig.max_concurrent_calls,
        is_active: selectedConfig.is_active,
      };

      if (selectedConfig.id) {
        const { error } = await supabase
          .from('voice_agent_configurations')
          .update(configData)
          .eq('id', selectedConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('voice_agent_configurations')
          .insert(configData);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Voice agent configuration saved successfully!' });
      await loadConfigurations();
    } catch (error: unknown) {
      console.error('Error saving configuration:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save configuration'
      });
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-bold text-gray-900">Voice Agent Configuration</h1>
            <p className="text-gray-600">Configure AI-powered voice agents for calls</p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center space-x-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Agent Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={selectedConfig.agent_name}
                onChange={(e) =>
                  setSelectedConfig({ ...selectedConfig, agent_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="AI Assistant"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Type
              </label>
              <select
                value={selectedConfig.agent_type}
                onChange={(e) =>
                  setSelectedConfig({
                    ...selectedConfig,
                    agent_type: e.target.value as VoiceConfig['agent_type'],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sales_inbound">Sales Inbound</option>
                <option value="sales_outbound">Sales Outbound</option>
                <option value="support_inbound">Support Inbound</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Gender
              </label>
              <select
                value={selectedConfig.voice_gender}
                onChange={(e) =>
                  setSelectedConfig({
                    ...selectedConfig,
                    voice_gender: e.target.value as VoiceConfig['voice_gender'],
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Speed: {selectedConfig.voice_speed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={selectedConfig.voice_speed}
                onChange={(e) =>
                  setSelectedConfig({
                    ...selectedConfig,
                    voice_speed: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Concurrent Calls
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={selectedConfig.max_concurrent_calls}
                onChange={(e) =>
                  setSelectedConfig({
                    ...selectedConfig,
                    max_concurrent_calls: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={selectedConfig.is_active}
                onChange={(e) =>
                  setSelectedConfig({ ...selectedConfig, is_active: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Agent Active
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telnyx API Key
              </label>
              <input
                type="password"
                value={selectedConfig.telnyx_api_key_encrypted}
                onChange={(e) =>
                  setSelectedConfig({
                    ...selectedConfig,
                    telnyx_api_key_encrypted: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Telnyx API key"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your API key is encrypted and stored securely
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Greeting Message
              </label>
              <textarea
                value={selectedConfig.greeting_message}
                onChange={(e) =>
                  setSelectedConfig({
                    ...selectedConfig,
                    greeting_message: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hello! How can I help you today?"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Getting Started with Telnyx</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Sign up for a Telnyx account at telnyx.com</li>
          <li>Generate an API key from your Telnyx dashboard</li>
          <li>Purchase a phone number for your voice agent</li>
          <li>Configure the phone number in the Phone Numbers section</li>
          <li>Test your voice agent with a test call</li>
        </ol>
      </div>
    </div>
  );
}
