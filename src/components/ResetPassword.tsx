import { useEffect, useState, FormEvent } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase, initialAuthLink } from '../lib/supabase';
import { isClearNavHost, RESET_PATH } from '../lib/authRedirect';

type Mode = 'checking' | 'set-password' | 'confirmed' | 'request' | 'done';

interface Brand {
  name: string;
  accent: string;
  logoUrl: string | null;
}

const DEFAULT_BRAND: Brand = { name: 'ClearNAV', accent: '#0284C7', logoUrl: null };
const RESERVED_SUBDOMAINS = ['www', 'invoice', 'phone'];

function readableTextOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#0f172a' : '#ffffff';
}

async function findVerifiedDomainTenant(host: string): Promise<string | null> {
  const bare = host.replace(/^www\./, '');
  const { data, error } = await supabase
    .from('tenant_domains')
    .select('tenant_id')
    .in('domain', [bare, `www.${bare}`])
    .eq('is_verified', true)
    .limit(1);
  if (error) return null;
  return data?.[0]?.tenant_id ?? null;
}

async function findTenantBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('platform_tenants')
    .select('id')
    .eq('slug', slug)
    .in('status', ['active', 'trial'])
    .maybeSingle();
  return data?.id ?? null;
}

async function resolveReturn(raw: string | null): Promise<{ url: string; tenantId: string | null }> {
  const fallback = { url: `${window.location.origin}/?login=1`, tenantId: null };
  if (!raw) return fallback;

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return fallback;
  }
  if (target.protocol !== 'https:' && target.origin !== window.location.origin) return fallback;

  const host = target.hostname.toLowerCase();
  if (isClearNavHost(host)) {
    const sub = host.endsWith('.clearnav.cv') ? host.slice(0, -'.clearnav.cv'.length) : '';
    const tenantId = sub && !sub.includes('.') && !RESERVED_SUBDOMAINS.includes(sub) ? await findTenantBySlug(sub) : null;
    return { url: target.toString(), tenantId };
  }

  const tenantId = await findVerifiedDomainTenant(host);
  if (tenantId) return { url: target.toString(), tenantId };
  if (target.origin === window.location.origin) return { url: target.toString(), tenantId: null };
  return fallback;
}

async function loadBrand(tenantId: string): Promise<Brand> {
  const [settings, theme] = await Promise.all([
    supabase.from('tenant_settings').select('branding').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('site_themes').select('logo_url').eq('tenant_id', tenantId).eq('is_active', true).maybeSingle(),
  ]);
  const branding = (settings.data?.branding ?? {}) as { company_name?: string; accent_color?: string };
  return {
    name: branding.company_name || 'your fund',
    accent: branding.accent_color || DEFAULT_BRAND.accent,
    logoUrl: (theme.data as { logo_url?: string | null } | null)?.logo_url ?? null,
  };
}

const inputClass =
  'w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 transition-colors';

export default function ResetPassword() {
  const [mode, setMode] = useState<Mode>('checking');
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [returnUrl, setReturnUrl] = useState(`${window.location.origin}/?login=1`);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialAuthLink.error ? 'This link has expired or was already used. Request a new one below.' : null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Reset password';
    let active = true;
    (async () => {
      const resolved = await resolveReturn(new URLSearchParams(window.location.search).get('return'));
      if (!active) return;
      setReturnUrl(resolved.url);
      if (resolved.tenantId) {
        const b = await loadBrand(resolved.tenantId).catch(() => null);
        if (active && b) setBrand(b);
      }
    })();
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session || initialAuthLink.error) return setMode('request');
      const type = initialAuthLink.type;
      setMode(type === 'signup' || type === 'email_change' ? 'confirmed' : 'set-password');
    })();
    return () => { active = false; };
  }, []);

  const goBack = async () => {
    setBusy(true);
    if (new URL(returnUrl).origin !== window.location.origin) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    window.location.assign(returnUrl);
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError('Could not update your password. The link may have expired.');
      else setMode('done');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${RESET_PATH}?return=${encodeURIComponent(returnUrl)}`,
      });
      if (error) setError('Could not send the reset email. Please try again.');
      else setNotice('If that address has an account, a new reset link is on its way.');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const buttonStyle = { backgroundColor: brand.accent, color: readableTextOn(brand.accent) };
  const primaryButton =
    'group w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl transition-all hover:brightness-110 hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed';
  const backLabel = brand === DEFAULT_BRAND ? 'Continue to sign in' : `Continue to ${brand.name}`;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(ellipse at 50% 0%, ${brand.accent} 0%, transparent 60%)` }}
      />
      <div className="relative w-full max-w-sm animate-[fadeIn_0.4s_ease-out]">
        <div className="flex flex-col items-center text-center mb-8">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-14 max-w-[200px] object-contain mb-4" />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-xl font-semibold"
              style={{ ...buttonStyle, boxShadow: `0 8px 32px ${brand.accent}40` }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-sm text-slate-400">{brand.name}</div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {mode === 'checking' && (
            <div className="flex justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {mode === 'set-password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <Header icon={KeyRound} title="Choose a new password" subtitle="Use at least 8 characters." />
              <Field icon={Lock} label="New password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
              <Field icon={Lock} label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              <Messages error={error} notice={notice} />
              <button type="submit" disabled={busy} className={primaryButton} style={buttonStyle}>
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <>Update password <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            </form>
          )}

          {(mode === 'done' || mode === 'confirmed') && (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">
                {mode === 'done' ? 'Password updated' : 'Email confirmed'}
              </h1>
              <p className="text-sm text-slate-400 mb-6">
                {mode === 'done' ? 'You can now sign in with your new password.' : 'Your account is ready. Sign in to continue.'}
              </p>
              <button onClick={goBack} disabled={busy} className={primaryButton} style={buttonStyle}>
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <>{backLabel} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            </div>
          )}

          {mode === 'request' && (
            <form onSubmit={handleRequest} className="space-y-4">
              <Header icon={Mail} title="Reset your password" subtitle="Enter your email and we'll send you a secure link." />
              <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@company.com" />
              <Messages error={error} notice={notice} />
              <button type="submit" disabled={busy} className={primaryButton} style={buttonStyle}>
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <>Send reset link <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
              </button>
              <button type="button" onClick={goBack} className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors pt-1">
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Secured by ClearNAV
        </div>
      </div>
    </div>
  );
}

function Header({ icon: Icon, title, subtitle }: { icon: typeof Mail; title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <Icon className="h-5 w-5 text-slate-400 mb-3" />
      <h1 className="text-xl font-semibold text-white mb-1">{title}</h1>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

interface FieldProps {
  icon: typeof Mail;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}

function Field({ icon: Icon, label, type, value, onChange, autoComplete, placeholder }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type={type}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function Messages({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {error && <div className="px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">{error}</div>}
      {notice && <div className="px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300">{notice}</div>}
    </>
  );
}
