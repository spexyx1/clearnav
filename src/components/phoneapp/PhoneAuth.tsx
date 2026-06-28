import { useState } from 'react';
import { Smartphone, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  onAuthenticated: () => void;
}

type Mode = 'signin' | 'signup';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
        <Smartphone className="w-5 h-5 text-white" />
      </div>
      <div className="leading-none">
        <div className="text-sm font-bold text-white tracking-tight">ClearNAV</div>
        <div className="text-xs text-slate-400 font-medium">Business Phone</div>
      </div>
    </div>
  );
}

export default function PhoneAuth({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }
    onAuthenticated();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError(null);

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name.trim() } },
    });

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

    if (signUpData.user) {
      // Upsert profile record
      await supabase.from('phone_app_profiles').upsert({
        user_id: signUpData.user.id,
        display_name: name.trim(),
        email,
      });
    }

    onAuthenticated();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center px-8 py-5 border-b border-slate-800/60">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Hero text */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs font-semibold text-cyan-400 tracking-wider uppercase mb-4">
              Business Phone Numbers
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Get started free'}
            </h1>
            <p className="text-slate-400 text-sm">
              {mode === 'signin'
                ? 'Sign in to manage your business phone numbers.'
                : 'Create an account to get a business phone number in minutes.'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(null); }}
                      required
                      autoFocus
                      placeholder="Jane Smith"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    required
                    autoFocus={mode === 'signin'}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    required
                    placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                    minLength={mode === 'signup' ? 8 : undefined}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 mt-2"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ArrowRight className="w-4 h-4" />
                }
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-800 text-center">
              {mode === 'signin' ? (
                <p className="text-sm text-slate-400">
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Sign up free
                  </button>
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            By continuing you agree to our{' '}
            <a href="https://clearnav.cv/terms" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 underline">Terms</a>
            {' '}and{' '}
            <a href="https://clearnav.cv/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
