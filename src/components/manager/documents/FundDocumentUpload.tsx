import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, FileText, Clock, CheckCircle, XCircle, Loader2,
  AlertTriangle, RefreshCw, Trash2, ChevronRight, Plus, File
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface FundDocument {
  id: string;
  tenant_id: string;
  fund_id: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  extraction_status: 'pending' | 'processing' | 'extracted' | 'approved' | 'failed';
  extraction_error: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
}

interface FundDocumentUploadProps {
  onReviewDocument: (documentId: string) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  trust_deed: 'Trust Deed',
  im: 'Information Memorandum',
  ppm: 'Private Placement Memorandum',
  subscription_agreement: 'Subscription Agreement',
  other: 'Other Document',
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: Clock },
  processing: { label: 'Analyzing...', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Loader2 },
  extracted: { label: 'Ready for Review', color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: CheckCircle },
  approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
};

export default function FundDocumentUpload({ onReviewDocument }: FundDocumentUploadProps) {
  const { currentTenant, user } = useAuth();
  const [documents, setDocuments] = useState<FundDocument[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    document_type: 'trust_deed',
    fund_id: '',
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (currentTenant?.id) {
      loadDocuments();
      loadFunds();
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentTenant]);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fund_documents')
      .select('*')
      .eq('tenant_id', currentTenant?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as FundDocument[]);
      const hasProcessing = data.some((d) => d.extraction_status === 'processing');
      if (hasProcessing) startPolling();
    }
    setLoading(false);
  };

  const loadFunds = async () => {
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');
    if (data) setFunds(data);
  };

  const startPolling = () => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('fund_documents')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDocuments(data as FundDocument[]);
        const hasProcessing = data.some((d) => d.extraction_status === 'processing');
        if (!hasProcessing && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, 3000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleFileSelect = (file: File) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowed.includes(file.type)) {
      setError('Only PDF, Word (.doc/.docx), and text files are supported');
      return;
    }
    if (file.size > 52428800) {
      setError('File size must be under 50MB');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setShowUploadForm(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentTenant?.id) return;
    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      const ext = selectedFile.name.split('.').pop();
      const storagePath = `${currentTenant.id}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      setUploadProgress(30);

      const { error: storageError } = await supabase.storage
        .from('fund-documents')
        .upload(storagePath, selectedFile, { upsert: false });

      if (storageError) throw new Error(`Upload failed: ${storageError.message}`);

      setUploadProgress(60);

      const { data: docData, error: dbError } = await supabase
        .from('fund_documents')
        .insert({
          tenant_id: currentTenant.id,
          fund_id: uploadForm.fund_id || null,
          document_type: uploadForm.document_type,
          file_name: selectedFile.name,
          file_url: storagePath,
          file_size_bytes: selectedFile.size,
          extraction_status: 'processing',
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      setUploadProgress(80);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-fund-document`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fund_document_id: docData.id }),
          }
        ).catch(() => {});
      }

      setUploadProgress(100);
      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadForm({ document_type: 'trust_deed', fund_id: '' });
      await loadDocuments();
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRetryExtraction = async (doc: FundDocument) => {
    await supabase
      .from('fund_documents')
      .update({ extraction_status: 'processing', extraction_error: null, updated_at: new Date().toISOString() })
      .eq('id', doc.id);

    setDocuments((prev) =>
      prev.map((d) => d.id === doc.id ? { ...d, extraction_status: 'processing' } : d)
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-fund-document`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fund_document_id: doc.id }),
        }
      ).catch(() => {});
    }
    startPolling();
  };

  const handleDelete = async (doc: FundDocument) => {
    await supabase.storage.from('fund-documents').remove([doc.file_url]);
    await supabase.from('fund_documents').delete().eq('id', doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-white">Document Intelligence</h3>
          <p className="text-slate-400 mt-1 text-sm">
            Upload fund documents and let AI extract fund structure, share classes, and investor details
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />

      {!showUploadForm && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'
          }`}
        >
          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Drop your fund document here</p>
          <p className="text-slate-500 text-sm mt-1">
            Supports Trust Deeds, IMs, PPMs &mdash; PDF, Word, or text &bull; Max 50MB
          </p>
        </div>
      )}

      {showUploadForm && selectedFile && (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-slate-400 text-sm">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Document Type</label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="trust_deed">Trust Deed</option>
                  <option value="im">Information Memorandum (IM)</option>
                  <option value="ppm">Private Placement Memorandum (PPM)</option>
                  <option value="subscription_agreement">Subscription Agreement</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Link to Existing Fund <span className="text-slate-500">(optional)</span>
                </label>
                <select
                  value={uploadForm.fund_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, fund_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="">Create new fund from document</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fund_code} — {f.fund_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {uploadProgress < 60 ? 'Uploading...' : uploadProgress < 80 ? 'Saving...' : 'Starting AI analysis...'}
                  </span>
                  <span className="text-cyan-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowUploadForm(false); setSelectedFile(null); setError(null); }}
                disabled={uploading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? 'Uploading...' : 'Upload & Analyze'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Uploaded Documents</h4>
          {documents.map((doc) => {
            const status = STATUS_CONFIG[doc.extraction_status];
            const StatusIcon = status.icon;
            const isProcessing = doc.extraction_status === 'processing';
            const canReview = doc.extraction_status === 'extracted';

            return (
              <div
                key={doc.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <File className="w-5 h-5 text-slate-300" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium truncate text-sm">{doc.file_name}</p>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {formatFileSize(doc.file_size_bytes)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-slate-400">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {doc.extraction_error && (
                      <p className="text-xs text-red-400 mt-1 truncate">{doc.extraction_error}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>{status.label}</span>
                    </span>

                    {canReview && (
                      <button
                        onClick={() => onReviewDocument(doc.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {doc.extraction_status === 'approved' && (
                      <button
                        onClick={() => onReviewDocument(doc.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {doc.extraction_status === 'failed' && (
                      <button
                        onClick={() => handleRetryExtraction(doc)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Retry extraction"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    {!isProcessing && (
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {documents.length === 0 && !showUploadForm && (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No documents uploaded yet</p>
        </div>
      )}
    </div>
  );
}
