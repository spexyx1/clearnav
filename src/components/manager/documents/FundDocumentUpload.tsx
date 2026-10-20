import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, FileText, AlertTriangle, RefreshCw, Trash2, ChevronRight, Loader2, ExternalLink, ScanText } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useTenantId } from '../../../lib/useTenantId';
import { useFunds } from '../history/useFunds';
import TenantNotice from '../TenantNotice';
import { PanelLoader } from '../../shared/Spinner';
import { Button, Pill, input } from '../onboarding/ui';
import {
  DOC_TYPES, checkFile, deleteDocument, docTypeLabel, isInvestorForm, loadDocuments, openDocument,
  readAndSave, retryDocument, uploadDocument, type FundDocument,
} from '../../../lib/documentIntake';

interface Props { onReviewDocument: (documentId: string) => void }

const size = (b: number | null) => (!b ? '' : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function statusOf(doc: FundDocument, reading: boolean) {
  if (doc.extraction_status === 'processing') {
    return reading
      ? { pill: <Pill tone="cyan"><Loader2 className="w-3 h-3 animate-spin" />Reading</Pill>, note: null, retry: false, review: false }
      : { pill: <Pill tone="amber">Reading stopped</Pill>, note: 'The page was closed before reading finished.', retry: true, review: false };
  }
  if (doc.extraction_status === 'failed') {
    return { pill: <Pill tone="red">Could not read</Pill>, note: doc.extraction_error ?? 'No reason was recorded.', retry: true, review: true };
  }
  if (doc.extraction_status === 'approved') {
    return { pill: <Pill tone="green">Approved</Pill>, note: null, retry: false, review: true };
  }
  if (doc.review?.approval_status === 'rejected') {
    return { pill: <Pill tone="red">Rejected</Pill>, note: doc.review.rejection_notes ? `Reason: ${doc.review.rejection_notes}` : null, retry: false, review: true };
  }
  if (doc.extraction_status === 'awaiting_review') {
    return {
      pill: <span className="flex gap-1.5"><Pill tone="cyan">Ready for review</Pill><Pill tone="amber">Fill in by hand</Pill></span>,
      note: doc.extraction_error, retry: false, review: true,
    };
  }
  const found = doc.review?.found;
  return { pill: <Pill tone="cyan">Ready for review</Pill>, note: found ? `${found} details found. Check each one against the document.` : null, retry: false, review: true };
}

export default function FundDocumentUpload({ onReviewDocument }: Props) {
  const { user } = useAuth();
  const { tenantId, state, retry } = useTenantId();
  const { funds, fundId, setFundId } = useFunds(tenantId);
  const [documents, setDocuments] = useState<FundDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [docType, setDocType] = useState('trust_deed');
  const [uploading, setUploading] = useState(false);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    try {
      setDocuments(await loadDocuments(tenantId));
      setLoadError(null);
    } catch (e) {
      setLoadError(errText(e, 'Could not load documents.'));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { refresh(); }, [refresh]);

  const track = (id: string, on: boolean) =>
    setReading((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const pick = async (file: File) => {
    const problem = await checkFile(file);
    setError(problem);
    setSelected(problem ? null : file);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleUpload = async () => {
    if (!selected || !tenantId) return;
    setUploading(true);
    setError(null);
    try {
      const doc = await uploadDocument(tenantId, selected, docType, fundId || null, user?.id ?? null);
      const file = selected;
      setSelected(null);
      track(doc.id, true);
      await refresh();
      try {
        await readAndSave(doc, file);
      } catch (e) {
        setError(errText(e, 'The document could not be read.'));
      } finally {
        track(doc.id, false);
        await refresh();
      }
    } catch (e) {
      setError(errText(e, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (doc: FundDocument) => {
    setError(null);
    track(doc.id, true);
    setDocuments((ds) => ds.map((d) => (d.id === doc.id ? { ...d, extraction_status: 'processing' } : d)));
    try {
      await retryDocument(doc);
    } catch (e) {
      setError(errText(e, 'The document could not be read.'));
    } finally {
      track(doc.id, false);
      await refresh();
    }
  };

  const handleDelete = async (doc: FundDocument) => {
    setBusy(doc.id);
    setError(null);
    try {
      await deleteDocument(doc);
      setConfirmDelete(null);
    } catch (e) {
      setError(errText(e, 'Could not delete the document.'));
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  const handleOpen = async (doc: FundDocument) => {
    try {
      window.open(await openDocument(doc), '_blank', 'noopener');
    } catch (e) {
      setError(errText(e, 'The file could not be opened.'));
    }
  };

  if (state === 'loading') return <PanelLoader />;
  if (state !== 'ready') return <TenantNotice state={state} retry={retry} />;
  if (loading) return <PanelLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white">Document Intelligence</h3>
        <p className="text-slate-400 mt-1 text-sm max-w-3xl leading-relaxed">
          Upload a trust deed, information memorandum or an investor's application form. The app reads PDFs on this screen and fills in
          what it finds, with the clause and page each value came from. Nothing is applied until you check and approve it.
        </p>
      </div>

      <input ref={fileInput} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300/70 hover:text-red-200 text-xs">Dismiss</button>
        </div>
      )}

      {!selected ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
          onClick={() => fileInput.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'}`}>
          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-200 font-medium">Drop a document here, or click to choose one</p>
          <p className="text-slate-500 text-sm mt-1">PDF, Word or text, up to 50 MB. PDFs are read automatically; Word files and scanned pages are filled in by hand.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/15 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-cyan-300" /></div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{selected.name}</p>
              <p className="text-slate-400 text-sm">{size(selected.size)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm text-slate-300 mb-1.5">What is this document?</span>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className={input}>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {isInvestorForm(docType) && <span className="block text-xs text-slate-500 mt-1">One investor per form. Approving it adds an application to Onboarding; no units are issued.</span>}
            </label>
            <label className="block">
              <span className="block text-sm text-slate-300 mb-1.5">Fund</span>
              <select value={fundId} onChange={(e) => setFundId(e.target.value)} className={input}>
                {funds.length === 0 && <option value="">No active fund</option>}
                {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button tone="quiet" onClick={() => setSelected(null)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} loading={uploading}><ScanText className="w-3.5 h-3.5" />Upload and read</Button>
          </div>
        </div>
      )}

      {loadError && <p className="text-sm text-red-300">{loadError} <button onClick={refresh} className="underline">Try again</button></p>}

      {documents.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Uploaded documents</h4>
          {documents.map((doc) => {
            const s = statusOf(doc, reading.has(doc.id));
            const isReading = doc.extraction_status === 'processing' && reading.has(doc.id);
            return (
              <div key={doc.id} className="rounded-xl border border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-colors p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-slate-300" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate text-sm">{doc.file_name}</p>
                        <button onClick={() => handleOpen(doc)} className="text-slate-500 hover:text-cyan-300 transition-colors" title="Open the file"><ExternalLink className="w-3.5 h-3.5" /></button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {docTypeLabel(doc.document_type)} · {size(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {s.note && <p className={`text-xs mt-1 ${doc.extraction_status === 'failed' || doc.review?.approval_status === 'rejected' ? 'text-red-300' : 'text-slate-400'}`}>{s.note}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.pill}
                    {s.retry && <Button tone="quiet" onClick={() => handleRetry(doc)}><RefreshCw className="w-3.5 h-3.5" />Try again</Button>}
                    {s.review && (
                      <Button tone={doc.extraction_status === 'approved' ? 'quiet' : 'primary'} onClick={() => onReviewDocument(doc.id)}>
                        {doc.extraction_status === 'approved' ? 'View' : 'Review'}<ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!isReading && (confirmDelete === doc.id ? (
                      <span className="flex items-center gap-1.5">
                        <Button tone="danger" loading={busy === doc.id} onClick={() => handleDelete(doc)}>Delete</Button>
                        <Button tone="quiet" onClick={() => setConfirmDelete(null)}>Keep</Button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(doc.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete document">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
                {confirmDelete === doc.id && (
                  <p className="text-xs text-amber-300 mt-3">
                    This removes the file and its review. Fund settings or Onboarding applications already approved from it stay as they are.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : !selected && <p className="text-center text-slate-500 text-sm py-6">No documents uploaded yet.</p>}
    </div>
  );
}
