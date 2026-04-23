import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Button } from './shared/Button';

interface LoginPageProps {
  onBack: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  const { signIn, currentTenant } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantSettings, setTenantSettings] = useState<any>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    loadTenantSettings();
  }, [currentTenant]);

  const loadTenantSettings = async () => {
    if (!currentTenant) return;

    try {
      const { data } = await supabase
        .from('tenant_settings')
        .select('branding, landing_page')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (data) {
        setTenantSettings(data);
      }
    } catch (error) {
      console.error('Error loading tenant settings:', error);
    }
  };

  const companyName = tenantSettings?.branding?.company_name || currentTenant?.name || 'ClearNAV';
  const contactEmail = tenantSettings?.landing_page?.contact_email || 'support@clearnav.cv';

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Single subtle vignette — no stacked gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,116,144,0.10)_0%,_transparent_65%)] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-brand-text-muted hover:text-white transition-colors duration-150 mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" aria-hidden />
          <span className="text-meta font-medium">Back</span>
        </button>

        <div className="bg-brand-surface border border-brand-border rounded-card shadow-card p-8">
          {/* Brand header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 bg-brand-surface-2 border border-brand-border rounded-card flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-brand-accent" aria-hidden />
            </div>
            <h1 className="text-h1 text-white">{companyName}</h1>
            <p className="text-meta text-brand-text-muted mt-1">Sign in to your portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-meta font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted pointer-events-none" aria-hidden />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2.5 bg-brand-surface-2 border border-brand-border rounded-input text-white placeholder-brand-text-muted text-body focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent hover:border-slate-600 transition-colors duration-150 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-meta font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted pointer-events-none" aria-hidden />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2.5 bg-brand-surface-2 border border-brand-border rounded-input text-white placeholder-brand-text-muted text-body focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent hover:border-slate-600 transition-colors duration-150 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="flex items-start gap-2.5 p-3 bg-status-danger-bg border border-status-danger-border rounded-input animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" aria-hidden />
                <p className="text-meta text-status-danger">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-border text-center">
            <p className="text-meta text-brand-text-muted">
              Need help?{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-brand-accent hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-accent rounded"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>

        {/* Security footnote — factual */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-text-muted" aria-hidden />
          <p className="text-caption text-brand-text-muted">256-bit TLS encryption · Secure authentication</p>
        </div>
      </div>
    </div>
  );
}
