import { useState, useEffect } from 'react';
import { Activity, TrendingDown, Shield, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function RiskMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRiskMetrics();
    }
  }, [user]);

  const loadRiskMetrics = async () => {
    const { data } = await supabase
      .from('portfolio_risk_metrics')
      .select('*')
      .eq('client_id', user?.id)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    setMetrics(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">Risk metrics will be available soon</p>
        <p className="text-sm text-slate-500">Our team is calculating your portfolio risk analytics</p>
      </div>
    );
  }

  const getRiskLevel = (sortino: number | null) => {
    if (!sortino) return { level: 'Unknown', color: 'text-slate-400' };
    if (sortino > 2) return { level: 'Excellent', color: 'text-green-400' };
    if (sortino > 1) return { level: 'Good', color: 'text-cyan-400' };
    if (sortino > 0) return { level: 'Moderate', color: 'text-orange-400' };
    return { level: 'High Risk', color: 'text-red-400' };
  };

  const riskLevel = getRiskLevel(metrics.sortino_ratio);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          Risk <span className="font-semibold">Analytics</span>
        </h2>
        <p className="text-slate-400">
          Comprehensive risk assessment and performance metrics
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Last calculated: {new Date(metrics.calculation_date).toLocaleDateString()}
        </p>
      </div>

      <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-semibold text-white">Portfolio Risk Score</h3>
            </div>
            <p className={`text-3xl font-bold ${riskLevel.color}`}>{riskLevel.level}</p>
            <p className="text-sm text-slate-300 mt-2">
              Based on {metrics.lookback_period_days}-day analysis
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Sortino Ratio</div>
            <div className={`text-2xl font-bold ${riskLevel.color}`}>
              {metrics.sortino_ratio?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingDown className="w-5 h-5 text-red-400 mr-2" />
              Value at Risk (VaR)
              <button className="ml-2 text-slate-500 hover:text-slate-300" title="Maximum expected loss over a given time period at a specific confidence level">
                <Info className="w-4 h-4" />
              </button>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">1-Day VaR (95% confidence)</span>
                  <span className="text-red-300 font-medium">
                    {metrics.var_95_1day ? `-$${Math.abs(metrics.var_95_1day).toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Maximum expected loss in one day with 95% confidence
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">1-Day VaR (99% confidence)</span>
                  <span className="text-red-400 font-medium">
                    {metrics.var_99_1day ? `-$${Math.abs(metrics.var_99_1day).toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Maximum expected loss in one day with 99% confidence
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">10-Day VaR (95% confidence)</span>
                  <span className="text-red-300 font-medium">
                    {metrics.var_95_10day ? `-$${Math.abs(metrics.var_95_10day).toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Maximum expected loss over 10 days with 95% confidence
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 text-orange-400 mr-2" />
              Volatility Metrics
              <button className="ml-2 text-slate-500 hover:text-slate-300" title="Measures of portfolio variability and risk">
                <Info className="w-4 h-4" />
              </button>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Annualized Volatility</span>
                  <span className="text-white font-medium">
                    {metrics.volatility_annualized ? `${(metrics.volatility_annualized * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Standard deviation of returns over the year
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Downside Deviation</span>
                  <span className="text-white font-medium">
                    {metrics.downside_deviation ? `${(metrics.downside_deviation * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Volatility of negative returns only
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 text-cyan-400 mr-2" />
              Risk-Adjusted Returns
              <button className="ml-2 text-slate-500 hover:text-slate-300" title="Performance metrics adjusted for risk taken">
                <Info className="w-4 h-4" />
              </button>
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Sortino Ratio</span>
                  <span className={`text-xl font-bold ${riskLevel.color}`}>
                    {metrics.sortino_ratio?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Return per unit of downside risk. Only penalizes negative volatility. Higher is better - above 1 is good, above 2 is excellent.
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Alpha (vs benchmark)</span>
                  <span className={`font-medium ${metrics.alpha && metrics.alpha > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.alpha ? `${metrics.alpha > 0 ? '+' : ''}${(metrics.alpha * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Excess return over benchmark
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Beta (vs benchmark)</span>
                  <span className="text-white font-medium">
                    {metrics.beta?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Sensitivity to market movements. 1.0 = moves with market.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
              Drawdown Analysis
              <button className="ml-2 text-slate-500 hover:text-slate-300" title="Peak-to-trough decline metrics">
                <Info className="w-4 h-4" />
              </button>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Maximum Drawdown</span>
                  <span className="text-red-400 font-medium">
                    {metrics.max_drawdown ? `${(metrics.max_drawdown * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Largest peak-to-trough decline in portfolio value
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Current Drawdown</span>
                  <span className="text-orange-400 font-medium">
                    {metrics.current_drawdown ? `${(metrics.current_drawdown * 100).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Current decline from most recent peak
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Market Correlations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/50 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">S&P 500 Correlation</span>
              <span className="text-white font-medium">
                {metrics.correlation_sp500?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full"
                style={{ width: `${Math.abs((metrics.correlation_sp500 || 0) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              1.0 = perfectly correlated, 0 = no correlation, -1.0 = inversely correlated
            </p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Bonds Correlation</span>
              <span className="text-white font-medium">
                {metrics.correlation_bonds?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full"
                style={{ width: `${Math.abs((metrics.correlation_bonds || 0) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Correlation with bond market movements
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-white mb-1">Understanding Risk Metrics</p>
            <p className="text-slate-400">
              These metrics help assess your portfolio's risk profile and risk-adjusted performance.
              Higher Sortino ratios indicate better risk-adjusted returns. Lower VaR and drawdowns indicate less downside risk.
              All strategies target 12-24% annual returns. All calculations use {metrics.lookback_period_days} days of historical data.
              Risk-free rate used: {(metrics.risk_free_rate * 100).toFixed(2)}%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
