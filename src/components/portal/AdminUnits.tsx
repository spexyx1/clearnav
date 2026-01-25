import { useEffect, useState } from 'react';
import { Users, Plus, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminUnits() {
  const [clients, setClients] = useState<any[]>([]);
  const [trustAccount, setTrustAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [clientsRes, trustRes, unitsRes] = await Promise.all([
      supabase.from('client_profiles').select('*').order('full_name'),
      supabase.from('trust_account').select('*').maybeSingle(),
      supabase.from('client_units').select('*, client_profiles(full_name, email)')
    ]);

    const clientsWithUnits = clientsRes.data?.map((client: any) => {
      const units = unitsRes.data?.find((u: any) => u.client_id === client.id);
      return {
        ...client,
        units: units || null
      };
    });

    setClients(clientsWithUnits || []);
    setTrustAccount(trustRes.data);
    setLoading(false);
  };

  const handleIssueUnits = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      setSubmitting(false);
      return;
    }

    if (!formData.client_id) {
      setError('Please select a client');
      setSubmitting(false);
      return;
    }

    const navPerUnit = trustAccount?.current_nav_per_unit || 1.00;
    const unitsToIssue = amount / navPerUnit;

    const { data: existingUnits } = await supabase
      .from('client_units')
      .select('*')
      .eq('client_id', formData.client_id)
      .eq('trust_account_id', trustAccount.id)
      .maybeSingle();

    if (existingUnits) {
      const newTotalUnits = existingUnits.units_owned + unitsToIssue;
      const newCostBasis = existingUnits.cost_basis + amount;
      const newAvgCostPerUnit = newCostBasis / newTotalUnits;

      const { error: updateError } = await supabase
        .from('client_units')
        .update({
          units_owned: newTotalUnits,
          cost_basis: newCostBasis,
          cost_basis_per_unit: newAvgCostPerUnit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUnits.id);

      if (updateError) {
        setError('Failed to update units');
        setSubmitting(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('client_units')
        .insert({
          client_id: formData.client_id,
          trust_account_id: trustAccount.id,
          units_owned: unitsToIssue,
          cost_basis: amount,
          cost_basis_per_unit: navPerUnit,
          purchase_date: new Date().toISOString(),
        });

      if (insertError) {
        setError('Failed to issue units');
        setSubmitting(false);
        return;
      }
    }

    await supabase
      .from('unit_transactions')
      .insert({
        client_id: formData.client_id,
        trust_account_id: trustAccount.id,
        transaction_type: 'subscription',
        units: unitsToIssue,
        amount: amount,
        nav_per_unit: navPerUnit,
        transaction_date: new Date().toISOString(),
        status: 'completed',
      });

    const newTotalUnits = (trustAccount?.total_units_outstanding || 0) + unitsToIssue;
    await supabase
      .from('trust_account')
      .update({
        total_units_outstanding: newTotalUnits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trustAccount.id);

    const currentValue = unitsToIssue * navPerUnit;
    await supabase
      .from('client_profiles')
      .update({
        total_invested: amount,
        current_value: currentValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', formData.client_id);

    setShowForm(false);
    setFormData({ client_id: '', amount: '' });
    setSubmitting(false);
    loadData();
  };

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
          Unit <span className="font-semibold">Management</span>
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded font-medium hover:from-cyan-500 hover:to-blue-500 transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>Issue Units</span>
        </button>
      </div>

      {trustAccount && (
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <div className="text-sm text-slate-400 mb-2">Total Trust AUM</div>
            <div className="text-3xl font-bold text-white">
              ${trustAccount.total_aum.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <div className="text-sm text-slate-400 mb-2">Total Units Outstanding</div>
            <div className="text-3xl font-bold text-white">
              {trustAccount.total_units_outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
            <div className="text-sm text-slate-400 mb-2">Current NAV/Unit</div>
            <div className="text-3xl font-bold text-white">
              ${trustAccount.current_nav_per_unit.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Issue New Units</h3>

          <form onSubmit={handleIssueUnits} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Client
              </label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="">Select client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Investment Amount ($)
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="0.00"
              />
              {formData.amount && trustAccount && (
                <div className="mt-2 text-sm text-slate-400">
                  Will issue {(parseFloat(formData.amount) / trustAccount.current_nav_per_unit).toFixed(4)} units at ${trustAccount.current_nav_per_unit.toFixed(4)}/unit
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded font-medium hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Issuing...' : 'Issue Units'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 border border-slate-700 text-white rounded font-medium hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Client Allocations</h3>

        {clients.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No clients found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Client</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Units Owned</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Cost Basis</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Current Value</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">% Ownership</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Return</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  if (!client.units) {
                    return (
                      <tr key={client.id} className="border-b border-slate-800/50">
                        <td className="py-4 px-4 text-white">{client.full_name}</td>
                        <td colSpan={5} className="py-4 px-4 text-center text-slate-500">No units issued</td>
                      </tr>
                    );
                  }

                  const currentValue = client.units.units_owned * (trustAccount?.current_nav_per_unit || 1);
                  const gainLoss = currentValue - client.units.cost_basis;
                  const returnPct = client.units.cost_basis > 0 ? (gainLoss / client.units.cost_basis) * 100 : 0;
                  const ownershipPct = trustAccount?.total_units_outstanding > 0
                    ? (client.units.units_owned / trustAccount.total_units_outstanding) * 100
                    : 0;

                  return (
                    <tr key={client.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="text-white font-medium">{client.full_name}</div>
                        <div className="text-sm text-slate-400">{client.email}</div>
                      </td>
                      <td className="py-4 px-4 text-right text-white">
                        {client.units.units_owned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right text-white">
                        ${client.units.cost_basis.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-white">
                        ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right text-white">
                        {ownershipPct.toFixed(2)}%
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`flex items-center justify-end ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <TrendingUp className={`w-4 h-4 mr-1 ${gainLoss < 0 ? 'rotate-180' : ''}`} />
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                        </span>
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
