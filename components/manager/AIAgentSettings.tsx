import React, { useState, useEffect } from 'react';
import { Settings, Mail, Clock, User, Zap, TrendingUp, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTenantInfo } from '@/lib/hooks';
import EmailTemplateManager from './EmailTemplateManager';

type SettingsTab = 'general' | 'templates' | 'cadence' | 'sender' | 'personalization' | 'optimization';

export default function AIAgentSettings() {
  const { tenantInfo } = useTenantInfo();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [globalSettings, setGlobalSettings] = useState({
    ai_model: 'gpt-4',
    ai_temperature: 0.7,
    ai_creativity_level: 'balanced',
    communication_tone: 'professional',
    writing_style: 'concise',
    personalization_level: 'medium',
    use_company_research: true,
    use_social_signals: true,
    require_approval_for_first_email: true,
    require_approval_for_cold_outreach: false,
    max_follow_ups_without_response: 5,
    global_daily_limit: 500,
    auto_optimize_send_times: true,
    auto_pause_low_performers: true,
    auto_escalate_hot_leads: true,
    auto_enrich_leads: true,
    notify_on_reply: true,
    notify_on_meeting_booked: true,
    notify_on_hot_lead: true,
  });

  const [cadenceSettings, setCadenceSettings] = useState({
    cadence_name: 'Default Outreach',
    cadence_type: 'moderate',
    business_hours_only: true,
    send_timezone: 'recipient',
    daily_send_limit: 50,
    hourly_send_limit: 10,
    pause_on_reply: true,
    pause_on_meeting_booked: true,
    auto_exit_on_no_engagement_days: 30,
    enable_email: true,
    enable_calls: false,
    enable_sms: false,
    max_call_attempts: 3,
    days_between_calls: 3,
  });

  const [senderProfile, setSenderProfile] = useState({
    profile_name: 'Default Sender',
    sender_name: '',
    sender_email: '',
    sender_title: '',
    sender_company: '',
    email_signature_html: '',
    linkedin_url: '',
    calendar_link: '',
    daily_send_limit: 100,
    send_from_hours: 9,
    send_to_hours: 17,
    is_warming: false,
    warming_daily_increment: 5,
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchSettings();
    }
  }, [tenantInfo?.id]);

  const fetchSettings = async () => {
    if (!tenantInfo?.id) return;

    setLoading(true);
    try {
      const { data: settings, error } = await supabase
        .from('ai_agent_global_settings')
        .select('*')
        .eq('tenant_id', tenantInfo.id)
        .maybeSingle();

      if (settings) {
        setGlobalSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!tenantInfo?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agent_global_settings')
        .upsert({
          tenant_id: tenantInfo.id,
          ...globalSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveCadenceSettings = async () => {
    if (!tenantInfo?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_cadence_configurations')
        .upsert({
          tenant_id: tenantInfo.id,
          ...cadenceSettings,
          total_steps: 5,
          steps: [],
          is_active: true,
          is_default: true,
        });

      if (error) throw error;

      alert('Cadence settings saved successfully');
    } catch (error) {
      console.error('Error saving cadence settings:', error);
      alert('Failed to save cadence settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSenderProfile = async () => {
    if (!tenantInfo?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_sender_profiles')
        .upsert({
          tenant_id: tenantInfo.id,
          ...senderProfile,
          is_active: true,
          is_default: true,
        });

      if (error) throw error;

      alert('Sender profile saved successfully');
    } catch (error) {
      console.error('Error saving sender profile:', error);
      alert('Failed to save sender profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General AI Settings', icon: Settings },
    { id: 'templates' as SettingsTab, label: 'Email Templates', icon: Mail },
    { id: 'cadence' as SettingsTab, label: 'Cadence & Timing', icon: Clock },
    { id: 'sender' as SettingsTab, label: 'Sender Profile', icon: User },
    { id: 'personalization' as SettingsTab, label: 'Personalization', icon: Zap },
    { id: 'optimization' as SettingsTab, label: 'Optimization', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">AI Agent Configuration</h2>
        <p className="text-slate-600">Customize AI behavior, email design, and outreach settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">AI Behavior</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    AI Model
                  </label>
                  <select
                    value={globalSettings.ai_model}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, ai_model: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="gpt-4">GPT-4 (Recommended)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Creativity Level: {globalSettings.ai_creativity_level}
                  </label>
                  <select
                    value={globalSettings.ai_creativity_level}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, ai_creativity_level: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="conservative">Conservative (Stick to proven patterns)</option>
                    <option value="balanced">Balanced (Mix of proven and creative)</option>
                    <option value="creative">Creative (More experimental approaches)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Communication Tone
                  </label>
                  <select
                    value={globalSettings.communication_tone}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, communication_tone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="formal">Formal</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Writing Style
                  </label>
                  <select
                    value={globalSettings.writing_style}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, writing_style: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="brief">Brief (2-3 sentences)</option>
                    <option value="concise">Concise (1 short paragraph)</option>
                    <option value="detailed">Detailed (2-3 paragraphs)</option>
                    <option value="storytelling">Storytelling (Narrative approach)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Safety & Compliance</h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.require_approval_for_first_email}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, require_approval_for_first_email: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Require approval for first email to each lead</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.require_approval_for_cold_outreach}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, require_approval_for_cold_outreach: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Require approval for all cold outreach</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Follow-ups Without Response
                  </label>
                  <input
                    type="number"
                    value={globalSettings.max_follow_ups_without_response}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, max_follow_ups_without_response: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Global Daily Send Limit
                  </label>
                  <input
                    type="number"
                    value={globalSettings.global_daily_limit}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, global_daily_limit: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && <EmailTemplateManager />}

          {activeTab === 'cadence' && (
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Outreach Cadence</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cadence Type
                  </label>
                  <select
                    value={cadenceSettings.cadence_type}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, cadence_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="aggressive">Aggressive (More frequent touchpoints)</option>
                    <option value="moderate">Moderate (Balanced approach)</option>
                    <option value="gentle">Gentle (Spaced out touchpoints)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cadenceSettings.business_hours_only}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, business_hours_only: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Send only during business hours</span>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Daily Send Limit
                    </label>
                    <input
                      type="number"
                      value={cadenceSettings.daily_send_limit}
                      onChange={(e) => setCadenceSettings({ ...cadenceSettings, daily_send_limit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hourly Send Limit
                    </label>
                    <input
                      type="number"
                      value={cadenceSettings.hourly_send_limit}
                      onChange={(e) => setCadenceSettings({ ...cadenceSettings, hourly_send_limit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Auto-exit After Days Without Engagement
                  </label>
                  <input
                    type="number"
                    value={cadenceSettings.auto_exit_on_no_engagement_days}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, auto_exit_on_no_engagement_days: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Pause Conditions</h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cadenceSettings.pause_on_reply}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, pause_on_reply: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Pause sequence when lead replies</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cadenceSettings.pause_on_meeting_booked}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, pause_on_meeting_booked: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Pause sequence when meeting is booked</span>
                </label>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Multi-Channel Settings</h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cadenceSettings.enable_email}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, enable_email: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Enable Email Outreach</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cadenceSettings.enable_calls}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, enable_calls: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Enable Phone Calls</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cadenceSettings.enable_sms}
                    onChange={(e) => setCadenceSettings({ ...cadenceSettings, enable_sms: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Enable SMS</span>
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={saveCadenceSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Cadence Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sender' && (
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Sender Identity</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sender Name *
                    </label>
                    <input
                      type="text"
                      value={senderProfile.sender_name}
                      onChange={(e) => setSenderProfile({ ...senderProfile, sender_name: e.target.value })}
                      placeholder="John Smith"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sender Email *
                    </label>
                    <input
                      type="email"
                      value={senderProfile.sender_email}
                      onChange={(e) => setSenderProfile({ ...senderProfile, sender_email: e.target.value })}
                      placeholder="john@company.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={senderProfile.sender_title}
                      onChange={(e) => setSenderProfile({ ...senderProfile, sender_title: e.target.value })}
                      placeholder="Sales Development Rep"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={senderProfile.sender_company}
                      onChange={(e) => setSenderProfile({ ...senderProfile, sender_company: e.target.value })}
                      placeholder="Acme Corp"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Signature
                  </label>
                  <textarea
                    value={senderProfile.email_signature_html}
                    onChange={(e) => setSenderProfile({ ...senderProfile, email_signature_html: e.target.value })}
                    rows={4}
                    placeholder="Best regards,&#10;John Smith&#10;Sales Development Rep"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={senderProfile.linkedin_url}
                      onChange={(e) => setSenderProfile({ ...senderProfile, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Calendar Link
                    </label>
                    <input
                      type="url"
                      value={senderProfile.calendar_link}
                      onChange={(e) => setSenderProfile({ ...senderProfile, calendar_link: e.target.value })}
                      placeholder="https://calendly.com/..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Sending Schedule</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Daily Limit
                    </label>
                    <input
                      type="number"
                      value={senderProfile.daily_send_limit}
                      onChange={(e) => setSenderProfile({ ...senderProfile, daily_send_limit: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Send From (Hour)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={senderProfile.send_from_hours}
                      onChange={(e) => setSenderProfile({ ...senderProfile, send_from_hours: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Send To (Hour)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={senderProfile.send_to_hours}
                      onChange={(e) => setSenderProfile({ ...senderProfile, send_to_hours: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={senderProfile.is_warming}
                    onChange={(e) => setSenderProfile({ ...senderProfile, is_warming: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Enable email warming (gradually increase volume)</span>
                </label>

                {senderProfile.is_warming && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Daily Increment During Warming
                    </label>
                    <input
                      type="number"
                      value={senderProfile.warming_daily_increment}
                      onChange={(e) => setSenderProfile({ ...senderProfile, warming_daily_increment: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Start at 10 emails/day and increase by this amount daily
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={saveSenderProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Sender Profile'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'personalization' && (
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Personalization Settings</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Personalization Level
                  </label>
                  <select
                    value={globalSettings.personalization_level}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, personalization_level: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="minimal">Minimal (Name and company only)</option>
                    <option value="medium">Medium (Include role and industry insights)</option>
                    <option value="high">High (Deep research and customization)</option>
                    <option value="maximum">Maximum (Ultra-personalized, one-of-a-kind)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.use_company_research}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, use_company_research: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Use company research for personalization</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.use_social_signals}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, use_social_signals: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Use social media signals (LinkedIn, Twitter)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.auto_enrich_leads}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, auto_enrich_leads: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Automatically enrich lead data before outreach</span>
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'optimization' && (
            <div className="space-y-6 max-w-3xl">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">AI Optimization</h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.auto_optimize_send_times}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, auto_optimize_send_times: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Auto-optimize send times based on engagement data</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.auto_pause_low_performers}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, auto_pause_low_performers: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Automatically pause low-performing campaigns</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.auto_escalate_hot_leads}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, auto_escalate_hot_leads: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Auto-escalate hot leads to human reps</span>
                </label>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.notify_on_reply}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, notify_on_reply: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Notify me when a lead replies</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.notify_on_meeting_booked}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, notify_on_meeting_booked: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Notify me when a meeting is booked</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.notify_on_hot_lead}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, notify_on_hot_lead: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Notify me when a hot lead is identified</span>
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}