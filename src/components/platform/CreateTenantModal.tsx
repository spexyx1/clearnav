import React, { useState, useEffect } from 'react';
import { X, Building2, Database, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database as DB } from '../../types/database';

type SubscriptionPlan = DB['public']['Tables']['subscription_plans']['Row'];

interface CreateTenantModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTenantModal({ onClose, onSuccess }: CreateTenantModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    database_type: 'managed' as 'managed' | 'byod',
    plan_id: '',
    enable_trial: true,
  });
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (data) {
      setPlans(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, plan_id: data[0].id }));
      }
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const trialEndsAt = formData.enable_trial
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data: tenant, error: tenantError } = await supabase
        .from('platform_tenants')
        .insert({
          name: formData.name,
          slug: formData.slug,
          database_type: formData.database_type,
          status: formData.enable_trial ? 'trial' : 'active',
          trial_ends_at: trialEndsAt,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      const plan = plans.find((p) => p.id === formData.plan_id);
      if (plan) {
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        await supabase.from('tenant_subscriptions').insert({
          tenant_id: tenant.id,
          plan_id: plan.id,
          status: 'active',
          current_period_end: currentPeriodEnd.toISOString(),
        });
      }

      await supabase.from('tenant_settings').insert({
        tenant_id: tenant.id,
        branding: {},
        features: {},
        notifications: {},
        integrations: {},
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlans = plans.filter((plan) => plan.database_type === formData.database_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Create New Tenant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tenant Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Acme Capital"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subdomain Slug
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: generateSlug(e.target.value) })
                }
                placeholder="acme-capital"
                required
                pattern="[a-z0-9-]+"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-slate-600">.yourdomain.com</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Only lowercase letters, numbers, and hyphens
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Database Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, database_type: 'managed' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.database_type === 'managed'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Database className="w-6 h-6 mb-2 mx-auto text-blue-600" />
                <div className="font-medium text-slate-900">Managed</div>
                <div className="text-sm text-slate-600 mt-1">We host the database</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, database_type: 'byod' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.database_type === 'byod'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Database className="w-6 h-6 mb-2 mx-auto text-green-600" />
                <div className="font-medium text-slate-900">BYOD</div>
                <div className="text-sm text-slate-600 mt-1">Client's database</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subscription Plan
            </label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {filteredPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ${plan.price_monthly / 100}/month
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.enable_trial}
                onChange={(e) =>
                  setFormData({ ...formData, enable_trial: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-slate-900">Enable 30-day trial</div>
                <div className="text-sm text-slate-600">
                  Tenant starts in trial status with full access
                </div>
              </div>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
