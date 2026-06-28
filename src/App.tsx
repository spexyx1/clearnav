import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { LanguageProvider } from './lib/LanguageContext';
import LandingPage from './components/LandingPage';
import ClearNAVLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';
import { PublicWebsite } from './components/public/PublicWebsite';
import { resolveTenantFromDomain } from './lib/tenantResolver';
import { isPlatformRootDomain, isInvoiceAppDomain, isPhoneAppDomain } from './lib/hostUtils';

const InvoiceApp = lazyWithReload(() => import('./components/invoiceapp/InvoiceApp'));
const PhoneApp = lazyWithReload(() => import('./components/phoneapp/PhoneApp'));
import { FullPageLoader } from './components/shared/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useRoute } from './lib/useRoute';
import './i18n/config';

// Wraps lazy() so a stale-deployment chunk 404 triggers a one-time page reload
// rather than surfacing a raw "Failed to fetch dynamically imported module" error.
function lazyWithReload<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch(() => {
      if (!sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
      }
      // Return a no-op component while the reload happens
      return { default: (() => null) as unknown as T };
    })
  );
}

const ClientPortal = lazyWithReload(() => import('./components/ClientPortal'));
const ManagerPortal = lazyWithReload(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazyWithReload(() => import('./components/platform/PlatformAdminPortal'));
const AcceptInvitation = lazyWithReload(() => import('./components/AcceptInvitation'));
const ClientSignup = lazyWithReload(() => import('./components/ClientSignup'));
const DebugLogin = lazyWithReload(() => import('./components/DebugLogin'));
const SalesSheet = lazyWithReload(() => import('./components/SalesSheet'));
const TermsOfService = lazyWithReload(() => import('./components/legal/TermsOfService'));
const PrivacyPolicy = lazyWithReload(() => import('./components/legal/PrivacyPolicy'));
const InvestorPage = lazyWithReload(() => import('./components/InvestorPage'));
const ContactPage = lazyWithReload(() => import('./components/ContactPage'));
const InvestorVault = lazyWithReload(() => import('./components/InvestorVault'));
const InvestorReport = lazyWithReload(() => import('./components/InvestorReport'));
const InvestorApplicationForm = lazyWithReload(() => import('./components/vault/InvestorApplicationForm'));
const InvoicePublicView = lazyWithReload(() => import('./components/manager/invoicing/InvoicePublicView'));

function AppContent() {
  const { user, loading, roleCategory, currentTenant } = useAuth();
  const [route, navigate] = useRoute();
  const [publicTenant, setPublicTenant] = useState<{ id: string; slug: string } | null>(null);
  const [vaultPassphrase, setVaultPassphrase] = useState('');

  // On the platform root (clearnav.cv, vercel previews, localhost without ?tenant),
  // there is never a public tenant — skip the network lookup entirely.
  const isPlatformRoot = isPlatformRootDomain(window.location.hostname);
  const isInvoiceApp = isInvoiceAppDomain(window.location.hostname);
  const isPhoneApp = isPhoneAppDomain(window.location.hostname);
  const [tenantLoading, setTenantLoading] = useState(!isPlatformRoot && !isInvoiceApp && !isPhoneApp);

  useEffect(() => {
    if (loading) return;
    // Platform root never has a tenant — no lookup needed
    if (isPlatformRoot) return;
    if (isInvoiceApp) return;
    if (isPhoneApp) return;

    async function resolveTenant() {
      try {
        setTenantLoading(true);
        const result = await resolveTenantFromDomain(window.location.hostname);
        if (result.tenant) {
          setPublicTenant({ id: result.tenant.id, slug: result.tenant.slug });
        }
      } catch (error) {
        console.error('Error resolving tenant:', error);
      } finally {
        setTenantLoading(false);
      }
    }

    if (!user) {
      if (!isInvoiceApp && !isPhoneApp) resolveTenant();
      else setTenantLoading(false);
    } else {
      setTenantLoading(false);
    }
  }, [user, loading, isPlatformRoot]);

  const Fallback = () => <FullPageLoader />;

  // On the platform root, don't block on auth loading for unauthenticated visitors —
  // ClearNAVLandingPage doesn't need auth and can paint immediately.
  if (loading && !isPlatformRoot && !isInvoiceApp && !isPhoneApp) return <FullPageLoader />;

  // Phone app at phone.clearnav.cv — completely independent component tree
  if (isPhoneApp) {
    return <Suspense fallback={<Fallback />}><PhoneApp /></Suspense>;
  }

  // Invoice app at invoice.clearnav.cv — completely independent component tree
  if (isInvoiceApp) {
    return <Suspense fallback={<Fallback />}><InvoiceApp /></Suspense>;
  }

  if (route === 'debug' && import.meta.env.DEV) {
    return <Suspense fallback={<Fallback />}><DebugLogin /></Suspense>;
  }

  if (route === 'sales-sheet') {
    return <Suspense fallback={<Fallback />}><SalesSheet onBack={() => navigate('/')} /></Suspense>;
  }

  if (route === 'accept-invite') {
    return <Suspense fallback={<Fallback />}><AcceptInvitation /></Suspense>;
  }

  if (route === 'signup') {
    return <Suspense fallback={<Fallback />}><ClientSignup onBack={() => navigate('/')} /></Suspense>;
  }

  if (route === 'terms') {
    return (
      <Suspense fallback={<Fallback />}>
        <TermsOfService tenantId={currentTenant?.id || publicTenant?.id || null} onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (route === 'privacy') {
    return (
      <Suspense fallback={<Fallback />}>
        <PrivacyPolicy tenantId={currentTenant?.id || publicTenant?.id || null} onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (route === 'investors') {
    return (
      <Suspense fallback={<Fallback />}>
        <InvestorPage onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (route === 'contact') {
    return (
      <Suspense fallback={<Fallback />}>
        <ContactPage onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  if (route === 'vault') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <InvestorVault
            onBack={() => navigate('/')}
            onOpenReport={(passphrase) => { setVaultPassphrase(passphrase); navigate('/vault/report'); }}
            onApply={(passphrase) => { setVaultPassphrase(passphrase); navigate('/vault/apply'); }}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (route === 'investor-report') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <InvestorReport onBack={() => navigate('/vault')} passphrase={vaultPassphrase} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (route === 'vault-apply') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <InvestorApplicationForm onBack={() => navigate('/vault')} passphrase={vaultPassphrase} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (route === 'invoice-public') {
    const token = window.location.pathname.replace('/invoice/', '').split('/')[0];
    return (
      <Suspense fallback={<Fallback />}>
        <InvoicePublicView token={token} />
      </Suspense>
    );
  }

  if (user && roleCategory) {
    switch (roleCategory) {
      case 'superadmin':
        return <Suspense fallback={<Fallback />}><PlatformAdminPortal /></Suspense>;
      case 'tenant_admin':
      case 'staff_user':
        return <Suspense fallback={<Fallback />}><ManagerPortal /></Suspense>;
      case 'client':
        return <Suspense fallback={<Fallback />}><ClientPortal /></Suspense>;
      default:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-600 max-w-md">
              <h1 className="text-2xl font-bold mb-4 text-gray-800">Invalid Role</h1>
              <p>Your account does not have a valid role assigned. Please contact support.</p>
            </div>
          </div>
        );
    }
  }

  if (route === 'login') {
    return <LoginPage onBack={() => navigate(publicTenant ? '/' : '/')} />;
  }

  if (tenantLoading) return <FullPageLoader />;

  if (publicTenant) {
    return <PublicWebsite tenantId={publicTenant.id} tenantSlug={publicTenant.slug} />;
  }

  if (!currentTenant) {
    return <ClearNAVLandingPage onLoginClick={() => navigate('/?login=1')} />;
  }

  return <LandingPage onLoginClick={() => navigate('/?login=1')} />;
}

function App() {
  // Localhost dev guard — redirects to default tenant if none is specified
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant');
    const path = window.location.pathname;
    const specialPaths = ['/debug', '/signup', '/terms', '/privacy', '/investors', '/contact', '/vault', '/vault/report', '/vault/apply'];

    if (!specialPaths.includes(path) && !path.startsWith('/invoice/') && !path.startsWith('/phone') && !tenantParam) {      const defaultTenant = import.meta.env.VITE_DEFAULT_DEV_TENANT || 'arkline';
      window.location.replace(
        `${window.location.protocol}//${window.location.host}${path}?tenant=${defaultTenant}`
      );
      return <FullPageLoader />;
    }
  }

  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
