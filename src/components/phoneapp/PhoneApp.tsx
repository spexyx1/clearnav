import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import {
  Smartphone, Phone, Plus, Clock, Voicemail, LogOut,
  PhoneCall, PhoneOutgoing, AlertCircle, X, Loader2, User, Settings,
  Menu, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { FullPageLoader } from '../shared/Spinner';
import { TenantPhoneNumber } from '../manager/phone/types';
import PhoneAuth from './PhoneAuth';

const MyNumbers = lazy(() => import('../manager/phone/MyNumbers'));
const NumberSearch = lazy(() => import('../manager/phone/NumberSearch'));
const CallLog = lazy(() => import('../manager/phone/CallLog'));
const VoicemailInbox = lazy(() => import('../manager/phone/VoicemailInbox'));

type Tab = 'numbers' | 'search' | 'calls' | 'voicemail';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-cyan-500/20">
        <Smartphone className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
      </div>
      <div className="leading-none">
        <div className="text-xs font-bold text-white tracking-tight">ClearNAV</div>
        <div className="text-[10px] text-slate-400 font-medium">Business Phone</div>
      </div>
    </div>
  );
}

interface DashboardProps {
  session: Session;
  displayName: string;
}

function Dashboard({ session, displayName }: DashboardProps) {
  const [tab, setTab] = useState<Tab>('numbers');
  const [numbers, setNumbers] = useState<TenantPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadVoicemails, setUnreadVoicemails] = useState(0);
  const [voicemailFocusId, setVoicemailFocusId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Outbound call modal
  const [showCallModal, setShowCallModal] = useState(false);
  const [callFrom, setCallFrom] = useState('');
  const [callTo, setCallTo] = useState('');
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callSuccess, setCallSuccess] = useState(false);

  const loadNumbers = useCallback(async () => {
    setLoading(true);
    try {
      // Use the edge function so user-scoped RLS applies correctly
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );
      const json = await res.json();
      setNumbers(json.numbers || []);
    } finally {
      setLoading(false);
    }
  }, [session.access_token]);

  const loadUnreadVoicemails = useCallback(async () => {
    const { count } = await supabase
      .from('phone_number_voicemails')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .in('phone_number_id', numbers.map(n => n.id).filter(Boolean));
    setUnreadVoicemails(count || 0);
  }, [numbers]);

  useEffect(() => { loadNumbers(); }, [loadNumbers]);
  useEffect(() => { if (numbers.length) loadUnreadVoicemails(); }, [loadUnreadVoicemails, numbers.length]);

  async function makeCall() {
    if (!callFrom || !callTo) { setCallError('Select a number and enter a destination.'); return; }
    setCalling(true);
    setCallError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'call', phone_number_id: callFrom, destination: callTo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Call failed');
      setCallSuccess(true);
      setTimeout(() => { setShowCallModal(false); setCallSuccess(false); setCallTo(''); }, 2500);
    } catch (e: any) {
      setCallError(e.message);
    } finally {
      setCalling(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const tabs: { id: Tab; label: string; icon: typeof Phone; badge?: number }[] = [
    { id: 'numbers',   label: 'My Numbers',   icon: Phone },
    { id: 'search',    label: 'Get a Number', icon: Plus },
    { id: 'calls',     label: 'Call Log',     icon: Clock },
    { id: 'voicemail', label: 'Voicemail',    icon: Voicemail, badge: unreadVoicemails },
  ];

  const navLinks = (
    <nav className="space-y-1 px-3 py-4">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => { setTab(t.id); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === t.id
              ? 'bg-cyan-500/15 text-cyan-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <t.icon className={`w-4 h-4 shrink-0 ${tab === t.id ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="flex-1 text-left">{t.label}</span>
          {!!t.badge && t.badge > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-violet-500 text-white rounded-full">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-60 bg-slate-900 border-r border-slate-800
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800">
          <Logo />
          <button className="lg:hidden text-slate-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {navLinks}
        </div>

        {/* Stats pills */}
        {!loading && numbers.length > 0 && (
          <div className="px-4 pb-3 space-y-2">
            <div className="bg-slate-800/60 rounded-xl px-3 py-2.5">
              <div className="text-xs text-slate-500 mb-1">Active Numbers</div>
              <div className="text-sm font-bold text-cyan-400">{numbers.length}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-3 py-2.5">
              <div className="text-xs text-slate-500 mb-1">Monthly Cost</div>
              <div className="text-sm font-bold text-white">
                ${numbers.reduce((s, n) => s + Number(n.monthly_cost_usd), 0).toFixed(2)}/mo
              </div>
            </div>
          </div>
        )}

        {/* User area */}
        <div className="px-3 py-3 border-t border-slate-800">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <div className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="flex-1 text-sm font-medium text-slate-300 text-left truncate">{displayName}</span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-slate-900 border-b border-slate-800">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <Logo />
          {numbers.length > 0 && (
            <button
              onClick={() => setShowCallModal(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white text-xs font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
            >
              <PhoneOutgoing className="w-3.5 h-3.5" />
              Call
            </button>
          )}
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Desktop header */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">
                  {tabs.find(t => t.id === tab)?.label}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tab === 'numbers' && 'Manage your business phone numbers and call settings.'}
                  {tab === 'search' && 'Search and purchase local, toll-free, or international numbers.'}
                  {tab === 'calls' && 'View your inbound and outbound call history.'}
                  {tab === 'voicemail' && 'Listen to voicemails left on your business numbers.'}
                </p>
              </div>
              {numbers.length > 0 && (
                <button
                  onClick={() => setShowCallModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <PhoneOutgoing className="w-4 h-4" />
                  Make a Call
                </button>
              )}
            </div>

            {loading && tab === 'numbers' ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
                {tab === 'numbers' && (
                  <MyNumbers
                    numbers={numbers}
                    onRefresh={loadNumbers}
                    onNavigateToVoicemail={(id) => { setVoicemailFocusId(id); setTab('voicemail'); }}
                  />
                )}
                {tab === 'search' && (
                  <NumberSearch onPurchased={() => { loadNumbers(); setTab('numbers'); }} />
                )}
                {tab === 'calls' && <CallLog numbers={numbers} />}
                {tab === 'voicemail' && (
                  <VoicemailInbox numbers={numbers} focusNumberId={voicemailFocusId} />
                )}
              </Suspense>
            )}
          </div>
        </main>
      </div>

      {/* Outbound call modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-cyan-400" />
                Make a Business Call
              </h2>
              <button
                onClick={() => { setShowCallModal(false); setCallError(null); setCallSuccess(false); }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {callSuccess ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Phone className="w-7 h-7 text-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-base font-semibold text-white">Connecting your call...</p>
                  <p className="text-sm text-slate-400 text-center">Your mobile will ring first, then you'll be connected to the destination.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Call from (your business number)</label>
                    <select
                      value={callFrom}
                      onChange={e => setCallFrom(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Select a number...</option>
                      {numbers.filter(n => n.forward_to).map(n => (
                        <option key={n.id} value={n.id}>
                          {n.phone_number}{n.label ? ` — ${n.label}` : ''}
                        </option>
                      ))}
                    </select>
                    {numbers.length > 0 && numbers.every(n => !n.forward_to) && (
                      <p className="text-xs text-amber-400 mt-1.5">Set a forwarding number in My Numbers before placing calls.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Call to (destination)</label>
                    <input
                      value={callTo}
                      onChange={e => setCallTo(e.target.value)}
                      placeholder="+15551234567"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-xs text-slate-400 leading-relaxed">
                    Your mobile number will ring first. Once you answer, the call will be bridged to the destination — your business number shows as caller ID.
                  </div>

                  {callError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />{callError}
                    </div>
                  )}

                  <button
                    onClick={makeCall}
                    disabled={calling || !callFrom || !callTo}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {calling ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneOutgoing className="w-5 h-5" />}
                    {calling ? 'Connecting...' : 'Place Call'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhoneApp() {
  useEffect(() => { document.title = 'ClearNAV Business Phone'; }, []);

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const u = session.user;
    const name = u.user_metadata?.display_name || u.email?.split('@')[0] || 'Account';
    setDisplayName(name);

    // Ensure phone_app_profiles row exists
    supabase.from('phone_app_profiles').upsert({
      user_id: u.id,
      display_name: name,
      email: u.email,
    }, { onConflict: 'user_id' });
  }, [session?.user?.id]);

  if (session === undefined) return <FullPageLoader />;

  if (!session) {
    return <PhoneAuth onAuthenticated={() => {}} />;
  }

  return <Dashboard session={session} displayName={displayName} />;
}
