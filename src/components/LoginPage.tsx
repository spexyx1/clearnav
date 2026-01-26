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
    : (tenantSettings?.branding?.company_name || currentTenant?.name || 'ClearNAV');
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

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-10 shadow-2xl shadow-black/20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl mb-6 shadow-xl shadow-blue-500/30 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-teal-400 rounded-2xl animate-pulse opacity-40"></div>
              <Shield className="w-10 h-10 text-white relative z-10" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-light text-white mb-3 tracking-tight">
              {companyName}
            </h1>
            <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-3"></div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-400 text-sm">
              Sign in to access your portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-white mb-2.5">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-all duration-200 ${
                    emailFocused ? 'text-blue-400' : 'text-slate-500'
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border-2 border-slate-700/70 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20 hover:border-slate-600"
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-white mb-2.5">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-all duration-200 ${
                    passwordFocused ? 'text-blue-400' : 'text-slate-500'
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
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border-2 border-slate-700/70 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20 hover:border-slate-600"
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
              className="w-full relative group px-6 py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:via-cyan-500 hover:to-teal-500 focus:from-blue-500 focus:via-cyan-500 focus:to-teal-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transform hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100"
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
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rounded-xl"></div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-700/50">
            <p className="text-sm text-slate-400 text-center leading-relaxed">
              Need assistance?{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-blue-400 hover:text-cyan-400 font-semibold transition-colors duration-200"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-slate-600 text-xs">
            Secure login powered by Supabase
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-slate-500 text-xs">All connections encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
