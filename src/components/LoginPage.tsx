import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { isPlatformAdminDomain } from '../lib/tenantResolver';

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
  const isAdminMode = isPlatformAdminDomain();

  useEffect(() => {
    if (!isAdminMode) {
      loadTenantSettings();
    }
  }, [currentTenant, isAdminMode]);

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

  const companyName = isAdminMode
    ? 'ClearNav'
    : (tenantSettings?.branding?.company_name || currentTenant?.name || 'Grey Alpha');
  const contactEmail = isAdminMode
    ? 'admin@clearnav.com'
    : (tenantSettings?.landing_page?.contact_email || 'support@greyalpha.co');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={onBack}
          className="group flex items-center space-x-2 text-slate-400 hover:text-white transition-all duration-200 mb-8 ml-1"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl shadow-black/20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-cyan-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
              {companyName}
            </h1>
            <h2 className="text-xl font-semibold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-400 text-sm">
              Sign in to access your portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-colors duration-200 ${
                    emailFocused ? 'text-cyan-400' : 'text-slate-500'
                  }`} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-slate-800 transition-all duration-200 focus:shadow-lg focus:shadow-cyan-500/10"
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors duration-200 ${
                    passwordFocused ? 'text-cyan-400' : 'text-slate-500'
                  }`} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-slate-800 transition-all duration-200 focus:shadow-lg focus:shadow-cyan-500/10"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 focus:from-cyan-500 focus:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-cyan-500/25 hover:shadow-2xl hover:shadow-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              Need assistance?{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors underline decoration-cyan-400/30 hover:decoration-cyan-300/50"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          Secure login powered by Supabase
        </p>
      </div>
    </div>
  );
}
