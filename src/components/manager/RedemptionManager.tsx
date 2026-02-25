import { useState, useEffect } from 'react';
import { ArrowUpCircle, Clock, CheckCircle, XCircle, AlertTriangle, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getLatestNAV } from '../../lib/navCalculation';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface RedemptionRequest {
  id: string;
  request_number: string;
  request_date: string;
  redemption_date: string;
  redemption_type: string;
  shares_requested: number;
  amount_requested: number;
  shares_approved: number;
  amount_approved: number;
  redemption_price: number;
  status: string;
  reason: string;
  rejection_reason: string;
  capital_account: {
    account_number: string;
    shares_owned: number;
    investor: { full_name: string; email: string };
  };
}

export default function RedemptionManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [filterStatus, setFilterStatus] = useState('requested');
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RedemptionRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [capitalAccounts, setCapitalAccounts] = useState<any[]>([]);
  const [savingNew, setSavingNew] = useState(false);
  const [newForm, setNewForm] = useState({
    fund_id: '',
    capital_account_id: '',
    redemption_type: 'partial',
    shares_requested: '',
    amount_requested: '',
    redemption_date: '',
    reason: '',
  });
  const [reviewData, setReviewData] = useState({
    shares_approved: 0,
    amount_approved: 0,
    redemption_price: 0,
    notes: '',
    rejection_reason: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadRequests();
    }
  }, [selectedFund, filterStatus]);

  const loadFunds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name, base_currency')
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

  const loadRequests = async () => {
    let query = supabase
      .from('redemption_requests')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          shares_owned,
          investor:client_profiles!investor_id(full_name, email)
        )
      `)
      .eq('fund_id', selectedFund)
      .order('request_date', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;

    if (data) {
      setRequests(data as any);
    }
  };

  const openReviewModal = async (request: RedemptionRequest) => {
    setSelectedRequest(request);

    const latestNAV = await getLatestNAV(selectedFund);
    const navPerShare = latestNAV?.nav_per_share || 100;

    setReviewData({
      shares_approved: request.shares_requested || 0,
      amount_approved: request.amount_requested || 0,
      redemption_price: navPerShare,
      notes: '',
      rejection_reason: '',
    });

    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const { error } = await supabase
      .from('redemption_requests')
      .update({
        status: 'approved',
        shares_approved: reviewData.shares_approved,
        amount_approved: reviewData.amount_approved,
        redemption_price: reviewData.redemption_price,
        notes: reviewData.notes,
        reviewed_by: user?.id,
        approved_by: user?.id,
      })
      .eq('id', selectedRequest.id);

    if (!error) {
      setShowReviewModal(false);
      loadRequests();
    } else {
      alert('Error approving redemption request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !reviewData.rejection_reason) {
      alert('Please provide a rejection reason');
      return;
    }

    const { error } = await supabase
      .from('redemption_requests')
      .update({
        status: 'rejected',
        rejection_reason: reviewData.rejection_reason,
        reviewed_by: user?.id,
      })
      .eq('id', selectedRequest.id);

    if (!error) {
      setShowReviewModal(false);
      loadRequests();
    } else {
      alert('Error rejecting redemption request');
    }
  };

  const handleProcess = async (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    const { error: txnError } = await supabase
      .from('capital_transactions')
      .insert({
        tenant_id: currentTenant?.id,
        capital_account_id: request.capital_account_id,
        fund_id: selectedFund,
        transaction_type: 'redemption',
        transaction_date: new Date().toISOString().split('T')[0],
        settlement_date: request.redemption_date,
        amount: request.amount_approved,
        shares: -request.shares_approved,
        price_per_share: request.redemption_price,
        currency: funds.find(f => f.id === selectedFund)?.base_currency || 'USD',
        status: 'settled',
        description: `Redemption ${request.request_number}`,
        created_by: user?.id,
      });

    if (!txnError) {
      const { data: account } = await supabase
        .from('capital_accounts')
        .select('shares_owned, capital_returned')
        .eq('id', request.capital_account_id)
        .single();

      if (account) {
        await supabase
          .from('capital_accounts')
          .update({
            shares_owned: account.shares_owned - request.shares_approved,
            capital_returned: (account.capital_returned || 0) + request.amount_approved,
          })
          .eq('id', request.capital_account_id);
      }

      await supabase
        .from('redemption_requests')
        .update({
          status: 'completed',
          settlement_date: new Date().toISOString().split('T')[0],
          settlement_amount: request.amount_approved,
        })
        .eq('id', requestId);

      loadRequests();
    } else {
      alert('Error processing redemption');
    }
  };

  const openCreateModal = async () => {
    setNewForm({
      fund_id: selectedFund,
      capital_account_id: '',
      redemption_type: 'partial',
      shares_requested: '',
      amount_requested: '',
      redemption_date: '',
      reason: '',
    });
    await loadCapitalAccounts(selectedFund);
    setShowCreateModal(true);
  };

  const loadCapitalAccounts = async (fundId: string) => {
    const { data } = await supabase
      .from('capital_accounts')
      .select('id, account_number, shares_owned, commitment_amount, investor:client_profiles!investor_id(full_name)')
      .eq('fund_id', fundId)
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('account_number');
    setCapitalAccounts(data || []);
  };

  const handleCreateRedemption = async () => {
    if (!newForm.capital_account_id || !newForm.redemption_date) return;
    setSavingNew(true);

    const reqNum = `RDM-${Date.now().toString(36).toUpperCase()}`;
    const account = capitalAccounts.find((a: any) => a.id === newForm.capital_account_id);
    const sharesReq = newForm.redemption_type === 'full'
      ? (account?.shares_owned || 0)
      : parseFloat(newForm.shares_requested) || 0;

    const latestNAV = await getLatestNAV(newForm.fund_id || selectedFund);
    const navPrice = latestNAV?.nav_per_share || 100;
    const amountReq = newForm.amount_requested ? parseFloat(newForm.amount_requested) : sharesReq * navPrice;

    const { error } = await supabase
      .from('redemption_requests')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: newForm.fund_id || selectedFund,
        capital_account_id: newForm.capital_account_id,
        request_number: reqNum,
        request_date: new Date().toISOString().split('T')[0],
        redemption_date: newForm.redemption_date,
        redemption_type: newForm.redemption_type,
        shares_requested: sharesReq,
        amount_requested: amountReq,
        status: 'requested',
        reason: newForm.reason || null,
        requested_by: user?.id,
      });

    setSavingNew(false);
    if (!error) {
      setShowCreateModal(false);
      loadRequests();
    } else {
      alert('Error creating redemption request: ' + error.message);
    }
  };

  const calculateStats = () => {
    return requests.reduce((acc, req) => {
      if (req.status === 'requested') acc.pending++;
      if (req.status === 'approved') acc.approved++;
      if (req.status === 'completed') {
        acc.completed++;
        acc.totalRedeemed += req.amount_approved || 0;
      }
      return acc;
    }, { pending: 0, approved: 0, completed: 0, totalRedeemed: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const stats = calculateStats();
  const selectedFundData = funds.find(f => f.id === selectedFund);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Redemption Management</h2>
          <p className="text-slate-400 mt-1">Review and process investor redemption requests</p>
        </div>
        <div className="flex items-center space-x-3">
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
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/50">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                {stats.pending} Pending Redemption Request{stats.pending > 1 ? 's' : ''}
              </h3>
              <p className="text-slate-400 text-sm">
                Awaiting review and approval
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Pending Review</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.pending}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Approved</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.approved}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Completed</span>
            <ArrowUpCircle className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.completed}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Redeemed</span>
            <ArrowUpCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(stats.totalRedeemed / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Redemption Requests ({requests.length})</h3>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="requested">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="grid grid-cols-6 gap-4 items-start">
                  <div className="col-span-2">
                    <div className="font-medium text-white">{req.capital_account?.investor.full_name}</div>
                    <div className="text-xs text-slate-400 mt-1">{req.capital_account?.account_number}</div>
                    <div className="text-xs text-slate-400">{req.capital_account?.investor.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Request #</div>
                    <div className="text-white font-mono text-sm">{req.request_number}</div>
                    <div className="text-xs text-slate-400 mt-1 capitalize">
                      {req.redemption_type} Redemption
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Requested</div>
                    <div className="text-white text-sm">
                      {req.shares_requested?.toLocaleString() || '-'} shares
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {selectedFundData?.base_currency} {((req.amount_requested || 0) / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Date Requested</div>
                    <div className="text-white text-sm">{new Date(req.request_date).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Redeem: {new Date(req.redemption_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      req.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : req.status === 'approved'
                        ? 'bg-blue-500/20 text-blue-400'
                        : req.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400'
                        : req.status === 'processing'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'requested' && (
                      <button
                        onClick={() => openReviewModal(req)}
                        className="block mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Review Request
                      </button>
                    )}
                    {req.status === 'approved' && (
                      <button
                        onClick={() => handleProcess(req.id)}
                        className="block mt-2 text-xs text-green-400 hover:text-green-300"
                      >
                        Process Redemption
                      </button>
                    )}
                  </div>
                </div>
                {req.reason && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400">Reason</div>
                    <div className="text-sm text-slate-300">{req.reason}</div>
                  </div>
                )}
                {req.rejection_reason && (
                  <div className="mt-3 pt-3 border-t border-slate-700 bg-red-500/10 -m-4 p-4 rounded-b-lg">
                    <div className="text-xs text-red-400">Rejection Reason</div>
                    <div className="text-sm text-red-300">{req.rejection_reason}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ArrowUpCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No redemption requests</p>
            <p className="text-slate-500 text-sm mt-2">Redemption requests will appear here when investors request to redeem</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">New Redemption Request</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Capital Account</label>
                <select
                  value={newForm.capital_account_id}
                  onChange={(e) => setNewForm({ ...newForm, capital_account_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select account...</option>
                  {capitalAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number} - {a.investor?.full_name} ({a.shares_owned?.toLocaleString()} shares)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Redemption Type</label>
                <div className="flex gap-3">
                  {['partial', 'full'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewForm({ ...newForm, redemption_type: type })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newForm.redemption_type === type
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {newForm.redemption_type === 'partial' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Shares to Redeem</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={newForm.shares_requested}
                      onChange={(e) => setNewForm({ ...newForm, shares_requested: e.target.value })}
                      placeholder="0.000000"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Amount (optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newForm.amount_requested}
                      onChange={(e) => setNewForm({ ...newForm, amount_requested: e.target.value })}
                      placeholder="Auto-calculated"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              )}

              {newForm.redemption_type === 'full' && newForm.capital_account_id && (
                <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300">
                  Full redemption: all {capitalAccounts.find((a: any) => a.id === newForm.capital_account_id)?.shares_owned?.toLocaleString() || 0} shares will be redeemed.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Redemption Date</label>
                <input
                  type="date"
                  value={newForm.redemption_date}
                  onChange={(e) => setNewForm({ ...newForm, redemption_date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reason (optional)</label>
                <textarea
                  value={newForm.reason}
                  onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
                  rows={2}
                  placeholder="Reason for redemption..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRedemption}
                disabled={savingNew || !newForm.capital_account_id || !newForm.redemption_date}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {savingNew ? 'Creating...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Review Redemption Request</h3>
              <p className="text-slate-400 mt-1">
                {selectedRequest.capital_account.investor.full_name} - {selectedRequest.capital_account.account_number}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-400">Shares Requested</div>
                    <div className="text-white font-semibold text-lg">
                      {selectedRequest.shares_requested?.toLocaleString() || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Amount Requested</div>
                    <div className="text-white font-semibold text-lg">
                      {selectedFundData?.base_currency} {((selectedRequest.amount_requested || 0) / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Current Shares Owned</div>
                    <div className="text-white font-medium">
                      {selectedRequest.capital_account.shares_owned.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Redemption Date</div>
                    <div className="text-white font-medium">
                      {new Date(selectedRequest.redemption_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Shares Approved
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={reviewData.shares_approved}
                    onChange={(e) => setReviewData({
                      ...reviewData,
                      shares_approved: parseFloat(e.target.value) || 0,
                      amount_approved: (parseFloat(e.target.value) || 0) * reviewData.redemption_price
                    })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Redemption Price
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={reviewData.redemption_price}
                    onChange={(e) => setReviewData({
                      ...reviewData,
                      redemption_price: parseFloat(e.target.value) || 0,
                      amount_approved: reviewData.shares_approved * (parseFloat(e.target.value) || 0)
                    })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount Approved
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={reviewData.amount_approved.toFixed(2)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={reviewData.notes}
                  onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                  rows={2}
                  placeholder="Internal notes"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={reviewData.rejection_reason}
                  onChange={(e) => setReviewData({ ...reviewData, rejection_reason: e.target.value })}
                  rows={2}
                  placeholder="Reason for rejection (required to reject)"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
