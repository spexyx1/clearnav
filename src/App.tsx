import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
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
  const { user, loading, isStaff, isPlatformAdmin, currentTenant } = useAuth();
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

    if (isStaff) {
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
