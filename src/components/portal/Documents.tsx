import { useEffect, useState } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'quarterly_letter' | 'annual_report' | 'other'>('all');

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    setLoading(true);

    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('document_type', filter);
    }

    const { data } = await query;
    setDocuments(data || []);
    setLoading(false);
  };

  const getDocumentIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-cyan-400" />;
  };

  const getDocumentTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      quarterly_letter: { label: 'Quarterly Letter', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      annual_report: { label: 'Annual Report', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      other: { label: 'Other', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
    };

    const badge = badges[type] || badges.other;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-white">
          Documents & <span className="font-semibold">Reports</span>
        </h2>
        <div className="flex space-x-2">
          {(['all', 'quarterly_letter', 'annual_report', 'other'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'quarterly_letter' ? 'Quarterly' : f === 'annual_report' ? 'Annual' : 'Other'}
            </button>
          ))}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">No documents available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6 hover:border-cyan-500/30 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    {getDocumentIcon(doc.document_type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-sm text-slate-400 mb-2">{doc.description}</p>
                    )}
                    {getDocumentTypeBadge(doc.document_type)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                <div className="flex items-center text-sm text-slate-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{doc.period}</span>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
