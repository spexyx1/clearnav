import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare, Search, ChevronRight, Send, User, Bot, Users,
  AlertCircle, CheckCircle, Clock, RefreshCw, Filter, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Conversation {
  id: string;
  user_id: string;
  portal: string;
  title: string;
  status: 'open' | 'resolved' | 'escalated';
  last_message_at: string;
  unread_count: number;
  user_email?: string;
  tenant_name?: string;
}

interface Message {
  id: string;
  sender_type: 'user' | 'ai' | 'agent';
  body_markdown: string;
  tool_calls?: unknown[];
  model?: string;
  created_at: string;
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  escalated: { label: 'Escalated', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function AISupportConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(100);
    setConversations((data as Conversation[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, []);

  const selectConversation = useCallback((conv: Conversation) => {
    setSelected(conv);
    loadMessages(conv.id);
  }, [loadMessages]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    await supabase
      .from('support_conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, status: status as Conversation['status'] } : c));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: status as Conversation['status'] } : null);
  }, [selected]);

  const sendReply = useCallback(async () => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    const { data: msg } = await supabase
      .from('support_messages')
      .insert({ conversation_id: selected.id, sender_type: 'agent', body_markdown: reply })
      .select()
      .single();
    if (msg) {
      setMessages((prev) => [...prev, msg as Message]);
      await updateStatus(selected.id, 'resolved');
    }
    setReply('');
    setSending(false);
  }, [reply, selected, sending, updateStatus]);

  const filtered = conversations.filter((c) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px] border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'open', 'escalated', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No conversations found.</p>
          )}
          {filtered.map((conv) => {
            const cfg = STATUS_CONFIG[conv.status];
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selected?.id === conv.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <p className="text-sm font-medium text-slate-800 line-clamp-1 flex-1">{conv.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="capitalize">{conv.portal.replace('_', ' ')}</span>
                  <span>·</span>
                  <span>{new Date(conv.last_message_at).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-2 border-t border-slate-100">
          <button onClick={loadConversations} className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Thread view */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Select a conversation to view messages</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Thread header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{selected.title}</h3>
              <p className="text-xs text-slate-400 capitalize">{selected.portal.replace('_', ' ')} portal</p>
            </div>
            <div className="flex items-center gap-2">
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => updateStatus(selected.id, 'resolved')}
                  className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors flex items-center gap-1"
                >
                  <CheckCircle size={12} />
                  Resolve
                </button>
              )}
              {selected.status !== 'escalated' && (
                <button
                  onClick={() => updateStatus(selected.id, 'escalated')}
                  className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg font-medium transition-colors flex items-center gap-1"
                >
                  <AlertCircle size={12} />
                  Escalate
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isUser = msg.sender_type === 'user';
              const isAgent = msg.sender_type === 'agent';
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${isAgent ? 'bg-amber-100' : 'bg-blue-100'}`}>
                      {isAgent ? <Users size={13} className="text-amber-600" /> : <Bot size={13} className="text-blue-600" />}
                    </div>
                  )}
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isUser ? 'bg-blue-600 text-white rounded-tr-sm' :
                    isAgent ? 'bg-amber-50 border border-amber-200 text-slate-800 rounded-tl-sm' :
                    'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {isAgent && <p className="text-xs font-semibold text-amber-600 mb-1">Support Agent</p>}
                    {!isUser && !isAgent && <p className="text-xs font-semibold text-blue-600 mb-1">AI Assistant</p>}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.body_markdown}</p>
                    <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-100">
                      <User size={13} className="text-slate-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reply composer */}
          <div className="px-4 pb-4 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">Reply as support agent</p>
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Type a reply..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
