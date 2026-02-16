import React, { useState, useEffect } from 'react';
import {
  Bot, Save, RefreshCw, Phone, Mail, MessageSquare, Settings, Shield,
  Clock, TrendingUp, Zap, AlertTriangle, CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface AgentConfig {
  id: string;
  agent_name: string;
  agent_description: string;
  personality_type: string;
  tone: string;
  formality_level: number;
  enthusiasm_level: number;
  voice_provider: string;
  voice_accent: string;
  voice_pace: string;
  max_conversation_turns: number;
  auto_escalate_after_turns: number;
  enable_small_talk: boolean;
  use_prospect_name: boolean;
  require_approval_for_demos: boolean;
  require_approval_for_trials: boolean;
  require_approval_for_pricing: boolean;
  operating_hours: any;
  voice_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  chat_enabled: boolean;
  total_conversations: number;
  total_conversions: number;
  conversion_rate: number;
}

export default function AIAgentConfig() {
  const { currentTenant: tenant } = useAuth();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personality' | 'voice' | 'behavior' | 'guardrails' | 'channels' | 'performance'>('personality');

  useEffect(() => {
    if (tenant?.id) {
      loadConfig();
    }
  }, [tenant?.id]);

  const loadConfig = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('ai_agent_configs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
      } else {
        const defaultConfig: Partial<AgentConfig> = {
          agent_name: 'Sales Assistant',
          agent_description: 'AI-powered sales development representative',
          personality_type: 'professional',
          tone: 'neutral',
          formality_level: 5,
          enthusiasm_level: 5,
          voice_provider: 'elevenlabs',
          voice_accent: 'american',
          voice_pace: 'medium',
          max_conversation_turns: 15,
          auto_escalate_after_turns: 20,
          enable_small_talk: true,
          use_prospect_name: true,
          require_approval_for_demos: false,
          require_approval_for_trials: false,
          require_approval_for_pricing: false,
          voice_enabled: true,
          email_enabled: true,
          sms_enabled: false,
          chat_enabled: false,
          total_conversations: 0,
          total_conversions: 0,
          conversion_rate: 0
        };

        const { data: newConfig, error: createError } = await supabase
          .from('ai_agent_configs')
          .insert({ ...defaultConfig, tenant_id: tenant.id })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !tenant?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agent_configs')
        .update(config)
        .eq('id', config.id);

      if (error) throw error;

      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading AI agent configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load configuration</p>
      </div>
    );
  }

  const tabs = [
    { id: 'personality', label: 'Personality', icon: Bot },
    { id: 'voice', label: 'Voice', icon: Phone },
    { id: 'behavior', label: 'Behavior', icon: MessageSquare },
    { id: 'guardrails', label: 'Guardrails', icon: Shield },
    { id: 'channels', label: 'Channels', icon: Zap },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI BDR Agent Configuration</h2>
          <p className="text-gray-600 mt-1">
            Customize your AI agent's personality, voice, and behavior
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'personality' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={config.agent_name}
                  onChange={(e) => updateConfig('agent_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Sales Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={config.agent_description}
                  onChange={(e) => updateConfig('agent_description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your AI agent's role and purpose"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personality Type
                  </label>
                  <select
                    value={config.personality_type}
                    onChange={(e) => updateConfig('personality_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="consultative">Consultative</option>
                    <option value="direct">Direct</option>
                    <option value="empathetic">Empathetic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={config.tone}
                    onChange={(e) => updateConfig('tone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="formal">Formal</option>
                    <option value="neutral">Neutral</option>
                    <option value="casual">Casual</option>
                    <option value="warm">Warm</option>
                    <option value="confident">Confident</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formality Level: {config.formality_level}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.formality_level}
                  onChange={(e) => updateConfig('formality_level', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Casual</span>
                  <span>Formal</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enthusiasm Level: {config.enthusiasm_level}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.enthusiasm_level}
                  onChange={(e) => updateConfig('enthusiasm_level', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Reserved</span>
                  <span>Enthusiastic</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Provider
                </label>
                <select
                  value={config.voice_provider}
                  onChange={(e) => updateConfig('voice_provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="bland">Bland AI</option>
                  <option value="vapi">Vapi</option>
                  <option value="google">Google Text-to-Speech</option>
                  <option value="aws">AWS Polly</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accent
                  </label>
                  <select
                    value={config.voice_accent}
                    onChange={(e) => updateConfig('voice_accent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="american">American</option>
                    <option value="british">British</option>
                    <option value="australian">Australian</option>
                    <option value="canadian">Canadian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speaking Pace
                  </label>
                  <select
                    value={config.voice_pace}
                    onChange={(e) => updateConfig('voice_pace', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="slow">Slow</option>
                    <option value="medium">Medium</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Voice Configuration Note</h4>
                    <p className="text-sm text-blue-700">
                      Voice settings require API integration with your chosen provider. Contact support to set up voice capabilities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Conversation Turns
                  </label>
                  <input
                    type="number"
                    value={config.max_conversation_turns}
                    onChange={(e) => updateConfig('max_conversation_turns', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="50"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Maximum back-and-forth exchanges before ending conversation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-escalate After Turns
                  </label>
                  <input
                    type="number"
                    value={config.auto_escalate_after_turns}
                    onChange={(e) => updateConfig('auto_escalate_after_turns', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="100"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Escalate to human after this many turns
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.enable_small_talk}
                    onChange={(e) => updateConfig('enable_small_talk', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Enable Small Talk</span>
                    <p className="text-sm text-gray-600">Allow friendly conversation starters and rapport building</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.use_prospect_name}
                    onChange={(e) => updateConfig('use_prospect_name', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Use Prospect Name</span>
                    <p className="text-sm text-gray-600">Personalize conversations with prospect's name</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'guardrails' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Approval Workflows</h4>
                    <p className="text-sm text-yellow-700">
                      Configure which actions require human approval before the AI can execute them
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={config.require_approval_for_demos}
                    onChange={(e) => updateConfig('require_approval_for_demos', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 block mb-1">Require Approval for Demo Bookings</span>
                    <p className="text-sm text-gray-600">
                      AI must get approval before scheduling demos on team calendars
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={config.require_approval_for_trials}
                    onChange={(e) => updateConfig('require_approval_for_trials', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 block mb-1">Require Approval for Trial Accounts</span>
                    <p className="text-sm text-gray-600">
                      AI must get approval before starting free trials for prospects
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={config.require_approval_for_pricing}
                    onChange={(e) => updateConfig('require_approval_for_pricing', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 block mb-1">Require Approval for Pricing Discussions</span>
                    <p className="text-sm text-gray-600">
                      AI must escalate to human for any pricing-related conversations
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                  <input
                    type="checkbox"
                    checked={config.voice_enabled}
                    onChange={(e) => updateConfig('voice_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Voice Calls</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Handle inbound and outbound phone conversations
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                  <input
                    type="checkbox"
                    checked={config.email_enabled}
                    onChange={(e) => updateConfig('email_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-gray-900">Email</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Send and respond to email communications
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                  <input
                    type="checkbox"
                    checked={config.sms_enabled}
                    onChange={(e) => updateConfig('sms_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-900">SMS</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Text message conversations with prospects
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                  <input
                    type="checkbox"
                    checked={config.chat_enabled}
                    onChange={(e) => updateConfig('chat_enabled', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-gray-900">Live Chat</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Website chat widget conversations
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Total Conversations</span>
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{config.total_conversations}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Conversions</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">{config.total_conversions}</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Conversion Rate</span>
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {config.conversion_rate ? config.conversion_rate.toFixed(1) : '0'}%
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">Detailed Analytics Coming Soon</h3>
                <p className="text-sm text-gray-600">
                  View comprehensive performance metrics, conversation analytics, and ROI tracking
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
