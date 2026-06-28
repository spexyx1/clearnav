import { useState, useEffect, useCallback } from 'react';
import { Voicemail, Play, CheckCircle, Phone, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Voicemail as VoicemailType, TenantPhoneNumber, formatDuration, formatPhoneNumber } from './types';

interface Props {
  numbers: TenantPhoneNumber[];
  focusNumberId?: string | null;
}

export default function VoicemailInbox({ numbers, focusNumberId }: Props) {
  const [voicemails, setVoicemails] = useState<VoicemailType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumberId, setSelectedNumberId] = useState<string>(focusNumberId || 'all');
  const [playing, setPlaying] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('phone_number_voicemails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50);

      if (selectedNumberId !== 'all') query = query.eq('phone_number_id', selectedNumberId);

      const { data } = await query;
      setVoicemails(data || []);
    } finally {
      setLoading(false);
    }
  }, [selectedNumberId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (focusNumberId) setSelectedNumberId(focusNumberId);
  }, [focusNumberId]);

  async function markRead(id: string) {
    setMarking(id);
    await supabase.from('phone_number_voicemails').update({ is_read: true }).eq('id', id);
    setVoicemails(prev => prev.map(v => v.id === id ? { ...v, is_read: true } : v));
    setMarking(null);
  }

  function togglePlay(vm: VoicemailType) {
    if (!vm.recording_url) return;

    if (playing === vm.id) {
      audioEl?.pause();
      setPlaying(null);
      return;
    }

    audioEl?.pause();
    const el = new Audio(vm.recording_url);
    el.play();
    el.onended = () => setPlaying(null);
    setAudioEl(el);
    setPlaying(vm.id);

    if (!vm.is_read) markRead(vm.id);
  }

  function numberLabel(id: string | null) {
    if (!id) return '—';
    return numbers.find(n => n.id === id)?.phone_number ?? '—';
  }

  const unread = voicemails.filter(v => !v.is_read).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {unread > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-lg">
            <Voicemail className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">{unread} unread</span>
          </div>
        )}

        <div className="relative">
          <select
            value={selectedNumberId}
            onChange={e => setSelectedNumberId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Numbers</option>
            {numbers.map(n => (
              <option key={n.id} value={n.id}>{n.phone_number}{n.label ? ` (${n.label})` : ''}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : voicemails.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Voicemail className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No voicemails</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {voicemails.map(vm => (
              <div
                key={vm.id}
                className={`px-5 py-4 hover:bg-slate-800/30 transition-colors ${!vm.is_read ? 'border-l-2 border-violet-500' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    !vm.is_read ? 'bg-violet-500/20' : 'bg-slate-800'
                  }`}>
                    <Voicemail className={`w-5 h-5 ${!vm.is_read ? 'text-violet-400' : 'text-slate-500'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold font-mono ${!vm.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {formatPhoneNumber(vm.from_number)}
                      </span>
                      {vm.caller_name && (
                        <span className="text-xs text-slate-400">{vm.caller_name}</span>
                      )}
                      {!vm.is_read && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-300 rounded uppercase tracking-wider">New</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mb-2">
                      To {numberLabel(vm.phone_number_id)} · {formatDuration(vm.duration_seconds)} ·{' '}
                      {new Date(vm.received_at).toLocaleDateString()} {new Date(vm.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {vm.transcription && (
                      <p className="text-sm text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 mb-3 leading-relaxed">
                        "{vm.transcription}"
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      {vm.recording_url ? (
                        <button
                          onClick={() => togglePlay(vm)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            playing === vm.id
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {playing === vm.id
                            ? <><span className="w-3 h-3 border-2 border-white rounded-sm inline-block" /> Stop</>
                            : <><Play className="w-3.5 h-3.5" /> Play</>
                          }
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Recording unavailable</span>
                      )}

                      {!vm.is_read && (
                        <button
                          onClick={() => markRead(vm.id)}
                          disabled={marking === vm.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          {marking === vm.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />
                          }
                          Mark read
                        </button>
                      )}

                      <a
                        href={`tel:${vm.from_number}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call back
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
