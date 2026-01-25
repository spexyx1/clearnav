import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, RefreshCw, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface DashboardProps {
  profile: any;
}

export default function Dashboard({ profile }: DashboardProps) {
  const { user } = useAuth();
  const [clientUnits, setClientUnits] = useState<any>(null);
  const [trustAccount, setTrustAccount] = useState<any>(null);
  const [trustPositions, setTrustPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    const [unitsRes, trustRes, positionsRes] = await Promise.all([
      supabase
        .from('client_units')
        .select('*')
        .eq('client_id', user?.id)
        .maybeSingle(),
      supabase
        .from('trust_account')
        .select('*')
        .maybeSingle(),
      supabase
        .from('trust_positions')
        .select('*')
        .order('market_value', { ascending: false })
    ]);

    setClientUnits(unitsRes.data);
    setTrustAccount(trustRes.data);
    setTrustPositions(positionsRes.data || []);
    setLoading(false);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ibkr-sync-portfolio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!clientUnits || !trustAccount) {
    return (
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
        <PieChart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 mb-4">No units allocated yet. Contact your account manager to complete setup.</p>
      </div>
    );
  }

  const currentValue = clientUnits.units_owned * trustAccount.current_nav_per_unit;
  const totalGainLoss = currentValue - clientUnits.cost_basis;
  const totalReturn = clientUnits.cost_basis > 0 ? ((totalGainLoss / clientUnits.cost_basis) * 100) : 0;
  const ownershipPercentage = trustAccount.total_units_outstanding > 0
    ? (clientUnits.units_owned / trustAccount.total_units_outstanding) * 100
    : 0;

  const lastSyncTime = trustAccount.last_sync_at
    ? new Date(trustAccount.last_sync_at).toLocaleString()
    : 'Never';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Portfolio <span className="font-semibold">Overview</span>
          </h2>
          <p className="text-sm text-slate-400">
            Last synced: {lastSyncTime}
          </p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Refresh Data'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Current Value</div>
            <DollarSign className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm flex items-center ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGainLoss >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Units Owned</div>
            <PieChart className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {clientUnits.units_owned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-slate-500">
            NAV: ${trustAccount.current_nav_per_unit.toFixed(4)}/unit
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Cost Basis</div>
            <Calendar className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${clientUnits.cost_basis.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500">
            ${clientUnits.cost_basis_per_unit.toFixed(4)}/unit
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Trust Ownership</div>
            <Percent className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {ownershipPercentage.toFixed(2)}%
          </div>
          <div className="text-sm text-slate-500">
            Of ${trustAccount.total_aum.toLocaleString()} AUM
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Your Proportional Holdings</h3>

          {trustPositions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No positions in trust portfolio
            </div>
          ) : (
            <div className="space-y-4">
              {trustPositions.map((position) => {
                const clientShare = (position.market_value * ownershipPercentage) / 100;
                const clientQuantity = (position.quantity * ownershipPercentage) / 100;
                const positionReturn = position.average_cost > 0
                  ? ((position.current_price - position.average_cost) / position.average_cost) * 100
                  : 0;

                return (
                  <div key={position.id} className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-white text-lg">{position.symbol}</div>
                        <div className="text-sm text-slate-400">
                          {clientQuantity.toFixed(2)} shares ({ownershipPercentage.toFixed(2)}% of {position.quantity.toLocaleString()})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">${clientShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className={`text-sm ${positionReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {positionReturn >= 0 ? '+' : ''}{positionReturn.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Price: ${position.current_price.toFixed(2)}</span>
                      <span>Avg Cost: ${position.average_cost.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Trust Summary</h3>

          <div className="space-y-6">
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Total Trust AUM</div>
              <div className="text-2xl font-bold text-white">
                ${trustAccount.total_aum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Total Units Outstanding</div>
              <div className="text-2xl font-bold text-white">
                {trustAccount.total_units_outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Current NAV per Unit</div>
              <div className="text-2xl font-bold text-white">
                ${trustAccount.current_nav_per_unit.toFixed(4)}
              </div>
            </div>

            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <div className="text-sm text-cyan-300 mb-2">Performance Calculation</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Your Units: {clientUnits.units_owned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div>× Current NAV: ${trustAccount.current_nav_per_unit.toFixed(4)}</div>
                <div className="pt-1 border-t border-cyan-500/30">
                  = Current Value: ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
