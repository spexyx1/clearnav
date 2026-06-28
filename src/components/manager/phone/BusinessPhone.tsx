import { useState, useEffect, useCallback } from 'react';
import {
  Phone, Search, PhoneCall, Clock, Voicemail, Plus, Loader2,
  PhoneOutgoing, AlertCircle, X, Smartphone
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { TenantPhoneNumber } from './types';
import NumberSearch from './NumberSearch';
import MyNumbers from './MyNumbers';
import CallLog from './CallLog';
import VoicemailInbox from './VoicemailInbox';

type Tab = 'numbers' | 'search' | 'calls' | 'voicemail';

export default function BusinessPhone() {
  const { currentTenant } = useAuth();
  const [tab, setTab] = useState<Tab>('numbers');
  const [numbers, setNumbers] = useState<TenantPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadVoicemails, setUnreadVoicemails] = useState(0);
  const [voicemailFocusId, setVoicemailFocusId] = useState<string | null>(null);

  // Outbound call modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callFrom, setCallFrom] = useState('');
  const [callTo, setCallTo] = useState('');
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callSuccess, setCallSuccess] = useState(false);

  const loadNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tenant_phone_numbers')
        .select('*')
        .eq('status', 'active')
        .order('provisioned_at', { ascending: false });
      setNumbers(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    if (!currentTenant?.id) return;
    const { data } = await supabase.rpc('get_unread_voicemail_count', { p_tenant_id: currentTenant.id });
    setUnreadVoicemails(data || 0);
  }, [currentTenant?.id]);

  useEffect(() => {
    loadNumbers();
    loadUnreadCount();
  }, [loadNumbers, loadUnreadCount]);

  async function makeCall() {
    if (!callFrom || !callTo) { setCallError('Select a number and enter a destination.'); return; }
    setCalling(true);
    setCallError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
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

  const tabs: { id: Tab; label: string; icon: typeof Phone; badge?: number }[] = [
    { id: 'numbers', label: 'My Numbers', icon: Phone },
    { id: 'search',  label: 'Get a Number', icon: Plus },
    { id: 'calls',   label: 'Call Log', icon: Clock },
    { id: 'voicemail', label: 'Voicemail', icon: Voicemail, badge: unreadVoicemails },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Smartphone className="w-6 h-6 text-cyan-400" />
            Business Phone
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure local, toll-free, and international numbers. Forward calls to your mobile, manage voicemail, and make outbound calls with your business number.
          </p>
        </div>

        {numbers.length > 0 && (
          <button
            onClick={() => setShowCallModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
          >
            <PhoneOutgoing className="w-4 h-4" />
            Make a Call
          </button>
        )}
      </div>

      {/* Stats bar */}
      {!loading && numbers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Numbers', value: numbers.length, color: 'text-cyan-400' },
            { label: 'Monthly Cost', value: `$${numbers.reduce((s, n) => s + Number(n.monthly_cost_usd), 0).toFixed(2)}`, color: 'text-white' },
            { label: 'With Forwarding', value: numbers.filter(n => n.forward_to).length, color: 'text-emerald-400' },
            { label: 'Unread Voicemails', value: unreadVoicemails, color: unreadVoicemails > 0 ? 'text-violet-400' : 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative -mb-px ${
              tab === t.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {!!t.badge && t.badge > 0 && (
              <span className="ml-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-violet-500 text-white rounded-full">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading && tab === 'numbers' ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {tab === 'numbers' && (
            <MyNumbers
              numbers={numbers}
              onRefresh={() => { loadNumbers(); loadUnreadCount(); }}
              onNavigateToVoicemail={(id) => { setVoicemailFocusId(id); setTab('voicemail'); }}
            />
          )}
          {tab === 'search' && (
            <NumberSearch onPurchased={() => { loadNumbers(); setTab('numbers'); }} />
          )}
          {tab === 'calls' && <CallLog numbers={numbers} />}
          {tab === 'voicemail' && (
            <VoicemailInbox
              numbers={numbers}
              focusNumberId={voicemailFocusId}
            />
          )}
        </>
      )}

      {/* Outbound call modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-cyan-400" />
                Make a Business Call
              </h2>
              <button onClick={() => { setShowCallModal(false); setCallError(null); setCallSuccess(false); }} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
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
                    Your mobile number will ring first. Once you answer, the call will be bridged to the destination — your business number will show as the caller ID.
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
