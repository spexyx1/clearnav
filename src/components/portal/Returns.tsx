import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function Returns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'ytd' | '1y' | '3y'>('all');

  useEffect(() => {
    if (user) {
      loadReturns();
    }
  }, [user, timeframe]);

  const loadReturns = async () => {
    setLoading(true);

    let query = supabase
      .from('performance_returns')
      .select('*')
      .eq('client_id', user?.id)
      .order('period', { ascending: false });

    if (timeframe !== 'all') {
      const now = new Date();
      let startDate = new Date();

      if (timeframe === 'ytd') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (timeframe === '1y') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      } else if (timeframe === '3y') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 3));
      }

      query = query.gte('period', startDate.toISOString());
    }

    const { data } = await query;
    setReturns(data || []);
    setLoading(false);
  };

  const calculateStats = () => {
    if (returns.length === 0) return { avgReturn: 0, bestMonth: 0, worstMonth: 0, positiveMonths: 0 };

    const avgReturn = returns.reduce((sum, r) => sum + r.return_percentage, 0) / returns.length;
    const bestMonth = Math.max(...returns.map(r => r.return_percentage));
    const worstMonth = Math.min(...returns.map(r => r.return_percentage));
    const positiveMonths = returns.filter(r => r.return_percentage > 0).length;

    return { avgReturn, bestMonth, worstMonth, positiveMonths };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-white">
          Performance <span className="font-semibold">Returns</span>
        </h2>
        <div className="flex space-x-2">
          {(['all', 'ytd', '1y', '3y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="text-sm text-slate-400 mb-2">Average Return</div>
          <div className={`text-3xl font-bold ${stats.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(2)}%
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="text-sm text-slate-400 mb-2">Best Month</div>
          <div className="text-3xl font-bold text-green-400">
            +{stats.bestMonth.toFixed(2)}%
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="text-sm text-slate-400 mb-2">Worst Month</div>
          <div className="text-3xl font-bold text-red-400">
            {stats.worstMonth.toFixed(2)}%
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="text-sm text-slate-400 mb-2">Win Rate</div>
          <div className="text-3xl font-bold text-white">
            {returns.length > 0 ? ((stats.positiveMonths / returns.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Historical Returns</h3>

        {returns.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No return data available for selected timeframe
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Period</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Return</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Portfolio Value</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Benchmark</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Outperformance</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((returnData) => {
                  const outperformance = returnData.benchmark_return !== null
                    ? returnData.return_percentage - returnData.benchmark_return
                    : null;

                  return (
                    <tr key={returnData.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 text-white">
                        {new Date(returnData.period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-semibold flex items-center justify-end ${returnData.return_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {returnData.return_percentage >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                          {returnData.return_percentage >= 0 ? '+' : ''}{returnData.return_percentage.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-white">
                        ${returnData.portfolio_value.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-400">
                        {returnData.benchmark_return !== null
                          ? `${returnData.benchmark_return >= 0 ? '+' : ''}${returnData.benchmark_return.toFixed(2)}%`
                          : 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {outperformance !== null ? (
                          <span className={outperformance >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
