import React, { useState, useEffect } from 'react';
import { Save, Bell, Clock, Mail, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/lib/hooks';

interface ApprovalSettings {
  custom_pricing_timeout_minutes: number;
  custom_pricing_timeout_behavior: string;
  escalation_timeout_minutes: number;
  escalation_timeout_behavior: string;
  email_exception_timeout_minutes: number;
  email_exception_timeout_behavior: string;
  enable_email_deduplication: boolean;
  promotional_cooldown_days: number;
  followup_cooldown_days: number;
  outreach_cooldown_days: number;
  similarity_threshold: string;
  enable_email_notifications: boolean;
  enable_browser_notifications: boolean;
  enable_sound_alerts: boolean;
  notification_email_addresses: string[];
  auto_approve_meetings: boolean;
  auto_approve_trials: boolean;
  auto_approve_standard_sequences: boolean;
}

const timeoutBehaviors = [
  { value: 'hold', label: 'Hold (Wait for approval)' },
  { value: 'auto_approve', label: 'Auto-Approve' },
  { value: 'auto_reject', label: 'Auto-Reject' },
  { value: 'escalate', label: 'Escalate to Manager' },
];

const similarityThresholds = [
  { value: 'strict', label: 'Strict (Exact match only)' },
  { value: 'moderate', label: 'Moderate (Similar content)' },
  { value: 'lenient', label: 'Lenient (Different wording OK)' },
];

export default function ApprovalSettings() {
  const { tenant } = useTenant();
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (!tenant?.id) return;
    loadSettings();
  }, [tenant?.id]);

  const loadSettings = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_agent_approval_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('ai_agent_approval_settings')
          .insert({ tenant_id: tenant.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agent_approval_settings')
        .update({
          ...settings,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenant.id);

      if (error) throw error;
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addNotificationEmail = () => {
    if (!emailInput || !settings) return;

    const emails = emailInput.split(',').map(e => e.trim()).filter(e => e);
    setSettings({
      ...settings,
      notification_email_addresses: [...settings.notification_email_addresses, ...emails],
    });
    setEmailInput('');
  };

  const removeNotificationEmail = (email: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notification_email_addresses: settings.notification_email_addresses.filter(e => e !== email),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Approval Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure how AI agent actions are approved and when they timeout
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Timeout Configuration</h3>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Pricing Discussions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Timeout Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.custom_pricing_timeout_minutes}
                      onChange={(e) => setSettings({ ...settings, custom_pricing_timeout_minutes: parseInt(e.target.value) })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      min="15"
                      max="1440"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Timeout Behavior</label>
                  <select
                    value={settings.custom_pricing_timeout_behavior}
                    onChange={(e) => setSettings({ ...settings, custom_pricing_timeout_behavior: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {timeoutBehaviors.map(tb => (
                      <option key={tb.value} value={tb.value}>{tb.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Support Escalations</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Timeout Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.escalation_timeout_minutes}
                      onChange={(e) => setSettings({ ...settings, escalation_timeout_minutes: parseInt(e.target.value) })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      min="15"
                      max="1440"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Timeout Behavior</label>
                  <select
                    value={settings.escalation_timeout_behavior}
                    onChange={(e) => setSettings({ ...settings, escalation_timeout_behavior: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {timeoutBehaviors.map(tb => (
                      <option key={tb.value} value={tb.value}>{tb.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Email Sequence Exceptions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Timeout Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.email_exception_timeout_minutes}
                      onChange={(e) => setSettings({ ...settings, email_exception_timeout_minutes: parseInt(e.target.value) })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      min="15"
                      max="1440"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Timeout Behavior</label>
                  <select
                    value={settings.email_exception_timeout_behavior}
                    onChange={(e) => setSettings({ ...settings, email_exception_timeout_behavior: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {timeoutBehaviors.map(tb => (
                      <option key={tb.value} value={tb.value}>{tb.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Email Deduplication</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enable_email_deduplication}
                onChange={(e) => setSettings({ ...settings, enable_email_deduplication: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Enable duplicate email detection</span>
            </label>

            {settings.enable_email_deduplication && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Promotional Emails</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.promotional_cooldown_days}
                        onChange={(e) => setSettings({ ...settings, promotional_cooldown_days: parseInt(e.target.value) })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        max="30"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Follow-up Emails</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.followup_cooldown_days}
                        onChange={(e) => setSettings({ ...settings, followup_cooldown_days: parseInt(e.target.value) })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        max="30"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Outreach Emails</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={settings.outreach_cooldown_days}
                        onChange={(e) => setSettings({ ...settings, outreach_cooldown_days: parseInt(e.target.value) })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        min="1"
                        max="30"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Similarity Detection Threshold</label>
                  <select
                    value={settings.similarity_threshold}
                    onChange={(e) => setSettings({ ...settings, similarity_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {similarityThresholds.map(st => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Notification Preferences</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enable_email_notifications}
                onChange={(e) => setSettings({ ...settings, enable_email_notifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Email notifications for pending approvals</span>
            </label>

            {settings.enable_email_notifications && (
              <div>
                <label className="block text-sm text-gray-700 mb-2">Notification Email Addresses</label>
                <div className="space-y-2">
                  {settings.notification_email_addresses.map(email => (
                    <div key={email} className="flex items-center gap-2">
                      <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        {email}
                      </span>
                      <button
                        onClick={() => removeNotificationEmail(email)}
                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={addNotificationEmail}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enable_browser_notifications}
                onChange={(e) => setSettings({ ...settings, enable_browser_notifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Browser notifications</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enable_sound_alerts}
                onChange={(e) => setSettings({ ...settings, enable_sound_alerts: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Sound alerts for urgent approvals</span>
            </label>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">Auto-Approval Settings</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.auto_approve_meetings}
                onChange={(e) => setSettings({ ...settings, auto_approve_meetings: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Auto-approve meeting bookings</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.auto_approve_trials}
                onChange={(e) => setSettings({ ...settings, auto_approve_trials: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Auto-approve trial activations</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.auto_approve_standard_sequences}
                onChange={(e) => setSettings({ ...settings, auto_approve_standard_sequences: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Auto-approve standard email sequences (without red flags)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
