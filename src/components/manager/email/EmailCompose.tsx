import { useState, useRef } from 'react';
import { Send, X, RefreshCw, Minus, Maximize2, Paperclip, FileText, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  buildTenantWelcomeEmailHtml,
  buildTenantWelcomeEmailText,
  buildTenantWelcomeEmailSubject,
} from '../../email/TenantWelcomeEmailTemplate';

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

export interface AttachedFile {
  filename: string;
  content: string; // base64
  content_type: string;
  size: number;
}

interface EmailComposeProps {
  accounts: EmailAccount[];
  selectedAccountId: string;
  initialData?: Partial<ComposeData>;
  initialHtml?: string;
  initialAttachments?: AttachedFile[];
  onClose: () => void;
  onSent: () => void;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

const TEMPLATES = [
  { id: 'welcome', label: 'New Tenant Welcome' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailCompose({
  accounts,
  selectedAccountId,
  initialData,
  initialHtml,
  initialAttachments,
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
  const [attachments, setAttachments] = useState<AttachedFile[]>(initialAttachments || []);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [composedHtml, setComposedHtml] = useState<string | null>(initialHtml || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fromAccount = accounts.find((a) => a.id === fromAccountId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachError(null);
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachError(`"${file.name}" exceeds the 10 MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setAttachments((prev) => [
          ...prev,
          { filename: file.name, content: base64, content_type: file.type || 'application/octet-stream', size: file.size },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const applyTemplate = (templateId: string) => {
    setShowTemplates(false);
    if (templateId === 'welcome') {
      const subject = buildTenantWelcomeEmailSubject('{{Tenant Name}}');
      const bodyText = buildTenantWelcomeEmailText({
        tenantName: '{{Tenant Name}}',
        adminName: '{{Admin Name}}',
        tenantSlug: '',
      });
      const bodyHtml = buildTenantWelcomeEmailHtml({
        tenantName: '{{Tenant Name}}',
        adminName: '{{Admin Name}}',
        tenantSlug: '',
      });
      setForm((prev) => ({ ...prev, subject, body: bodyText }));
      setComposedHtml(bodyHtml);
      if (attachments.length === 0) {
        setAttachError('Remember to attach: Fund Administration Agreement and KYC/AML Protocols before sending.');
      }
    }
  };

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

      const bodyHtml = composedHtml ||
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap;">${form.body.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`;

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
          attachments: attachments.length
            ? attachments.map(({ filename, content, content_type }) => ({ filename, content, content_type }))
            : undefined,
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
    <div className="fixed bottom-0 right-6 z-40 w-[580px] bg-slate-900 border border-slate-700 border-b-0 rounded-t-xl shadow-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-xl border-b border-slate-700 flex-shrink-0">
        <span className="text-sm font-semibold text-white">New Message</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
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
              {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-slate-300 transition-colors px-1">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-slate-300 transition-colors px-1">Bcc</button>}
            </div>
          </div>

          {showCc && (
            <div className="flex items-center px-4 py-2">
              <span className="text-xs text-slate-500 w-14 flex-shrink-0">Cc</span>
              <input type="text" value={form.cc} onChange={(e) => setForm({ ...form, cc: e.target.value })} placeholder="cc@example.com" className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center px-4 py-2">
              <span className="text-xs text-slate-500 w-14 flex-shrink-0">Bcc</span>
              <input type="text" value={form.bcc} onChange={(e) => setForm({ ...form, bcc: e.target.value })} placeholder="bcc@example.com" className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none" />
            </div>
          )}

          <div className="flex items-center px-4 py-2">
            <span className="text-xs text-slate-500 w-14 flex-shrink-0">Subject</span>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => { setForm({ ...form, subject: e.target.value }); setComposedHtml(null); }}
              placeholder="Subject"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <textarea
            value={form.body}
            onChange={(e) => { setForm({ ...form, body: e.target.value }); setComposedHtml(null); }}
            rows={10}
            placeholder="Write your message..."
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <FileText className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 max-w-[160px] truncate">{a.filename}</span>
                <span className="text-xs text-slate-500">{formatBytes(a.size)}</span>
                <button onClick={() => removeAttachment(i)} className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {attachError && (
          <div className="mx-4 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-400">{attachError}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex-shrink-0">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={sending || !form.to.trim() || !form.subject.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? 'Sending...' : 'Send'}
          </button>

          <button
            onClick={() => { setAttachError(null); fileInputRef.current?.click(); }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Templates
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTemplates && (
              <div className="absolute bottom-full left-0 mb-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Templates</p>
                </div>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {fromAccount && (
          <span className="text-xs text-slate-500 truncate max-w-[180px]">
            from {fromAccount.email_address}
          </span>
        )}
      </div>
    </div>
  );
}
