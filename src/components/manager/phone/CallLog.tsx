import { useState, useEffect, useCallback } from 'react';
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Voicemail, Clock,
  RefreshCw, Filter, ChevronDown
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { PhoneCallLog, TenantPhoneNumber, formatDuration, formatPhoneNumber } from './types';

interface Props {
  numbers: TenantPhoneNumber[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  answered:  { label: 'Answered',  color: 'text-emerald-400' },
  missed:    { label: 'Missed',    color: 'text-red-400' },
  voicemail: { label: 'Voicemail', color: 'text-violet-400' },
  failed:    { label: 'Failed',    color: 'text-red-500' },
  busy:      { label: 'Busy',      color: 'text-amber-400' },
  no_answer: { label: 'No Answer', color: 'text-amber-400' },
  ringing:   { label: 'Ringing',   color: 'text-cyan-400' },
  initiated: { label: 'Initiated', color: 'text-slate-400' },
};

export default function CallLog({ numbers }: Props) {
  const [calls, setCalls] = useState<PhoneCallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound' | 'missed'>('all');
  const [selectedNumberId, setSelectedNumberId] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('phone_number_call_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (selectedNumberId !== 'all') query = query.eq('phone_number_id', selectedNumberId);
      if (filter === 'inbound') query = query.eq('direction', 'inbound');
      if (filter === 'outbound') query = query.eq('direction', 'outbound');
      if (filter === 'missed') query = query.in('status', ['missed', 'no_answer']);

      const { data } = await query;
      setCalls(data || []);
    } finally {
      setLoading(false);
    }
  }, [filter, selectedNumberId]);

  useEffect(() => { load(); }, [load]);

  function numberLabel(id: string | null) {
    if (!id) return '—';
    return numbers.find(n => n.id === id)?.phone_number ?? '—';
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
          {(['all', 'inbound', 'outbound', 'missed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                filter === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

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

      {/* Summary stats */}
      {calls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: calls.length, icon: Filter, color: 'text-slate-300' },
            { label: 'Answered', value: calls.filter(c => c.status === 'answered').length, icon: PhoneIncoming, color: 'text-emerald-400' },
            { label: 'Missed', value: calls.filter(c => c.status === 'missed' || c.status === 'no_answer').length, icon: PhoneMissed, color: 'text-red-400' },
            { label: 'Voicemail', value: calls.filter(c => c.status === 'voicemail').length, icon: Voicemail, color: 'text-violet-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-900 rounded-lg border border-slate-800 px-4 py-3 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call list */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <PhoneMissed className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No calls yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {calls.map(call => {
              const cfg = STATUS_CONFIG[call.status] ?? { label: call.status, color: 'text-slate-400' };
              return (
                <div key={call.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {call.direction === 'inbound' ? (
                      call.status === 'missed' || call.status === 'no_answer'
                        ? <PhoneMissed className="w-4 h-4 text-red-400" />
                        : <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white font-mono">
                        {call.direction === 'inbound'
                          ? formatPhoneNumber(call.from_number)
                          : formatPhoneNumber(call.to_number)}
                      </span>
                      {call.caller_name && (
                        <span className="text-xs text-slate-400">{call.caller_name}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {call.direction === 'inbound' ? 'to' : 'from'} {numberLabel(call.phone_number_id)}
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</div>
                    {call.duration_seconds > 0 && (
                      <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />{formatDuration(call.duration_seconds)}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-slate-600 w-28 hidden sm:block">
                    {new Date(call.started_at).toLocaleDateString()}<br />
                    {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
