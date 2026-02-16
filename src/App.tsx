import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { isPlatformAdminDomain } from './lib/tenantResolver';
import LandingPage from './components/LandingPage';
import ClearNavLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';
import TenantSelector from './components/TenantSelector';

const ClientPortal = lazy(() => import('./components/ClientPortal'));
const ManagerPortal = lazy(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazy(() => import('./components/platform/PlatformAdminPortal'));
const AcceptInvitation = lazy(() => import('./components/AcceptInvitation'));
const ClientSignup = lazy(() => import('./components/ClientSignup'));
const DebugLogin = lazy(() => import('./components/DebugLogin'));
const SalesSheet = lazy(() => import('./components/SalesSheet'));

function AppContent() {
  const { user, loading, roleLoading, isStaff, isTenantAdmin, isPlatformAdmin, currentTenant, allUserRoles, availableTenants } = useAuth();
  const [view, setView] = useState<'landing' | 'login' | 'accept-invite' | 'signup' | 'debug' | 'sales-sheet'>('landing');
  const [showTenantSelector, setShowTenantSelector] = useState(false);

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

  if (loading || roleLoading) {
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
    const params = new URLSearchParams(window.location.search);
    const tenantParam = params.get('tenant');
    const needsTenantSelection = user &&
      !isPlatformAdmin &&
      !tenantParam &&
      !currentTenant &&
      availableTenants.length > 0 &&
      allUserRoles &&
      (allUserRoles.tenantAccesses.length > 0 || allUserRoles.clientTenants.length > 0);

    if (needsTenantSelection || showTenantSelector) {
      return <TenantSelector onClose={() => setShowTenantSelector(false)} />;
    }

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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
