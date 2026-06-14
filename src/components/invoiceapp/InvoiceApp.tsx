import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import {
  FileText, LayoutDashboard, Users, Package, Settings,
  Plus, LogOut, ChevronDown, Menu, X, User, Shield,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { FullPageLoader } from '../shared/Spinner';
import InvoiceAuth from './InvoiceAuth';
import InvoiceOnboarding from './InvoiceOnboarding';
import { InvoiceAppProfile } from './types';

const InvoiceDashboard = lazy(() => import('./InvoiceDashboard'));
const InvoiceAppEditor = lazy(() => import('./InvoiceAppEditor'));
const InvoiceAppDetail = lazy(() => import('./InvoiceAppDetail'));
const InvoiceAppClients = lazy(() => import('./InvoiceAppClients'));
const InvoiceAppProducts = lazy(() => import('./InvoiceAppProducts'));
const InvoiceAppSettings = lazy(() => import('./InvoiceAppSettings'));
const InvoicePublicView = lazy(() => import('../manager/invoicing/InvoicePublicView'));

type AppView =
  | 'dashboard'
  | 'invoice-new'
  | { type: 'invoice-edit'; id: string }
  | { type: 'invoice-detail'; id: string }
  | 'clients'
  | 'products'
  | 'settings';

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-white" />
      </div>
      <div className="leading-none">
        <div className="text-xs font-bold text-gray-900 tracking-tight">ClearNAV</div>
        <div className="text-xs text-gray-500">Invoicing</div>
      </div>
    </div>
  );
}

function SidebarLink({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );
}

interface AuthedAppProps {
  session: Session;
  profile: InvoiceAppProfile | null;
  onProfileUpdate: (p: InvoiceAppProfile) => void;
}

function AuthedApp({ session, profile, onProfileUpdate }: AuthedAppProps) {
  const [view, setView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = session.user;

  const displayName = profile?.username || profile?.display_name || user.email?.split('@')[0] || 'Account';

  function isActive(v: AppView | string): boolean {
    if (typeof view === 'string') return view === v;
    if (typeof v === 'string') return view.type === v;
    return false;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const nav = (
    <nav className="space-y-1">
      <SidebarLink icon={LayoutDashboard} label="Dashboard" active={isActive('dashboard')} onClick={() => { setView('dashboard'); setSidebarOpen(false); }} />
      <SidebarLink icon={Plus} label="New Invoice" active={isActive('invoice-new')} onClick={() => { setView('invoice-new'); setSidebarOpen(false); }} />
      <SidebarLink icon={Users} label="Clients" active={isActive('clients')} onClick={() => { setView('clients'); setSidebarOpen(false); }} />
      <SidebarLink icon={Package} label="Products" active={isActive('products')} onClick={() => { setView('products'); setSidebarOpen(false); }} />
      <SidebarLink icon={Settings} label="Settings" active={isActive('settings')} onClick={() => { setView('settings'); setSidebarOpen(false); }} />
    </nav>
  );

  function renderContent() {
    if (view === 'dashboard') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceDashboard
            userId={user.id}
            onNewInvoice={() => setView('invoice-new')}
            onOpenInvoice={(id) => setView({ type: 'invoice-detail', id })}
          />
        </Suspense>
      );
    }

    if (view === 'invoice-new') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceAppEditor
            userId={user.id}
            onSaved={(id) => { setView({ type: 'invoice-detail', id }); }}
            onBack={() => setView('dashboard')}
          />
        </Suspense>
      );
    }

    if (typeof view === 'object' && view.type === 'invoice-edit') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceAppEditor
            userId={user.id}
            invoiceId={view.id}
            onSaved={(id) => setView({ type: 'invoice-detail', id })}
            onBack={() => setView({ type: 'invoice-detail', id: view.id })}
          />
        </Suspense>
      );
    }

    if (typeof view === 'object' && view.type === 'invoice-detail') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceAppDetail
            userId={user.id}
            invoiceId={view.id}
            onEdit={(id) => setView({ type: 'invoice-edit', id })}
            onBack={() => setView('dashboard')}
          />
        </Suspense>
      );
    }

    if (view === 'clients') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceAppClients userId={user.id} onNewInvoice={(clientId) => {
            setView('invoice-new');
            // Pass client ID via sessionStorage for pre-fill
            if (clientId) sessionStorage.setItem('invoice_prefill_client', clientId);
          }} />
        </Suspense>
      );
    }

    if (view === 'products') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceAppProducts userId={user.id} />
        </Suspense>
      );
    }

    if (view === 'settings') {
      return (
        <Suspense fallback={<FullPageLoader />}>
          <InvoiceAppSettings
            userId={user.id}
            profile={profile}
            onProfileUpdate={onProfileUpdate}
          />
        </Suspense>
      );
    }

    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
          <Logo />
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {nav}
        </div>

        <div className="px-3 py-3 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-700 text-left truncate">{displayName}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={() => { setView('settings'); setUserMenuOpen(false); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Account Settings
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <Logo />
          <div className="ml-auto">
            <button
              onClick={() => setView('invoice-new')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {profile?.is_guest && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-amber-800">
                  Your invoices are saved to this browser.{' '}
                  <button
                    onClick={() => setView('settings')}
                    className="underline font-medium"
                  >
                    Add a password
                  </button>{' '}
                  to access from any device.
                </span>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function InvoiceApp() {
  const path = window.location.pathname;
  if (path.startsWith('/invoice/')) {
    const token = path.replace('/invoice/', '').split('/')[0];
    return (
      <Suspense fallback={<FullPageLoader />}>
        <InvoicePublicView token={token} />
      </Suspense>
    );
  }
  return <InvoiceAppContainer />;
}

function InvoiceAppContainer() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<InvoiceAppProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const { data } = await supabase
      .from('invoice_app_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setProfile(data as InvoiceAppProfile | null);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user) loadProfile(session.user.id);
    else setProfile(null);
  }, [session, loadProfile]);

  if (session === undefined || (session && profileLoading)) {
    return <FullPageLoader />;
  }

  if (!session) {
    return <InvoiceAuth onAuthenticated={() => {}} />;
  }

  // Guest users skip onboarding (profile created with onboarding_complete=true)
  // Non-guest users without onboarding go through the setup flow
  if (profile && !profile.onboarding_complete && !profile.is_guest) {
    return (
      <InvoiceOnboarding
        userId={session.user.id}
        onComplete={() => loadProfile(session.user.id)}
      />
    );
  }

  if (!profile) {
    return <FullPageLoader />;
  }

  return (
    <AuthedApp
      session={session}
      profile={profile}
      onProfileUpdate={(p) => setProfile(p)}
    />
  );
}
