import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { isPlatformAdminDomain } from './lib/tenantResolver';
import LandingPage from './components/LandingPage';
import ClearNavLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';
import ClientPortal from './components/ClientPortal';
import AcceptInvitation from './components/AcceptInvitation';
import ClientSignup from './components/ClientSignup';

const ManagerPortal = lazy(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazy(() => import('./components/platform/PlatformAdminPortal'));

function AppContent() {
  const { user, loading, isStaff, isPlatformAdmin, currentTenant } = useAuth();
  const [view, setView] = useState<'landing' | 'login' | 'accept-invite' | 'signup'>('landing');

  useEffect(() => {
    const checkRoute = () => {
      const params = new URLSearchParams(window.location.search);
      console.log('[App] Checking route:', {
        hasToken: !!params.get('token'),
        pathname: window.location.pathname,
        modeParam: params.get('mode'),
        currentView: view
      });

      if (params.get('token')) {
        console.log('[App] Setting view to accept-invite');
        setView('accept-invite');
      } else if (window.location.pathname === '/signup') {
        console.log('[App] Setting view to signup');
        setView('signup');
      } else if (params.get('mode') === 'admin') {
        console.log('[App] Setting view to login (admin mode)');
        setView('login');
      }
    };

    checkRoute();

    const handleUrlChange = () => {
      checkRoute();
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  console.log('[App] Render state:', {
    loading,
    view,
    hasUser: !!user,
    isPlatformAdmin,
    isStaff,
    hasTenant: !!currentTenant,
    isPlatformAdminDomain: isPlatformAdminDomain()
  });

  if (loading) {
    console.log('[App] Rendering: Loading spinner');
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (view === 'accept-invite') {
    console.log('[App] Rendering: AcceptInvitation');
    return <AcceptInvitation />;
  }

  if (view === 'signup') {
    console.log('[App] Rendering: ClientSignup');
    return <ClientSignup />;
  }

  if (user) {
    if (isPlatformAdmin && isPlatformAdminDomain()) {
      console.log('[App] Rendering: PlatformAdminPortal');
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

    if (isStaff) {
      console.log('[App] Rendering: ManagerPortal');
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
    console.log('[App] Rendering: ClientPortal');
    return <ClientPortal />;
  }

  if (view === 'login') {
    console.log('[App] Rendering: LoginPage');
    return <LoginPage onBack={() => setView('landing')} />;
  }

  if (!currentTenant) {
    console.log('[App] Rendering: ClearNavLandingPage (no tenant)');
    return <ClearNavLandingPage />;
  }

  console.log('[App] Rendering: LandingPage (has tenant)');
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
