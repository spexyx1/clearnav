import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, Percent, BarChart3, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { MetricCard, Card, CardHeader } from '../shared/Card';
import { Money, Pct, Count } from '../shared/Numerics';
import { EmptyState } from '../shared/EmptyState';
import { Button } from '../shared/Button';
import { PanelLoader } from '../shared/Spinner';
import { formatDateTime, formatCurrency } from '../../lib/format';

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
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsRes, trustRes, positionsRes] = await Promise.all([
        supabase.from('client_units').select('*').eq('client_id', user?.id).maybeSingle(),
        supabase.from('trust_account').select('*').maybeSingle(),
        supabase.from('trust_positions').select('*').order('market_value', { ascending: false }),
      ]);
      if (unitsRes.error) throw unitsRes.error;
      if (trustRes.error) throw trustRes.error;
      if (positionsRes.error) throw positionsRes.error;
      setClientUnits(unitsRes.data);
      setTrustAccount(trustRes.data);
      setTrustPositions(positionsRes.data || []);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ibkr-sync-portfolio`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) await loadData();
    } catch (error) {
      console.error('Sync failed:', error);
    }
    setSyncing(false);
  };

  if (loading) return <PanelLoader />;

  if (!clientUnits || !trustAccount) {
    return (
      <Card>
        <EmptyState
          icon={PieChart}
          title="No portfolio data yet"
          body="Your units and holdings will appear here once your account manager has completed setup. This typically takes 1–2 business days."
        />
      </Card>
    );
  }

  const currentValue = clientUnits.units_owned * trustAccount.current_nav_per_unit;
  const totalGainLoss = currentValue - clientUnits.cost_basis;
  const totalReturn = clientUnits.cost_basis > 0 ? (totalGainLoss / clientUnits.cost_basis) * 100 : 0;
  const ownershipPct = trustAccount.total_units_outstanding > 0
    ? (clientUnits.units_owned / trustAccount.total_units_outstanding) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-h1 text-white">Portfolio Overview</h2>
          <p className="text-meta text-brand-text-muted mt-1">
            Last updated: {formatDateTime(trustAccount.last_sync_at)}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleManualSync}
          loading={syncing}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {syncing ? 'Syncing…' : 'Refresh'}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Current Value"
          icon={<DollarSign className="w-4 h-4" />}
          value={<Money value={currentValue} />}
          delta={
            <span className={`flex items-center gap-1 ${totalGainLoss >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
              {totalGainLoss >= 0
                ? <TrendingUp className="w-3.5 h-3.5" aria-hidden />
                : <TrendingDown className="w-3.5 h-3.5" aria-hidden />}
              <Pct value={totalReturn} signed />
            </span>
          }
        />
        <MetricCard
          label="Units Owned"
          icon={<PieChart className="w-4 h-4" />}
          value={<Count value={clientUnits.units_owned} decimals={2} />}
          delta={
            <span className="text-brand-text-muted">
              NAV <Money value={trustAccount.current_nav_per_unit} decimals={4} /> / unit
            </span>
          }
        />
        <MetricCard
          label="Cost Basis"
          icon={<BarChart3 className="w-4 h-4" />}
          value={<Money value={clientUnits.cost_basis} />}
          delta={
            <span className="text-brand-text-muted">
              <Money value={clientUnits.cost_basis_per_unit} decimals={4} /> / unit
            </span>
          }
        />
        <MetricCard
          label="Trust Ownership"
          icon={<Percent className="w-4 h-4" />}
          value={<Pct value={ownershipPct} />}
          delta={
            <span className="text-brand-text-muted">
              of <Money value={trustAccount.total_aum} /> AUM
            </span>
          }
        />
      </div>

      {/* Holdings + Trust Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Holdings */}
        <Card>
          <CardHeader title="Your Proportional Holdings" />
          {trustPositions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No positions yet"
              body="Trust positions will appear here once the portfolio has been funded and holdings are recorded."
              compact
            />
          ) : (
            <div className="space-y-2">
              {trustPositions.map((pos) => {
                const clientShare = (pos.market_value * ownershipPct) / 100;
                const posReturn = pos.average_cost > 0
                  ? ((pos.current_price - pos.average_cost) / pos.average_cost) * 100
                  : 0;

                return (
                  <div key={pos.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-brand-surface-2 border border-brand-border rounded-input">
                    {/* Symbol + name */}
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-white">{pos.symbol}</p>
                      <p className="text-meta text-brand-text-muted truncate">
                        <Count value={(pos.quantity * ownershipPct) / 100} decimals={2} /> shares
                      </p>
                    </div>
                    {/* Price pair */}
                    <div className="text-right shrink-0">
                      <p className="text-meta text-brand-text-muted">
                        <span className="text-brand-text-secondary">${pos.current_price.toFixed(2)}</span>
                        <span className="mx-1 text-brand-border">·</span>
                        avg ${pos.average_cost.toFixed(2)}
                      </p>
                    </div>
                    {/* Value + return */}
                    <div className="text-right shrink-0 w-28">
                      <Money value={clientShare} column />
                      <Pct value={posReturn} signed column />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Trust summary */}
        <Card>
          <CardHeader title="Trust Summary" />
          <dl className="space-y-3">
            {[
              { label: 'Total Trust AUM', value: <Money value={trustAccount.total_aum} /> },
              { label: 'Units Outstanding', value: <Count value={trustAccount.total_units_outstanding} decimals={2} /> },
              { label: 'Current NAV / Unit', value: <Money value={trustAccount.current_nav_per_unit} decimals={4} /> },
              { label: 'Your Current Value', value: <Money value={currentValue} /> },
              { label: 'Unrealised Gain / Loss', value: (
                <span className={totalGainLoss >= 0 ? 'text-status-success' : 'text-status-danger'}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                </span>
              )},
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5 border-b border-brand-border last:border-0">
                <dt className="text-meta text-brand-text-muted">{label}</dt>
                <dd className="text-body font-medium text-white tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
