import { useEffect, useState } from 'react';
import { Receipt, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function TaxDocuments() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    document_type: '',
    tax_year: new Date().getFullYear() - 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('tax_document_requests')
      .select('*')
      .eq('client_id', user?.id)
      .order('requested_date', { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!formData.document_type) {
      setError('Please select a document type');
      setSubmitting(false);
      return;
    }

    const { error: submitError } = await supabase
      .from('tax_document_requests')
      .insert([{
        client_id: user?.id,
        document_type: formData.document_type,
        tax_year: formData.tax_year
      }]);

    setSubmitting(false);

    if (submitError) {
      setError('Failed to submit request. Please try again.');
      return;
    }

    setShowForm(false);
    setFormData({ document_type: '', tax_year: new Date().getFullYear() - 1 });
    loadRequests();
  };

  const documentTypes = [
    { value: '1099', label: 'Form 1099' },
    { value: 'k1', label: 'Schedule K-1' },
    { value: 'gain_loss', label: 'Gain/Loss Statement' },
    { value: 'year_end_summary', label: 'Year-End Summary' }
  ];

  const getStatusIcon = (status: string) => {
    return status === 'completed'
      ? <CheckCircle className="w-5 h-5 text-green-400" />
      : <Clock className="w-5 h-5 text-yellow-400" />;
  };

  const getStatusBadge = (status: string) => {
    return status === 'completed' ? (
      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-400 border-green-500/30">
        Completed
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        Pending
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
          Tax <span className="font-semibold">Documents</span>
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded font-medium hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 flex items-center space-x-2"
        >
          <Receipt className="w-5 h-5" />
          <span>Request Tax Document</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Request Tax Document</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Document Type
              </label>
              <select
                required
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="">Select document type...</option>
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tax Year
              </label>
              <select
                required
                value={formData.tax_year}
                onChange={(e) => setFormData({ ...formData, tax_year: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
              Tax documents are typically processed within 3-5 business days. You will receive an email notification when your document is ready.
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 border border-slate-700 text-white rounded font-medium hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Request History</h3>

        {requests.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No tax document requests found
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(request.status)}
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-semibold text-white">
                        {documentTypes.find(t => t.value === request.document_type)?.label || request.document_type}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-slate-400">
                      Tax Year: {request.tax_year}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">
                    Requested: {new Date(request.requested_date).toLocaleDateString()}
                  </div>
                  {request.completed_date && (
                    <div className="text-sm text-green-400">
                      Completed: {new Date(request.completed_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
