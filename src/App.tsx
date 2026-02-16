import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { PlatformProvider } from './lib/platformContext';
import { isPlatformAdminDomain } from './lib/tenantResolver';
import LandingPage from './components/LandingPage';
import ClearNavLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';

const ClientPortal = lazy(() => import('./components/ClientPortal'));
const ManagerPortal = lazy(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazy(() => import('./components/platform/PlatformAdminPortal'));
const AcceptInvitation = lazy(() => import('./components/AcceptInvitation'));
const ClientSignup = lazy(() => import('./components/ClientSignup'));
const DebugLogin = lazy(() => import('./components/DebugLogin'));
const SalesSheet = lazy(() => import('./components/SalesSheet'));

function AppContent() {
  const { user, loading, isStaff, isTenantAdmin, isPlatformAdmin, currentTenant } = useAuth();
  const [view, setView] = useState<'landing' | 'login' | 'accept-invite' | 'signup' | 'debug' | 'sales-sheet'>('landing');

  useEffect(() => {
    const checkRoute = () => {
      const params = new URLSearchParams(window.location.search);

      if (params.get('token')) {
        setView('accept-invite');
      } else if (window.location.pathname === '/signup') {
        setView('signup');
      } else if (window.location.pathname === '/debug') {
        setView('debug');
      } else if (window.location.pathname === '/sales-sheet') {
        setView('sales-sheet');
      }
    };

    checkRoute();

    const handleUrlChange = () => {
      checkRoute();
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const LoadingSpinner = () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
    </div>
  );

  if (view === 'debug') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <DebugLogin />
      </Suspense>
    );
  }

  if (view === 'sales-sheet') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SalesSheet onBack={() => setView('landing')} />
      </Suspense>
    );
  }

  if (view === 'accept-invite') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AcceptInvitation />
      </Suspense>
    );
  }

  if (view === 'signup') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ClientSignup onBack={() => setView('landing')} />
      </Suspense>
    );
  }

  if (user) {
    if (isPlatformAdmin && isPlatformAdminDomain()) {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <PlatformAdminPortal />
        </Suspense>
      );
    }

    if (isStaff || isTenantAdmin) {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <ManagerPortal />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ClientPortal />
      </Suspense>
    );
  }

  if (view === 'login') {
    return <LoginPage onBack={() => setView('landing')} />;
  }

  if (!currentTenant) {
    return <ClearNavLandingPage onLoginClick={() => setView('login')} />;
  }

  return <LandingPage onLoginClick={() => setView('login')} />;
}

function App() {
  // On localhost, ensure tenant parameter is present before anything loads
  // This must run synchronously to prevent AuthProvider from loading with null tenant
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant');
    const isDebug = window.location.pathname === '/debug';
    const isSignup = window.location.pathname === '/signup';

    // If not in special modes and no tenant param, redirect immediately
    if (!isDebug && !isSignup && !tenantParam) {
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?tenant=greyalpha`;
      window.location.replace(newUrl);
      // Return loading state while redirecting
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading tenant...</p>
          </div>
        </div>
      );
    }
  }

  return (
    <AuthProvider>
      <PlatformProvider>
        <AppContent />
      </PlatformProvider>
    </AuthProvider>
  );
}

export default App;
