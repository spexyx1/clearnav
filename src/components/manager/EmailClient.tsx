import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Search, RefreshCw, Paperclip, Star,
  Inbox, Send as SentIcon, FileText, Archive, Trash2,
  Settings, X, Pencil, ChevronDown, UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import EmailAccountManager from './email/EmailAccountManager';
import EmailSetup from './email/EmailSetup';
import EmailCompose from './email/EmailCompose';
import MessageView from './email/MessageView';

interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string;
  account_type: string;
}

interface EmailMessage {
  id: string;
  from_address: string;
  from_name: string | null;
  to_addresses: any;
  cc_addresses?: any;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  folder: string;
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  received_at: string | null;
  sent_at: string | null;
  created_at: string;
}

type FolderId = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';

const FOLDERS: { id: FolderId; name: string; icon: typeof Inbox }[] = [
  { id: 'inbox', name: 'Inbox', icon: Inbox },
  { id: 'sent', name: 'Sent', icon: SentIcon },
  { id: 'drafts', name: 'Drafts', icon: FileText },
  { id: 'archive', name: 'Archive', icon: Archive },
  { id: 'trash', name: 'Trash', icon: Trash2 },
];

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffHours < 168) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EmailClient() {
  const { user, isTenantAdmin } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderId>('inbox');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<{
    to?: string;
    cc?: string;
    subject?: string;
    body?: string;
  } | undefined>(undefined);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

  const loadEmailAccounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: accessData, error: accessError } = await supabase
        .from('email_account_access')
        .select(`
          account_id,
          access_level,
          email_accounts (
            id,
            email_address,
            display_name,
            account_type,
            is_active
          )
        `)
        .eq('user_id', user.id);

      if (accessError) throw accessError;

      const accountsList = (accessData || [])
        .filter((a: any) => a.email_accounts)
        .map((a: any) => a.email_accounts as EmailAccount);

      setAccounts(accountsList);
      if (accountsList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsList[0]);
      }
    } catch (err: any) {
      console.error('Error loading email accounts:', err);
      setError(err.message || 'Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!selectedAccount) return;

    try {
      setMessagesLoading(true);

      let query = supabase
        .from('email_messages')
        .select('id, from_address, from_name, to_addresses, cc_addresses, subject, body_html, body_text, folder, is_read, is_starred, is_draft, has_attachments, received_at, sent_at, created_at')
        .eq('account_id', selectedAccount.id)
        .eq('folder', currentFolder)
        .order('received_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchQuery.trim()) {
        query = query.or(`subject.ilike.%${searchQuery}%,from_address.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error loading messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedAccount, currentFolder, searchQuery]);

  const loadFolderCounts = useCallback(async () => {
    if (!selectedAccount) return;

    const { count } = await supabase
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', selectedAccount.id)
      .eq('folder', 'inbox')
      .eq('is_read', false);

    setFolderCounts((prev) => ({ ...prev, inbox: count || 0 }));
  }, [selectedAccount]);

  useEffect(() => {
    if (user) loadEmailAccounts();
    else setLoading(false);
  }, [user, loadEmailAccounts]);

  useEffect(() => {
    if (selectedAccount) {
      loadMessages();
      loadFolderCounts();
    }
  }, [selectedAccount, currentFolder, loadMessages, loadFolderCounts]);

  useEffect(() => {
    if (!searchQuery && selectedAccount) loadMessages();
    const timeout = setTimeout(() => {
      if (searchQuery && selectedAccount) loadMessages();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('email_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
    );
    loadFolderCounts();
  };

  const toggleStar = async (message: EmailMessage) => {
    const newStarred = !message.is_starred;
    await supabase
      .from('email_messages')
      .update({ is_starred: newStarred })
      .eq('id', message.id);

    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, is_starred: newStarred } : m))
    );
    if (selectedMessage?.id === message.id) {
      setSelectedMessage({ ...message, is_starred: newStarred });
    }
  };

  const moveToFolder = async (messageId: string, folder: string) => {
    await supabase
      .from('email_messages')
      .update({ folder })
      .eq('id', messageId);

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (selectedMessage?.id === messageId) setSelectedMessage(null);
    loadFolderCounts();
  };

  const handleReply = (message: EmailMessage) => {
    setComposeData({
      to: message.from_address,
      subject: `Re: ${message.subject.replace(/^Re:\s*/i, '')}`,
      body: `\n\n--- Original Message ---\nFrom: ${message.from_name || message.from_address}\nDate: ${new Date(message.received_at || message.created_at).toLocaleString()}\n\n${message.body_text || ''}`,
    });
    setComposeOpen(true);
  };

  const handleForward = (message: EmailMessage) => {
    setComposeData({
      to: '',
      subject: `Fwd: ${message.subject.replace(/^Fwd:\s*/i, '')}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${message.from_name || message.from_address}\nDate: ${new Date(message.received_at || message.created_at).toLocaleString()}\nSubject: ${message.subject}\n\n${message.body_text || ''}`,
    });
    setComposeOpen(true);
  };

  const handleCompose = () => {
    setComposeData(undefined);
    setComposeOpen(true);
  };

  const handleSent = () => {
    setComposeOpen(false);
    setComposeData(undefined);
    setSendSuccess('Email sent successfully');
    if (currentFolder === 'sent') loadMessages();
    setTimeout(() => setSendSuccess(null), 3000);
  };

  const handleAccountCreated = () => {
    loadEmailAccounts();
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading email...</p>
        </div>
      </div>
    );
  }

  if (!loading && accounts.length === 0) {
    return <EmailSetup onAccountCreated={handleAccountCreated} />;
  }

  const unreadCount = folderCounts.inbox || 0;

  return (
    <>
      <div className="h-[calc(100vh-140px)] flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex-shrink-0 bg-slate-800/80 border-b border-slate-700 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowAccountPicker(!showAccountPicker)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600/50 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center">
                    <span className="text-xs font-semibold text-cyan-300">
                      {(selectedAccount?.display_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white leading-tight">
                      {selectedAccount?.display_name}
                    </div>
                    <div className="text-xs text-slate-400 leading-tight">
                      {selectedAccount?.email_address}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </button>

                {showAccountPicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowAccountPicker(false)} />
                    <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-40 py-1 overflow-hidden">
                      <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Your Accounts
                      </div>
                      {accounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedAccount(account);
                            setSelectedMessage(null);
                            setShowAccountPicker(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            selectedAccount?.id === account.id
                              ? 'bg-cyan-600/10'
                              : 'hover:bg-slate-700/50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-cyan-300">
                              {account.display_name[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {account.display_name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {account.email_address}
                            </div>
                          </div>
                          {selectedAccount?.id === account.id && (
                            <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                      {isTenantAdmin && (
                        <>
                          <div className="border-t border-slate-700 my-1" />
                          <button
                            onClick={() => {
                              setShowAccountPicker(false);
                              setShowSettings(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <UserPlus className="h-4 w-4 text-slate-400" />
                            </div>
                            <span className="text-sm text-slate-400">Manage Accounts</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-56 bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={() => loadMessages()}
                className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${messagesLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleCompose}
                className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Compose
              </button>
              {isTenantAdmin && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Email Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {sendSuccess && (
            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
              <span>{sendSuccess}</span>
              <button onClick={() => setSendSuccess(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-52 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 p-3 space-y-1">
            {FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const count = folder.id === 'inbox' ? unreadCount : 0;
              const isActive = currentFolder === folder.id;

              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setCurrentFolder(folder.id);
                    setSelectedMessage(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-cyan-600/15 text-cyan-300'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : ''}`} />
                  <span className="text-sm font-medium flex-1">{folder.name}</span>
                  {count > 0 && (
                    <span className="text-xs font-semibold bg-cyan-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-80 lg:w-96 flex-shrink-0 border-r border-slate-800 overflow-y-auto">
            {messagesLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-6">
                  <Mail className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                  <p className="text-sm text-slate-500">
                    {searchQuery ? 'No messages found' : `No messages in ${currentFolder}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {messages.map((message) => {
                  const isSelected = selectedMessage?.id === message.id;
                  const dateStr = message.received_at || message.sent_at || message.created_at;

                  return (
                    <button
                      key={message.id}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (!message.is_read) markAsRead(message.id);
                      }}
                      className={`w-full p-4 text-left transition-colors ${
                        isSelected
                          ? 'bg-cyan-900/20 border-l-2 border-l-cyan-500'
                          : !message.is_read
                          ? 'bg-slate-800/30 hover:bg-slate-800/50 border-l-2 border-l-transparent'
                          : 'hover:bg-slate-800/30 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span
                              className={`text-sm truncate ${
                                !message.is_read ? 'font-semibold text-white' : 'text-slate-300'
                              }`}
                            >
                              {currentFolder === 'sent'
                                ? (() => {
                                    const to = message.to_addresses;
                                    if (Array.isArray(to) && to.length > 0) {
                                      const first = typeof to[0] === 'string' ? to[0] : to[0]?.email || '';
                                      return `To: ${first}`;
                                    }
                                    return 'To: (unknown)';
                                  })()
                                : message.from_name || message.from_address}
                            </span>
                            <span className="text-xs text-slate-600 flex-shrink-0 ml-2">
                              {formatDate(dateStr)}
                            </span>
                          </div>
                          <p
                            className={`text-sm mb-1 truncate ${
                              !message.is_read ? 'font-medium text-slate-200' : 'text-slate-400'
                            }`}
                          >
                            {message.subject || '(No subject)'}
                          </p>
                          <p className="text-xs text-slate-600 truncate">
                            {message.body_text?.substring(0, 80)}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                          {message.has_attachments && (
                            <Paperclip className="h-3 w-3 text-slate-600" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(message);
                            }}
                            className="p-0.5"
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                message.is_starred
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-700 hover:text-slate-500'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden bg-slate-900">
            {selectedMessage ? (
              <MessageView
                message={selectedMessage}
                onReply={() => handleReply(selectedMessage)}
                onForward={() => handleForward(selectedMessage)}
                onArchive={() => moveToFolder(selectedMessage.id, 'archive')}
                onDelete={() => moveToFolder(selectedMessage.id, 'trash')}
                onToggleStar={() => toggleStar(selectedMessage)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-slate-800" />
                  <p className="text-sm text-slate-600">Select a message to read</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {composeOpen && selectedAccount && (
        <EmailCompose
          accounts={accounts}
          selectedAccountId={selectedAccount.id}
          initialData={composeData}
          onClose={() => {
            setComposeOpen(false);
            setComposeData(undefined);
          }}
          onSent={handleSent}
        />
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-700 overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-white">Email Account Settings</h3>
              <button
                onClick={() => {
                  setShowSettings(false);
                  loadEmailAccounts();
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <EmailAccountManager />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
