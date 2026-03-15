import React, { useState, useEffect } from 'react';
import { Plus, Mail, Phone, MessageSquare, Clock, Save, Play, Pause, Trash2, Copy, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantInfo } from '../../lib/hooks';

interface Campaign {
  id: string;
  campaign_name: string;
  description: string;
  campaign_type: string;
  status: string;
  leads_enrolled: number;
  leads_contacted: number;
  leads_engaged: number;
  leads_converted: number;
  conversion_rate: number;
  created_at: string;
}

interface TouchpointStep {
  id: string;
  type: 'email' | 'call' | 'sms' | 'wait';
  delay_days: number;
  subject?: string;
  content?: string;
  call_script?: string;
}

export default function CampaignBuilder() {
  const { tenantInfo } = useTenantInfo();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState('cold_outreach');
  const [primaryChannel, setPrimaryChannel] = useState('email');
  const [touchpoints, setTouchpoints] = useState<TouchpointStep[]>([
    { id: '1', type: 'email', delay_days: 0, subject: '', content: '' }
  ]);

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchCampaigns();
    }
  }, [tenantInfo?.id]);

  const fetchCampaigns = async () => {
    if (!tenantInfo?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_sales_campaigns')
        .select('*')
        .eq('tenant_id', tenantInfo.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTouchpoint = () => {
    const newId = (parseInt(touchpoints[touchpoints.length - 1]?.id || '0') + 1).toString();
    setTouchpoints([...touchpoints, {
      id: newId,
      type: 'email',
      delay_days: 2,
      subject: '',
      content: ''
    }]);
  };

  const removeTouchpoint = (id: string) => {
    setTouchpoints(touchpoints.filter(t => t.id !== id));
  };

  const updateTouchpoint = (id: string, updates: Partial<TouchpointStep>) => {
    setTouchpoints(touchpoints.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const saveCampaign = async () => {
    if (!tenantInfo?.id || !campaignName) {
      alert('Please fill in campaign name');
      return;
    }

    try {
      const campaignData = {
        tenant_id: tenantInfo.id,
        campaign_name: campaignName,
        description,
        campaign_type: campaignType,
        primary_channel: primaryChannel,
        max_touchpoints: touchpoints.length,
        touchpoint_spacing_days: touchpoints.map(t => t.delay_days),
        status: 'draft',
      };

      if (editingCampaign) {
        const { error } = await supabase
          .from('ai_sales_campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_sales_campaigns')
          .insert(campaignData);

        if (error) throw error;
      }

      alert('Campaign saved successfully');
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    }
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('ai_sales_campaigns')
        .update({ status })
        .eq('id', campaignId);

      if (error) throw error;

      alert(`Campaign ${status === 'active' ? 'activated' : 'paused'}`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign status');
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const { error } = await supabase
        .from('ai_sales_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      alert('Campaign deleted');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const duplicateCampaign = async (campaign: Campaign) => {
    try {
      const { error } = await supabase
        .from('ai_sales_campaigns')
        .insert({
          ...campaign,
          id: undefined,
          campaign_name: `${campaign.campaign_name} (Copy)`,
          status: 'draft',
          leads_enrolled: 0,
          leads_contacted: 0,
          leads_engaged: 0,
          leads_converted: 0,
          conversion_rate: 0,
        });

      if (error) throw error;

      alert('Campaign duplicated');
      fetchCampaigns();
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      alert('Failed to duplicate campaign');
    }
  };

  const editCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setCampaignName(campaign.campaign_name);
    setDescription(campaign.description);
    setCampaignType(campaign.campaign_type);
    setShowBuilder(true);
  };

  const resetForm = () => {
    setCampaignName('');
    setDescription('');
    setCampaignType('cold_outreach');
    setPrimaryChannel('email');
    setTouchpoints([{ id: '1', type: 'email', delay_days: 0, subject: '', content: '' }]);
    setEditingCampaign(null);
    setShowBuilder(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
            </h2>
            <p className="text-slate-600">Design multi-step outreach campaigns</p>
          </div>
          <button
            onClick={resetForm}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Q1 Cold Outreach - Tech Startups"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the campaign objectives and target audience..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Type
                </label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cold_outreach">Cold Outreach</option>
                  <option value="demo_follow_up">Demo Follow-up</option>
                  <option value="trial_nurture">Trial Nurture</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="re_engagement">Re-engagement</option>
                  <option value="renewal">Renewal</option>
                  <option value="upsell">Upsell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Primary Channel
                </label>
                <select
                  value={primaryChannel}
                  onChange={(e) => setPrimaryChannel(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="multi_channel">Multi-Channel</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Campaign Steps</h3>
            <button
              onClick={addTouchpoint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </button>
          </div>

          <div className="space-y-4">
            {touchpoints.map((touchpoint, index) => (
              <div key={touchpoint.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-900">
                      Step {index + 1}
                      {index === 0 ? ' (Immediate)' : ` (Day ${touchpoint.delay_days})`}
                    </span>
                  </div>
                  {touchpoints.length > 1 && (
                    <button
                      onClick={() => removeTouchpoint(touchpoint.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Action Type
                    </label>
                    <select
                      value={touchpoint.type}
                      onChange={(e) => updateTouchpoint(touchpoint.id, { type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="email">Send Email</option>
                      <option value="call">Make Call</option>
                      <option value="sms">Send SMS</option>
                      <option value="wait">Wait Period</option>
                    </select>
                  </div>

                  {index > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Days After Previous Step
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={touchpoint.delay_days}
                        onChange={(e) => updateTouchpoint(touchpoint.id, { delay_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {touchpoint.type === 'email' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={touchpoint.subject || ''}
                        onChange={(e) => updateTouchpoint(touchpoint.id, { subject: e.target.value })}
                        placeholder="Quick question about {{company}}"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Content
                      </label>
                      <textarea
                        value={touchpoint.content || ''}
                        onChange={(e) => updateTouchpoint(touchpoint.id, { content: e.target.value })}
                        rows={4}
                        placeholder="Hi {{first_name}},&#10;&#10;I noticed that {{company}} is..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Use variables: {'{'}first_name{'}'}, {'{'}last_name{'}'}, {'{'}company{'}'}, {'{'}job_title{'}'}
                      </p>
                    </div>
                  </div>
                )}

                {touchpoint.type === 'call' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Call Script
                    </label>
                    <textarea
                      value={touchpoint.call_script || ''}
                      onChange={(e) => updateTouchpoint(touchpoint.id, { call_script: e.target.value })}
                      rows={4}
                      placeholder="Opening: Hi, this is [NAME] calling for {{first_name}}..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {touchpoint.type === 'sms' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SMS Message
                    </label>
                    <textarea
                      value={touchpoint.content || ''}
                      onChange={(e) => updateTouchpoint(touchpoint.id, { content: e.target.value })}
                      rows={3}
                      maxLength={160}
                      placeholder="Hi {{first_name}}, quick question about..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {(touchpoint.content || '').length}/160 characters
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={resetForm}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={saveCampaign}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Save Campaign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-slate-600">Manage your AI outreach campaigns</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{campaign.campaign_name}</h3>
                <p className="text-sm text-slate-600 line-clamp-2">{campaign.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Enrolled</span>
                <span className="font-semibold text-slate-900">{campaign.leads_enrolled}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Contacted</span>
                <span className="font-semibold text-slate-900">{campaign.leads_contacted}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Engaged</span>
                <span className="font-semibold text-slate-900">{campaign.leads_engaged}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Converted</span>
                <span className="font-semibold text-green-600">{campaign.leads_converted}</span>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Conversion Rate:</span>
                  <span className="font-semibold text-slate-900">{campaign.conversion_rate || 0}%</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {campaign.status === 'draft' || campaign.status === 'paused' ? (
                <button
                  onClick={() => updateCampaignStatus(campaign.id, 'active')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <Play className="w-4 h-4" />
                  Activate
                </button>
              ) : (
                <button
                  onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              <button
                onClick={() => editCampaign(campaign)}
                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => duplicateCampaign(campaign)}
                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteCampaign(campaign.id)}
                className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            <p className="mb-4">No campaigns created yet</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Your First Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
}