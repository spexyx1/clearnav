import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ClientManager() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data } = await supabase
      .from('client_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.account_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInvested = clients.reduce((sum, c) => sum + (c.total_invested || 0), 0);
  const totalValue = clients.reduce((sum, c) => sum + (c.current_value || 0), 0);
  const totalGainLoss = totalValue - totalInvested;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          Client <span className="font-semibold">Management</span>
        </h2>
        <p className="text-slate-400">Manage active client accounts and portfolios</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Total Clients</div>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{clients.length}</div>
          <div className="text-sm text-slate-500">Active accounts</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Total Invested</div>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${(totalInvested / 1000000).toFixed(2)}M
          </div>
          <div className="text-sm text-slate-500">Capital committed</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">Total P&L</div>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className={`text-3xl font-bold mb-1 ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${(totalGainLoss / 1000).toFixed(0)}k
          </div>
          <div className="text-sm text-slate-500">
            {totalInvested > 0 ? `${((totalGainLoss / totalInvested) * 100).toFixed(2)}%` : '0%'}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search clients by name, email, or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Account #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Invested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Current Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Gain/Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Inception Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No clients found
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const gainLoss = (client.current_value || 0) - (client.total_invested || 0);
                  const returnPct = client.total_invested > 0 ? ((gainLoss / client.total_invested) * 100) : 0;

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{client.full_name}</div>
                        <div className="text-xs text-slate-400">{client.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{client.account_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          ${client.total_invested.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white font-medium">
                          ${client.current_value.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString()}
                          <span className="text-xs ml-1">({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">
                          {new Date(client.inception_date).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
