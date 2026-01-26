import { useState, useEffect } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, DollarSign, Filter, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface CapitalAccount {
  id: string;
  account_number: string;
  investor: { full_name: string };
  shares_owned: number;
}

interface Transaction {
  id: string;
  transaction_type: string;
  transaction_date: string;
  settlement_date: string;
  amount: number;
  shares: number;
  price_per_share: number;
  currency: string;
  status: string;
  reference_number: string;
  description: string;
  capital_account: {
    account_number: string;
    investor: { full_name: string };
  };
}

export default function TransactionManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    capital_account_id: '',
    transaction_type: 'contribution',
    transaction_date: new Date().toISOString().split('T')[0],
    settlement_date: '',
    amount: 0,
    shares: 0,
    price_per_share: 0,
    description: '',
    notes: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadAccounts();
      loadTransactions();
    }
  }, [selectedFund, filterType, filterStatus]);

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

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('capital_accounts')
      .select(`
        id,
        account_number,
        shares_owned,
        investor:client_profiles!investor_id(full_name)
      `)
      .eq('fund_id', selectedFund)
      .eq('status', 'active')
      .order('account_number');

    if (data) {
      setAccounts(data as any);
    }
  };

  const loadTransactions = async () => {
    let query = supabase
      .from('capital_transactions')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name)
        )
      `)
      .eq('fund_id', selectedFund)
      .order('transaction_date', { ascending: false });

    if (filterType !== 'all') {
      query = query.eq('transaction_type', filterType);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query.limit(100);

    if (data) {
      setTransactions(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const refNumber = `TXN-${Date.now().toString().slice(-8)}`;
    const selectedFundData = funds.find(f => f.id === selectedFund);

    const { error } = await supabase
      .from('capital_transactions')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        capital_account_id: formData.capital_account_id,
        transaction_type: formData.transaction_type,
        transaction_date: formData.transaction_date,
        settlement_date: formData.settlement_date || null,
        amount: formData.amount,
        shares: formData.shares || null,
        price_per_share: formData.price_per_share || null,
        currency: selectedFundData?.base_currency || 'USD',
        status: 'pending',
        reference_number: refNumber,
        description: formData.description,
        notes: formData.notes,
        created_by: user?.id,
      });

    if (!error) {
      closeModal();
      loadTransactions();
      updateCapitalAccount(formData.capital_account_id, formData.transaction_type, formData.amount, formData.shares);
    } else {
      alert('Error creating transaction');
    }
  };

  const updateCapitalAccount = async (accountId: string, type: string, amount: number, shares: number) => {
    const { data: account } = await supabase
      .from('capital_accounts')
      .select('capital_contributed, capital_returned, shares_owned')
      .eq('id', accountId)
      .single();

    if (account) {
      const updates: any = {};

      if (type === 'contribution') {
        updates.capital_contributed = (account.capital_contributed || 0) + amount;
        updates.shares_owned = (account.shares_owned || 0) + shares;
      } else if (type === 'redemption' || type === 'distribution') {
        updates.capital_returned = (account.capital_returned || 0) + amount;
        updates.shares_owned = (account.shares_owned || 0) - shares;
      }

      await supabase
        .from('capital_accounts')
        .update(updates)
        .eq('id', accountId);
    }
  };

  const openModal = () => {
    setFormData({
      capital_account_id: accounts[0]?.id || '',
      transaction_type: 'contribution',
      transaction_date: new Date().toISOString().split('T')[0],
      settlement_date: '',
      amount: 0,
      shares: 0,
      price_per_share: 0,
      description: '',
      notes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'contribution':
        return <ArrowDownCircle className="w-4 h-4 text-green-400" />;
      case 'redemption':
        return <ArrowUpCircle className="w-4 h-4 text-red-400" />;
      case 'distribution':
        return <DollarSign className="w-4 h-4 text-blue-400" />;
      case 'transfer_in':
      case 'transfer_out':
        return <ArrowRightLeft className="w-4 h-4 text-yellow-400" />;
      default:
        return <DollarSign className="w-4 h-4 text-slate-400" />;
    }
  };

  const calculateTotals = () => {
    return transactions.reduce((acc, txn) => {
      if (txn.transaction_type === 'contribution') {
        acc.totalIn += txn.amount;
      } else if (txn.transaction_type === 'redemption' || txn.transaction_type === 'distribution') {
        acc.totalOut += txn.amount;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0 });
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
          <h2 className="text-2xl font-bold text-white">Transaction Management</h2>
          <p className="text-slate-400 mt-1">Track and manage capital transactions</p>
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
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Contributions</span>
            <ArrowDownCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalIn / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-xl p-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Outflows</span>
            <ArrowUpCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalOut / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Net Flow</span>
            <DollarSign className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {((totals.totalIn - totals.totalOut) / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Transaction History</h3>
          <div className="flex space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="contribution">Contributions</option>
              <option value="redemption">Redemptions</option>
              <option value="distribution">Distributions</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="settled">Settled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm flex items-center space-x-1 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-10 gap-4 text-sm font-medium text-slate-400 pb-3 border-b border-slate-700">
              <div className="col-span-2">Investor</div>
              <div>Type</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Price/Share</div>
              <div>Status</div>
              <div>Reference</div>
              <div>Description</div>
            </div>

            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="grid grid-cols-10 gap-4 items-center py-3 hover:bg-slate-700/50 rounded-lg px-3 transition-colors"
              >
                <div className="col-span-2">
                  <div className="font-medium text-white">{txn.capital_account.investor.full_name}</div>
                  <div className="text-xs text-slate-400">{txn.capital_account.account_number}</div>
                </div>
                <div className="flex items-center space-x-2">
                  {getTransactionIcon(txn.transaction_type)}
                  <span className="text-white text-sm capitalize">{txn.transaction_type.replace('_', ' ')}</span>
                </div>
                <div className="text-white text-sm">
                  {new Date(txn.transaction_date).toLocaleDateString()}
                </div>
                <div className={`text-right font-mono ${
                  txn.transaction_type === 'contribution' || txn.transaction_type === 'transfer_in'
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {txn.transaction_type === 'contribution' || txn.transaction_type === 'transfer_in' ? '+' : '-'}
                  {(txn.amount / 1000).toFixed(0)}K
                </div>
                <div className="text-right text-white font-mono text-sm">
                  {txn.shares ? txn.shares.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                </div>
                <div className="text-right text-slate-300 text-sm">
                  {txn.price_per_share ? txn.price_per_share.toFixed(4) : '-'}
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    txn.status === 'settled'
                      ? 'bg-green-500/20 text-green-400'
                      : txn.status === 'processing'
                      ? 'bg-blue-500/20 text-blue-400'
                      : txn.status === 'cancelled'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {txn.status}
                  </span>
                </div>
                <div className="text-slate-400 text-xs font-mono">{txn.reference_number}</div>
                <div className="text-slate-300 text-sm truncate">{txn.description || '-'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No transactions found</p>
            <p className="text-slate-500 text-sm mt-2">Record your first transaction to get started</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Record Transaction</h3>
              <p className="text-slate-400 mt-1">Enter transaction details</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Transaction Type
                  </label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="contribution">Contribution</option>
                    <option value="redemption">Redemption</option>
                    <option value="distribution">Distribution</option>
                    <option value="transfer_in">Transfer In</option>
                    <option value="transfer_out">Transfer Out</option>
                    <option value="fee">Fee</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Capital Account
                  </label>
                  <select
                    required
                    value={formData.capital_account_id}
                    onChange={(e) => setFormData({ ...formData, capital_account_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_number} - {account.investor.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Settlement Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.settlement_date}
                    onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Shares (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.shares}
                    onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Price/Share (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.price_per_share}
                    onChange={(e) => setFormData({ ...formData, price_per_share: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of transaction"
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
                  rows={3}
                  placeholder="Additional notes or details"
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
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
