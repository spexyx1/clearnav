import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  stripe_coupon_id: string | null;
  recurring_months: number | null;
  created_at: string;
}

interface PromotionalCampaign {
  id: string;
  name: string;
  description: string;
  campaign_type: string;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  discount_codes: string[];
  performance_metrics: any;
}

export default function DiscountManagement() {
  const [activeView, setActiveView] = useState<'codes' | 'campaigns'>('codes');
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [campaigns, setCampaigns] = useState<PromotionalCampaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    loadDiscountCodes();
    loadCampaigns();
  }, []);

  const loadDiscountCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscountCodes(data || []);
    } catch (error) {
      console.error('Error loading discount codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const toggleCodeActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await loadDiscountCodes();
    } catch (error) {
      console.error('Error toggling code:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredCodes = discountCodes.filter((code) => {
    const matchesSearch =
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === null || code.is_active === filterActive;
    return matchesSearch && matchesFilter;
  });

  const formatDiscount = (code: DiscountCode) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}%`;
    }
    return `$${(code.discount_value / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Discount Management
            </h2>
            <p className="text-slate-600">
              Create and manage discount codes for tenant subscriptions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Discount</span>
          </button>
        </div>

        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveView('codes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'codes'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Discount Codes
          </button>
          <button
            onClick={() => setActiveView('campaigns')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'campaigns'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Campaigns
          </button>
        </div>

        {activeView === 'codes' && (
          <>
            <div className="flex space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search discount codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterActive(null)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterActive === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterActive(true)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterActive === true
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterActive(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filterActive === false
                      ? 'bg-slate-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Valid Until
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <code className="px-2 py-1 bg-slate-100 text-slate-900 rounded font-mono text-sm">
                              {code.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(code.code)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {code.name}
                            </div>
                            {code.description && (
                              <div className="text-sm text-slate-500">
                                {code.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-green-600">
                            {formatDiscount(code)}
                          </span>
                          {code.recurring_months && (
                            <span className="ml-2 text-xs text-slate-500">
                              ({code.recurring_months === 0 ? 'Forever' : `${code.recurring_months} mo`})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">
                              {code.times_used}
                              {code.usage_limit && ` / ${code.usage_limit}`}
                            </div>
                            <div className="text-slate-500">
                              {code.usage_limit
                                ? `${Math.round((code.times_used / code.usage_limit) * 100)}% used`
                                : 'Unlimited'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(code.valid_until)}
                        </td>
                        <td className="px-6 py-4">
                          {code.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                toggleCodeActive(code.id, code.is_active)
                              }
                              className="text-slate-600 hover:text-slate-900"
                              title={
                                code.is_active ? 'Deactivate' : 'Activate'
                              }
                            >
                              {code.is_active ? (
                                <XCircle className="w-5 h-5" />
                              ) : (
                                <CheckCircle className="w-5 h-5" />
                              )}
                            </button>
                            <button className="text-blue-600 hover:text-blue-800">
                              <Edit className="w-5 h-5" />
                            </button>
                            <button className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCodes.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No discount codes found
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeView === 'campaigns' && (
          <div className="grid gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-lg border border-slate-200 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {campaign.name}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {campaign.description}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'draft'
                        ? 'bg-slate-100 text-slate-800'
                        : campaign.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {campaign.status.charAt(0).toUpperCase() +
                      campaign.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center space-x-6 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                      {campaign.end_date
                        ? new Date(campaign.end_date).toLocaleDateString()
                        : 'Ongoing'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Percent className="w-4 h-4" />
                    <span>{campaign.discount_codes.length} codes</span>
                  </div>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
                No promotional campaigns yet
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateDiscountModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadDiscountCodes();
          }}
        />
      )}
    </div>
  );
}

interface CreateDiscountModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateDiscountModal({ onClose, onSuccess }: CreateDiscountModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    valid_until: '',
    usage_limit: '',
    recurring_months: '',
  });
  const [loading, setLoading] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('discount_codes').insert({
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value:
          formData.discount_type === 'percentage'
            ? parseInt(formData.discount_value)
            : parseInt(formData.discount_value) * 100,
        valid_until: formData.valid_until || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        recurring_months: formData.recurring_months
          ? parseInt(formData.recurring_months)
          : null,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      await supabase.from('platform_admin_audit_logs').insert({
        admin_user_id: userData.user?.id,
        action_type: 'create_discount_code',
        resource_type: 'discount_codes',
        details: { code: formData.code, name: formData.name },
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating discount code:', error);
      alert('Failed to create discount code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            Create Discount Code
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Discount Code
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="LAUNCH2024"
                required
              />
              <button
                type="button"
                onClick={generateCode}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Launch Promotion"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description (Internal)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Special discount for launch week..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Discount Type
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount_type: e.target.value as 'percentage' | 'fixed_amount',
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Discount Value
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_value: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formData.discount_type === 'percentage' ? '50' : '10.00'}
                  required
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                  {formData.discount_type === 'percentage' ? '%' : '$'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) =>
                  setFormData({ ...formData, valid_until: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usage Limit (Optional)
              </label>
              <input
                type="number"
                value={formData.usage_limit}
                onChange={(e) =>
                  setFormData({ ...formData, usage_limit: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unlimited"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Recurring Months (Optional)
            </label>
            <input
              type="number"
              value={formData.recurring_months}
              onChange={(e) =>
                setFormData({ ...formData, recurring_months: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="One-time discount"
              min="0"
            />
            <p className="text-sm text-slate-500 mt-1">
              0 = applies forever, blank = one-time only
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
