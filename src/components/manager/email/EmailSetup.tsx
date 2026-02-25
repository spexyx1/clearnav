import { useState, useEffect } from 'react';
import { Mail, ArrowRight, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface EmailSetupProps {
  onAccountCreated: () => void;
}

export default function EmailSetup({ onAccountCreated }: EmailSetupProps) {
  const { user, tenantId, staffAccount } = useAuth();
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const emailDomain = 'clearnav.cv';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (staffAccount?.full_name) {
      setDisplayName(staffAccount.full_name);
      const suggested = staffAccount.full_name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.+|\.+$/g, '');
      setHandle(suggested);
    }
  }, [staffAccount]);

  const sanitizeHandle = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9._+-]/g, '');
  };

  const checkAvailability = async (emailHandle: string) => {
    if (!emailHandle || !emailDomain) return;
    setChecking(true);
    setIsAvailable(null);

    const fullAddress = `${emailHandle}@${emailDomain}`;
    const { data } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email_address', fullAddress)
      .maybeSingle();

    setIsAvailable(!data);
    setChecking(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (handle.length >= 2) {
        checkAvailability(handle);
      } else {
        setIsAvailable(null);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [handle, emailDomain]);

  const handleCreate = async () => {
    if (!handle || !displayName || !user || !tenantId) return;
    setSaving(true);
    setError(null);

    try {
      const emailAddress = `${handle}@${emailDomain}`;

      const { data: existing } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email_address', emailAddress)
        .maybeSingle();

      if (existing) {
        setError('This email address is already taken. Choose a different handle.');
        setSaving(false);
        return;
      }

      const { data: settings } = await supabase
        .from('tenant_email_settings')
        .select('provider_type')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const { data: newAccount, error: createError } = await supabase
        .from('email_accounts')
        .insert({
          tenant_id: tenantId,
          email_address: emailAddress,
          email_handle: handle,
          display_name: displayName,
          account_type: 'personal',
          storage_quota_bytes: 1073741824,
          storage_used_bytes: 0,
          is_active: true,
          provider_type: settings?.provider_type || 'internal',
        })
        .select()
        .single();

      if (createError) throw createError;

      if (newAccount) {
        await supabase.from('email_account_access').insert({
          account_id: newAccount.id,
          user_id: user.id,
          access_level: 'full',
          granted_by: user.id,
        });
      }

      onAccountCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create email account');
    } finally {
      setSaving(false);
    }
  };

  const fullAddress = handle ? `${handle}@${emailDomain}` : '';

  return (
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
            <Mail className="h-8 w-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Email</h2>
          <p className="text-slate-400">
            Choose your email address under <span className="text-cyan-400 font-mono">@{emailDomain}</span>
          </p>
        </div>

        {step === 'choose' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="flex items-stretch">
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(sanitizeHandle(e.target.value))}
                  placeholder="john.smith"
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 border-r-0 text-white placeholder-slate-500 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono transition-all"
                />
                <span className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-400 rounded-r-lg text-sm flex items-center font-mono">
                  @{emailDomain}
                </span>
              </div>

              {handle.length >= 2 && (
                <div className="mt-2 flex items-center gap-2">
                  {checking ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                      <span className="text-xs text-slate-400">Checking availability...</span>
                    </>
                  ) : isAvailable === true ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs text-emerald-400">{fullAddress} is available</span>
                    </>
                  ) : isAvailable === false ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs text-red-400">Already taken -- try another</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {fullAddress && isAvailable && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                <p className="text-sm text-slate-300">Your email address will be:</p>
                <p className="text-lg font-mono font-semibold text-cyan-400 mt-1">{fullAddress}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={() => setStep('confirm')}
              disabled={!handle || !displayName || !isAvailable || handle.length < 2}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-5">
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-cyan-400" />
              </div>
              <p className="text-slate-300 mb-1">Confirm your new email</p>
              <p className="text-xl font-mono font-bold text-white">{fullAddress}</p>
              <p className="text-sm text-slate-400 mt-2">Display name: {displayName}</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('choose')}
                disabled={saving}
                className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
