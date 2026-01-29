import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { PlatformProvider } from './lib/platformContext';
import { isPlatformAdminDomain } from './lib/tenantResolver';
import LandingPage from './components/LandingPage';
import ClearNavLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';
import ClientPortal from './components/ClientPortal';
import AcceptInvitation from './components/AcceptInvitation';
import ClientSignup from './components/ClientSignup';
import DebugLogin from './components/DebugLogin';

const ManagerPortal = lazy(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazy(() => import('./components/platform/PlatformAdminPortal'));

function AppContent() {
  const { user, loading, isStaff, isTenantAdmin, isPlatformAdmin, currentTenant } = useAuth();
  const [view, setView] = useState<'landing' | 'login' | 'accept-invite' | 'signup' | 'debug'>('landing');

  useEffect(() => {
    const checkRoute = () => {
      const params = new URLSearchParams(window.location.search);

      if (params.get('token')) {
        setView('accept-invite');
      } else if (window.location.pathname === '/signup') {
        setView('signup');
      } else if (window.location.pathname === '/debug') {
        setView('debug');
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

  if (view === 'debug') {
    return <DebugLogin />;
  }

  if (view === 'accept-invite') {
    return <AcceptInvitation />;
  }

  if (view === 'signup') {
    return <ClientSignup onBack={() => setView('landing')} />;
  }

  if (user) {
    if (isPlatformAdmin && isPlatformAdminDomain()) {
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
          </div>
        }>
          <PlatformAdminPortal />
        </Suspense>
      );
    }

    if (isStaff || isTenantAdmin) {
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
          </div>
        }>
          <ManagerPortal />
        </Suspense>
      );
    }
    return <ClientPortal />;
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
