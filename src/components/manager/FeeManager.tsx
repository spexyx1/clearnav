import { useState, useEffect } from 'react';
import { Plus, DollarSign, Percent, Calculator, TrendingUp } from 'lucide-react';
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

interface FeeSchedule {
  id: string;
  fee_name: string;
  fee_type: string;
  calculation_method: string;
  fee_rate: number;
  frequency: string;
  hurdle_rate: number | null;
  high_water_mark: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
  share_class: { class_code: string; class_name: string } | null;
}

interface FeeTransaction {
  id: string;
  period_start: string;
  period_end: string;
  base_amount: number;
  fee_rate_applied: number;
  fee_amount: number;
  fee_paid: number;
  status: string;
  capital_account: {
    account_number: string;
    investor: { full_name: string };
  };
  fee_schedule: {
    fee_name: string;
    fee_type: string;
  };
}

export default function FeeManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [feeSchedules, setFeeSchedules] = useState<FeeSchedule[]>([]);
  const [feeTransactions, setFeeTransactions] = useState<FeeTransaction[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedTab, setSelectedTab] = useState<'schedules' | 'transactions'>('schedules');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    share_class_id: '',
    fee_name: '',
    fee_type: 'management_fee',
    calculation_method: 'percentage_of_nav',
    fee_rate: 0,
    frequency: 'quarterly',
    hurdle_rate: 0,
    high_water_mark: false,
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadShareClasses();
      loadFeeSchedules();
      loadFeeTransactions();
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

  const loadFeeSchedules = async () => {
    const { data } = await supabase
      .from('fee_schedules')
      .select(`
        *,
        share_class:share_classes(class_code, class_name)
      `)
      .eq('fund_id', selectedFund)
      .order('created_at', { ascending: false });

    if (data) {
      setFeeSchedules(data as any);
    }
  };

  const loadFeeTransactions = async () => {
    const { data } = await supabase
      .from('fee_transactions')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name)
        ),
        fee_schedule:fee_schedules!fee_schedule_id(
          fee_name,
          fee_type
        )
      `)
      .eq('fund_id', selectedFund)
      .order('period_end', { ascending: false })
      .limit(100);

    if (data) {
      setFeeTransactions(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('fee_schedules')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        share_class_id: formData.share_class_id || null,
        fee_name: formData.fee_name,
        fee_type: formData.fee_type,
        calculation_method: formData.calculation_method,
        fee_rate: formData.fee_rate,
        frequency: formData.frequency,
        hurdle_rate: formData.hurdle_rate || null,
        high_water_mark: formData.high_water_mark,
        start_date: formData.start_date,
        status: 'active',
        notes: formData.notes,
      });

    if (!error) {
      closeModal();
      loadFeeSchedules();
    } else {
      alert('Error creating fee schedule');
    }
  };

  const calculateFees = async () => {
    const { data: accounts } = await supabase
      .from('capital_accounts')
      .select('id, shares_owned')
      .eq('fund_id', selectedFund)
      .eq('status', 'active');

    if (!accounts || accounts.length === 0) {
      alert('No active capital accounts found');
      return;
    }

    const { data: latestNAV } = await supabase
      .from('nav_calculations')
      .select('nav_per_share, calculation_date')
      .eq('fund_id', selectedFund)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .single();

    if (!latestNAV) {
      alert('No NAV calculation found. Please calculate NAV first.');
      return;
    }

    const activeFeeSchedules = feeSchedules.filter(fs => fs.status === 'active');

    if (activeFeeSchedules.length === 0) {
      alert('No active fee schedules found');
      return;
    }

    const today = new Date();
    const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);

    for (const account of accounts) {
      const accountValue = account.shares_owned * latestNAV.nav_per_share;

      for (const schedule of activeFeeSchedules) {
        let baseAmount = accountValue;

        if (schedule.calculation_method === 'percentage_of_nav') {
          baseAmount = accountValue;
        }

        const annualFeeRate = schedule.fee_rate / 100;
        let feeRateForPeriod = annualFeeRate;

        if (schedule.frequency === 'quarterly') {
          feeRateForPeriod = annualFeeRate / 4;
        } else if (schedule.frequency === 'monthly') {
          feeRateForPeriod = annualFeeRate / 12;
        }

        const feeAmount = baseAmount * feeRateForPeriod;

        await supabase
          .from('fee_transactions')
          .insert({
            tenant_id: currentTenant?.id,
            fee_schedule_id: schedule.id,
            capital_account_id: account.id,
            fund_id: selectedFund,
            period_start: quarterStart.toISOString().split('T')[0],
            period_end: quarterEnd.toISOString().split('T')[0],
            calculation_date: new Date().toISOString().split('T')[0],
            base_amount: baseAmount,
            fee_rate_applied: feeRateForPeriod,
            fee_amount: feeAmount,
            status: 'calculated',
            calculation_details: {
              nav_per_share: latestNAV.nav_per_share,
              shares: account.shares_owned,
              account_value: accountValue,
            },
            created_by: user?.id,
          });
      }
    }

    loadFeeTransactions();
    alert('Fees calculated successfully');
  };

  const openModal = () => {
    setFormData({
      share_class_id: '',
      fee_name: '',
      fee_type: 'management_fee',
      calculation_method: 'percentage_of_nav',
      fee_rate: 2.0,
      frequency: 'quarterly',
      hurdle_rate: 0,
      high_water_mark: false,
      start_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const calculateTotals = () => {
    return feeTransactions.reduce((acc, txn) => {
      acc.totalCalculated += txn.fee_amount;
      acc.totalPaid += txn.fee_paid;
      if (txn.status === 'calculated' || txn.status === 'accrued') {
        acc.totalOutstanding += txn.fee_amount - txn.fee_paid;
      }
      return acc;
    }, { totalCalculated: 0, totalPaid: 0, totalOutstanding: 0 });
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
          <h2 className="text-2xl font-bold text-white">Fee Management</h2>
          <p className="text-slate-400 mt-1">Configure fee schedules and calculate fees</p>
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
          {selectedTab === 'schedules' && (
            <button
              onClick={openModal}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fee Schedule</span>
            </button>
          )}
          {selectedTab === 'transactions' && (
            <button
              onClick={calculateFees}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              <span>Calculate Fees</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-700">
        <button
          onClick={() => setSelectedTab('schedules')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedTab === 'schedules'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Fee Schedules ({feeSchedules.length})
        </button>
        <button
          onClick={() => setSelectedTab('transactions')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedTab === 'transactions'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Fee Transactions ({feeTransactions.length})
        </button>
      </div>

      {selectedTab === 'transactions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Fees Calculated</span>
              <DollarSign className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {selectedFundData?.base_currency} {(totals.totalCalculated / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Fees Paid</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-400">
              {selectedFundData?.base_currency} {(totals.totalPaid / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Outstanding</span>
              <Percent className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              {selectedFundData?.base_currency} {(totals.totalOutstanding / 1000).toFixed(1)}K
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'schedules' ? (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">Fee Schedules</h3>

          {feeSchedules.length > 0 ? (
            <div className="space-y-3">
              {feeSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="grid grid-cols-6 gap-4 items-start">
                    <div>
                      <div className="font-medium text-white">{schedule.fee_name}</div>
                      <div className="text-xs text-slate-400 mt-1 capitalize">
                        {schedule.fee_type.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Share Class</div>
                      <div className="text-white text-sm">
                        {schedule.share_class ? `Class ${schedule.share_class.class_code}` : 'All Classes'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Fee Rate</div>
                      <div className="text-white font-semibold">{schedule.fee_rate}%</div>
                      <div className="text-xs text-slate-400 capitalize">{schedule.frequency}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Calculation Method</div>
                      <div className="text-slate-300 text-sm capitalize">
                        {schedule.calculation_method.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Start Date</div>
                      <div className="text-white text-sm">{new Date(schedule.start_date).toLocaleDateString()}</div>
                      {schedule.hurdle_rate && (
                        <div className="text-xs text-cyan-400 mt-1">
                          Hurdle: {schedule.hurdle_rate}%
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        schedule.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {schedule.status}
                      </span>
                      {schedule.high_water_mark && (
                        <div className="text-xs text-blue-400 mt-2">High Water Mark</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Percent className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No fee schedules configured</p>
              <p className="text-slate-500 text-sm mt-2">Add your first fee schedule to start tracking fees</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">Fee Transactions</h3>

          {feeTransactions.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-slate-400 pb-3 border-b border-slate-700">
                <div className="col-span-2">Investor</div>
                <div>Fee Type</div>
                <div>Period</div>
                <div className="text-right">Base Amount</div>
                <div className="text-right">Fee Rate</div>
                <div className="text-right">Fee Amount</div>
                <div>Status</div>
              </div>

              {feeTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="grid grid-cols-8 gap-4 items-center py-3 hover:bg-slate-700/50 rounded-lg px-3 transition-colors"
                >
                  <div className="col-span-2">
                    <div className="font-medium text-white">{txn.capital_account.investor.full_name}</div>
                    <div className="text-xs text-slate-400">{txn.capital_account.account_number}</div>
                  </div>
                  <div className="text-white text-sm capitalize">
                    {txn.fee_schedule.fee_type.replace('_', ' ')}
                  </div>
                  <div className="text-slate-300 text-sm">
                    {new Date(txn.period_end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-right text-white font-mono text-sm">
                    {(txn.base_amount / 1000).toFixed(0)}K
                  </div>
                  <div className="text-right text-slate-300 text-sm">
                    {(txn.fee_rate_applied * 100).toFixed(2)}%
                  </div>
                  <div className="text-right text-cyan-400 font-semibold">
                    {(txn.fee_amount / 1000).toFixed(1)}K
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      txn.status === 'paid'
                        ? 'bg-green-500/20 text-green-400'
                        : txn.status === 'invoiced'
                        ? 'bg-blue-500/20 text-blue-400'
                        : txn.status === 'waived'
                        ? 'bg-slate-500/20 text-slate-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No fee transactions yet</p>
              <p className="text-slate-500 text-sm mt-2">Click Calculate Fees to generate fee transactions</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Add Fee Schedule</h3>
              <p className="text-slate-400 mt-1">Configure a new fee schedule</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fee_name}
                    onChange={(e) => setFormData({ ...formData, fee_name: e.target.value })}
                    placeholder="e.g., Management Fee"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fee Type
                  </label>
                  <select
                    value={formData.fee_type}
                    onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="management_fee">Management Fee</option>
                    <option value="performance_fee">Performance Fee</option>
                    <option value="admin_fee">Admin Fee</option>
                    <option value="custodian_fee">Custodian Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Calculation Method
                  </label>
                  <select
                    value={formData.calculation_method}
                    onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="percentage_of_nav">% of NAV</option>
                    <option value="percentage_of_committed">% of Committed Capital</option>
                    <option value="percentage_of_invested">% of Invested Capital</option>
                    <option value="percentage_of_gains">% of Gains</option>
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fee Rate (% Annual)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.fee_rate}
                    onChange={(e) => setFormData({ ...formData, fee_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hurdle Rate (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hurdle_rate}
                    onChange={(e) => setFormData({ ...formData, hurdle_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="high_water_mark"
                  checked={formData.high_water_mark}
                  onChange={(e) => setFormData({ ...formData, high_water_mark: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                />
                <label htmlFor="high_water_mark" className="text-sm text-slate-300">
                  Apply High Water Mark (for performance fees)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
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
                  Add Fee Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
