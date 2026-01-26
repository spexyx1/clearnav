import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, CheckCircle, Clock, Plus, Eye, LineChart, ThumbsUp, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getLatestNAV, getNAVHistory, approveNAV } from '../../lib/navCalculation';
import NAVCalculator from './NAVCalculator';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
  status: string;
}

interface NAVCalculation {
  id: string;
  nav_date: string;
  nav_per_share: number;
  net_asset_value: number;
  total_shares: number;
  status: string;
  version: number;
  created_at: string;
}

export default function NAVDashboard() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [latestNAV, setLatestNAV] = useState<NAVCalculation | null>(null);
  const [navHistory, setNavHistory] = useState<NAVCalculation[]>([]);
  const [pendingNAVs, setPendingNAVs] = useState<NAVCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadNAVData();
    }
  }, [selectedFund]);

  const loadFunds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');

    if (!error && data) {
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    }
    setLoading(false);
  };

  const loadNAVData = async () => {
    if (!selectedFund) return;

    const latest = await getLatestNAV(selectedFund);
    setLatestNAV(latest);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const history = await getNAVHistory(selectedFund, undefined, startDate, endDate);
    setNavHistory(history);

    const { data: pending } = await supabase
      .from('nav_calculations')
      .select('*')
      .eq('fund_id', selectedFund)
      .in('status', ['draft', 'pending_approval'])
      .order('nav_date', { ascending: false });

    if (pending) {
      setPendingNAVs(pending);
    }
  };

  const handleApproveNAV = async (navId: string) => {
    try {
      await approveNAV(navId, user?.id || '');
      loadNAVData();
    } catch (error) {
      console.error('Error approving NAV:', error);
      alert('Error approving NAV');
    }
  };

  const handleRejectNAV = async (navId: string) => {
    if (confirm('Are you sure you want to reject this NAV calculation?')) {
      await supabase
        .from('nav_calculations')
        .update({ status: 'superseded' })
        .eq('id', navId);
      loadNAVData();
    }
  };

  const calculateChange = () => {
    if (navHistory.length < 2) return { value: 0, percentage: 0 };

    const current = navHistory[navHistory.length - 1].nav_per_share;
    const previous = navHistory[navHistory.length - 2].nav_per_share;
    const change = current - previous;
    const percentage = (change / previous) * 100;

    return { value: change, percentage };
  };

  const change = calculateChange();
  const selectedFundData = funds.find(f => f.id === selectedFund);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">NAV Dashboard</h2>
          <p className="text-slate-400 mt-1">Calculate and track Net Asset Value</p>
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
            onClick={() => setShowCalculator(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Calculate NAV</span>
          </button>
        </div>
      </div>

      {latestNAV && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Current NAV per Share</span>
              <DollarSign className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {selectedFundData?.base_currency} {latestNAV.nav_per_share.toFixed(4)}
            </div>
            <div className={`text-sm mt-2 flex items-center ${change.percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {change.percentage >= 0 ? '+' : ''}{change.percentage.toFixed(2)}% from last NAV
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Fund NAV</span>
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {selectedFundData?.base_currency} {(latestNAV.net_asset_value / 1000000).toFixed(2)}M
            </div>
            <div className="text-sm text-slate-400 mt-2">
              {latestNAV.total_shares.toLocaleString()} shares outstanding
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Latest NAV Date</span>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Date(latestNAV.nav_date).toLocaleDateString()}
            </div>
            <div className="text-sm text-slate-400 mt-2">
              Version {latestNAV.version}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Status</span>
              {latestNAV.status === 'approved' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-white capitalize">
              {latestNAV.status.replace('_', ' ')}
            </div>
            <div className="text-sm text-slate-400 mt-2">
              {new Date(latestNAV.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {pendingNAVs.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-500" />
              Pending NAV Approvals ({pendingNAVs.length})
            </h3>
          </div>

          <div className="space-y-3">
            {pendingNAVs.map((nav) => (
              <div
                key={nav.id}
                className="bg-slate-800/80 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>
                    <div className="text-xs text-slate-400">Date</div>
                    <div className="text-white font-medium">
                      {new Date(nav.nav_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">NAV per Share</div>
                    <div className="text-white font-mono">
                      {selectedFundData?.base_currency} {nav.nav_per_share.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total NAV</div>
                    <div className="text-white">
                      {selectedFundData?.base_currency} {(nav.net_asset_value / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Status</div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      nav.status === 'pending_approval'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {nav.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Created</div>
                    <div className="text-slate-300 text-sm">
                      {new Date(nav.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleApproveNAV(nav.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleRejectNAV(nav.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <LineChart className="w-5 h-5 mr-2 text-cyan-500" />
            NAV History (Last 12 Months)
          </h3>
        </div>

        {navHistory.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-4 text-sm font-medium text-slate-400 pb-3 border-b border-slate-700">
              <div>Date</div>
              <div>NAV per Share</div>
              <div>Total NAV</div>
              <div>Shares</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {navHistory.slice().reverse().map((nav) => (
              <div
                key={nav.id}
                className="grid grid-cols-6 gap-4 items-center py-3 hover:bg-slate-700/50 rounded-lg px-3 transition-colors"
              >
                <div className="text-white font-medium">
                  {new Date(nav.nav_date).toLocaleDateString()}
                </div>
                <div className="text-white font-mono">
                  {selectedFundData?.base_currency} {nav.nav_per_share.toFixed(4)}
                </div>
                <div className="text-slate-300">
                  {selectedFundData?.base_currency} {(nav.net_asset_value / 1000000).toFixed(2)}M
                </div>
                <div className="text-slate-300">
                  {nav.total_shares.toLocaleString()}
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    nav.status === 'approved'
                      ? 'bg-green-500/20 text-green-400'
                      : nav.status === 'pending_approval'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {nav.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <button className="p-2 hover:bg-slate-600 rounded-lg transition-colors">
                    <Eye className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <LineChart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No NAV history available</p>
            <p className="text-slate-500 text-sm mt-2">Calculate your first NAV to get started</p>
          </div>
        )}
      </div>

      {!latestNAV && funds.length > 0 && (
        <div className="bg-slate-800/30 rounded-xl p-12 border-2 border-dashed border-slate-700 text-center">
          <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No NAV Calculated Yet</h3>
          <p className="text-slate-400 mb-6">
            Calculate your first NAV to start tracking fund performance
          </p>
          <button
            onClick={() => setShowCalculator(true)}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg inline-flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Calculate First NAV</span>
          </button>
        </div>
      )}

      {funds.length === 0 && (
        <div className="bg-slate-800/30 rounded-xl p-12 border-2 border-dashed border-slate-700 text-center">
          <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Funds Found</h3>
          <p className="text-slate-400 mb-6">
            Create a fund first to start calculating NAV
          </p>
        </div>
      )}

      {showCalculator && (
        <NAVCalculator
          fundId={selectedFund}
          onClose={() => setShowCalculator(false)}
          onSuccess={() => loadNAVData()}
        />
      )}
    </div>
  );
}
