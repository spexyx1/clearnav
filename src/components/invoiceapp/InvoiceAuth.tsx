import { useState } from 'react';
import {
  FileText, Lock, User, Eye, EyeOff,
  AlertCircle, Loader2, ArrowRight, Mail, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  onAuthenticated: () => void;
}

type Mode = 'username' | 'password-required' | 'email-signin' | 'email-signup';

const GUEST_DOMAIN = 'guest.clearnav.cv';
function guestEmail(username: string) {
  return `${username.toLowerCase().trim()}@${GUEST_DOMAIN}`;
}

function validateUsername(u: string): string | null {
  const s = u.trim();
  if (s.length < 2) return 'Username must be at least 2 characters.';
  if (s.length > 30) return 'Username must be 30 characters or fewer.';
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return 'Only letters, numbers, underscores and hyphens allowed.';
  return null;
}

export default function InvoiceAuth({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailExpanded, setEmailExpanded] = useState(false);

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    const validErr = validateUsername(trimmed);
    if (validErr) { setError(validErr); return; }

    setLoading(true);
    setError(null);

    try {
      const { data: lookup, error: lookupErr } = await supabase
        .rpc('invoice_app_username_lookup', { p_username: trimmed });
      if (lookupErr) throw lookupErr;

      const result = lookup as { exists: boolean; is_guest: boolean; has_password: boolean } | null;

      if (!result?.exists) {
        // New username — create pre-confirmed guest user via edge function
        const { data: fnData, error: fnErr } = await supabase.functions.invoke('invoice-app-auth', {
          body: { mode: 'guest_create', username: trimmed },
        });
        if (fnErr) throw new Error(fnErr.message);
        if (fnData?.error) throw new Error(fnData.error);

        // Exchange magic-link token for a real session
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: fnData.token_hash,
          type: 'magiclink',
        });
        if (verifyErr) throw verifyErr;

        const guestToken = localStorage.getItem('invoice_guest_token');
        if (guestToken) {
          await supabase.rpc('claim_guest_invoices', { p_guest_token: guestToken });
          localStorage.removeItem('invoice_guest_token');
        }

        onAuthenticated();
        return;
      }

      if (result.has_password) {
        setMode('password-required');
      } else {
        setError(
          'This username is saved on another device. ' +
          'Open Settings → Secure Account on that device to set a password, ' +
          'then you can sign in from anywhere — or choose a different username.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: guestEmail(username),
      password,
    });
    if (err) {
      setError('Incorrect password. Try again.');
      setLoading(false);
      return;
    }
    onAuthenticated();
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    onAuthenticated();
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) { setError('Please enter your name.'); return; }
    setLoading(true);
    setError(null);

    // Create user via edge function (bypasses email confirmation requirement)
    const { data: fnData, error: fnErr } = await supabase.functions.invoke('invoice-app-auth', {
      body: { mode: 'email_signup', email: emailInput, password, name: nameInput },
    });
    if (fnErr) { setError(fnErr.message); setLoading(false); return; }
    if (fnData?.error) { setError(fnData.error); setLoading(false); return; }

    // Sign in immediately (user is pre-confirmed)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password,
    });
    if (signInErr) { setError(signInErr.message); setLoading(false); return; }

    const guestToken = localStorage.getItem('invoice_guest_token');
    if (guestToken) {
      await supabase.rpc('claim_guest_invoices', { p_guest_token: guestToken });
      localStorage.removeItem('invoice_guest_token');
    }

    onAuthenticated();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center px-8 py-5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">ClearNAV</span>
          <span className="text-gray-400 mx-1">·</span>
          <span className="text-gray-500 text-sm font-medium">Invoicing</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

            {/* Username entry */}
            {mode === 'username' && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Create or retrieve invoices</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    Enter a username to get started — no email required.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleUsernameSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setError(null); }}
                        required
                        autoFocus
                        placeholder="e.g. johndoe or my_business"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">
                      Letters, numbers, underscores and hyphens · 2–30 chars
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !username.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ArrowRight className="w-4 h-4" />}
                    Continue
                  </button>
                </form>

                {/* Secondary email option */}
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <button
                    onClick={() => { setEmailExpanded(v => !v); setError(null); }}
                    className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>Have an email account?</span>
                    {emailExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {emailExpanded && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => { setMode('email-signin'); setError(null); }}
                        className="flex-1 py-2 px-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Sign in
                      </button>
                      <button
                        onClick={() => { setMode('email-signup'); setError(null); }}
                        className="flex-1 py-2 px-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Create account
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Password required for existing username */}
            {mode === 'password-required' && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Welcome back, {username}</h1>
                  <p className="text-gray-500 text-sm mt-1">This username is password-protected.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoFocus
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Sign In
                  </button>
                </form>

                <div className="mt-4 text-sm text-center">
                  <button
                    onClick={() => { setMode('username'); setPassword(''); setError(null); }}
                    className="text-blue-600 hover:underline"
                  >
                    Use a different username
                  </button>
                </div>
              </>
            )}

            {/* Email sign-in */}
            {mode === 'email-signin' && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
                  <p className="text-gray-500 text-sm mt-1">Sign in with your email and password</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Sign In
                  </button>
                </form>

                <div className="mt-4 text-sm text-center">
                  <button onClick={() => { setMode('username'); setError(null); }} className="text-blue-600 hover:underline">
                    Back
                  </button>
                </div>
              </>
            )}

            {/* Email sign-up */}
            {mode === 'email-signup' && (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
                  <p className="text-gray-500 text-sm mt-1">Sign up with email and password</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        required
                        placeholder="Jane Smith"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Min. 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Create Account
                  </button>
                </form>

                <div className="mt-4 text-sm text-center">
                  <button onClick={() => { setMode('username'); setError(null); }} className="text-blue-600 hover:underline">
                    Back
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing you agree to our{' '}
            <a href="https://clearnav.cv/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a>
            {' '}and{' '}
            <a href="https://clearnav.cv/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
