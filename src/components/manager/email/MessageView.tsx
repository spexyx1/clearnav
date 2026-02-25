import { Archive, Trash2, Star, Reply, Forward, Clock, CornerUpRight } from 'lucide-react';
import { sanitizeHtml } from '../../../lib/sanitize';

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

interface MessageViewProps {
  message: EmailMessage;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}

function formatFullDate(dateString: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function parseAddresses(addresses: any): string {
  if (!addresses) return '';
  if (typeof addresses === 'string') return addresses;
  if (Array.isArray(addresses)) {
    return addresses
      .map((a: any) => (typeof a === 'string' ? a : a.email || a.address || ''))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export default function MessageView({
  message,
  onReply,
  onForward,
  onArchive,
  onDelete,
  onToggleStar,
}: MessageViewProps) {
  const dateStr = message.sent_at || message.received_at || message.created_at;
  const toStr = parseAddresses(message.to_addresses);
  const ccStr = parseAddresses(message.cc_addresses);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-700/50">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-white leading-snug flex-1">
            {message.subject || '(No subject)'}
          </h2>
          <button
            onClick={onToggleStar}
            className="p-1 flex-shrink-0"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                message.is_starred
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            />
          </button>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-sm font-semibold text-cyan-300">
              {(message.from_name || message.from_address || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white text-sm">
                {message.from_name || message.from_address}
              </span>
              {message.from_name && (
                <span className="text-xs text-slate-500">&lt;{message.from_address}&gt;</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              <span>{formatFullDate(dateStr)}</span>
            </div>
            {toStr && (
              <div className="mt-1 text-xs text-slate-500">
                <span className="text-slate-600">To: </span>{toStr}
              </div>
            )}
            {ccStr && (
              <div className="text-xs text-slate-500">
                <span className="text-slate-600">Cc: </span>{ccStr}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
          <button
            onClick={onForward}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <CornerUpRight className="h-3.5 w-3.5" />
            Forward
          </button>
          <div className="flex-1" />
          <button
            onClick={onArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-red-900/30 text-red-400 rounded-lg border border-slate-700 hover:border-red-800 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {message.body_html ? (
          <div
            className="prose prose-invert prose-sm max-w-none text-slate-300
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-slate-600 prose-blockquote:text-slate-400
              prose-code:text-cyan-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
              prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body_html) }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">
            {message.body_text || '(No content)'}
          </pre>
        )}
      </div>
    </div>
  );
}
