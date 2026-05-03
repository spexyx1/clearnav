import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Send, ThumbsUp, ThumbsDown, RotateCcw, BookOpen,
  Navigation, ExternalLink, MessageSquare, ChevronLeft, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTutorial } from '../../lib/tutorial/TutorialContext';

interface ToolCall {
  name: string;
  input: {
    route?: string;
    label?: string;
    tutorial_key?: string;
    step_id?: string;
    summary?: string;
  };
}

interface Message {
  id: string;
  sender_type: 'user' | 'ai' | 'agent';
  body_markdown: string;
  tool_calls?: ToolCall[];
  created_at: string;
  feedback?: 'up' | 'down' | null;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  last_message_at: string;
}

interface Props {
  portal: 'client' | 'manager' | 'platform_admin';
  currentRoute?: string;
  userRole?: string;
  tenantName?: string;
  onNavigate?: (route: string) => void;
}

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  dashboard: ['What does the dashboard show me?', 'How do I see my portfolio performance?'],
  nav: ['How do I record a NAV?', 'What is the NAV audit trail?'],
  crm: ['How do I add a new contact?', 'What is the investor pipeline?'],
  capital_calls: ['How do I issue a capital call?', 'Can I automate capital call notifications?'],
  compliance: ['How does KYC verification work?', 'Where do I see AML reports?'],
  email: ['How do I set up my email inbox?', 'Can I send newsletters to all investors?'],
  blog: ['How do I publish a blog post?', 'Can I schedule content?'],
  default: ['How do I get started?', 'What features are most important to set up first?', 'Can you give me a tour?'],
};

function getSuggestions(route?: string): string[] {
  if (!route) return SUGGESTED_PROMPTS.default;
  for (const key of Object.keys(SUGGESTED_PROMPTS)) {
    if (route.includes(key)) return SUGGESTED_PROMPTS[key];
  }
  return SUGGESTED_PROMPTS.default;
}

// Very simple markdown renderer
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-slate-800 mt-2 mb-1 text-sm">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc text-sm">$1</li>')
    .replace(/\n/g, '<br />');
}

export function HelpChatPanel({ portal, currentRoute, userRole, tenantName, onNavigate }: Props) {
  const { isHelpOpen, closeHelp, restart: restartTutorial } = useTutorial();
  const [view, setView] = useState<'chat' | 'threads'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isHelpOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isHelpOpen]);

  // Real-time subscription on active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`support-messages-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  // Load threads
  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from('support_conversations')
      .select('id, title, status, last_message_at')
      .order('last_message_at', { ascending: false })
      .limit(20);
    setConversations((data as Conversation[]) ?? []);
  }, []);

  const loadThread = useCallback(async (convId: string) => {
    setActiveConversationId(convId);
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setView('chat');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setError(null);
    setLoading(true);

    // Optimistic user message
    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, sender_type: 'user', body_markdown: text, created_at: new Date().toISOString() },
    ]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-help-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            conversation_id: activeConversationId,
            message: text,
            portal_context: portal,
            current_route: currentRoute,
            user_role: userRole,
            tenant_name: tenantName,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to get response');
      }

      const result = await res.json();

      // Set conversation id if new
      if (!activeConversationId && result.conversation_id) {
        setActiveConversationId(result.conversation_id);
      }

      // Remove optimistic + add real AI message
      setMessages((prev) => {
        const withoutOpt = prev.filter((m) => m.id !== optimisticId);
        // user message may come via realtime sub, avoid dup
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender_type: 'ai',
          body_markdown: result.message,
          tool_calls: result.tool_calls?.length ? result.tool_calls : undefined,
          created_at: new Date().toISOString(),
        };
        return [...withoutOpt, aiMsg];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setLoading(false);
    }
  }, [loading, activeConversationId, portal, currentRoute, userRole, tenantName]);

  const submitFeedback = useCallback(async (messageId: string, rating: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    );
    await supabase.from('support_feedback').upsert({
      message_id: messageId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      rating,
    });
  }, []);

  const newConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setView('chat');
  }, []);

  if (!isHelpOpen) return null;

  const suggestions = getSuggestions(currentRoute);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9970] bg-black/20 backdrop-blur-sm"
        onClick={closeHelp}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[9975] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {view === 'threads' && (
              <button onClick={() => setView('chat')} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-sm">AI Help Assistant</h2>
              <p className="text-xs text-blue-100">Powered by Claude</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { loadThreads(); setView('threads'); }}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="Past conversations"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={newConversation}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
              title="New conversation"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={closeHelp}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Threads view */}
        {view === 'threads' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">Past Conversations</h3>
            {conversations.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No past conversations.</p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadThread(conv.id)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700 line-clamp-1">{conv.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    conv.status === 'escalated' ? 'bg-orange-100 text-orange-600' :
                    conv.status === 'resolved' ? 'bg-green-100 text-green-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(conv.last_message_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Chat view */}
        {view === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Welcome state */}
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="text-blue-500" size={24} />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">How can I help?</h3>
                  <p className="text-sm text-slate-500 mb-5">
                    Ask me anything about the platform and I will guide you step by step.
                  </p>
                  {/* Suggested prompts */}
                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="w-full text-sm text-left px-4 py-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {/* Tour restart */}
                  <button
                    onClick={() => { closeHelp(); restartTutorial(); }}
                    className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mx-auto transition-colors"
                  >
                    <BookOpen size={14} />
                    Start guided tour
                  </button>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.sender_type === 'user' ? '' : 'w-full'}`}>
                    {msg.sender_type === 'user' ? (
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                        {msg.body_markdown}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* AI/Agent bubble */}
                        {msg.body_markdown && (
                          <div className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${msg.sender_type === 'agent' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-100'}`}>
                            {msg.sender_type === 'agent' && (
                              <p className="text-xs font-semibold text-amber-600 mb-1">Support Agent</p>
                            )}
                            <div
                              className="text-slate-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.body_markdown) }}
                            />
                          </div>
                        )}

                        {/* Tool call action cards */}
                        {msg.tool_calls?.map((tc, i) => (
                          <div key={i} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 flex items-center justify-between gap-2">
                            {tc.name === 'navigate_to' && (
                              <>
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                  <Navigation size={14} />
                                  <span>Go to <strong>{tc.input.label}</strong></span>
                                </div>
                                <button
                                  onClick={() => onNavigate?.(tc.input.route!)}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  Take me there
                                  <ExternalLink size={11} />
                                </button>
                              </>
                            )}
                            {tc.name === 'start_tutorial_chapter' && (
                              <>
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                  <BookOpen size={14} />
                                  <span>{tc.input.label}</span>
                                </div>
                                <button
                                  onClick={() => { closeHelp(); restartTutorial(); }}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  Start tour
                                </button>
                              </>
                            )}
                            {tc.name === 'create_support_ticket' && (
                              <div className="flex items-center gap-2 text-sm text-amber-700">
                                <AlertCircle size={14} />
                                <span>Escalated to support team</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Feedback */}
                        {msg.sender_type === 'ai' && msg.id && !msg.id.startsWith('ai-') && (
                          <div className="flex items-center gap-1 pl-1">
                            <span className="text-xs text-slate-400 mr-1">Helpful?</span>
                            <button
                              onClick={() => submitFeedback(msg.id, 'up')}
                              className={`p-1 rounded transition-colors ${msg.feedback === 'up' ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}
                            >
                              <ThumbsUp size={13} />
                            </button>
                            <button
                              onClick={() => submitFeedback(msg.id, 'down')}
                              className={`p-1 rounded transition-colors ${msg.feedback === 'down' ? 'text-red-400' : 'text-slate-300 hover:text-red-400'}`}
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex-shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Ask anything about the platform..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all max-h-32"
                  style={{ minHeight: 40 }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
