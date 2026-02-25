import { useState } from 'react';
import { Send, X, RefreshCw, ChevronDown, Minus, Maximize2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string;
  account_type: string;
}

interface ComposeData {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

interface EmailComposeProps {
  accounts: EmailAccount[];
  selectedAccountId: string;
  initialData?: Partial<ComposeData>;
  onClose: () => void;
  onSent: () => void;
}

export default function EmailCompose({
  accounts,
  selectedAccountId,
  initialData,
  onClose,
  onSent,
}: EmailComposeProps) {
  const [fromAccountId, setFromAccountId] = useState(selectedAccountId);
  const [form, setForm] = useState<ComposeData>({
    to: initialData?.to || '',
    cc: initialData?.cc || '',
    bcc: initialData?.bcc || '',
    subject: initialData?.subject || '',
    body: initialData?.body || '',
  });
  const [showCc, setShowCc] = useState(!!initialData?.cc);
  const [showBcc, setShowBcc] = useState(!!initialData?.bcc);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  const handleSend = async () => {
    if (!form.to.trim() || !form.subject.trim()) {
      setError('Recipient and subject are required');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const toList = form.to.split(',').map((e: string) => e.trim()).filter(Boolean);
      const ccList = form.cc ? form.cc.split(',').map((e: string) => e.trim()).filter(Boolean) : undefined;
      const bccList = form.bcc ? form.bcc.split(',').map((e: string) => e.trim()).filter(Boolean) : undefined;

      const bodyHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap;">${form.body.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: fromAccountId,
          to: toList,
          cc: ccList,
          bcc: bccList,
          subject: form.subject,
          body_text: form.body,
          body_html: bodyHtml,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send');

      onSent();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-40 w-72 bg-slate-800 border border-slate-700 border-b-0 rounded-t-lg shadow-2xl">
        <button
          onClick={() => setMinimized(false)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors rounded-t-lg"
        >
          <span className="text-sm font-medium text-white truncate">
            {form.subject || 'New Message'}
          </span>
          <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-6 z-40 w-[560px] bg-slate-900 border border-slate-700 border-b-0 rounded-t-xl shadow-2xl flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-xl border-b border-slate-700">
        <span className="text-sm font-semibold text-white">New Message</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-slate-800">
          {accounts.length > 1 && (
            <div className="flex items-center px-4 py-2">
              <span className="text-xs text-slate-500 w-14 flex-shrink-0">From</span>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white focus:outline-none cursor-pointer"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-800">
                    {a.display_name} &lt;{a.email_address}&gt;
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center px-4 py-2">
            <span className="text-xs text-slate-500 w-14 flex-shrink-0">To</span>
            <input
              type="text"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="hover:text-slate-300 transition-colors px-1">Cc</button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="hover:text-slate-300 transition-colors px-1">Bcc</button>
              )}
            </div>
          </div>

          {showCc && (
            <div className="flex items-center px-4 py-2">
              <span className="text-xs text-slate-500 w-14 flex-shrink-0">Cc</span>
              <input
                type="text"
                value={form.cc}
                onChange={(e) => setForm({ ...form, cc: e.target.value })}
                placeholder="cc@example.com"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center px-4 py-2">
              <span className="text-xs text-slate-500 w-14 flex-shrink-0">Bcc</span>
              <input
                type="text"
                value={form.bcc}
                onChange={(e) => setForm({ ...form, bcc: e.target.value })}
                placeholder="bcc@example.com"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center px-4 py-2">
            <span className="text-xs text-slate-500 w-14 flex-shrink-0">Subject</span>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Subject"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 py-3">
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={10}
            placeholder="Write your message..."
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
        <button
          onClick={handleSend}
          disabled={sending || !form.to.trim() || !form.subject.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {sending ? 'Sending...' : 'Send'}
        </button>

        {fromAccount && (
          <span className="text-xs text-slate-500 truncate max-w-[200px]">
            from {fromAccount.email_address}
          </span>
        )}
      </div>
    </div>
  );
}
