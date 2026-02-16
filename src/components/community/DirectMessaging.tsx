import { useState, useEffect, useRef } from 'react';
import { Send, Search, Plus, X, Paperclip, MoreVertical, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { sanitizeText } from '../../lib/sanitize';

interface MessageThread {
  id: string;
  participant_ids: string[];
  thread_type: string;
  thread_name: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  participants?: any[];
  unread_count?: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
}

export default function DirectMessaging() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages();
      markThreadAsRead();

      const subscription = supabase
        .channel(`thread:${selectedThread.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `thread_id=eq.${selectedThread.id}`
          },
          (payload) => {
            loadMessages();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase.rpc('get_user_threads_with_details', {
      p_user_id: user.id
    });

    if (!error && data) {
      const threads = (data as any[]).map(t => ({
        id: t.thread_id,
        participant_ids: t.participant_ids,
        thread_type: t.thread_type,
        thread_name: t.thread_name,
        last_message_at: t.last_message_at,
        last_message_preview: t.last_message_preview,
        participants: Array.isArray(t.participant_names)
          ? t.participant_names.map((p: any) => ({
              display_name: p.display_name || 'Unknown User',
              avatar_url: p.avatar_url
            }))
          : [],
        unread_count: Number(t.unread_count) || 0
      }));
      setThreads(threads);
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedThread) return;

    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender_profile:user_profiles_public!sender_id(display_name, avatar_url)
      `)
      .eq('thread_id', selectedThread.id)
      .order('sent_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const markThreadAsRead = async () => {
    if (!selectedThread || !user) return;

    const unreadMessages = messages.filter(m => m.sender_id !== user.id);

    for (const message of unreadMessages) {
      await supabase
        .from('message_read_receipts')
        .upsert({
          message_id: message.id,
          user_id: user.id,
          read_at: new Date().toISOString()
        }, { onConflict: 'message_id,user_id' });
    }

    loadThreads();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !user || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        thread_id: selectedThread.id,
        sender_id: user.id,
        content: messageContent,
        sent_at: new Date().toISOString()
      });

    if (!error) {
      await supabase
        .from('message_threads')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100)
        })
        .eq('id', selectedThread.id);

      loadMessages();
      loadThreads();
    } else {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    }
  };

  const handleCreateThread = async (recipientId: string) => {
    if (!user) return;

    const participantIds = [user.id, recipientId].sort();

    const { data: existingThread } = await supabase
      .from('message_threads')
      .select('*')
      .contains('participant_ids', participantIds)
      .eq('thread_type', 'direct')
      .maybeSingle();

    if (existingThread) {
      setSelectedThread(existingThread);
      setShowNewThreadModal(false);
      return;
    }

    const { data, error } = await supabase
      .from('message_threads')
      .insert({
        participant_ids: participantIds,
        thread_type: 'direct',
        created_by: user.id
      })
      .select()
      .single();

    if (!error && data) {
      setSelectedThread(data);
      setShowNewThreadModal(false);
      loadThreads();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getThreadDisplayName = (thread: MessageThread) => {
    if (thread.thread_name) return thread.thread_name;
    if (thread.participants && thread.participants.length > 0) {
      return thread.participants
        .map(p => p.display_name || 'Unknown User')
        .join(', ');
    }
    return 'Unknown Conversation';
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow">
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <button
              onClick={() => setShowNewThreadModal(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No conversations yet</p>
              <p className="text-sm text-gray-500 mt-1">Start a new conversation</p>
            </div>
          ) : (
            <div>
              {threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full p-4 border-b border-gray-200 text-left hover:bg-gray-50 ${
                    selectedThread?.id === thread.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-sm font-medium truncate flex-1 ${
                      (thread.unread_count || 0) > 0 ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {getThreadDisplayName(thread)}
                    </span>
                    {(thread.unread_count || 0) > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">
                    {thread.last_message_preview || 'No messages yet'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatMessageTime(thread.last_message_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {getThreadDisplayName(selectedThread)}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedThread.thread_type === 'group' ? 'Group conversation' : 'Direct message'}
                </p>
              </div>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-lg ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      {!isOwnMessage && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {message.sender_profile?.display_name?.[0] || 'U'}
                        </div>
                      )}
                      {!isOwnMessage && !showAvatar && <div className="w-8" />}

                      <div>
                        {showAvatar && !isOwnMessage && (
                          <p className="text-xs text-gray-600 mb-1 ml-1">
                            {message.sender_profile?.display_name || 'Unknown User'}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{sanitizeText(message.content)}</p>
                        </div>
                        <p className={`text-xs text-gray-400 mt-1 ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}>
                          {formatMessageTime(message.sent_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg mb-1"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-1"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {showNewThreadModal && (
        <NewThreadModal
          onClose={() => setShowNewThreadModal(false)}
          onCreateThread={handleCreateThread}
        />
      )}
    </div>
  );
}

interface NewThreadModalProps {
  onClose: () => void;
  onCreateThread: (recipientId: string) => void;
}

function NewThreadModal({ onClose, onCreateThread }: NewThreadModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [searchQuery]);

  const loadUsers = async () => {
    setLoading(true);

    let query = supabase
      .from('user_profiles_public')
      .select('user_id, display_name')
      .eq('profile_visibility', 'public')
      .limit(20);

    if (searchQuery) {
      query = query.ilike('display_name', `%${searchQuery}%`);
    }

    const { data } = await query;

    setUsers(data || []);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">New Conversation</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users found</p>
              </div>
            ) : (
              <div>
                {users.map(user => (
                  <button
                    key={user.user_id}
                    onClick={() => onCreateThread(user.user_id)}
                    className="w-full p-3 hover:bg-gray-50 rounded-lg text-left flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.display_name?.[0] || 'U'}
                    </div>
                    <span className="font-medium text-gray-900">
                      {user.display_name || 'Unknown User'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
