import { useEffect, useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { EmptyState } from '../shared/EmptyState';
import { PanelLoader } from '../shared/Spinner';
import type { BadgeTone } from '../shared/Badge';
import { formatDate } from '../../lib/format';

type DocFilter = 'all' | 'quarterly_letter' | 'annual_report' | 'other';

const FILTER_LABELS: Record<DocFilter, string> = {
  all: 'All',
  quarterly_letter: 'Quarterly',
  annual_report: 'Annual',
  other: 'Other',
};

const DOC_TYPE_META: Record<string, { label: string; tone: BadgeTone }> = {
  quarterly_letter: { label: 'Quarterly Letter', tone: 'info' },
  annual_report:    { label: 'Annual Report',    tone: 'success' },
  other:            { label: 'Other',            tone: 'neutral' },
};

function docMeta(type: string) {
  return DOC_TYPE_META[type] ?? DOC_TYPE_META.other;
}

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DocFilter>('all');

  useEffect(() => { loadDocuments(); }, [filter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('document_type', filter);
      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.warn('Documents load error:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-h1 text-white">Documents & Reports</h2>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(FILTER_LABELS) as DocFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1.5 rounded-input text-meta font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                filter === f
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-surface-2 text-brand-text-secondary hover:text-white hover:bg-slate-700'
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <PanelLoader />
      ) : documents.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No documents yet"
            body={
              filter === 'all'
                ? 'Your manager will share quarterly letters, annual reports, and other documents here. Check back after your next reporting period.'
                : `No ${FILTER_LABELS[filter].toLowerCase()} documents have been shared yet.`
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const meta = docMeta(doc.document_type);
            return (
              <div
                key={doc.id}
                className="bg-brand-surface border border-brand-border rounded-card shadow-card p-5 hover:border-slate-600 transition-colors duration-150 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 bg-brand-surface-2 rounded-input flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-brand-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-body font-semibold text-white leading-snug mb-1 truncate">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-meta text-brand-text-muted line-clamp-2 mb-2">{doc.description}</p>
                    )}
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-brand-border">
                  <div className="flex items-center gap-1.5 text-meta text-brand-text-muted">
                    <Calendar className="w-3.5 h-3.5" aria-hidden />
                    <span>{doc.period || formatDate(doc.created_at, 'short')}</span>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${doc.title}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-meta font-medium rounded-input transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
