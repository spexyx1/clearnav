import { useState, useEffect } from 'react';
import { Plus, Bell, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
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
  commitment_amount: number;
  capital_called: number;
  investor: { full_name: string; email: string };
}

interface CapitalCall {
  id: string;
  call_number: string;
  call_date: string;
  due_date: string;
  call_amount: number;
  amount_paid: number;
  amount_outstanding: number;
  percentage_of_commitment: number;
  status: string;
  purpose: string;
  capital_account: {
    account_number: string;
    investor: { full_name: string; email: string };
  };
}

export default function CapitalCallManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [accounts, setAccounts] = useState<CapitalAccount[]>([]);
  const [calls, setCalls] = useState<CapitalCall[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    capital_account_id: '',
    call_date: new Date().toISOString().split('T')[0],
    due_date: '',
    call_amount: 0,
    percentage_of_commitment: 0,
    purpose: '',
    notes: '',
    payment_instructions: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadAccounts();
      loadCalls();
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

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('capital_accounts')
      .select(`
        id,
        account_number,
        commitment_amount,
        capital_called,
        investor:client_profiles!investor_id(full_name, email)
      `)
      .eq('fund_id', selectedFund)
      .eq('status', 'active')
      .order('account_number');

    if (data) {
      setAccounts(data as any);
    }
  };

  const loadCalls = async () => {
    let query = supabase
      .from('capital_calls')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name, email)
        )
      `)
      .eq('fund_id', selectedFund)
      .order('call_date', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;

    if (data) {
      setCalls(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const callNumber = `CALL-${Date.now().toString().slice(-8)}`;
    const selectedFundData = funds.find(f => f.id === selectedFund);

    const { error } = await supabase
      .from('capital_calls')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        capital_account_id: formData.capital_account_id,
        call_number: callNumber,
        call_date: formData.call_date,
        due_date: formData.due_date,
        call_amount: formData.call_amount,
        percentage_of_commitment: formData.percentage_of_commitment,
        currency: selectedFundData?.base_currency || 'USD',
        status: 'issued',
        purpose: formData.purpose,
        notes: formData.notes,
        payment_instructions: formData.payment_instructions,
        created_by: user?.id,
      });

    if (!error) {
      closeModal();
      loadCalls();
      updateCapitalAccountCalled(formData.capital_account_id, formData.call_amount);
    } else {
      alert('Error creating capital call');
    }
  };

  const updateCapitalAccountCalled = async (accountId: string, amount: number) => {
    const { data: account } = await supabase
      .from('capital_accounts')
      .select('capital_called')
      .eq('id', accountId)
      .single();

    if (account) {
      await supabase
        .from('capital_accounts')
        .update({ capital_called: (account.capital_called || 0) + amount })
        .eq('id', accountId);
    }
  };

  const handleRecordPayment = async (callId: string, paymentAmount: number) => {
    const { error } = await supabase
      .from('capital_calls')
      .update({ amount_paid: paymentAmount })
      .eq('id', callId);

    if (!error) {
      loadCalls();
    }
  };

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      const available = account.commitment_amount - (account.capital_called || 0);
      setFormData({
        ...formData,
        capital_account_id: accountId,
        call_amount: 0,
        percentage_of_commitment: 0,
      });
    }
  };

  const handleAmountChange = (amount: number) => {
    const account = accounts.find(a => a.id === formData.capital_account_id);
    if (account && account.commitment_amount > 0) {
      const percentage = (amount / account.commitment_amount) * 100;
      setFormData({
        ...formData,
        call_amount: amount,
        percentage_of_commitment: parseFloat(percentage.toFixed(2)),
      });
    } else {
      setFormData({ ...formData, call_amount: amount });
    }
  };

  const openModal = () => {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    setFormData({
      capital_account_id: accounts[0]?.id || '',
      call_date: new Date().toISOString().split('T')[0],
      due_date: defaultDueDate.toISOString().split('T')[0],
      call_amount: 0,
      percentage_of_commitment: 0,
      purpose: '',
      notes: '',
      payment_instructions: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const calculateTotals = () => {
    return calls.reduce((acc, call) => {
      acc.totalCalled += call.call_amount;
      acc.totalPaid += call.amount_paid;
      acc.totalOutstanding += call.amount_outstanding;
      return acc;
    }, { totalCalled: 0, totalPaid: 0, totalOutstanding: 0 });
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
  const overdueCalls = calls.filter(c => c.status === 'overdue' || (c.status === 'issued' && new Date(c.due_date) < new Date()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Capital Call Management</h2>
          <p className="text-slate-400 mt-1">Issue and track capital calls to investors</p>
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
            <span>Issue Capital Call</span>
          </button>
        </div>
      </div>

      {overdueCalls.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-6 border border-red-500/50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                {overdueCalls.length} Overdue Capital Call{overdueCalls.length > 1 ? 's' : ''}
              </h3>
              <p className="text-slate-400 text-sm">
                Total overdue: {selectedFundData?.base_currency} {
                  (overdueCalls.reduce((sum, c) => sum + c.amount_outstanding, 0) / 1000).toFixed(0)
                }K
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Called</span>
            <Bell className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalCalled / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Paid</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            {selectedFundData?.base_currency} {(totals.totalPaid / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Outstanding</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {selectedFundData?.base_currency} {(totals.totalOutstanding / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Capital Calls ({calls.length})</h3>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="partial">Partial Payment</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {calls.length > 0 ? (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="grid grid-cols-6 gap-4 items-start">
                  <div className="col-span-2">
                    <div className="font-medium text-white">{call.capital_account.investor.full_name}</div>
                    <div className="text-xs text-slate-400 mt-1">{call.capital_account.account_number}</div>
                    <div className="text-xs text-slate-400">{call.capital_account.investor.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Call Number</div>
                    <div className="text-white font-mono text-sm">{call.call_number}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {call.percentage_of_commitment.toFixed(1)}% of commitment
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Due Date</div>
                    <div className="text-white text-sm">{new Date(call.due_date).toLocaleDateString()}</div>
                    <div className={`text-xs mt-1 ${
                      new Date(call.due_date) < new Date() && call.status !== 'paid'
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}>
                      {new Date(call.due_date) < new Date() && call.status !== 'paid'
                        ? 'OVERDUE'
                        : `${Math.ceil((new Date(call.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Amount</div>
                    <div className="text-white font-semibold">
                      {selectedFundData?.base_currency} {(call.call_amount / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-green-400 mt-1">
                      Paid: {(call.amount_paid / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-yellow-400">
                      Due: {(call.amount_outstanding / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      call.status === 'paid'
                        ? 'bg-green-500/20 text-green-400'
                        : call.status === 'partial'
                        ? 'bg-blue-500/20 text-blue-400'
                        : call.status === 'overdue' || (call.status === 'issued' && new Date(call.due_date) < new Date())
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {call.status === 'issued' && new Date(call.due_date) < new Date() ? 'overdue' : call.status}
                    </span>
                    {call.status !== 'paid' && (
                      <button
                        onClick={() => {
                          const payment = prompt(`Enter payment amount (Outstanding: ${call.amount_outstanding}):`);
                          if (payment) {
                            handleRecordPayment(call.id, call.amount_paid + parseFloat(payment));
                          }
                        }}
                        className="block mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
                {call.purpose && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-400">Purpose</div>
                    <div className="text-sm text-slate-300">{call.purpose}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No capital calls issued yet</p>
            <p className="text-slate-500 text-sm mt-2">Issue your first capital call to request funds from investors</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Issue Capital Call</h3>
              <p className="text-slate-400 mt-1">Request capital from an investor</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Investor / Capital Account
                </label>
                <select
                  required
                  value={formData.capital_account_id}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.investor.full_name}
                      (Commitment: {selectedFundData?.base_currency}{(account.commitment_amount / 1000).toFixed(0)}K,
                      Called: {selectedFundData?.base_currency}{((account.capital_called || 0) / 1000).toFixed(0)}K)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Call Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.call_date}
                    onChange={(e) => setFormData({ ...formData, call_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Call Amount
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.call_amount}
                    onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    % of Commitment
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={formData.percentage_of_commitment}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Purpose
                </label>
                <input
                  type="text"
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., Investment opportunities, Operating expenses"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payment Instructions
                </label>
                <textarea
                  value={formData.payment_instructions}
                  onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
                  rows={3}
                  placeholder="Wire transfer details, account information, etc."
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
                  Issue Capital Call
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
