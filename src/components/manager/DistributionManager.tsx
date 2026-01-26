import { useState, useEffect } from 'react';
import { Plus, DollarSign, Users, TrendingUp, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface ShareClass {
  id: string;
  class_code: string;
  class_name: string;
}

interface Distribution {
  id: string;
  distribution_number: string;
  record_date: string;
  payment_date: string;
  distribution_type: string;
  amount_per_share: number;
  total_amount: number;
  total_shares: number;
  status: string;
  description: string;
  share_class: { class_code: string; class_name: string } | null;
}

export default function DistributionManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    share_class_id: '',
    record_date: new Date().toISOString().split('T')[0],
    payment_date: '',
    distribution_type: 'dividend',
    amount_per_share: 0,
    description: '',
    notes: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadShareClasses();
      loadDistributions();
    }
  }, [selectedFund]);

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

  const loadShareClasses = async () => {
    const { data } = await supabase
      .from('share_classes')
      .select('id, class_code, class_name')
      .eq('fund_id', selectedFund)
      .eq('status', 'active')
      .order('class_code');

    if (data) {
      setShareClasses(data);
    }
  };

  const loadDistributions = async () => {
    const { data } = await supabase
      .from('distributions')
      .select(`
        *,
        share_class:share_classes(class_code, class_name)
      `)
      .eq('fund_id', selectedFund)
      .order('payment_date', { ascending: false });

    if (data) {
      setDistributions(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const shareClassId = formData.share_class_id || null;

    const { data: totalSharesData } = await supabase
      .from('capital_accounts')
      .select('shares_owned')
      .eq('fund_id', selectedFund)
      .eq('status', 'active')
      .then(res => {
        if (shareClassId) {
          return supabase
            .from('capital_accounts')
            .select('shares_owned')
            .eq('fund_id', selectedFund)
            .eq('share_class_id', shareClassId)
            .eq('status', 'active');
        }
        return res;
      });

    const totalShares = totalSharesData?.reduce((sum, acc) => sum + (acc.shares_owned || 0), 0) || 0;
    const totalAmount = totalShares * formData.amount_per_share;
    const distNumber = `DIST-${Date.now().toString().slice(-8)}`;
    const selectedFundData = funds.find(f => f.id === selectedFund);

    const { data: distribution, error } = await supabase
      .from('distributions')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        share_class_id: shareClassId,
        distribution_number: distNumber,
        record_date: formData.record_date,
        payment_date: formData.payment_date,
        distribution_type: formData.distribution_type,
        amount_per_share: formData.amount_per_share,
        total_amount: totalAmount,
        total_shares: totalShares,
        currency: selectedFundData?.base_currency || 'USD',
        status: 'pending',
        description: formData.description,
        notes: formData.notes,
        created_by: user?.id,
      })
      .select()
      .single();

    if (!error && distribution) {
      await createDistributionAllocations(distribution.id, shareClassId);
      closeModal();
      loadDistributions();
    } else {
      alert('Error creating distribution');
    }
  };

  const createDistributionAllocations = async (distributionId: string, shareClassId: string | null) => {
    let query = supabase
      .from('capital_accounts')
      .select('id, shares_owned')
      .eq('fund_id', selectedFund)
      .eq('status', 'active');

    if (shareClassId) {
      query = query.eq('share_class_id', shareClassId);
    }

    const { data: accounts } = await query;

    if (accounts) {
      const allocations = accounts
        .filter(acc => acc.shares_owned > 0)
        .map(acc => ({
          distribution_id: distributionId,
          capital_account_id: acc.id,
          shares_held: acc.shares_owned,
          allocation_amount: acc.shares_owned * formData.amount_per_share,
          status: 'pending',
        }));

      await supabase
        .from('distribution_allocations')
        .insert(allocations);
    }
  };

  const handleApprove = async (distributionId: string) => {
    const { error } = await supabase
      .from('distributions')
      .update({
        status: 'approved',
        approved_by: user?.id,
      })
      .eq('id', distributionId);

    if (!error) {
      loadDistributions();
    }
  };

  const handleProcess = async (distributionId: string) => {
    const { error: distError } = await supabase
      .from('distributions')
      .update({ status: 'processing' })
      .eq('id', distributionId);

    if (!distError) {
      const { data: allocations } = await supabase
        .from('distribution_allocations')
        .select('*')
        .eq('distribution_id', distributionId);

      if (allocations) {
        for (const allocation of allocations) {
          await supabase
            .from('capital_transactions')
            .insert({
              tenant_id: currentTenant?.id,
              capital_account_id: allocation.capital_account_id,
              fund_id: selectedFund,
              transaction_type: 'distribution',
              transaction_date: new Date().toISOString().split('T')[0],
              amount: allocation.allocation_amount,
              shares: 0,
              currency: funds.find(f => f.id === selectedFund)?.base_currency || 'USD',
              status: 'settled',
              description: `Distribution ${distributionId.slice(0, 8)}`,
              created_by: user?.id,
            });

          await supabase
            .from('distribution_allocations')
            .update({ status: 'paid' })
            .eq('id', allocation.id);
        }

        await supabase
          .from('distributions')
          .update({ status: 'completed' })
          .eq('id', distributionId);

        loadDistributions();
      }
    }
  };

  const openModal = () => {
    const defaultPaymentDate = new Date();
    defaultPaymentDate.setDate(defaultPaymentDate.getDate() + 7);

    setFormData({
      share_class_id: '',
      record_date: new Date().toISOString().split('T')[0],
      payment_date: defaultPaymentDate.toISOString().split('T')[0],
      distribution_type: 'dividend',
      amount_per_share: 0,
      description: '',
      notes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const calculateTotals = () => {
    return distributions
      .filter(d => d.status === 'completed')
      .reduce((acc, dist) => {
        acc.totalDistributed += dist.total_amount;
        acc.totalInvestors += 1;
        return acc;
      }, { totalDistributed: 0, totalInvestors: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const totals = calculateTotals();
  const selectedFundData = funds.find(f => f.id === selectedFund);
  const pendingDistributions = distributions.filter(d => d.status === 'pending' || d.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Distribution Management</h2>
          <p className="text-slate-400 mt-1">Declare and process distributions to investors</p>
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
          <button
            onClick={openModal}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Declare Distribution</span>
          </button>
        </div>
      </div>

      {pendingDistributions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {pendingDistributions.length} Pending Distribution{pendingDistributions.length > 1 ? 's' : ''}
                </h3>
                <p className="text-slate-400 text-sm">
                  Waiting for approval or processing
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Distributed (All Time)</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalDistributed / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Distributions Processed</span>
            <Check className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {distributions.filter(d => d.status === 'completed').length}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-6">Distributions ({distributions.length})</h3>

        {distributions.length > 0 ? (
          <div className="space-y-3">
            {distributions.map((dist) => (
              <div
                key={dist.id}
                className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="grid grid-cols-6 gap-4 items-start">
                  <div>
                    <div className="text-xs text-slate-400">Distribution #</div>
                    <div className="text-white font-mono text-sm">{dist.distribution_number}</div>
                    <div className="text-xs text-slate-400 mt-1 capitalize">
                      {dist.distribution_type.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Share Class</div>
                    <div className="text-white text-sm">
                      {dist.share_class ? `Class ${dist.share_class.class_code}` : 'All Classes'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Record Date</div>
                    <div className="text-white text-sm">{new Date(dist.record_date).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Pay: {new Date(dist.payment_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Per Share</div>
                    <div className="text-white font-semibold">
                      {selectedFundData?.base_currency} {dist.amount_per_share.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Amount</div>
                    <div className="text-green-400 font-semibold">
                      {selectedFundData?.base_currency} {(dist.total_amount / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {dist.total_shares.toLocaleString()} shares
                    </div>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      dist.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : dist.status === 'approved'
                        ? 'bg-blue-500/20 text-blue-400'
                        : dist.status === 'processing'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {dist.status}
                    </span>
                    {dist.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(dist.id)}
                        className="block mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Approve
                      </button>
                    )}
                    {dist.status === 'approved' && (
                      <button
                        onClick={() => handleProcess(dist.id)}
                        className="block mt-2 text-xs text-green-400 hover:text-green-300"
                      >
                        Process Payment
                      </button>
                    )}
                  </div>
                </div>
                {dist.description && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400">Description</div>
                    <div className="text-sm text-slate-300">{dist.description}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No distributions declared yet</p>
            <p className="text-slate-500 text-sm mt-2">Declare your first distribution to return capital to investors</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Declare Distribution</h3>
              <p className="text-slate-400 mt-1">Set distribution terms and amounts</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Distribution Type
                  </label>
                  <select
                    value={formData.distribution_type}
                    onChange={(e) => setFormData({ ...formData, distribution_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="dividend">Dividend</option>
                    <option value="capital_gain">Capital Gain</option>
                    <option value="return_of_capital">Return of Capital</option>
                    <option value="interest">Interest</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Share Class (Optional)
                  </label>
                  <select
                    value={formData.share_class_id}
                    onChange={(e) => setFormData({ ...formData, share_class_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Share Classes</option>
                    {shareClasses.map(sc => (
                      <option key={sc.id} value={sc.id}>
                        Class {sc.class_code} - {sc.class_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Record Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.record_date}
                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount Per Share
                </label>
                <input
                  type="number"
                  required
                  step="0.000001"
                  value={formData.amount_per_share}
                  onChange={(e) => setFormData({ ...formData, amount_per_share: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Q4 2024 Dividend Distribution"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Internal notes"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  Declare Distribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
