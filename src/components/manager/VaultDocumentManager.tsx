import { useState, useEffect, useRef } from 'react';
import { Lock, Upload, Trash2, Eye, EyeOff, Plus, FileText, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface VaultDocument {
  id: string;
  document_name: string;
  document_type: string;
  storage_path: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const DOC_TYPE_OPTIONS = [
  { value: 'pitch_deck',      label: 'Pitch Deck' },
  { value: 'term_sheet',      label: 'Term Sheet' },
  { value: 'one_pager',       label: 'One-Pager' },
  { value: 'trade_history',   label: 'Trade History' },
  { value: 'strategy_report', label: 'Strategy Report' },
  { value: 'other',           label: 'Other' },
];

interface UploadForm {
  document_name: string;
  document_type: string;
  description: string;
  file: File | null;
}

const EMPTY_FORM: UploadForm = {
  document_name: '',
  document_type: 'pitch_deck',
  description: '',
  file: null,
};

export default function VaultDocumentManager() {
  const { currentTenant } = useAuth();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentTenant?.id) loadDocuments();
  }, [currentTenant?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadDocuments = async () => {
    if (!currentTenant?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('investor_vault_documents')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('sort_order', { ascending: true });
    if (!error) setDocuments(data ?? []);
    setLoading(false);
  };

  const handleToggleActive = async (doc: VaultDocument) => {
    const { error } = await supabase
      .from('investor_vault_documents')
      .update({ is_active: !doc.is_active })
      .eq('id', doc.id);
    if (error) {
      setToast({ type: 'error', message: 'Failed to update document visibility.' });
    } else {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_active: !d.is_active } : d))
      );
    }
  };

  const handleDelete = async (doc: VaultDocument) => {
    if (!confirm(`Delete "${doc.document_name}"? This cannot be undone.`)) return;

    // Remove from storage
    if (doc.storage_path) {
      await supabase.storage.from('investor-documents').remove([doc.storage_path]);
    }

    const { error } = await supabase
      .from('investor_vault_documents')
      .delete()
      .eq('id', doc.id);

    if (error) {
      setToast({ type: 'error', message: 'Failed to delete document.' });
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setToast({ type: 'success', message: 'Document deleted.' });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.document_name.trim() || !currentTenant?.id) return;

    setUploading(true);
    try {
      const ext = form.file.name.split('.').pop() ?? 'pdf';
      const path = `${currentTenant.id}/${Date.now()}-${form.document_type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('investor-documents')
        .upload(path, form.file, { upsert: false });

      if (uploadError) throw uploadError;

      const maxOrder = documents.reduce((max, d) => Math.max(max, d.sort_order), -1);

      const { error: insertError } = await supabase
        .from('investor_vault_documents')
        .insert({
          tenant_id:     currentTenant.id,
          document_name: form.document_name.trim(),
          document_type: form.document_type,
          storage_path:  path,
          description:   form.description.trim(),
          sort_order:    maxOrder + 1,
          is_active:     true,
        });

      if (insertError) throw insertError;

      setToast({ type: 'success', message: 'Document uploaded successfully.' });
      setForm(EMPTY_FORM);
      setShowUpload(false);
      loadDocuments();
    } catch {
      setToast({ type: 'error', message: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Investor Vault</h1>
            <p className="text-sm text-slate-400">
              Manage documents shown at{' '}
              <span className="font-mono text-slate-300">arklinetrust.com/vault</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Vault URL callout */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-slate-300 font-medium mb-0.5">Vault access passphrase is configured</p>
          <p className="text-slate-500">
            Share the URL <span className="font-mono text-slate-300">arklinetrust.com/vault</span> privately with prospective investors. They will be prompted for the passphrase before any documents are shown.
          </p>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white">Upload Document</h2>
              <button onClick={() => { setShowUpload(false); setForm(EMPTY_FORM); }} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Document Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.document_name}
                  onChange={(e) => setForm({ ...form, document_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  placeholder="e.g. Arkline Trust Pitch Deck 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Document Type *
                </label>
                <select
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
                >
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                  placeholder="Short description shown on the document card"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  File (PDF) *
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500/40 transition-colors"
                >
                  {form.file ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>{form.file.name}</span>
                      <span className="text-slate-500">({(form.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Click to select a PDF file</p>
                      <p className="text-xs text-slate-600 mt-1">Max 50 MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setForm(EMPTY_FORM); }}
                  className="flex-1 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !form.file || !form.document_name.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <Lock className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-1">No documents uploaded yet</p>
          <p className="text-slate-600 text-sm mb-6">
            Upload your pitch deck, term sheet, and one-pager to make them available to prospects.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-lg border transition-all ${
                doc.is_active
                  ? 'bg-slate-800/40 border-slate-700/50'
                  : 'bg-slate-900/40 border-slate-800/40 opacity-50'
              }`}
            >
              <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{doc.document_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-amber-400/70">
                    {DOC_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label ?? doc.document_type}
                  </span>
                  {doc.description && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500 truncate">{doc.description}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleActive(doc)}
                  title={doc.is_active ? 'Hide from vault' : 'Show in vault'}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  {doc.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  title="Delete document"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl z-50 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900 border border-emerald-700 text-emerald-200'
              : 'bg-red-900 border border-red-700 text-red-200'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
            : <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
