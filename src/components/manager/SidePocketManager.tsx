import { useState, useEffect } from 'react';
import { Plus, Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface SidePocket {
  id: string;
  side_pocket_name: string;
  side_pocket_code: string;
  investment_description: string | null;
  creation_date: string;
  total_value: number;
  unrealized_gain_loss: number;
  liquidity_status: string;
  status: string;
}

interface SidePocketAllocation {
  id: string;
  allocation_date: string;
  allocated_amount: number;
  current_value: number;
  unrealized_gain_loss: number;
  distributions_received: number;
  status: string;
  capital_account: {
    account_number: string;
    investor: { full_name: string };
  };
}

export default function SidePocketManager() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [sidePockets, setSidePockets] = useState<SidePocket[]>([]);
  const [allocations, setAllocations] = useState<SidePocketAllocation[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedPocket, setSelectedPocket] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    side_pocket_name: '',
    side_pocket_code: '',
    investment_description: '',
    creation_reason: '',
    total_value: 0,
    liquidity_status: 'illiquid',
    distribution_priority: 'pro_rata',
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadSidePockets();
    }
  }, [selectedFund]);

  useEffect(() => {
    if (selectedPocket) {
      loadAllocations();
    }
  }, [selectedPocket]);

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

  const loadSidePockets = async () => {
    const { data } = await supabase
      .from('side_pockets')
      .select('*')
      .eq('fund_id', selectedFund)
      .order('creation_date', { ascending: false });

    if (data) {
      setSidePockets(data);
      if (data.length > 0 && !selectedPocket) {
        setSelectedPocket(data[0].id);
      }
    }
  };

  const loadAllocations = async () => {
    const { data } = await supabase
      .from('side_pocket_allocations')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name)
        )
      `)
      .eq('side_pocket_id', selectedPocket)
      .order('allocation_date', { ascending: false });

    if (data) {
      setAllocations(data as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('side_pockets')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        side_pocket_name: formData.side_pocket_name,
        side_pocket_code: formData.side_pocket_code,
        investment_description: formData.investment_description,
        creation_date: new Date().toISOString().split('T')[0],
        creation_reason: formData.creation_reason,
        total_value: formData.total_value,
        liquidity_status: formData.liquidity_status,
        distribution_priority: formData.distribution_priority,
        status: 'active',
      });

    if (!error) {
      closeModal();
      loadSidePockets();
    } else {
      alert('Error creating side pocket');
    }
  };

  const openModal = () => {
    setFormData({
      side_pocket_name: '',
      side_pocket_code: '',
      investment_description: '',
      creation_reason: '',
      total_value: 0,
      liquidity_status: 'illiquid',
      distribution_priority: 'pro_rata',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const calculateTotals = () => {
    return allocations.reduce((acc, alloc) => {
      acc.totalAllocated += alloc.allocated_amount;
      acc.totalCurrentValue += alloc.current_value;
      acc.totalGainLoss += alloc.unrealized_gain_loss;
      acc.totalDistributions += alloc.distributions_received;
      return acc;
    }, { totalAllocated: 0, totalCurrentValue: 0, totalGainLoss: 0, totalDistributions: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const selectedFundData = funds.find(f => f.id === selectedFund);
  const selectedPocketData = sidePockets.find(p => p.id === selectedPocket);
  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Side Pocket Manager</h2>
          <p className="text-slate-400 mt-1">Manage illiquid and special investments</p>
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
            <span>Create Side Pocket</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Side Pockets</span>
            <Package className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">{sidePockets.length}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Value</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {selectedFundData?.base_currency} {(sidePockets.reduce((sum, p) => sum + p.total_value, 0) / 1000000).toFixed(2)}M
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Active Pockets</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {sidePockets.filter(p => p.status === 'active').length}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Investors</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white">{allocations.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Side Pockets ({sidePockets.length})</h3>
          </div>

          {sidePockets.length > 0 ? (
            <div className="space-y-3">
              {sidePockets.map((pocket) => (
                <div
                  key={pocket.id}
                  onClick={() => setSelectedPocket(pocket.id)}
                  className={`bg-slate-800/80 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPocket === pocket.id
                      ? 'ring-2 ring-cyan-500 bg-slate-700/80'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{pocket.side_pocket_name}</h4>
                      <p className="text-slate-400 text-sm mt-1">Code: {pocket.side_pocket_code}</p>
                      {pocket.investment_description && (
                        <p className="text-slate-400 text-xs mt-1">{pocket.investment_description}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      pocket.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : pocket.status === 'distributing'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {pocket.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Total Value</div>
                      <div className="text-white font-semibold">
                        {(pocket.total_value / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Unrealized G/L</div>
                      <div className={`font-semibold ${
                        pocket.unrealized_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {pocket.unrealized_gain_loss >= 0 ? '+' : ''}
                        {(pocket.unrealized_gain_loss / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Liquidity</div>
                      <div className={`text-xs font-medium capitalize ${
                        pocket.liquidity_status === 'illiquid'
                          ? 'text-red-400'
                          : pocket.liquidity_status === 'partially_liquid'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}>
                        {pocket.liquidity_status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                    Created: {new Date(pocket.creation_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No side pockets</p>
              <p className="text-slate-500 text-sm mt-2">Create a side pocket for illiquid investments</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="mb-6">
            {selectedPocketData ? (
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedPocketData.side_pocket_name}</h3>
                <p className="text-slate-400 text-sm mt-1">Investor Allocations ({allocations.length})</p>
              </div>
            ) : (
              <h3 className="text-xl font-semibold text-white">Select a Side Pocket</h3>
            )}
          </div>

          {selectedPocketData && allocations.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-800/80 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Allocated</div>
                  <div className="text-white font-semibold text-sm">
                    {(totals.totalAllocated / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Current</div>
                  <div className="text-white font-semibold text-sm">
                    {(totals.totalCurrentValue / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-3">
                  <div className="text-xs text-slate-400">G/L</div>
                  <div className={`font-semibold text-sm ${
                    totals.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {totals.totalGainLoss >= 0 ? '+' : ''}
                    {(totals.totalGainLoss / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="bg-slate-800/80 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Distributed</div>
                  <div className="text-green-400 font-semibold text-sm">
                    {(totals.totalDistributions / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="bg-slate-800/80 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-white text-sm">
                          {allocation.capital_account.investor.full_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {allocation.capital_account.account_number}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        allocation.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : allocation.status === 'distributed'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {allocation.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-slate-400">Allocated</div>
                        <div className="text-white font-medium">
                          {(allocation.allocated_amount / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Current</div>
                        <div className="text-white font-medium">
                          {(allocation.current_value / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">G/L</div>
                        <div className={`font-medium ${
                          allocation.unrealized_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {allocation.unrealized_gain_loss >= 0 ? '+' : ''}
                          {((allocation.unrealized_gain_loss / allocation.allocated_amount) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Distributed</div>
                        <div className="text-green-400 font-medium">
                          {(allocation.distributions_received / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedPocketData && allocations.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No allocations yet</p>
              <p className="text-slate-500 text-sm mt-1">Allocate to investors as needed</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Create Side Pocket</h3>
              <p className="text-slate-400 mt-1">Establish a segregated investment account</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Side Pocket Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.side_pocket_name}
                    onChange={(e) => setFormData({ ...formData, side_pocket_name: e.target.value })}
                    placeholder="e.g., Illiquid Venture Portfolio"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Side Pocket Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.side_pocket_code}
                    onChange={(e) => setFormData({ ...formData, side_pocket_code: e.target.value })}
                    placeholder="e.g., SP-001"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Investment Description
                </label>
                <textarea
                  value={formData.investment_description}
                  onChange={(e) => setFormData({ ...formData, investment_description: e.target.value })}
                  rows={2}
                  placeholder="Describe the investment or asset class"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Creation Reason
                </label>
                <input
                  type="text"
                  value={formData.creation_reason}
                  onChange={(e) => setFormData({ ...formData, creation_reason: e.target.value })}
                  placeholder="e.g., Illiquidity event, Special opportunity"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Initial Value
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.total_value}
                    onChange={(e) => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Liquidity Status
                  </label>
                  <select
                    value={formData.liquidity_status}
                    onChange={(e) => setFormData({ ...formData, liquidity_status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="illiquid">Illiquid</option>
                    <option value="partially_liquid">Partially Liquid</option>
                    <option value="liquid">Liquid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Distribution Priority
                  </label>
                  <select
                    value={formData.distribution_priority}
                    onChange={(e) => setFormData({ ...formData, distribution_priority: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="pro_rata">Pro Rata</option>
                    <option value="pari_passu">Pari Passu</option>
                    <option value="waterfall">Waterfall</option>
                  </select>
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
                  Create Side Pocket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
