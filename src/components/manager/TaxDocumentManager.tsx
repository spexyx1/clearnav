import { useState, useEffect } from 'react';
import { FileText, Plus, Calendar, Send, CheckCircle, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
}

interface TaxDocument {
  id: string;
  document_type: string;
  tax_year: number;
  document_status: string;
  generation_date: string | null;
  finalized_date: string | null;
  sent_date: string | null;
  ordinary_income: number | null;
  qualified_dividends: number | null;
  capital_gains_short: number | null;
  capital_gains_long: number | null;
  interest_income: number | null;
  other_income: number | null;
  capital_account: {
    account_number: string;
    investor: { full_name: string; email: string };
  };
}

export default function TaxDocumentManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    capital_account_id: '',
    document_type: 'k1',
    ordinary_income: 0,
    qualified_dividends: 0,
    capital_gains_short: 0,
    capital_gains_long: 0,
    interest_income: 0,
    other_income: 0,
    notes: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadTaxDocuments();
    }
  }, [selectedFund, selectedYear, filterType, filterStatus]);

  const loadFunds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');

    if (data) {
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    }
    setLoading(false);
  };

  const loadTaxDocuments = async () => {
    let query = supabase
      .from('tax_documents')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name, email)
        )
      `)
      .eq('fund_id', selectedFund)
      .eq('tax_year', selectedYear)
      .order('created_at', { ascending: false });

    if (filterType !== 'all') {
      query = query.eq('document_type', filterType);
    }

    if (filterStatus !== 'all') {
      query = query.eq('document_status', filterStatus);
    }

    const { data } = await query;

    if (data) {
      setTaxDocuments(data as any);
    }
  };

  const generateK1s = async () => {
    setGenerating(true);

    const { data: accounts } = await supabase
      .from('capital_accounts')
      .select('id, account_number')
      .eq('fund_id', selectedFund)
      .eq('status', 'active');

    if (!accounts || accounts.length === 0) {
      alert('No active capital accounts found');
      setGenerating(false);
      return;
    }

    const { data: performanceMetrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('fund_id', selectedFund)
      .eq('period_type', 'yearly')
      .gte('metric_date', `${selectedYear}-01-01`)
      .lte('metric_date', `${selectedYear}-12-31`)
      .maybeSingle();

    for (const account of accounts) {
      const { data: transactions } = await supabase
        .from('capital_transactions')
        .select('*')
        .eq('capital_account_id', account.id)
        .gte('transaction_date', `${selectedYear}-01-01`)
        .lte('transaction_date', `${selectedYear}-12-31`);

      const distributions = transactions?.filter(t => t.transaction_type === 'distribution') || [];
      const totalDistributions = distributions.reduce((sum, t) => sum + t.amount, 0);

      const ordinaryIncome = totalDistributions * 0.3;
      const qualifiedDividends = totalDistributions * 0.2;
      const capitalGainsLong = totalDistributions * 0.4;
      const capitalGainsShort = totalDistributions * 0.1;

      await supabase
        .from('tax_documents')
        .insert({
          tenant_id: currentTenant?.id,
          capital_account_id: account.id,
          fund_id: selectedFund,
          document_type: 'k1',
          tax_year: selectedYear,
          document_status: 'draft',
          generation_date: new Date().toISOString().split('T')[0],
          ordinary_income: ordinaryIncome,
          qualified_dividends: qualifiedDividends,
          capital_gains_short: capitalGainsShort,
          capital_gains_long: capitalGainsLong,
          interest_income: 0,
          other_income: 0,
          created_by: user?.id,
        });
    }

    setGenerating(false);
    loadTaxDocuments();
    alert(`Generated ${accounts.length} K-1 documents`);
  };

  const finalizeDocument = async (documentId: string) => {
    const { error } = await supabase
      .from('tax_documents')
      .update({
        document_status: 'finalized',
        finalized_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', documentId);

    if (!error) {
      loadTaxDocuments();
    }
  };

  const sendDocument = async (documentId: string) => {
    const { error } = await supabase
      .from('tax_documents')
      .update({
        document_status: 'sent',
        sent_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', documentId);

    if (!error) {
      loadTaxDocuments();
      alert('Document sent to investor');
    }
  };

  const calculateStats = () => {
    return taxDocuments.reduce((acc, doc) => {
      if (doc.document_status === 'draft') acc.draft++;
      if (doc.document_status === 'finalized') acc.finalized++;
      if (doc.document_status === 'sent') acc.sent++;
      if (doc.document_type === 'k1') acc.k1s++;
      return acc;
    }, { draft: 0, finalized: 0, sent: 0, k1s: 0 });
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'k1': 'Schedule K-1',
      '1099_div': 'Form 1099-DIV',
      '1099_int': 'Form 1099-INT',
      '1099_b': 'Form 1099-B',
      '5498': 'Form 5498',
      'annual_statement': 'Annual Statement',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Tax Document Manager</h2>
          <p className="text-slate-400 mt-1">Generate and manage K-1s, 1099s, and other tax documents</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedFund}
            onChange={(e) => setSelectedFund(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            {funds.map(fund => (
              <option key={fund.id} value={fund.id}>
                {fund.fund_code} - {fund.fund_name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  Tax Year {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Generate K-1s for {selectedYear}</h3>
            <p className="text-slate-400 text-sm">
              Generate Schedule K-1 forms for all active investors
            </p>
          </div>
          <button
            onClick={generateK1s}
            disabled={generating}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{generating ? 'Generating...' : 'Generate K-1s'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">K-1 Forms</span>
            <FileText className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.k1s}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Draft</span>
            <Calendar className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.draft}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Finalized</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.finalized}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Sent</span>
            <Send className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.sent}</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Tax Documents ({taxDocuments.length})</h3>
          <div className="flex items-center space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="k1">K-1</option>
              <option value="1099_div">1099-DIV</option>
              <option value="1099_int">1099-INT</option>
              <option value="1099_b">1099-B</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="finalized">Finalized</option>
              <option value="sent">Sent</option>
            </select>
          </div>
        </div>

        {taxDocuments.length > 0 ? (
          <div className="space-y-3">
            {taxDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="grid grid-cols-8 gap-4 items-start">
                  <div className="col-span-2">
                    <div className="font-medium text-white">{doc.capital_account.investor.full_name}</div>
                    <div className="text-xs text-slate-400 mt-1">{doc.capital_account.account_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Document Type</div>
                    <div className="text-white text-sm">{getDocumentTypeLabel(doc.document_type)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Tax Year</div>
                    <div className="text-white text-sm">{doc.tax_year}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-slate-400 mb-1">Income Breakdown</div>
                    <div className="space-y-1 text-xs">
                      {doc.ordinary_income !== null && doc.ordinary_income > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ordinary:</span>
                          <span className="text-white">${(doc.ordinary_income / 1000).toFixed(1)}K</span>
                        </div>
                      )}
                      {doc.qualified_dividends !== null && doc.qualified_dividends > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dividends:</span>
                          <span className="text-white">${(doc.qualified_dividends / 1000).toFixed(1)}K</span>
                        </div>
                      )}
                      {doc.capital_gains_long !== null && doc.capital_gains_long > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">LT Gains:</span>
                          <span className="text-green-400">${(doc.capital_gains_long / 1000).toFixed(1)}K</span>
                        </div>
                      )}
                      {doc.capital_gains_short !== null && doc.capital_gains_short > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">ST Gains:</span>
                          <span className="text-yellow-400">${(doc.capital_gains_short / 1000).toFixed(1)}K</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Generated</div>
                    <div className="text-white text-sm">
                      {doc.generation_date ? new Date(doc.generation_date).toLocaleDateString() : '-'}
                    </div>
                    {doc.finalized_date && (
                      <div className="text-xs text-green-400 mt-1">
                        Finalized: {new Date(doc.finalized_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      doc.document_status === 'sent'
                        ? 'bg-green-500/20 text-green-400'
                        : doc.document_status === 'finalized'
                        ? 'bg-blue-500/20 text-blue-400'
                        : doc.document_status === 'review'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {doc.document_status}
                    </span>
                    <div className="flex items-center space-x-2 mt-2">
                      {doc.document_status === 'draft' && (
                        <button
                          onClick={() => finalizeDocument(doc.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Finalize
                        </button>
                      )}
                      {doc.document_status === 'finalized' && (
                        <button
                          onClick={() => sendDocument(doc.id)}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No tax documents for {selectedYear}</p>
            <p className="text-slate-500 text-sm mt-2">Generate K-1s to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
