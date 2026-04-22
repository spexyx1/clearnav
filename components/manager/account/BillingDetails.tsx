import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  DollarSign,
  Check,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  features: any;
}

interface TenantData {
  id: string;
  name: string;
  subscription_plan_id: string;
  subscription_start_date: string;
  subscription_status: string;
}

interface BillingDetailsData {
  billing_email: string;
  billing_contact_name: string;
  billing_phone: string;
  payment_method_type: string;
  payment_method_last4: string;
  payment_method_brand: string;
  auto_renew: boolean;
}

export default function BillingDetails() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [billingDetails, setBillingDetails] = useState<BillingDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!tenantUser) return;

      const { data: tenantData } = await supabase
        .from('platform_tenants')
        .select('*')
        .eq('id', tenantUser.tenant_id)
        .single();

      if (tenantData) {
        setTenant(tenantData);

        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', tenantData.subscription_plan_id)
          .single();

        setCurrentPlan(planData);
      }

      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      setAvailablePlans(plans || []);

      const { data: billing } = await supabase
        .from('tenant_billing_details')
        .select('*')
        .eq('tenant_id', tenantUser.tenant_id)
        .single();

      setBillingDetails(billing);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanChangeRequest(newPlanId: string) {
    if (!tenant || !currentPlan) return;

    const newPlan = availablePlans.find(p => p.id === newPlanId);
    if (!newPlan) return;

    const changeType = newPlan.price_monthly > currentPlan.price_monthly ? 'upgrade' : 'downgrade';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('subscription_change_requests')
      .insert({
        tenant_id: tenant.id,
        current_plan_id: currentPlan.id,
        requested_plan_id: newPlanId,
        change_type: changeType,
        requested_by: user.id,
      });

    if (!error) {
      alert('Plan change request submitted! Our team will review and process it shortly.');
      setShowPlanModal(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const nextBillingDate = tenant?.subscription_start_date
    ? new Date(new Date(tenant.subscription_start_date).setMonth(new Date(tenant.subscription_start_date).getMonth() + 1)).toLocaleDateString()
    : 'N/A';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-white">{currentPlan?.name || 'N/A'}</span>
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  Change Plan
                </button>
              </div>
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-bold text-cyan-400">
                  ${currentPlan?.price_monthly || 0}
                </span>
                <span className="text-slate-400">/month</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-white capitalize">{tenant?.subscription_status || 'Active'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Next Billing Date</span>
              <span className="text-white">{nextBillingDate}</span>
            </div>

            {currentPlan?.features && (
              <div className="pt-4 border-t border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Plan Features</h3>
                <div className="space-y-2">
                  {Object.entries(currentPlan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2 text-sm">
                      <Check className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Payment Method</h2>
            <button
              onClick={() => setShowBillingModal(true)}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              {billingDetails ? 'Update' : 'Add'}
            </button>
          </div>

          {billingDetails ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium capitalize">
                    {billingDetails.payment_method_brand || billingDetails.payment_method_type} •••• {billingDetails.payment_method_last4}
                  </div>
                  <div className="text-slate-400 text-sm">
                    Primary payment method
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Billing Email</span>
                  <span className="text-white">{billingDetails.billing_email}</span>
                </div>
                {billingDetails.billing_contact_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Contact Name</span>
                    <span className="text-white">{billingDetails.billing_contact_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Auto-Renew</span>
                  <span className="text-white">{billingDetails.auto_renew ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No payment method on file</p>
              <button
                onClick={() => setShowBillingModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          )}
        </div>
      </div>

      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Change Subscription Plan</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-slate-900 rounded-lg p-6 border-2 ${
                      plan.id === currentPlan?.id ? 'border-cyan-500' : 'border-slate-700'
                    }`}
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center space-x-1">
                        <span className="text-3xl font-bold text-cyan-400">${plan.price_monthly}</span>
                        <span className="text-slate-400">/month</span>
                      </div>
                    </div>

                    {plan.features && (
                      <div className="space-y-2 mb-6">
                        {Object.entries(plan.features).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2 text-sm">
                            <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            <span className="text-slate-300">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {plan.id === currentPlan?.id ? (
                      <button
                        disabled
                        className="w-full py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlanChangeRequest(plan.id)}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        {plan.price_monthly > (currentPlan?.price_monthly || 0) ? (
                          <>
                            <ArrowUpCircle className="w-4 h-4" />
                            <span>Upgrade</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle className="w-4 h-4" />
                            <span>Downgrade</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Update Payment Method</h2>
              <button onClick={() => setShowBillingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-cyan-500 bg-opacity-10 border border-cyan-500 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-cyan-300">
                    To update your payment method, please contact our support team. We'll securely process your payment information.
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowBillingModal(false);
                    document.querySelector('[data-tab="support"]')?.dispatchEvent(new Event('click', { bubbles: true }));
                  }}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => setShowBillingModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
