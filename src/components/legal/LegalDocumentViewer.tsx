import { useEffect, useState } from 'react';
import { FileText, Calendar, Scale, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LegalSection {
  title: string;
  content: string;
}

interface LegalDocument {
  id: string;
  title: string;
  version: string;
  effective_date: string;
  last_updated: string;
  content: {
    sections: LegalSection[];
    lastUpdated?: string;
  };
}

interface LegalDocumentViewerProps {
  documentType: 'terms' | 'privacy';
  tenantId?: string | null;
}

export default function LegalDocumentViewer({ documentType, tenantId }: LegalDocumentViewerProps) {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    loadDocument();
  }, [documentType, tenantId]);

  async function loadDocument() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc(
        'get_applicable_legal_document',
        {
          p_tenant_id: tenantId,
          p_document_type: documentType
        }
      );

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setDocument(data[0]);
        setExpandedSections(new Set(data[0].content.sections.map((_: any, i: number) => i)));
      } else {
        setError('Legal document not found');
      }
    } catch (err) {
      console.error('Error loading legal document:', err);
      setError('Failed to load legal document');
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(index: number) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  }

  function expandAll() {
    if (document) {
      setExpandedSections(new Set(document.content.sections.map((_, i) => i)));
    }
  }

  function collapseAll() {
    setExpandedSections(new Set());
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Scale className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Document Not Found</h1>
          <p className="text-slate-400 mb-6">{error || 'The requested legal document could not be found.'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  const title = documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Scale className="w-8 h-8 text-cyan-500" />
            <h1 className="text-4xl font-bold text-white">{document.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Version {document.version}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Effective: {new Date(document.effective_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Last Updated: {new Date(document.last_updated).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={expandAll}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm"
            >
              Collapse All
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {document.content.sections.map((section, index) => (
              <div key={index} className="group">
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
                >
                  <h2 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {section.title}
                  </h2>
                  {expandedSections.has(index) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                  )}
                </button>

                {expandedSections.has(index) && (
                  <div className="px-6 pb-6">
                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-900 rounded-xl border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-2">Questions or Concerns?</h3>
          <p className="text-slate-400 mb-4">
            If you have any questions about this {title.toLowerCase()}, please contact us at:
          </p>
          <div className="text-slate-300 space-y-1">
            <p>
              Email:{' '}
              <a
                href={`mailto:${documentType === 'terms' ? 'support@clearnav.cv' : 'privacy@clearnav.cv'}`}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {documentType === 'terms' ? 'support@clearnav.cv' : 'privacy@clearnav.cv'}
              </a>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 text-slate-500 text-sm space-y-0.5">
            <p className="font-medium text-slate-400">Grey Alpha LLC</p>
            <p>Wyoming Limited Liability Company</p>
            <p>640 South Broadway Suite 40</p>
            <p>Los Angeles, CA 90014</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .min-h-screen {
            background: white !important;
          }
          button {
            display: none !important;
          }
          .bg-slate-950,
          .bg-slate-900,
          .bg-slate-800 {
            background: white !important;
            border-color: #e5e7eb !important;
          }
          .text-white,
          .text-slate-300,
          .text-slate-400 {
            color: black !important;
          }
          .text-cyan-500,
          .text-cyan-400 {
            color: #0891b2 !important;
          }
        }
      `}</style>
    </div>
  );
}
