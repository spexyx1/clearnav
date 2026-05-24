import React, { useState } from 'react';
import { X, Save, ExternalLink, CheckCircle, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database as DB } from '../../types/database';
import { getTenantUrl } from '../../lib/tenantResolver';
import EmailCompose from '../manager/email/EmailCompose';
import {
  buildTenantWelcomeEmailHtml,
  buildTenantWelcomeEmailText,
  buildTenantWelcomeEmailSubject,
} from '../email/TenantWelcomeEmailTemplate';

type Tenant = DB['public']['Tables']['platform_tenants']['Row'];

interface TenantDetailsModalProps {
  tenant: Tenant & { user_count?: number };
  onClose: () => void;
  onUpdate: () => void;
}

export default function TenantDetailsModal({
  tenant,
  onClose,
  onUpdate,
}: TenantDetailsModalProps) {
  const [formData, setFormData] = useState({
    name: tenant.name,
    status: tenant.status,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeConfig, setComposeConfig] = useState<{
    accounts: { id: string; email_address: string; display_name: string; account_type: string }[];
    selectedAccountId: string;
    initialData: { to: string; subject: string; body: string };
    initialHtml: string;
  } | null>(null);
  const [loadingCompose, setLoadingCompose] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('platform_tenants')
        .update({
          name: formData.name,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      setSuccess('Tenant updated successfully');
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWelcomeEmail = async () => {
    setLoadingCompose(true);
    setError(null);

    try {
      // Fetch the platform info@ email account
      const { data: accountData } = await supabase
        .from('email_accounts')
        .select('id, email_address, display_name, account_type')
        .ilike('email_address', 'info@%clearnav%')
        .maybeSingle();

      // Fetch the tenant owner/admin email via staff_accounts
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select('user_id, role')
        .eq('tenant_id', tenant.id)
        .in('role', ['owner', 'admin'])
        .limit(1);

      let adminEmail = '';
      let adminName = '';

      if (tenantUsers?.[0]?.user_id) {
        const { data: staffData } = await supabase
          .from('staff_accounts')
          .select('email, full_name')
          .eq('auth_user_id', tenantUsers[0].user_id)
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        if (staffData) {
          adminEmail = staffData.email || '';
          adminName = staffData.full_name || adminEmail.split('@')[0] || 'Valued Client';
        }
      }

      const tenantSlug = tenant.slug || '';
      const subject = buildTenantWelcomeEmailSubject(tenant.name);
      const bodyText = buildTenantWelcomeEmailText({ tenantName: tenant.name, adminName, tenantSlug });
      const bodyHtml = buildTenantWelcomeEmailHtml({ tenantName: tenant.name, adminName, tenantSlug });

      const platformAccount = accountData || {
        id: 'platform-info',
        email_address: 'info@clearnav.cv',
        display_name: 'ClearNAV',
        account_type: 'department',
      };

      setComposeConfig({
        accounts: [platformAccount],
        selectedAccountId: platformAccount.id,
        initialData: { to: adminEmail, subject, body: bodyText },
        initialHtml: bodyHtml,
      });

      setComposeOpen(true);
    } catch (err: any) {
      setError('Could not prepare welcome email: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingCompose(false);
    }
  };

  const statusOptions = [
    { value: 'trial', label: 'Trial', color: 'blue' },
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'suspended', label: 'Suspended', color: 'yellow' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' },
  ];

  const tenantUrl = getTenantUrl(tenant.slug);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{tenant.name}</h2>
              <p className="text-slate-600 mt-1">Tenant Details & Management</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <div className="text-sm text-slate-600">Tenant ID</div>
                <div className="font-mono text-sm text-slate-900 mt-1">{tenant.id}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Slug</div>
                <div className="font-medium text-slate-900 mt-1">{tenant.slug}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Database Type</div>
                <div className="font-medium text-slate-900 mt-1 capitalize">{tenant.database_type}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">User Count</div>
                <div className="font-medium text-slate-900 mt-1">{tenant.user_count || 0}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Created</div>
                <div className="font-medium text-slate-900 mt-1">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Last Updated</div>
                <div className="font-medium text-slate-900 mt-1">
                  {new Date(tenant.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tenant Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: option.value as any })}
                    className={`p-3 border-2 rounded-lg transition-all text-left ${
                      formData.status === option.value
                        ? `border-${option.color}-600 bg-${option.color}-50`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-slate-900">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {tenant.trial_ends_at && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-1">Trial Period</div>
                <div className="text-sm text-blue-800">
                  Ends: {new Date(tenant.trial_ends_at).toLocaleDateString()} at{' '}
                  {new Date(tenant.trial_ends_at).toLocaleTimeString()}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tenant URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={tenantUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                />
                <a
                  href={tenantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-slate-600" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-6 border-t border-slate-200">
              {/* Welcome email action */}
              <button
                type="button"
                onClick={handleSendWelcomeEmail}
                disabled={loadingCompose}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Mail className="w-4 h-4" />
                {loadingCompose ? 'Preparing...' : 'Send Welcome Email'}
              </button>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email compose window — rendered outside the modal so it floats freely */}
      {composeOpen && composeConfig && (
        <WelcomeEmailCompose
          config={composeConfig}
          onClose={() => setComposeOpen(false)}
          onSent={() => {
            setComposeOpen(false);
            setSuccess('Welcome email sent successfully');
          }}
        />
      )}
    </>
  );
}

// Thin wrapper that injects the pre-built HTML body into EmailCompose
function WelcomeEmailCompose({
  config,
  onClose,
  onSent,
}: {
  config: {
    accounts: { id: string; email_address: string; display_name: string; account_type: string }[];
    selectedAccountId: string;
    initialData: { to: string; subject: string; body: string };
    initialHtml: string;
  };
  onClose: () => void;
  onSent: () => void;
}) {
  return (
    <EmailCompose
      accounts={config.accounts}
      selectedAccountId={config.selectedAccountId}
      initialData={config.initialData}
      initialHtml={config.initialHtml}
      onClose={onClose}
      onSent={onSent}
    />
  );
}
