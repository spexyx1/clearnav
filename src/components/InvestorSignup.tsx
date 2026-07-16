import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, User, AlertCircle, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InvestorSignupProps {
  onBack: () => void;
  onLogin: () => void;
  tenantId?: string | null;
}

export default function InvestorSignup({ onBack, onLogin, tenantId }: InvestorSignupProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tenantName, setTenantName] = useState('Arkline Trust');
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const primaryColor = '#0A1628';
  const accentColor = '#C9A962';

  useEffect(() => {
    if (tenantId) loadTenantName(tenantId);
  }, [tenantId]);

  const loadTenantName = async (id: string) => {
    try {
      const { data } = await supabase
        .from('tenant_settings')
        .select('branding')
        .eq('tenant_id', id)
        .maybeSingle();

      if (data?.branding?.company_name) {
        setTenantName(data.branding.company_name);
      }
    } catch (err) {
      console.error('Error loading tenant name:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!tenantId) {
      setError('Unable to determine the associated firm. Please try again from the login page.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account');

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          email,
          role_category: 'client',
          role_detail: null,
          tenant_id: tenantId,
          status: 'active',
          metadata: { full_name: fullName, self_registered: true },
        });

      if (roleError) throw roleError;

      setSuccess(true);
    } catch (err: any) {
      if (err.message?.includes('already') || err.message?.includes('registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.message?.includes('rls') || err.message?.includes('policy')) {
        setError('Unable to complete registration. Please contact us at enquiries@arklinetrust.com.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `radial-gradient(ellipse at 75% 30%, ${accentColor} 0%, transparent 55%)`
        }} />

        <div className="w-full max-w-md relative z-10">
          <div className="rounded-2xl p-10 shadow-2xl text-center" style={{
            backgroundColor: 'rgba(15, 30, 45, 0.85)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${accentColor}26`,
          }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6" style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
            }}>
              <CheckCircle className="w-10 h-10" style={{ color: '#10b981' }} />
            </div>

            <h1 className="text-3xl font-light text-white mb-3">Account Created</h1>
            <div className="h-px w-20 mx-auto mb-4" style={{ backgroundColor: accentColor, opacity: 0.6 }} />

            <p className="text-white/70 mb-8 leading-relaxed">
              Your {tenantName} investor account has been created successfully.
              You can now sign in to access the investor portal.
            </p>

            <button
              onClick={onLogin}
              className="w-full px-6 py-3.5 rounded-xl font-semibold text-base transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              style={{
                backgroundColor: accentColor,
                color: primaryColor,
                boxShadow: `0 4px 24px ${accentColor}40`,
              }}
            >
              Continue to Sign In
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: `radial-gradient(ellipse at 75% 30%, ${accentColor} 0%, transparent 55%)`
      }} />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={onBack}
          className="group flex items-center space-x-2 transition-all duration-200 mb-8 ml-1"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Login</span>
        </button>

        <div className="rounded-2xl p-10 shadow-2xl" style={{
          backgroundColor: 'rgba(15, 30, 45, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201, 169, 98, 0.15)',
        }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6" style={{
              backgroundColor: accentColor,
              boxShadow: `0 8px 32px ${accentColor}33`,
            }}>
              <span className="font-serif text-3xl font-bold" style={{ color: primaryColor }}>
                {tenantName.charAt(0)}
              </span>
            </div>
            <h1 className="text-3xl font-light text-white mb-2 tracking-tight">{tenantName}</h1>
            <div className="h-px w-20 mx-auto mb-4" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
            <h2 className="text-xl font-semibold text-white mb-1">Create Your Account</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Register to access the investor portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 transition-all duration-200" style={{
                    color: nameFocused ? accentColor : 'rgba(255,255,255,0.3)'
                  }} />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `2px solid ${nameFocused ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  }}
                  placeholder="Your full name"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signupEmail" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 transition-all duration-200" style={{
                    color: emailFocused ? accentColor : 'rgba(255,255,255,0.3)'
                  }} />
                </div>
                <input
                  id="signupEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `2px solid ${emailFocused ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  }}
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signupPassword" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 transition-all duration-200" style={{
                    color: passwordFocused ? accentColor : 'rgba(255,255,255,0.3)'
                  }} />
                </div>
                <input
                  id="signupPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `2px solid ${passwordFocused ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  }}
                  placeholder="At least 8 characters"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 transition-all duration-200" style={{
                    color: confirmFocused ? accentColor : 'rgba(255,255,255,0.3)'
                  }} />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: `2px solid ${confirmFocused ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  }}
                  placeholder="Re-enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start space-x-3 p-4 rounded-xl" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl font-semibold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundColor: accentColor,
                color: primaryColor,
                boxShadow: `0 4px 24px ${accentColor}40`,
              }}
            >
              <span className="flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs leading-relaxed text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              By creating an account, you confirm that you are a wholesale investor
              as defined under the Corporations Act 2001 (Cth). Access is restricted
              to qualified investors only.
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Already have an account?{' '}
              <button
                onClick={onLogin}
                className="font-medium transition-colors"
                style={{ color: accentColor }}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
