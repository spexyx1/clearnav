import { useState, useEffect } from 'react';
import { Mail, Send, Trash2, Archive, Star, Search, RefreshCw, Paperclip, ChevronLeft, X, Inbox, FileText, Send as SentIcon, Folder } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { sanitizeHtml } from '../../lib/sanitize';

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

interface EmailThread {
  id: string;
  subject: string;
  participants: any;
  message_count: number;
  last_message_at: string;
}

export default function EmailClient() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    if (user) {
      loadEmailAccounts();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadMessages();
    }
  }, [selectedAccount, currentFolder]);

  const loadEmailAccounts = async () => {
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

      if (accessError) {
        throw accessError;
      }

      const accountsList = accessData
        .filter(a => a.email_accounts)
        .map(a => a.email_accounts as unknown as EmailAccount);

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
  };

  const loadMessages = async () => {
    if (!selectedAccount) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('account_id', selectedAccount.id)
        .eq('folder', currentFolder)
        .order('received_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setMessages(data || []);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('email_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, is_read: true } : m
    ));
  };

  const toggleStar = async (message: EmailMessage) => {
    const newStarred = !message.is_starred;
    await supabase
      .from('email_messages')
      .update({ is_starred: newStarred })
      .eq('id', message.id);

    setMessages(messages.map(m =>
      m.id === message.id ? { ...m, is_starred: newStarred } : m
    ));

    if (selectedMessage?.id === message.id) {
      setSelectedMessage({ ...message, is_starred: newStarred });
    }
  };

  const moveToFolder = async (messageId: string, folder: string) => {
    await supabase
      .from('email_messages')
      .update({ folder })
      .eq('id', messageId);

    setMessages(messages.filter(m => m.id !== messageId));
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
  };

  const handleCompose = () => {
    setComposing(true);
    setSelectedMessage(null);
    setComposeForm({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
    });
  };

  const handleSendEmail = async () => {
    if (!selectedAccount || !composeForm.to || !composeForm.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          to: composeForm.to.split(',').map((e: string) => e.trim()).filter(Boolean),
          cc: composeForm.cc ? composeForm.cc.split(',').map((e: string) => e.trim()).filter(Boolean) : undefined,
          subject: composeForm.subject,
          body_text: composeForm.body,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send');

      setComposing(false);
      setComposeForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
      if (currentFolder === 'sent') {
        loadMessages();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    }
  };

  const handleReply = () => {
    if (!selectedMessage) return;

    setComposing(true);
    setComposeForm({
      to: selectedMessage.from_address,
      cc: '',
      bcc: '',
      subject: `Re: ${selectedMessage.subject}`,
      body: `\n\n--- Original Message ---\nFrom: ${selectedMessage.from_name || selectedMessage.from_address}\nDate: ${new Date(selectedMessage.received_at || selectedMessage.created_at).toLocaleString()}\n\n${selectedMessage.body_text || ''}`
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const folders = [
    { id: 'inbox', name: 'Inbox', icon: Inbox },
    { id: 'sent', name: 'Sent', icon: SentIcon },
    { id: 'drafts', name: 'Drafts', icon: FileText },
    { id: 'archive', name: 'Archive', icon: Archive },
    { id: 'trash', name: 'Trash', icon: Trash2 }
  ];

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-2" />
          <p className="text-slate-300">Loading email accounts...</p>
        </div>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <Mail className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">Failed to Load Email Accounts</h3>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => loadEmailAccounts()}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Mail className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">No Email Accounts</h3>
          <p className="text-slate-300">You don't have access to any email accounts yet.</p>
          <p className="text-sm text-slate-400 mt-2">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Mail className="h-6 w-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Email</h2>

            {accounts.length > 1 && (
              <select
                value={selectedAccount?.id || ''}
                onChange={(e) => {
                  const account = accounts.find(a => a.id === e.target.value);
                  setSelectedAccount(account || null);
                }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg text-sm hover:bg-slate-600"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.email_address}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={loadMessages}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-slate-300" />
            </button>
            <button
              onClick={handleCompose}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Compose
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-900">
        <div className="w-48 border-r border-slate-700 bg-slate-800 p-2">
          {folders.map(folder => {
            const Icon = folder.icon;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setCurrentFolder(folder.id);
                  setSelectedMessage(null);
                  setComposing(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentFolder === folder.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{folder.name}</span>
              </button>
            );
          })}
        </div>

        <div className="w-96 border-r border-slate-700 bg-slate-850 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <Folder className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                <p>No messages in {currentFolder}</p>
              </div>
            </div>
          ) : (
            <div>
              {messages.map(message => (
                <button
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    setComposing(false);
                    if (!message.is_read) {
                      markAsRead(message.id);
                    }
                  }}
                  className={`w-full p-4 border-b border-slate-700 text-left hover:bg-slate-700/50 transition-colors ${
                    selectedMessage?.id === message.id ? 'bg-cyan-900/30' : ''
                  } ${!message.is_read ? 'bg-cyan-900/20' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-sm truncate flex-1 ${
                      !message.is_read ? 'font-semibold text-white' : 'text-slate-300'
                    }`}>
                      {message.from_name || message.from_address}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      {message.has_attachments && (
                        <Paperclip className="h-3 w-3 text-slate-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(message);
                        }}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            message.is_starred
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-slate-500'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm mb-1 truncate ${
                    !message.is_read ? 'font-medium text-white' : 'text-slate-400'
                  }`}>
                    {message.subject || '(No subject)'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {message.body_text?.substring(0, 60)}...
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDate(message.received_at || message.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-900">
          {composing ? (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">New Message</h3>
                <button
                  onClick={() => setComposing(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    To
                  </label>
                  <input
                    type="text"
                    value={composeForm.to}
                    onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    CC
                  </label>
                  <input
                    type="text"
                    value={composeForm.cc}
                    onChange={(e) => setComposeForm({ ...composeForm, cc: e.target.value })}
                    placeholder="cc@example.com"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Message
                  </label>
                  <textarea
                    value={composeForm.body}
                    onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                    rows={12}
                    placeholder="Write your message..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSendEmail}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                  <button
                    onClick={() => setComposing(false)}
                    className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedMessage ? (
            <div className="p-6">
              <div className="mb-6 pb-4 border-b border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {selectedMessage.subject || '(No subject)'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="font-medium text-slate-300">
                        {selectedMessage.from_name || selectedMessage.from_address}
                      </span>
                      <span className="text-slate-500">
                        {formatDate(selectedMessage.received_at || selectedMessage.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(selectedMessage);
                    }}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        selectedMessage.is_starred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-500'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleReply}
                    className="px-3 py-1 text-sm border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => moveToFolder(selectedMessage.id, 'archive')}
                    className="px-3 py-1 text-sm border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 flex items-center gap-1"
                  >
                    <Archive className="h-3 w-3" />
                    Archive
                  </button>
                  <button
                    onClick={() => moveToFolder(selectedMessage.id, 'trash')}
                    className="px-3 py-1 text-sm border border-red-700 text-red-400 rounded-lg hover:bg-red-900/20 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                {selectedMessage.body_html ? (
                  <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedMessage.body_html) }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-slate-300">
                    {selectedMessage.body_text}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                <p>Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
