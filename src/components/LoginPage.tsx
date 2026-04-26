import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { readSiteCache } from '../lib/tenantCache';

interface LoginPageProps {
  onBack: () => void;
  /** ID of the public tenant resolved from the hostname (unauthenticated visitor). */
  publicTenantId?: string | null;
}

interface TenantBranding {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  bgAlt: string;
  textColor: string;
  contactEmail: string;
  tagline: string | null;
  isWhiteLabel: boolean;
}

const CLEARNAV_BRANDING: TenantBranding = {
  companyName: 'ClearNAV',
  logoUrl: null,
  primaryColor: '#0A1628',
  accentColor: '#06B6D4',
  bgColor: '#020817',
  bgAlt: '#0f172a',
  textColor: '#ffffff',
  contactEmail: 'support@clearnav.cv',
  tagline: null,
  isWhiteLabel: false,
};

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function isDark(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export default function LoginPage({ onBack, publicTenantId }: LoginPageProps) {
  const { signIn, currentTenant } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState<TenantBranding>(CLEARNAV_BRANDING);
  const [brandingReady, setBrandingReady] = useState(false);

  // Resolve effective tenant ID — prefer authenticated tenant, then public tenant from URL
  const effectiveTenantId = currentTenant?.id ?? publicTenantId ?? null;

  useEffect(() => {
    if (!effectiveTenantId) {
      setBranding(CLEARNAV_BRANDING);
      setBrandingReady(true);
      return;
    }
    loadTenantBranding(effectiveTenantId);
  }, [effectiveTenantId]);

  async function loadTenantBranding(tenantId: string) {
    // Try cache first for instant render
    const cached = readSiteCache(tenantId);
    if (cached?.data) {
      setBranding(buildBranding(cached.data));
      setBrandingReady(true);
    }

    try {
      const [settingsResult, themeResult] = await Promise.all([
        supabase
          .from('tenant_settings')
          .select('branding, landing_page')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        supabase
          .from('site_themes')
          .select('colors, typography, logo_url')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      const b = settingsResult.data?.branding ?? {};
      const lp = settingsResult.data?.landing_page ?? {};
      const colors = (themeResult.data?.colors ?? {}) as Record<string, string>;

      setBranding({
        companyName: b.company_name || currentTenant?.name || 'Investor Portal',
        logoUrl: themeResult.data?.logo_url ?? b.logo_url ?? null,
        primaryColor: colors.primary || '#0A1628',
        accentColor: colors.accent || '#06B6D4',
        bgColor: colors.background || '#ffffff',
        bgAlt: colors.backgroundAlt || '#f5f5f5',
        textColor: colors.text || '#1a1a1a',
        contactEmail: lp.contact_email || b.support_email || 'support@clearnav.cv',
        tagline: b.tagline ?? null,
        isWhiteLabel: b.white_label ?? false,
      });
    } catch {
      // fall through — keep whatever we have
    } finally {
      setBrandingReady(true);
    }
  }

  function buildBranding(siteData: ReturnType<typeof readSiteCache>['data']): TenantBranding {
    if (!siteData) return CLEARNAV_BRANDING;
    const colors = (siteData.theme?.colors ?? {}) as Record<string, string>;
    const b = siteData.branding ?? {};
    return {
      companyName: b.company_name || 'Investor Portal',
      logoUrl: siteData.theme?.logo_url ?? null,
      primaryColor: colors.primary || '#0A1628',
      accentColor: colors.accent || '#06B6D4',
      bgColor: colors.background || '#ffffff',
      bgAlt: colors.backgroundAlt || '#f5f5f5',
      textColor: colors.text || '#1a1a1a',
      contactEmail: 'support@clearnav.cv',
      tagline: b.tagline ?? null,
      isWhiteLabel: false,
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError('Invalid email or password. Please try again.');
    }
  };

  const isTenant = !!effectiveTenantId;
  const darkBg = isTenant ? isDark(branding.primaryColor) : true;
  const textOnBg = darkBg ? '#ffffff' : '#1a1a1a';
  const mutedOnBg = darkBg ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';

  if (!brandingReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: isTenant ? branding.bgColor : '#0A1628' }}
      />
    );
  }

  if (isTenant) {
    return <TenantLogin
      branding={branding}
      darkBg={darkBg}
      textOnBg={textOnBg}
      mutedOnBg={mutedOnBg}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      submitting={submitting}
      error={error}
      onBack={onBack}
      onSubmit={handleSubmit}
    />;
  }

  // ClearNAV default login (platform root or no public tenant)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={onBack}
          className="group flex items-center space-x-2 text-slate-400 hover:text-white transition-all duration-200 mb-8 ml-1"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-10 shadow-2xl shadow-black/20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl mb-5 shadow-xl shadow-blue-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1 className="text-3xl font-light text-white mb-1 tracking-tight">ClearNAV</h1>
            <div className="h-px w-20 mx-auto bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-3" />
            <p className="text-slate-400 text-sm">Sign in to access your portal</p>
          </div>

          <ClearNavForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />

          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
            <p className="text-sm text-slate-400">
              Need help?{' '}
              <a href={`mailto:${branding.contactEmail}`} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                Contact Support
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">All connections encrypted</p>
      </div>
    </div>
  );
}

// ─── Tenant-branded login ──────────────────────────────────────────────────────

interface LoginFormProps {
  branding: TenantBranding;
  darkBg: boolean;
  textOnBg: string;
  mutedOnBg: string;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  submitting: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function TenantLogin({
  branding, darkBg, textOnBg, mutedOnBg,
  email, setEmail, password, setPassword,
  submitting, error, onBack, onSubmit,
}: LoginFormProps) {
  const accentDark = isDark(branding.accentColor);
  const btnTextColor = accentDark ? '#ffffff' : '#1a1a1a';

  const cardBg = darkBg
    ? 'rgba(0,0,0,0.35)'
    : 'rgba(255,255,255,0.85)';
  const cardBorder = darkBg
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(0,0,0,0.08)';
  const inputBg = darkBg
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(0,0,0,0.04)';
  const inputBorder = darkBg
    ? 'rgba(255,255,255,0.15)'
    : 'rgba(0,0,0,0.15)';
  const labelColor = darkBg ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: branding.primaryColor }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(ellipse at 70% 20%, rgba(${hexToRgb(branding.accentColor)}, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(${hexToRgb(branding.accentColor)}, 0.05) 0%, transparent 60%)`,
        }}
      />

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 mb-8 ml-1 transition-all duration-200"
            style={{ color: mutedOnBg }}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Back</span>
          </button>

          <div
            className="rounded-2xl p-10 shadow-2xl backdrop-blur-sm"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
            }}
          >
            {/* Header */}
            <div className="text-center mb-10">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName}
                  className="h-12 w-auto mx-auto mb-5 object-contain"
                />
              ) : (
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5 text-xl font-bold"
                  style={{
                    backgroundColor: branding.accentColor,
                    color: btnTextColor,
                  }}
                >
                  {branding.companyName.charAt(0)}
                </div>
              )}
              <h1
                className="text-2xl font-semibold mb-1"
                style={{ color: textOnBg, fontFamily: 'var(--font-heading, inherit)' }}
              >
                {branding.companyName}
              </h1>
              {branding.tagline && (
                <p className="text-sm mt-1" style={{ color: mutedOnBg }}>
                  {branding.tagline}
                </p>
              )}
              <div
                className="h-px w-16 mx-auto mt-4"
                style={{ backgroundColor: branding.accentColor, opacity: 0.5 }}
              />
              <p className="text-sm mt-3" style={{ color: mutedOnBg }}>
                Sign in to your investor portal
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="t-email"
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: labelColor }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: mutedOnBg }}
                  />
                  <input
                    id="t-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={submitting}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm transition-all duration-150 outline-none focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      border: `1.5px solid ${inputBorder}`,
                      color: textOnBg,
                      caretColor: branding.accentColor,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = branding.accentColor; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = inputBorder; }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="t-password"
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: labelColor }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: mutedOnBg }}
                  />
                  <input
                    id="t-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={submitting}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm transition-all duration-150 outline-none focus:ring-2"
                    style={{
                      backgroundColor: inputBg,
                      border: `1.5px solid ${inputBorder}`,
                      color: textOnBg,
                      caretColor: branding.accentColor,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = branding.accentColor; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = inputBorder; }}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-400/30">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{
                  backgroundColor: branding.accentColor,
                  color: btnTextColor,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div
              className="mt-8 pt-6 text-center"
              style={{ borderTop: `1px solid ${cardBorder}` }}
            >
              <p className="text-sm" style={{ color: mutedOnBg }}>
                Need assistance?{' '}
                <a
                  href={`mailto:${branding.contactEmail}`}
                  className="font-medium transition-colors"
                  style={{ color: branding.accentColor }}
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

          {!branding.isWhiteLabel && (
            <p className="text-center mt-6 text-xs" style={{ color: `${textOnBg}33` }}>
              Powered by ClearNAV
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ClearNAV default form fields ─────────────────────────────────────────────

interface ClearNavFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  submitting: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}

function ClearNavForm({ email, setEmail, password, setPassword, submitting, error, onSubmit }: ClearNavFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-800/60 border-2 border-slate-700/70 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all duration-200 text-sm"
            placeholder="your@email.com"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-800/60 border-2 border-slate-700/70 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all duration-200 text-sm"
            placeholder="Enter your password"
            disabled={submitting}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl font-semibold text-sm hover:from-blue-500 hover:via-cyan-500 hover:to-teal-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing In...
          </span>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}
