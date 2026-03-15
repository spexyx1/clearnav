import React, { useState, useEffect } from 'react';
import { Mail, Check, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface TenantEmailStatus {
  email: string | null;
  verified: boolean;
  claimedAt: string | null;
  lastUsedAt: string | null;
  sentCount: number;
}

export function TenantEmailClaiming() {
  const { currentTenant: tenant } = useAuth();
  const [emailStatus, setEmailStatus] = useState<TenantEmailStatus | null>(null);
  const [proposedEmail, setProposedEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmailStatus();
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant && !proposedEmail && !emailStatus?.email) {
      const slug = tenant.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setProposedEmail(`${slug}@clearnav.cv`);
    }
  }, [tenant, emailStatus]);

  const loadEmailStatus = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_tenants')
        .select('tenant_email_address, email_verified, email_claimed_at, email_last_used_at, email_sent_count')
        .eq('id', tenant.id)
        .single();

      if (error) throw error;

      setEmailStatus({
        email: data.tenant_email_address,
        verified: data.email_verified,
        claimedAt: data.email_claimed_at,
        lastUsedAt: data.email_last_used_at,
        sentCount: data.email_sent_count || 0
      });
    } catch (err) {
      console.error('Error loading email status:', err);
      setError('Failed to load email status');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (email: string) => {
    if (!email.includes('@clearnav.cv')) {
      setIsAvailable(false);
      return;
    }

    const localPart = email.split('@')[0];
    if (!localPart || localPart.length < 2) {
      setIsAvailable(false);
      return;
    }

    if (!/^[a-z0-9-_]+$/.test(localPart)) {
      setIsAvailable(false);
      return;
    }

    try {
      setIsChecking(true);
      const { data, error } = await supabase
        .rpc('check_email_availability', { email_address: email });

      if (error) throw error;
      setIsAvailable(data);
    } catch (err) {
      console.error('Error checking availability:', err);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (proposedEmail && !emailStatus?.email) {
      const timeoutId = setTimeout(() => {
        checkAvailability(proposedEmail);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [proposedEmail, emailStatus]);

  const handleClaimEmail = async () => {
    if (!tenant || !proposedEmail || !isAvailable) return;

    try {
      setIsClaiming(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('platform_tenants')
        .update({
          tenant_email_address: proposedEmail,
          email_claimed_at: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      setSuccess('Email address claimed successfully!');
      await loadEmailStatus();
    } catch (err: any) {
      console.error('Error claiming email:', err);
      setError(err.message || 'Failed to claim email address');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!tenant || !emailStatus?.email) return;

    try {
      setIsVerifying(true);
      setError('');
      setSuccess('');

      const { data, error: functionError } = await supabase.functions.invoke('verify-tenant-email', {
        body: { tenantId: tenant.id }
      });

      if (functionError) throw functionError;

      if (data.verified) {
        setSuccess('Email address verified successfully!');
        await loadEmailStatus();
      } else {
        setError(data.error || 'Failed to verify email address');
      }
    } catch (err: any) {
      console.error('Error verifying email:', err);
      setError(err.message || 'Failed to verify email address');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLocalPartChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setProposedEmail(`${sanitized}@clearnav.cv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Address</h2>
        <p className="text-gray-600">
          Configure your branded email address for sending invitations and communications.
        </p>
      </div>

      {emailStatus?.email ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Mail className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">{emailStatus.email}</h3>
                  {emailStatus.verified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending Verification
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {emailStatus.claimedAt && `Claimed on ${new Date(emailStatus.claimedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Emails Sent</p>
              <p className="text-2xl font-bold text-gray-900">{emailStatus.sentCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Used</p>
              <p className="text-lg font-semibold text-gray-900">
                {emailStatus.lastUsedAt
                  ? new Date(emailStatus.lastUsedAt).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {!emailStatus.verified && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleVerifyEmail}
                disabled={isVerifying}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verify Email Address
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Claim Your Email Address</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose your email address on the clearnav.cv domain. This will be used as the sender address for all invitations and communications.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={proposedEmail.split('@')[0]}
                onChange={(e) => handleLocalPartChange(e.target.value)}
                placeholder="your-company"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-600">@clearnav.cv</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {proposedEmail && (
            <div className="flex items-center space-x-2">
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-600">Checking availability...</span>
                </>
              ) : isAvailable === true ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Available</span>
                </>
              ) : isAvailable === false ? (
                <>
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Not available or invalid</span>
                </>
              ) : null}
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleClaimEmail}
              disabled={!isAvailable || isClaiming}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Claim Email Address
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-900">Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-green-900">Success</h4>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How it works</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Claim your unique email address on clearnav.cv domain</li>
          <li>Verify ownership through Resend integration</li>
          <li>Use your branded email for all client invitations and communications</li>
          <li>Track email usage and performance in this dashboard</li>
        </ul>
      </div>
    </div>
  );
}
