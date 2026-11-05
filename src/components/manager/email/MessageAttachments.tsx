import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Download, Loader2, Paperclip, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatBytes } from '../../../lib/format';

interface AttachmentRecord {
  id: string;
  file_name: string;
  file_size: number;
  status: 'safe' | 'blocked' | 'failed' | null;
  status_reason: string | null;
  storage_path: string | null;
}

interface MessageAttachmentsProps {
  messageId: string;
}

export default function MessageAttachments({ messageId }: MessageAttachmentsProps) {
  const [attachments, setAttachments] = useState<AttachmentRecord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAttachments(null);
    setLoadFailed(false);
    setDownloadError(null);

    supabase
      .from('email_attachments')
      .select('id, file_name, file_size, status, status_reason, storage_path')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data)) {
          setLoadFailed(true);
          return;
        }
        setAttachments(data as AttachmentRecord[]);
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  async function handleDownload(item: AttachmentRecord) {
    if (!item.storage_path) return;
    setDownloadingId(item.id);
    setDownloadError(null);

    const { data, error } = await supabase.storage
      .from('email-attachments')
      .createSignedUrl(item.storage_path, 60, { download: item.file_name });

    setDownloadingId(null);
    if (error || !data?.signedUrl) {
      setDownloadError(`Could not download ${item.file_name}. Please try again.`);
      return;
    }
    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.rel = 'noopener noreferrer';
    link.click();
  }

  if (loadFailed) {
    return (
      <p className="mb-5 text-sm text-red-400">Attachments could not be loaded.</p>
    );
  }

  if (attachments === null || attachments.length === 0) return null;

  const hasDownloads = attachments.some((item) => item.status === 'safe');

  return (
    <section className="mb-6 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-200">
        <Paperclip className="h-4 w-4 text-cyan-400" />
        <span>Attachments ({attachments.length})</span>
      </div>

      <ul className="divide-y divide-slate-700/60">
        {attachments.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <AttachmentStatusIcon status={item.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 truncate">{item.file_name}</p>
              <p className={`text-xs ${item.status === 'blocked' ? 'text-red-400' : item.status === 'failed' ? 'text-amber-400' : 'text-slate-500'}`}>
                {describeStatus(item)}
              </p>
            </div>
            {item.status === 'safe' && (
              <button
                onClick={() => handleDownload(item)}
                disabled={downloadingId === item.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              >
                {downloadingId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download
              </button>
            )}
          </li>
        ))}
      </ul>

      {downloadError && <p className="mt-3 text-xs text-red-400">{downloadError}</p>}
      {hasDownloads && (
        <p className="mt-3 text-xs text-slate-500">
          Only open attachments you expect, especially from unknown senders.
        </p>
      )}
    </section>
  );
}

function AttachmentStatusIcon({ status }: { status: AttachmentRecord['status'] }) {
  if (status === 'blocked') return <Ban className="h-5 w-5 flex-shrink-0 text-red-400" />;
  if (status === 'failed') return <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />;
  if (status === 'safe') return <ShieldAlert className="h-5 w-5 flex-shrink-0 text-cyan-400" />;
  return <Paperclip className="h-5 w-5 flex-shrink-0 text-slate-500" />;
}

function describeStatus(item: AttachmentRecord): string {
  const size = formatBytes(item.file_size);
  if (item.status === 'blocked' || item.status === 'failed') {
    return item.status_reason ?? 'This attachment is not available.';
  }
  if (item.status === 'safe') return `${size}`;
  return `${size} - sent with this message`;
}
