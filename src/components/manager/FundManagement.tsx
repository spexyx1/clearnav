import { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Building2, DollarSign, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import FundDocumentUpload from './documents/FundDocumentUpload';
import DocumentExtractionReview from './documents/DocumentExtractionReview';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  fund_type: string;
  base_currency: string;
  inception_date: string;
  accounting_standard: string;
  nav_frequency: string;
  status: string;
  total_commitments: number;
  created_at: string;
}

type ActiveTab = 'funds' | 'documents';
type DocumentView = 'list' | 'review';

export default function FundManagement() {
  const { currentTenant } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('funds');
  const [documentView, setDocumentView] = useState<DocumentView>('list');
  const [reviewDocumentId, setReviewDocumentId] = useState<string | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approvalSummary, setApprovalSummary] = useState<{
    fundId: string | null;
    invitationId: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    fund_code: '',
    fund_name: '',
    fund_type: 'other',
    base_currency: 'USD',
    inception_date: new Date().toISOString().split('T')[0],
    accounting_standard: 'GAAP',
    nav_frequency: 'monthly',
    total_commitments: 0,
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  const loadFunds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('tenant_id', currentTenant?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFunds(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('funds').insert({
      tenant_id: currentTenant?.id,
      ...formData,
      status: 'active',
    });

    if (!error) {
      setShowCreateModal(false);
      setFormData({
        fund_code: '',
        fund_name: '',
        fund_type: 'other',
        base_currency: 'USD',
        inception_date: new Date().toISOString().split('T')[0],
        accounting_standard: 'GAAP',
        nav_frequency: 'monthly',
        total_commitments: 0,
      });
      loadFunds();
    }
  };

  const handleReviewDocument = (documentId: string) => {
    setReviewDocumentId(documentId);
    setDocumentView('review');
    setApprovalSummary(null);
  };

  const handleExtractionApproved = (
    _resultId: string,
    createdFundId: string | null,
    createdInvitationId: string | null
  ) => {
    setApprovalSummary({ fundId: createdFundId, invitationId: createdInvitationId });
    loadFunds();
  };

  const handleBackToDocuments = () => {
    setDocumentView('list');
    setReviewDocumentId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Fund Management</h2>
          <p className="text-slate-400 mt-1">Create and manage your investment funds</p>
        </div>
        {activeTab === 'funds' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Fund</span>
          </button>
        )}
      </div>

      <div className="flex space-x-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab('funds')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'funds'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Funds</span>
          {funds.length > 0 && (
            <span className="bg-slate-600 text-slate-300 text-xs rounded-full px-2 py-0.5">
              {funds.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('documents'); setDocumentView('list'); }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'documents'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Document Intelligence</span>
        </button>
      </div>

      {activeTab === 'funds' && (
        <>
          {funds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {funds.map((fund) => (
                <div
                  key={fund.id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                        {fund.fund_code}
                      </div>
                      <h3 className="text-lg font-bold text-white">{fund.fund_name}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      fund.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {fund.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Building2 className="w-4 h-4 text-slate-400 mr-2" />
                      <span className="text-slate-300 capitalize">{fund.fund_type} Fund</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="w-4 h-4 text-slate-400 mr-2" />
                      <span className="text-slate-300">{fund.base_currency} | {fund.accounting_standard}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                      <span className="text-slate-300">
                        Inception: {new Date(fund.inception_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <TrendingUp className="w-4 h-4 text-slate-400 mr-2" />
                      <span className="text-slate-300 capitalize">NAV: {fund.nav_frequency}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-slate-400">Total Commitments</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {fund.base_currency} {(fund.total_commitments / 1000000).toFixed(2)}M
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <button className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1">
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/30 rounded-xl p-12 border-2 border-dashed border-slate-700 text-center">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Funds Created</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Create a fund manually, or use Document Intelligence to upload a Trust Deed or IM and let AI set up your fund automatically.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg inline-flex items-center space-x-2 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Manually</span>
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg inline-flex items-center space-x-2 transition-colors text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'documents' && (
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-6">
          {documentView === 'list' ? (
            <>
              {approvalSummary && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-green-300 font-medium">Document approved successfully!</p>
                    <p className="text-green-400/70 text-sm mt-0.5">
                      Fund and share classes have been created. A draft NAV calculation is ready for review.
                      {approvalSummary.invitationId && ' An investor invitation has been sent.'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => { setActiveTab('funds'); setApprovalSummary(null); }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>View Fund</span>
                    </button>
                  </div>
                </div>
              )}
              <FundDocumentUpload onReviewDocument={handleReviewDocument} />
            </>
          ) : reviewDocumentId ? (
            <DocumentExtractionReview
              documentId={reviewDocumentId}
              onBack={handleBackToDocuments}
              onApproved={handleExtractionApproved}
            />
          ) : null}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Create New Fund</h3>
              <p className="text-slate-400 mt-1">Set up a new investment fund</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fund Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fund_code}
                    onChange={(e) => setFormData({ ...formData, fund_code: e.target.value.toUpperCase() })}
                    placeholder="FUND-001"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fund Type
                  </label>
                  <select
                    value={formData.fund_type}
                    onChange={(e) => setFormData({ ...formData, fund_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="pe">Private Equity</option>
                    <option value="vc">Venture Capital</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="credit">Credit Fund</option>
                    <option value="family_office">Family Office</option>
                    <option value="alternative">Alternative Investments</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fund Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fund_name}
                  onChange={(e) => setFormData({ ...formData, fund_name: e.target.value })}
                  placeholder="Alpha Growth Fund LP"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Base Currency
                  </label>
                  <select
                    value={formData.base_currency}
                    onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Inception Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.inception_date}
                    onChange={(e) => setFormData({ ...formData, inception_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Accounting Standard
                  </label>
                  <select
                    value={formData.accounting_standard}
                    onChange={(e) => setFormData({ ...formData, accounting_standard: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="GAAP">US GAAP</option>
                    <option value="IFRS">IFRS</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    NAV Frequency
                  </label>
                  <select
                    value={formData.nav_frequency}
                    onChange={(e) => setFormData({ ...formData, nav_frequency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Commitments
                </label>
                <input
                  type="number"
                  value={formData.total_commitments}
                  onChange={(e) => setFormData({ ...formData, total_commitments: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  Create Fund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
