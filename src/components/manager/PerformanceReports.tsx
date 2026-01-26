import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calculator, BarChart3, PieChart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
  inception_date: string;
}

interface PerformanceMetric {
  id: string;
  metric_date: string;
  period_type: string;
  beginning_nav: number;
  ending_nav: number;
  net_contributions: number;
  net_distributions: number;
  total_return_amount: number;
  total_return_percent: number;
  irr: number | null;
  moic: number | null;
  dpi: number | null;
  rvpi: number | null;
  tvpi: number | null;
}

export default function PerformanceReports() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'inception_to_date'>('quarterly');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadMetrics();
    }
  }, [selectedFund, selectedPeriod]);

  const loadFunds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name, base_currency, inception_date')
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

  const loadMetrics = async () => {
    const { data } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('fund_id', selectedFund)
      .eq('period_type', selectedPeriod)
      .is('capital_account_id', null)
      .order('metric_date', { ascending: false })
      .limit(12);

    if (data) {
      setMetrics(data);
    }
  };

  const calculatePerformance = async () => {
    setCalculating(true);

    const today = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (selectedPeriod === 'monthly') {
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    } else if (selectedPeriod === 'quarterly') {
      const quarter = Math.floor(today.getMonth() / 3);
      periodEnd = new Date(today.getFullYear(), quarter * 3, 0);
      periodStart = new Date(periodEnd.getFullYear(), (quarter - 1) * 3, 1);
    } else if (selectedPeriod === 'yearly') {
      periodEnd = new Date(today.getFullYear(), 0, 0);
      periodStart = new Date(periodEnd.getFullYear(), 0, 1);
    } else {
      const selectedFundData = funds.find(f => f.id === selectedFund);
      periodStart = new Date(selectedFundData?.inception_date || today);
      periodEnd = today;
    }

    const { data: navStart } = await supabase
      .from('nav_calculations')
      .select('total_nav')
      .eq('fund_id', selectedFund)
      .lte('calculation_date', periodStart.toISOString().split('T')[0])
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: navEnd } = await supabase
      .from('nav_calculations')
      .select('total_nav')
      .eq('fund_id', selectedFund)
      .lte('calculation_date', periodEnd.toISOString().split('T')[0])
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const beginningNAV = navStart?.total_nav || 0;
    const endingNAV = navEnd?.total_nav || 0;

    const { data: contributions } = await supabase
      .from('capital_transactions')
      .select('amount')
      .eq('fund_id', selectedFund)
      .eq('transaction_type', 'contribution')
      .gte('transaction_date', periodStart.toISOString().split('T')[0])
      .lte('transaction_date', periodEnd.toISOString().split('T')[0]);

    const { data: distributions } = await supabase
      .from('capital_transactions')
      .select('amount')
      .eq('fund_id', selectedFund)
      .in('transaction_type', ['distribution', 'redemption'])
      .gte('transaction_date', periodStart.toISOString().split('T')[0])
      .lte('transaction_date', periodEnd.toISOString().split('T')[0]);

    const netContributions = contributions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const netDistributions = distributions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    const totalReturnAmount = endingNAV + netDistributions - beginningNAV - netContributions;
    const totalReturnPercent = beginningNAV > 0 ? (totalReturnAmount / beginningNAV) * 100 : 0;

    const { data: allContributions } = await supabase
      .from('capital_transactions')
      .select('amount')
      .eq('fund_id', selectedFund)
      .eq('transaction_type', 'contribution');

    const { data: allDistributions } = await supabase
      .from('capital_transactions')
      .select('amount')
      .eq('fund_id', selectedFund)
      .in('transaction_type', ['distribution', 'redemption']);

    const totalContributions = allContributions?.reduce((sum, t) => sum + t.amount, 0) || 1;
    const totalDistributions = allDistributions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    const dpi = totalDistributions / totalContributions;
    const rvpi = endingNAV / totalContributions;
    const tvpi = dpi + rvpi;
    const moic = tvpi;

    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        tenant_id: currentTenant?.id,
        fund_id: selectedFund,
        metric_date: periodEnd.toISOString().split('T')[0],
        period_type: selectedPeriod,
        beginning_nav: beginningNAV,
        ending_nav: endingNAV,
        net_contributions: netContributions,
        net_distributions: netDistributions,
        total_return_amount: totalReturnAmount,
        total_return_percent: totalReturnPercent,
        dpi: dpi,
        rvpi: rvpi,
        tvpi: tvpi,
        moic: moic,
      });

    setCalculating(false);

    if (!error) {
      loadMetrics();
      alert('Performance calculated successfully');
    } else {
      alert('Error calculating performance');
    }
  };

  const getLatestMetric = () => {
    return metrics.length > 0 ? metrics[0] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const selectedFundData = funds.find(f => f.id === selectedFund);
  const latestMetric = getLatestMetric();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Performance Reports</h2>
          <p className="text-slate-400 mt-1">Track and analyze fund performance metrics</p>
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
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="inception_to_date">Since Inception</option>
          </select>
          <button
            onClick={calculatePerformance}
            disabled={calculating}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            <span>{calculating ? 'Calculating...' : 'Calculate'}</span>
          </button>
        </div>
      </div>

      {latestMetric && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Return</span>
                {latestMetric.total_return_percent >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className={`text-2xl font-bold ${
                latestMetric.total_return_percent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {latestMetric.total_return_percent >= 0 ? '+' : ''}{latestMetric.total_return_percent.toFixed(2)}%
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {selectedFundData?.base_currency} {(latestMetric.total_return_amount / 1000000).toFixed(2)}M
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">MOIC</span>
                <BarChart3 className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {latestMetric.moic?.toFixed(2) || '-'}x
              </div>
              <div className="text-sm text-slate-400 mt-1">Multiple on Invested Capital</div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">TVPI</span>
                <PieChart className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {latestMetric.tvpi?.toFixed(2) || '-'}x
              </div>
              <div className="text-sm text-slate-400 mt-1">Total Value to Paid-In</div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">DPI</span>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {latestMetric.dpi?.toFixed(2) || '-'}x
              </div>
              <div className="text-sm text-slate-400 mt-1">Distributions to Paid-In</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">NAV Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Beginning NAV</span>
                  <span className="text-white font-semibold">
                    {selectedFundData?.base_currency} {(latestMetric.beginning_nav / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Contributions</span>
                  <span className="text-green-400 font-semibold">
                    +{selectedFundData?.base_currency} {(latestMetric.net_contributions / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Distributions</span>
                  <span className="text-blue-400 font-semibold">
                    -{selectedFundData?.base_currency} {(latestMetric.net_distributions / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Return</span>
                  <span className={`font-semibold ${
                    latestMetric.total_return_amount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {latestMetric.total_return_amount >= 0 ? '+' : ''}
                    {selectedFundData?.base_currency} {(latestMetric.total_return_amount / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Ending NAV</span>
                  <span className="text-white font-bold text-lg">
                    {selectedFundData?.base_currency} {(latestMetric.ending_nav / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">PE Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">DPI (Realized)</span>
                  <span className="text-white font-semibold">{latestMetric.dpi?.toFixed(2) || '-'}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">RVPI (Unrealized)</span>
                  <span className="text-white font-semibold">{latestMetric.rvpi?.toFixed(2) || '-'}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">TVPI (Total Value)</span>
                  <span className="text-white font-semibold">{latestMetric.tvpi?.toFixed(2) || '-'}x</span>
                </div>
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300 font-medium">MOIC</span>
                    <span className="text-cyan-400 font-bold text-lg">{latestMetric.moic?.toFixed(2) || '-'}x</span>
                  </div>
                  <p className="text-xs text-slate-400">Multiple on Invested Capital</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-6">
          Historical Performance - {selectedPeriod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h3>

        {metrics.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-4 text-sm font-medium text-slate-400 pb-3 border-b border-slate-700">
              <div>Period</div>
              <div className="text-right">Beginning NAV</div>
              <div className="text-right">Ending NAV</div>
              <div className="text-right">Net Cash Flow</div>
              <div className="text-right">Return %</div>
              <div className="text-right">MOIC</div>
              <div className="text-right">TVPI</div>
            </div>

            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="grid grid-cols-7 gap-4 items-center py-3 hover:bg-slate-700/50 rounded-lg px-3 transition-colors"
              >
                <div className="text-white text-sm">
                  {new Date(metric.metric_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-right text-slate-300 text-sm">
                  {(metric.beginning_nav / 1000000).toFixed(2)}M
                </div>
                <div className="text-right text-white text-sm font-medium">
                  {(metric.ending_nav / 1000000).toFixed(2)}M
                </div>
                <div className="text-right text-slate-300 text-sm">
                  {((metric.net_contributions - metric.net_distributions) / 1000000).toFixed(2)}M
                </div>
                <div className={`text-right font-semibold text-sm ${
                  metric.total_return_percent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metric.total_return_percent >= 0 ? '+' : ''}{metric.total_return_percent.toFixed(2)}%
                </div>
                <div className="text-right text-cyan-400 text-sm">
                  {metric.moic?.toFixed(2) || '-'}x
                </div>
                <div className="text-right text-purple-400 text-sm">
                  {metric.tvpi?.toFixed(2) || '-'}x
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No performance data available</p>
            <p className="text-slate-500 text-sm mt-2">Click Calculate to generate performance metrics</p>
          </div>
        )}
      </div>
    </div>
  );
}
