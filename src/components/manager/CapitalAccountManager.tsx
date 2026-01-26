import { useState, useEffect } from 'react';
import { Plus, Users, DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
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

interface Investor {
  id: string;
  full_name: string;
  email: string;
}

interface CapitalAccount {
  id: string;
  fund_id: string;
  share_class_id: string;
  investor_id: string;
  account_number: string;
  commitment_amount: number;
  capital_called: number;
  capital_contributed: number;
  capital_returned: number;
  shares_owned: number;
  cost_basis: number;
  unrealized_gain_loss: number;
  realized_gain_loss: number;
  inception_date: string;
  status: string;
  investor: { full_name: string; email: string };
  fund: { fund_code: string; fund_name: string; base_currency: string };
  share_class: { class_code: string; class_name: string };
}

export default function CapitalAccountManager() {
  const { currentTenant } = useAuth();
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fund_id: '',
    share_class_id: '',
    investor_id: '',
    commitment_amount: 0,
    inception_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadAccounts();
      loadShareClassesForFund();
    }
  }, [selectedFund]);

  const loadData = async () => {
    setLoading(true);

    const [fundsRes, investorsRes] = await Promise.all([
      supabase
        .from('funds')
        .select('id, fund_code, fund_name, base_currency')
        .eq('tenant_id', currentTenant?.id)
        .eq('status', 'active')
        .order('fund_name'),
      supabase
        .from('client_profiles')
        .select('id, full_name, email')
        .eq('tenant_id', currentTenant?.id)
        .order('full_name'),
    ]);

    if (fundsRes.data) {
      setFunds(fundsRes.data);
      if (fundsRes.data.length > 0 && !selectedFund) {
        setSelectedFund(fundsRes.data[0].id);
      }
    }

    if (investorsRes.data) {
      setInvestors(investorsRes.data);
    }

    setLoading(false);
  };

  const loadShareClassesForFund = async () => {
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

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('capital_accounts')
      .select(`
        *,
        investor:client_profiles!investor_id(full_name, email),
        fund:funds!fund_id(fund_code, fund_name, base_currency),
        share_class:share_classes!share_class_id(class_code, class_name)
      `)
      .eq('fund_id', selectedFund)
      .order('created_at', { ascending: false });

    if (data) {
      setAccounts(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const accountNumber = `${funds.find(f => f.id === formData.fund_id)?.fund_code}-${Date.now().toString().slice(-6)}`;

    const { error } = await supabase
      .from('capital_accounts')
      .insert({
        ...formData,
        account_number: accountNumber,
        status: 'active',
      });

    if (!error) {
      closeModal();
      loadAccounts();
    }
  };

  const openModal = () => {
    setFormData({
      fund_id: selectedFund,
      share_class_id: shareClasses[0]?.id || '',
      investor_id: '',
      commitment_amount: 0,
      inception_date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const calculateTotals = () => {
    return accounts.reduce((acc, account) => ({
      totalCommitments: acc.totalCommitments + account.commitment_amount,
      totalContributed: acc.totalContributed + account.capital_contributed,
      totalShares: acc.totalShares + account.shares_owned,
      totalUnrealized: acc.totalUnrealized + account.unrealized_gain_loss,
    }), {
      totalCommitments: 0,
      totalContributed: 0,
      totalShares: 0,
      totalUnrealized: 0,
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Capital Account Management</h2>
          <p className="text-slate-400 mt-1">Track investor positions and capital flows</p>
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
            <span>New Account</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Commitments</span>
            <Wallet className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalCommitments / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Capital Contributed</span>
            <ArrowDownCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalContributed / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Shares</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {totals.totalShares.toLocaleString()}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Unrealized P&L</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold ${totals.totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {selectedFundData?.base_currency} {(totals.totalUnrealized / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      {accounts.length > 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Users className="w-5 h-5 mr-2 text-cyan-500" />
            Capital Accounts ({accounts.length})
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-10 gap-4 text-sm font-medium text-slate-400 pb-3 border-b border-slate-700">
              <div className="col-span-2">Investor</div>
              <div>Account #</div>
              <div>Class</div>
              <div className="text-right">Commitment</div>
              <div className="text-right">Contributed</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Cost Basis</div>
              <div className="text-right">Unrealized P&L</div>
              <div>Status</div>
            </div>

            {accounts.map((account) => (
              <div
                key={account.id}
                className="grid grid-cols-10 gap-4 items-center py-3 hover:bg-slate-700/50 rounded-lg px-3 transition-colors"
              >
                <div className="col-span-2">
                  <div className="font-medium text-white">{account.investor.full_name}</div>
                  <div className="text-xs text-slate-400">{account.investor.email}</div>
                </div>
                <div className="text-white font-mono text-sm">{account.account_number}</div>
                <div>
                  <span className="px-2 py-1 bg-slate-700 rounded text-xs text-white">
                    {account.share_class.class_code}
                  </span>
                </div>
                <div className="text-right text-white">
                  {(account.commitment_amount / 1000).toFixed(0)}K
                </div>
                <div className="text-right text-green-400">
                  {(account.capital_contributed / 1000).toFixed(0)}K
                </div>
                <div className="text-right text-white font-mono">
                  {account.shares_owned.toLocaleString()}
                </div>
                <div className="text-right text-slate-300">
                  {(account.cost_basis / 1000).toFixed(0)}K
                </div>
                <div className={`text-right font-medium ${account.unrealized_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {account.unrealized_gain_loss >= 0 ? '+' : ''}{(account.unrealized_gain_loss / 1000).toFixed(0)}K
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    account.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {account.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/30 rounded-xl p-12 border-2 border-dashed border-slate-700 text-center">
          <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Capital Accounts</h3>
          <p className="text-slate-400 mb-6">
            Create capital accounts to track investor positions and commitments
          </p>
          <button
            onClick={openModal}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg inline-flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create First Account</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Create Capital Account</h3>
              <p className="text-slate-400 mt-1">Set up a new investor capital account</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Investor
                </label>
                <select
                  required
                  value={formData.investor_id}
                  onChange={(e) => setFormData({ ...formData, investor_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select Investor</option>
                  {investors.map(investor => (
                    <option key={investor.id} value={investor.id}>
                      {investor.full_name} ({investor.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Share Class
                </label>
                <select
                  required
                  value={formData.share_class_id}
                  onChange={(e) => setFormData({ ...formData, share_class_id: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
                  {shareClasses.map(sc => (
                    <option key={sc.id} value={sc.id}>
                      Class {sc.class_code} - {sc.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Commitment Amount
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.commitment_amount}
                    onChange={(e) => setFormData({ ...formData, commitment_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
