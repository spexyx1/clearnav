import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, AlertCircle, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onBack: () => void;
  onSignup: () => void;
  tenantId?: string | null;
}

export default function LoginPage({ onBack, onSignup, tenantId }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantSettings, setTenantSettings] = useState<any>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (tenantId) loadTenantSettings(tenantId);
  }, [tenantId]);

  const loadTenantSettings = async (id: string) => {
    try {
      const { data } = await supabase
        .from('tenant_settings')
        .select('branding, landing_page')
        .eq('tenant_id', id)
        .maybeSingle();

      if (data) setTenantSettings(data);
    } catch (err) {
      console.error('Error loading tenant settings:', err);
    }
  };

  const companyName = tenantSettings?.branding?.company_name || 'Arkline Trust';
  const contactEmail = tenantSettings?.branding?.contact_email || 'enquiries@arklinetrust.com';
  const primaryColor = '#0A1628';
  const accentColor = '#C9A962';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
      {/* Subtle radial glow */}
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
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="rounded-2xl p-10 shadow-2xl" style={{
          backgroundColor: 'rgba(15, 30, 45, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201, 169, 98, 0.15)',
        }}>
          {/* Logo / Monogram */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 relative" style={{
              backgroundColor: accentColor,
              boxShadow: `0 8px 32px ${accentColor}33`,
            }}>
              <span className="font-serif text-3xl font-bold" style={{ color: primaryColor }}>
                {companyName.charAt(0)}
              </span>
            </div>
            <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
              {companyName}
            </h1>
            <div className="h-px w-20 mx-auto mb-4" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
            <h2 className="text-xl font-semibold text-white mb-1">Investor Portal</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Sign in to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 transition-all duration-200" style={{
                    color: emailFocused ? accentColor : 'rgba(255,255,255,0.3)'
                  }} />
                </div>
                <input
                  id="email"
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
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 transition-all duration-200" style={{
                    color: passwordFocused ? accentColor : 'rgba(255,255,255,0.3)'
                  }} />
                </div>
                <input
                  id="password"
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
                  placeholder="Enter your password"
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
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Create Account section */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm text-center mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
              New to {companyName}?
            </p>
            <button
              onClick={onSignup}
              className="w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'transparent',
                border: `1.5px solid ${accentColor}`,
                color: accentColor,
              }}
            >
              <UserPlus className="w-4 h-4" />
              Create Your Account
            </button>
          </div>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Need assistance?{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="font-medium transition-colors"
                style={{ color: accentColor }}
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#10b981' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              All connections encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
