import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Search, Plus, Edit, Eye, X, ArrowRight, Receipt, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Client {
  id: string;
  full_name: string;
  email: string;
  account_number: string;
  total_invested: number;
  current_value: number;
  inception_date: string;
  tenant_id: string;
  created_at: string;
}

interface ClientFormData {
  full_name: string;
  email: string;
  account_number: string;
  total_invested: string;
  current_value: string;
  inception_date: string;
}

const emptyForm: ClientFormData = {
  full_name: '',
  email: '',
  account_number: '',
  total_invested: '0',
  current_value: '0',
  inception_date: new Date().toISOString().split('T')[0],
};

function generateAccountNumber() {
  const prefix = 'ACC';
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

export default function ClientManager() {
  const { currentTenant } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [clientTransactions, setClientTransactions] = useState<any[]>([]);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadClients();
  }, [currentTenant]);

  const loadClients = async () => {
    const { data } = await supabase
      .from('client_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({ ...emptyForm, account_number: generateAccountNumber() });
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      email: client.email,
      account_number: client.account_number,
      total_invested: String(client.total_invested || 0),
      current_value: String(client.current_value || 0),
      inception_date: client.inception_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const openDetail = async (client: Client) => {
    setDetailClient(client);
    setLoadingDetail(true);

    const [accountsRes, txnRes] = await Promise.all([
      supabase
        .from('capital_accounts')
        .select('*, fund:funds(fund_code, fund_name)')
        .eq('investor_id', client.id),
      supabase
        .from('capital_transactions')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('transaction_date', { ascending: false })
        .limit(20),
    ]);

    setClientAccounts(accountsRes.data || []);

    const accountIds = (accountsRes.data || []).map((a: any) => a.id);
    if (accountIds.length > 0) {
      const { data: filteredTxns } = await supabase
        .from('capital_transactions')
        .select('*')
        .in('capital_account_id', accountIds)
        .order('transaction_date', { ascending: false })
        .limit(20);
      setClientTransactions(filteredTxns || []);
    } else {
      setClientTransactions([]);
    }

    setLoadingDetail(false);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email) return;
    setSaving(true);

    const payload = {
      full_name: formData.full_name,
      email: formData.email,
      account_number: formData.account_number,
      total_invested: parseFloat(formData.total_invested) || 0,
      current_value: parseFloat(formData.current_value) || 0,
      inception_date: formData.inception_date,
      tenant_id: currentTenant?.id,
    };

    if (editingClient) {
      const { error } = await supabase
        .from('client_profiles')
        .update(payload)
        .eq('id', editingClient.id);
      if (error) { alert('Error updating client: ' + error.message); }
    } else {
      const { error } = await supabase
        .from('client_profiles')
        .insert(payload);
      if (error) { alert('Error adding client: ' + error.message); }
    }

    setSaving(false);
    setShowModal(false);
    loadClients();
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInvested = clients.reduce((sum, c) => sum + (c.total_invested || 0), 0);
  const totalValue = clients.reduce((sum, c) => sum + (c.current_value || 0), 0);
  const totalGainLoss = totalValue - totalInvested;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Client <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Manage active client accounts and portfolios</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total Clients</span>
            <Users className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-white">{clients.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active accounts</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total Invested</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-white">${(totalInvested / 1000000).toFixed(2)}M</div>
          <div className="text-xs text-slate-500 mt-1">Capital committed</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Total P&L</span>
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${(totalGainLoss / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalInvested > 0 ? `${((totalGainLoss / totalInvested) * 100).toFixed(2)}%` : '0%'}
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search clients by name, email, or account number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors"
        />
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/30 border-b border-slate-700/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Account #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Invested</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Current Value</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Gain/Loss</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Inception</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No clients found</p>
                    <p className="text-slate-500 text-sm mt-1">Add your first client to get started</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const gainLoss = (client.current_value || 0) - (client.total_invested || 0);
                  const returnPct = client.total_invested > 0 ? ((gainLoss / client.total_invested) * 100) : 0;

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-medium text-white">{client.full_name}</div>
                        <div className="text-xs text-slate-400">{client.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-300 font-mono">{client.account_number}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">
                        ${Number(client.total_invested).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white font-medium">
                        ${Number(client.current_value).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString()}
                          <span className="text-xs ml-1 opacity-75">({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%)</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">
                        {new Date(client.inception_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetail(client)}
                            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-teal-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                            title="Edit Client"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Inception Date</label>
                  <input
                    type="date"
                    value={formData.inception_date}
                    onChange={(e) => setFormData({ ...formData, inception_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Total Invested</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_invested}
                    onChange={(e) => setFormData({ ...formData, total_invested: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.full_name || !formData.email}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailClient && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDetailClient(null)} />
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 overflow-y-auto animate-slideInRight">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-white">{detailClient.full_name}</h3>
                <p className="text-sm text-slate-400">{detailClient.email}</p>
              </div>
              <button onClick={() => setDetailClient(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Account Number</div>
                  <div className="text-white font-mono">{detailClient.account_number}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Inception Date</div>
                  <div className="text-white">{new Date(detailClient.inception_date).toLocaleDateString()}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Total Invested</div>
                  <div className="text-white font-semibold">${Number(detailClient.total_invested).toLocaleString()}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-1">Current Value</div>
                  <div className="text-white font-semibold">${Number(detailClient.current_value).toLocaleString()}</div>
                </div>
              </div>

              {loadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-teal-400" />
                      Capital Accounts ({clientAccounts.length})
                    </h4>
                    {clientAccounts.length === 0 ? (
                      <p className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-4 text-center">No capital accounts linked</p>
                    ) : (
                      <div className="space-y-2">
                        {clientAccounts.map((acct: any) => (
                          <div key={acct.id} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <div className="text-sm text-white font-medium">{acct.account_number}</div>
                              <div className="text-xs text-slate-400">{acct.fund?.fund_name || 'Unknown Fund'}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-white font-medium">{Number(acct.shares_owned || 0).toLocaleString()} shares</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-teal-400" />
                      Recent Transactions ({clientTransactions.length})
                    </h4>
                    {clientTransactions.length === 0 ? (
                      <p className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-4 text-center">No transactions found</p>
                    ) : (
                      <div className="space-y-2">
                        {clientTransactions.slice(0, 10).map((txn: any) => (
                          <div key={txn.id} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <div className="text-sm text-white capitalize">{txn.transaction_type?.replace('_', ' ')}</div>
                              <div className="text-xs text-slate-400">{new Date(txn.transaction_date).toLocaleDateString()}</div>
                            </div>
                            <div className={`text-sm font-medium ${
                              txn.transaction_type === 'contribution' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {txn.transaction_type === 'contribution' ? '+' : '-'}${Math.abs(txn.amount || 0).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setDetailClient(null); openEditModal(detailClient); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
