import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { LanguageProvider } from './lib/LanguageContext';
import LandingPage from './components/LandingPage';
import ClearNAVLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';
import { PublicWebsite } from './components/public/PublicWebsite';
import { resolveTenantFromDomain } from './lib/tenantResolver';
import { isPlatformRootDomain } from './lib/hostUtils';
import { FullPageLoader } from './components/shared/Spinner';
import { useRoute } from './lib/useRoute';
import './i18n/config';

const ClientPortal = lazy(() => import('./components/ClientPortal'));
const ManagerPortal = lazy(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazy(() => import('./components/platform/PlatformAdminPortal'));
const AcceptInvitation = lazy(() => import('./components/AcceptInvitation'));
const ClientSignup = lazy(() => import('./components/ClientSignup'));
const DebugLogin = lazy(() => import('./components/DebugLogin'));
const SalesSheet = lazy(() => import('./components/SalesSheet'));
const TermsOfService = lazy(() => import('./components/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));
const InvestorPage = lazy(() => import('./components/InvestorPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));

function AppContent() {
  const { user, loading, roleCategory, currentTenant } = useAuth();
  const [route, navigate] = useRoute();
  const [publicTenant, setPublicTenant] = useState<{ id: string; slug: string } | null>(null);

  // On the platform root (clearnav.cv, vercel previews, localhost without ?tenant),
  // there is never a public tenant — skip the network lookup entirely.
  const isPlatformRoot = isPlatformRootDomain(window.location.hostname);
  const [tenantLoading, setTenantLoading] = useState(!isPlatformRoot);

  useEffect(() => {
    if (loading) return;
    // Platform root never has a tenant — no lookup needed
    if (isPlatformRoot) return;

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
      resolveTenant();
    } else {
      setTenantLoading(false);
    }
  }, [user, loading, isPlatformRoot]);

  // On the platform root, don't block on auth loading for unauthenticated visitors —
  // ClearNAVLandingPage doesn't need auth and can paint immediately.
  if (loading && !isPlatformRoot) return <FullPageLoader />;

  const Fallback = () => <FullPageLoader />;

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
    const specialPaths = ['/debug', '/signup', '/terms', '/privacy', '/investors', '/contact'];

    if (!specialPaths.includes(path) && !tenantParam) {
      const defaultTenant = import.meta.env.VITE_DEFAULT_DEV_TENANT || 'arkline';
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
