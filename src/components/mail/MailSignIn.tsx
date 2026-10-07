import { useState, FormEvent } from 'react';
import { Landmark, Mail, Lock, ArrowRight, RefreshCw, ArrowLeft, ShieldCheck, Inbox, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type Mode = 'signin' | 'forgot' | 'reset';

interface MailSignInProps {
  recovery?: boolean;
  onPasswordUpdated?: () => void;
  onCancel?: () => void;
}

const inputClass =
  'w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all';

export default function MailSignIn({ recovery, onPasswordUpdated, onCancel }: MailSignInProps) {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>(recovery ? 'reset' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setError(error.message?.includes('Invalid') ? 'Incorrect email or password.' : 'Could not sign in. Please try again.');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/mail`,
        });
        if (error) setError('Could not send the reset email. Please try again.');
        else setNotice('If that address belongs to a staff account, a reset link is on its way.');
      } else {
        if (password.length < 8) {
          setError('Use at least 8 characters.');
          return;
        }
        if (password !== confirm) {
          setError('Passwords do not match.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setError('Could not update your password. The link may have expired.');
        else onPasswordUpdated?.();
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, { title: string; subtitle: string; cta: string }> = {
    signin: { title: 'Sign in to Mail', subtitle: 'Use your Arkline Trust staff login.', cta: 'Sign in' },
    forgot: { title: 'Reset your password', subtitle: 'We will email you a secure reset link.', cta: 'Send reset link' },
    reset: { title: 'Choose a new password', subtitle: 'Set a new password for your staff account.', cta: 'Update password' },
  };
  const copy = titles[mode];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 border-r border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.18),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(20,184,166,0.12),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-white font-semibold tracking-tight">Arkline Trust</div>
              <div className="text-xs text-slate-400">Staff Mail</div>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold text-white leading-tight tracking-tight mb-4">
              Every conversation,<br />one secure place.
            </h1>
            <p className="text-slate-400 leading-relaxed mb-10">
              Read, write and manage your @arklinetrust.com mail alongside the team's shared inboxes.
            </p>
            <div className="space-y-4">
              {[
                { icon: Inbox, text: 'Personal and shared mailboxes in one view' },
                { icon: Users, text: 'Access managed by your administrator' },
                { icon: ShieldCheck, text: 'Only staff can see the mailboxes they are assigned' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-cyan-400" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">Authorized Arkline Trust personnel only.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-[fadeIn_0.4s_ease-out]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-white font-semibold">Arkline Trust</div>
              <div className="text-xs text-slate-400">Staff Mail</div>
            </div>
          </div>

          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('signin')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          )}

          <h2 className="text-2xl font-semibold text-white mb-1">{copy.title}</h2>
          <p className="text-sm text-slate-400 mb-8">{copy.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@arklinetrust.com"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-400">
                    {mode === 'reset' ? 'New password' : 'Password'}
                  </label>
                  {mode === 'signin' && (
                    <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoComplete={mode === 'reset' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">{error}</div>
            )}
            {notice && (
              <div className="px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300">{notice}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/30"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : (
                <>
                  {copy.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {mode === 'reset' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel and return to mail
            </button>
          )}

          <p className="mt-8 text-xs text-slate-500 leading-relaxed">
            Don't have a login? Ask your Arkline Trust administrator to invite you from the staff area.
          </p>
        </div>
      </div>
    </div>
  );
}
