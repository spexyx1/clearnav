import { useState, useEffect } from 'react';
import { Plus, Calculator, TrendingUp, Layers, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface WaterfallStructure {
  id: string;
  structure_name: string;
  structure_type: string;
  hurdle_rate: number | null;
  catch_up_rate: number | null;
  carried_interest_rate: number;
  calculation_method: string;
  clawback_provision: boolean;
  status: string;
  tiers: any;
}

interface WaterfallCalculation {
  id: string;
  calculation_date: string;
  total_contributions: number;
  total_distributions: number;
  current_nav: number;
  preferred_return: number | null;
  lp_allocation: number;
  gp_allocation: number;
  catch_up_amount: number | null;
  tier_breakdown: any;
}

export default function WaterfallCalculator() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [structures, setStructures] = useState<WaterfallStructure[]>([]);
  const [calculations, setCalculations] = useState<WaterfallCalculation[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedTab, setSelectedTab] = useState<'structures' | 'calculations'>('structures');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    structure_name: '',
    structure_type: 'european',
    hurdle_rate: 8,
    catch_up_rate: 100,
    carried_interest_rate: 20,
    calculation_method: 'whole_fund',
    clawback_provision: true,
    preferred_return_compounded: true,
    gp_commitment_percent: 1,
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadStructures();
      loadCalculations();
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

  const loadStructures = async () => {
    const { data } = await supabase
      .from('waterfall_structures')
      .select('*')
      .eq('fund_id', selectedFund)
      .order('created_at', { ascending: false });

    if (data) {
      setStructures(data);
    }
  };

  const loadCalculations = async () => {
    const { data } = await supabase
      .from('waterfall_calculations')
      .select('*')
      .eq('fund_id', selectedFund)
      .order('calculation_date', { ascending: false })
      .limit(20);

    if (data) {
      setCalculations(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tiers = [
      {
        tier: 1,
        name: 'Return of Capital',
        allocation: { lp: 100, gp: 0 },
        description: '100% to LPs until return of capital'
      },
      {
        tier: 2,
        name: 'Preferred Return',
        allocation: { lp: 100, gp: 0 },
        description: `${formData.hurdle_rate}% hurdle to LPs`
      },
      {
        tier: 3,
        name: 'Catch-Up',
        allocation: { lp: 100 - formData.catch_up_rate, gp: formData.catch_up_rate },
        description: `${formData.catch_up_rate}% to GP until ${formData.carried_interest_rate}% of profits`
      },
      {
        tier: 4,
        name: 'Carried Interest',
        allocation: { lp: 100 - formData.carried_interest_rate, gp: formData.carried_interest_rate },
        description: `${100 - formData.carried_interest_rate}% LP / ${formData.carried_interest_rate}% GP`
      }
    ];

    const { error } = await supabase
      .from('waterfall_structures')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        structure_name: formData.structure_name,
        structure_type: formData.structure_type,
        hurdle_rate: formData.hurdle_rate,
        catch_up_rate: formData.catch_up_rate,
        carried_interest_rate: formData.carried_interest_rate,
        calculation_method: formData.calculation_method,
        clawback_provision: formData.clawback_provision,
        preferred_return_compounded: formData.preferred_return_compounded,
        gp_commitment_percent: formData.gp_commitment_percent,
        tiers: tiers,
        status: 'active',
      });

    if (!error) {
      closeModal();
      loadStructures();
    } else {
      alert('Error creating waterfall structure');
    }
  };

  const calculateWaterfall = async (structureId: string) => {
    setCalculating(true);

    const structure = structures.find(s => s.id === structureId);
    if (!structure) return;

    const { data: contributions } = await supabase
      .from('capital_transactions')
      .select('amount')
      .eq('fund_id', selectedFund)
      .eq('transaction_type', 'contribution');

    const { data: distributions } = await supabase
      .from('capital_transactions')
      .select('amount')
      .eq('fund_id', selectedFund)
      .in('transaction_type', ['distribution', 'redemption']);

    const { data: latestNAV } = await supabase
      .from('nav_calculations')
      .select('total_nav')
      .eq('fund_id', selectedFund)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const totalContributions = contributions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalDistributions = distributions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const currentNAV = latestNAV?.total_nav || 0;

    const totalValue = currentNAV + totalDistributions;
    const totalProfit = totalValue - totalContributions;

    const hurdleAmount = (totalContributions * (structure.hurdle_rate || 0) / 100);

    let lpAllocation = 0;
    let gpAllocation = 0;
    let catchUpAmount = 0;
    let preferredReturn = 0;

    if (totalProfit <= 0) {
      lpAllocation = totalDistributions;
      gpAllocation = 0;
    } else {
      preferredReturn = Math.min(totalProfit, hurdleAmount);
      lpAllocation = totalContributions + preferredReturn;

      let remainingProfit = totalProfit - preferredReturn;

      if (remainingProfit > 0) {
        const targetCarry = preferredReturn * (structure.carried_interest_rate / 100) / ((100 - structure.carried_interest_rate) / 100);
        catchUpAmount = Math.min(remainingProfit, targetCarry);
        gpAllocation = catchUpAmount;
        remainingProfit -= catchUpAmount;

        if (remainingProfit > 0) {
          const lpShare = remainingProfit * ((100 - structure.carried_interest_rate) / 100);
          const gpShare = remainingProfit * (structure.carried_interest_rate / 100);

          lpAllocation += lpShare;
          gpAllocation += gpShare;
        }
      }
    }

    const tierBreakdown = {
      tier1: { name: 'Return of Capital', lp: totalContributions, gp: 0 },
      tier2: { name: 'Preferred Return', lp: preferredReturn, gp: 0 },
      tier3: { name: 'Catch-Up', lp: 0, gp: catchUpAmount },
      tier4: { name: 'Carry Split', lp: lpAllocation - totalContributions - preferredReturn, gp: gpAllocation - catchUpAmount }
    };

    await supabase
      .from('waterfall_calculations')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        waterfall_structure_id: structureId,
        calculation_date: new Date().toISOString().split('T')[0],
        total_contributions: totalContributions,
        total_distributions: totalDistributions,
        current_nav: currentNAV,
        preferred_return: preferredReturn,
        lp_allocation: lpAllocation,
        gp_allocation: gpAllocation,
        catch_up_amount: catchUpAmount,
        tier_breakdown: tierBreakdown,
        calculation_details: {
          total_value: totalValue,
          total_profit: totalProfit,
          hurdle_amount: hurdleAmount,
        },
        created_by: user?.id,
      });

    setCalculating(false);
    loadCalculations();
    setSelectedTab('calculations');
    alert('Waterfall calculated successfully');
  };

  const openModal = () => {
    setFormData({
      structure_name: '',
      structure_type: 'european',
      hurdle_rate: 8,
      catch_up_rate: 100,
      carried_interest_rate: 20,
      calculation_method: 'whole_fund',
      clawback_provision: true,
      preferred_return_compounded: true,
      gp_commitment_percent: 1,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const selectedFundData = funds.find(f => f.id === selectedFund);
  const latestCalculation = calculations.length > 0 ? calculations[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Waterfall Calculator</h2>
          <p className="text-slate-400 mt-1">Configure and calculate carried interest waterfall</p>
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
          {selectedTab === 'structures' && (
            <button
              onClick={openModal}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Structure</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-700">
        <button
          onClick={() => setSelectedTab('structures')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedTab === 'structures'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Structures ({structures.length})
        </button>
        <button
          onClick={() => setSelectedTab('calculations')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedTab === 'calculations'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Calculations ({calculations.length})
        </button>
      </div>

      {latestCalculation && selectedTab === 'calculations' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">LP Allocation</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {selectedFundData?.base_currency} {(latestCalculation.lp_allocation / 1000000).toFixed(2)}M
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {((latestCalculation.lp_allocation / (latestCalculation.lp_allocation + latestCalculation.gp_allocation)) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">GP Carry</span>
              <DollarSign className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {selectedFundData?.base_currency} {(latestCalculation.gp_allocation / 1000000).toFixed(2)}M
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {((latestCalculation.gp_allocation / (latestCalculation.lp_allocation + latestCalculation.gp_allocation)) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Preferred Return</span>
              <Layers className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {selectedFundData?.base_currency} {((latestCalculation.preferred_return || 0) / 1000000).toFixed(2)}M
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Catch-Up</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {selectedFundData?.base_currency} {((latestCalculation.catch_up_amount || 0) / 1000000).toFixed(2)}M
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'structures' ? (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">Waterfall Structures</h3>

          {structures.length > 0 ? (
            <div className="space-y-4">
              {structures.map((structure) => (
                <div
                  key={structure.id}
                  className="bg-slate-800/80 rounded-lg p-6 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{structure.structure_name}</h4>
                      <p className="text-slate-400 text-sm mt-1 capitalize">
                        {structure.structure_type} Waterfall - {structure.calculation_method.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        structure.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {structure.status}
                      </span>
                      <button
                        onClick={() => calculateWaterfall(structure.id)}
                        disabled={calculating}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center space-x-2 transition-colors disabled:opacity-50"
                      >
                        <Calculator className="w-4 h-4" />
                        <span>Calculate</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-slate-400">Hurdle Rate</div>
                      <div className="text-white font-semibold">{structure.hurdle_rate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Catch-Up Rate</div>
                      <div className="text-white font-semibold">{structure.catch_up_rate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Carried Interest</div>
                      <div className="text-cyan-400 font-semibold">{structure.carried_interest_rate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Clawback</div>
                      <div className="text-white font-semibold">
                        {structure.clawback_provision ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {structure.tiers && (
                    <div className="border-t border-slate-700 pt-4">
                      <div className="text-sm font-medium text-slate-300 mb-3">Waterfall Tiers</div>
                      <div className="space-y-2">
                        {structure.tiers.map((tier: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="text-white font-medium">{tier.name}</span>
                              <span className="text-slate-400 ml-2">- {tier.description}</span>
                            </div>
                            <div className="text-slate-300">
                              LP: {tier.allocation.lp}% / GP: {tier.allocation.gp}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Layers className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No waterfall structures configured</p>
              <p className="text-slate-500 text-sm mt-2">Create a waterfall structure to calculate carried interest</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">Waterfall Calculations</h3>

          {calculations.length > 0 ? (
            <div className="space-y-3">
              {calculations.map((calc) => (
                <div
                  key={calc.id}
                  className="bg-slate-800/80 rounded-lg p-4"
                >
                  <div className="grid grid-cols-8 gap-4 items-center">
                    <div>
                      <div className="text-xs text-slate-400">Date</div>
                      <div className="text-white text-sm">
                        {new Date(calc.calculation_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Contributions</div>
                      <div className="text-white text-sm">
                        {(calc.total_contributions / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Distributions</div>
                      <div className="text-white text-sm">
                        {(calc.total_distributions / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Current NAV</div>
                      <div className="text-white text-sm">
                        {(calc.current_nav / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Preferred Return</div>
                      <div className="text-blue-400 text-sm">
                        {((calc.preferred_return || 0) / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">LP Allocation</div>
                      <div className="text-green-400 text-sm font-semibold">
                        {(calc.lp_allocation / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">GP Carry</div>
                      <div className="text-cyan-400 text-sm font-semibold">
                        {(calc.gp_allocation / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Carry %</div>
                      <div className="text-white text-sm font-semibold">
                        {((calc.gp_allocation / (calc.lp_allocation + calc.gp_allocation)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calculator className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No calculations yet</p>
              <p className="text-slate-500 text-sm mt-2">Run a waterfall calculation to see results here</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Create Waterfall Structure</h3>
              <p className="text-slate-400 mt-1">Configure carried interest distribution</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Structure Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.structure_name}
                  onChange={(e) => setFormData({ ...formData, structure_name: e.target.value })}
                  placeholder="e.g., Standard 20% Carry with 8% Hurdle"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Structure Type
                  </label>
                  <select
                    value={formData.structure_type}
                    onChange={(e) => setFormData({ ...formData, structure_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="european">European (Whole Fund)</option>
                    <option value="american">American (Deal-by-Deal)</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Calculation Method
                  </label>
                  <select
                    value={formData.calculation_method}
                    onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="whole_fund">Whole Fund</option>
                    <option value="deal_by_deal">Deal by Deal</option>
                    <option value="distribution_waterfall">Distribution Waterfall</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hurdle Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.hurdle_rate}
                    onChange={(e) => setFormData({ ...formData, hurdle_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Catch-Up Rate (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formData.catch_up_rate}
                    onChange={(e) => setFormData({ ...formData, catch_up_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Carried Interest (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formData.carried_interest_rate}
                    onChange={(e) => setFormData({ ...formData, carried_interest_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GP Commitment (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.gp_commitment_percent}
                  onChange={(e) => setFormData({ ...formData, gp_commitment_percent: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.clawback_provision}
                    onChange={(e) => setFormData({ ...formData, clawback_provision: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Include clawback provision</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.preferred_return_compounded}
                    onChange={(e) => setFormData({ ...formData, preferred_return_compounded: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Compound preferred return</span>
                </label>
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
                  Create Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
