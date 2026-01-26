import { useState, useEffect } from 'react';
import { Plus, TrendingUp, AlertTriangle, DollarSign, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface CarriedInterestAccount {
  id: string;
  gp_entity_name: string;
  total_carry_accrued: number;
  total_carry_distributed: number;
  clawback_reserve: number;
  high_water_mark: number;
  last_calculation_date: string | null;
  status: string;
  waterfall_structure: {
    structure_name: string;
    carried_interest_rate: number;
  } | null;
}

interface ClawbackProvision {
  id: string;
  calculation_date: string;
  total_carry_distributed: number;
  total_carry_earned: number;
  clawback_amount: number;
  clawback_status: string;
  amount_paid: number;
  payment_due_date: string | null;
}

export default function CarriedInterestTracker() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [carryAccounts, setCarryAccounts] = useState<CarriedInterestAccount[]>([]);
  const [clawbacks, setClawbacks] = useState<ClawbackProvision[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedTab, setSelectedTab] = useState<'accounts' | 'clawbacks'>('accounts');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    gp_entity_name: '',
    waterfall_structure_id: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadCarryAccounts();
      loadClawbacks();
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

  const loadCarryAccounts = async () => {
    const { data } = await supabase
      .from('carried_interest_accounts')
      .select(`
        *,
        waterfall_structure:waterfall_structures(structure_name, carried_interest_rate)
      `)
      .eq('fund_id', selectedFund)
      .order('created_at', { ascending: false });

    if (data) {
      setCarryAccounts(data as any);
    }
  };

  const loadClawbacks = async () => {
    const { data } = await supabase
      .from('clawback_provisions')
      .select('*')
      .eq('fund_id', selectedFund)
      .order('calculation_date', { ascending: false });

    if (data) {
      setClawbacks(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('carried_interest_accounts')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        waterfall_structure_id: formData.waterfall_structure_id || null,
        gp_entity_name: formData.gp_entity_name,
        status: 'active',
      });

    if (!error) {
      closeModal();
      loadCarryAccounts();
    } else {
      alert('Error creating carried interest account');
    }
  };

  const calculateClawback = async (accountId: string) => {
    const account = carryAccounts.find(a => a.id === accountId);
    if (!account) return;

    const { data: calculations } = await supabase
      .from('waterfall_calculations')
      .select('gp_allocation, lp_allocation')
      .eq('fund_id', selectedFund)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!calculations) {
      alert('No waterfall calculations found. Please run a waterfall calculation first.');
      return;
    }

    const totalCarryEarned = calculations.gp_allocation;
    const clawbackAmount = account.total_carry_distributed - totalCarryEarned;

    if (clawbackAmount > 0) {
      await supabase
        .from('clawback_provisions')
        .insert({
          tenant_id: currentTenant?.id,
          carried_interest_account_id: accountId,
          fund_id: selectedFund,
          calculation_date: new Date().toISOString().split('T')[0],
          total_carry_distributed: account.total_carry_distributed,
          total_carry_earned: totalCarryEarned,
          clawback_amount: clawbackAmount,
          clawback_status: 'calculated',
          amount_paid: 0,
          calculation_details: {
            gp_allocation: calculations.gp_allocation,
            lp_allocation: calculations.lp_allocation,
          },
          created_by: user?.id,
        });

      loadClawbacks();
      alert(`Clawback calculated: ${clawbackAmount.toLocaleString()} needs to be returned`);
    } else {
      alert('No clawback required. GP has not received excess carry.');
    }
  };

  const openModal = () => {
    setFormData({
      gp_entity_name: '',
      waterfall_structure_id: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const calculateTotals = () => {
    return carryAccounts.reduce((acc, account) => {
      acc.totalAccrued += account.total_carry_accrued;
      acc.totalDistributed += account.total_carry_distributed;
      acc.totalReserve += account.clawback_reserve;
      return acc;
    }, { totalAccrued: 0, totalDistributed: 0, totalReserve: 0 });
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
          <h2 className="text-2xl font-bold text-white">Carried Interest Tracker</h2>
          <p className="text-slate-400 mt-1">Track GP carried interest and clawback provisions</p>
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
          {selectedTab === 'accounts' && (
            <button
              onClick={openModal}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add GP Account</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-700">
        <button
          onClick={() => setSelectedTab('accounts')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedTab === 'accounts'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Carry Accounts ({carryAccounts.length})
        </button>
        <button
          onClick={() => setSelectedTab('clawbacks')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedTab === 'clawbacks'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Clawback Provisions ({clawbacks.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Accrued</span>
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(totals.totalAccrued / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Distributed</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            {selectedFundData?.base_currency} {(totals.totalDistributed / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Clawback Reserve</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {selectedFundData?.base_currency} {(totals.totalReserve / 1000000).toFixed(2)}M
          </div>
        </div>
      </div>

      {selectedTab === 'accounts' ? (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">GP Carried Interest Accounts</h3>

          {carryAccounts.length > 0 ? (
            <div className="space-y-3">
              {carryAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{account.gp_entity_name}</h4>
                      {account.waterfall_structure && (
                        <p className="text-slate-400 text-sm mt-1">
                          {account.waterfall_structure.structure_name} ({account.waterfall_structure.carried_interest_rate}%)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        account.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : account.status === 'suspended'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {account.status}
                      </span>
                      <button
                        onClick={() => calculateClawback(account.id)}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Calculate Clawback
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Carry Accrued</div>
                      <div className="text-white font-semibold text-lg">
                        {selectedFundData?.base_currency} {(account.total_carry_accrued / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Carry Distributed</div>
                      <div className="text-green-400 font-semibold text-lg">
                        {selectedFundData?.base_currency} {(account.total_carry_distributed / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Clawback Reserve</div>
                      <div className="text-yellow-400 font-semibold text-lg">
                        {selectedFundData?.base_currency} {(account.clawback_reserve / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">High Water Mark</div>
                      <div className="text-cyan-400 font-semibold text-lg">
                        {selectedFundData?.base_currency} {(account.high_water_mark / 1000000).toFixed(2)}M
                      </div>
                    </div>
                  </div>

                  {account.last_calculation_date && (
                    <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400">
                      Last calculated: {new Date(account.last_calculation_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Percent className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No carried interest accounts</p>
              <p className="text-slate-500 text-sm mt-2">Add a GP account to track carried interest</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">Clawback Provisions</h3>

          {clawbacks.length > 0 ? (
            <div className="space-y-3">
              {clawbacks.map((clawback) => (
                <div
                  key={clawback.id}
                  className="bg-slate-800/80 rounded-lg p-4"
                >
                  <div className="grid grid-cols-7 gap-4 items-center">
                    <div>
                      <div className="text-xs text-slate-400">Calculation Date</div>
                      <div className="text-white text-sm">
                        {new Date(clawback.calculation_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Carry Distributed</div>
                      <div className="text-white text-sm">
                        {(clawback.total_carry_distributed / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Carry Earned</div>
                      <div className="text-green-400 text-sm">
                        {(clawback.total_carry_earned / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Clawback Amount</div>
                      <div className="text-red-400 text-sm font-semibold">
                        {(clawback.clawback_amount / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Amount Paid</div>
                      <div className="text-white text-sm">
                        {(clawback.amount_paid / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Due Date</div>
                      <div className="text-white text-sm">
                        {clawback.payment_due_date ? new Date(clawback.payment_due_date).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        clawback.clawback_status === 'paid'
                          ? 'bg-green-500/20 text-green-400'
                          : clawback.clawback_status === 'notified'
                          ? 'bg-blue-500/20 text-blue-400'
                          : clawback.clawback_status === 'waived'
                          ? 'bg-slate-500/20 text-slate-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {clawback.clawback_status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No clawback provisions</p>
              <p className="text-slate-500 text-sm mt-2">Calculate clawbacks to track GP obligations</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-lg w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Add GP Account</h3>
              <p className="text-slate-400 mt-1">Create a carried interest tracking account</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GP Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.gp_entity_name}
                  onChange={(e) => setFormData({ ...formData, gp_entity_name: e.target.value })}
                  placeholder="e.g., ABC Capital Management GP, LLC"
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
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
