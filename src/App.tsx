import { useState, lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { PlatformProvider, usePlatform } from './lib/platformContext';
import { isPlatformAdminDomain } from './lib/tenantResolver';
import LandingPage from './components/LandingPage';
import ClearNavLandingPage from './components/ClearNavLandingPage';
import LoginPage from './components/LoginPage';
import ClientPortal from './components/ClientPortal';
import AcceptInvitation from './components/AcceptInvitation';

const ManagerPortal = lazy(() => import('./components/ManagerPortal'));
const PlatformAdminPortal = lazy(() => import('./components/platform/PlatformAdminPortal'));

function isRootDomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts.length <= 2 || (parts.length === 3 && parts[0] === 'www');
}

function AppContent() {
  const { user, loading, isStaff } = useAuth();
  const { isPlatformAdmin, currentTenant, isLoading: platformLoading } = usePlatform();
  const [view, setView] = useState<'landing' | 'login' | 'accept-invite'>('landing');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('accept-invite');
    }
  }, []);

  if (loading || platformLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (view === 'accept-invite') {
    return <AcceptInvitation />;
  }

  if (user) {
    if (isPlatformAdminDomain() && isPlatformAdmin) {
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

  if (isRootDomain() && !currentTenant) {
    return <ClearNavLandingPage />;
  }

  return <LandingPage onLoginClick={() => setView('login')} />;
}

function App() {
  return (
    <AuthProvider>
      <PlatformProvider>
        <AppContent />
      </PlatformProvider>
    </AuthProvider>
  );
}

export default App;
