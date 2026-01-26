import { useState, useEffect } from 'react';
import { ShoppingCart, FileCheck, TrendingUp, DollarSign, Coins, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Listing {
  id: string;
  asset_name: string;
  asset_type: string;
  quantity_available: number;
  price_per_unit: number;
  total_value: number;
  status: string;
  lister_id: string;
  created_at: string;
  client_profiles: {
    full_name: string;
    email: string;
  };
}

interface Order {
  id: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  status: string;
  created_at: string;
  marketplace_listings: {
    asset_name: string;
  };
  buyer: {
    full_name: string;
    email: string;
  };
  seller: {
    full_name: string;
    email: string;
  };
}

interface Transaction {
  id: string;
  asset_name: string;
  quantity: number;
  gross_amount: number;
  platform_fee: number;
  status: string;
  transaction_date: string;
  buyer: {
    full_name: string;
  };
  seller: {
    full_name: string;
  };
}

interface TokenizationRequest {
  id: string;
  asset_name: string;
  asset_quantity: number;
  proposed_token_symbol: string;
  status: string;
  requested_at: string;
  requester: {
    full_name: string;
    email: string;
  };
}

export default function ExchangeManagement() {
  const { currentTenant } = useAuth();
  const [activeView, setActiveView] = useState<'listings' | 'orders' | 'transactions' | 'fees' | 'tokenization'>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingListings: 0,
    activeOrders: 0,
    totalVolume: 0,
    platformRevenue: 0,
  });

  useEffect(() => {
    if (currentTenant) {
      loadData();
      loadStats();
    }
  }, [currentTenant, activeView]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeView === 'listings') {
        await loadListings();
      } else if (activeView === 'orders') {
        await loadOrders();
      } else if (activeView === 'transactions') {
        await loadTransactions();
      } else if (activeView === 'tokenization') {
        await loadTokenizationRequests();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const [listingsRes, ordersRes, transactionsRes] = await Promise.all([
      supabase
        .from('marketplace_listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      supabase
        .from('exchange_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'matched', 'in_escrow']),
      supabase
        .from('exchange_transactions')
        .select('gross_amount, platform_fee')
        .eq('status', 'completed'),
    ]);

    const totalVolume = transactionsRes.data?.reduce((sum, t) => sum + parseFloat(t.gross_amount), 0) || 0;
    const platformRevenue = transactionsRes.data?.reduce((sum, t) => sum + parseFloat(t.platform_fee), 0) || 0;

    setStats({
      pendingListings: listingsRes.count || 0,
      activeOrders: ordersRes.count || 0,
      totalVolume,
      platformRevenue,
    });
  };

  const loadListings = async () => {
    const { data } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        client_profiles!lister_id(full_name, email)
      `)
      .order('created_at', { ascending: false });

    setListings(data || []);
  };

  const loadOrders = async () => {
    const { data } = await supabase
      .from('exchange_orders')
      .select(`
        *,
        marketplace_listings(asset_name),
        buyer:client_profiles!buyer_id(full_name, email),
        seller:client_profiles!seller_id(full_name, email)
      `)
      .order('created_at', { ascending: false });

    setOrders(data || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('exchange_transactions')
      .select(`
        *,
        buyer:client_profiles!buyer_id(full_name),
        seller:client_profiles!seller_id(full_name)
      `)
      .order('transaction_date', { ascending: false });

    setTransactions(data || []);
  };

  const loadTokenizationRequests = async () => {
    const { data } = await supabase
      .from('tokenization_requests')
      .select(`
        *,
        requester:client_profiles!requester_id(full_name, email)
      `)
      .order('requested_at', { ascending: false });

    setTokenRequests(data || []);
  };

  const handleApproveListing = async (listingId: string) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        listed_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    if (!error) {
      loadData();
      loadStats();
    }
  };

  const handleRejectListing = async (listingId: string, reason: string) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', listingId);

    if (!error) {
      loadData();
      loadStats();
    }
  };

  const handleMatchOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('exchange_orders')
      .update({
        status: 'matched',
        matched_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (!error) {
      loadData();
      loadStats();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-400',
      pending: 'text-yellow-400',
      pending_approval: 'text-orange-400',
      completed: 'text-cyan-400',
      cancelled: 'text-red-400',
      matched: 'text-blue-400',
      rejected: 'text-red-400',
    };
    return colors[status] || 'text-slate-400';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed' || status === 'active') return <CheckCircle className="w-4 h-4" />;
    if (status === 'cancelled' || status === 'rejected') return <XCircle className="w-4 h-4" />;
    if (status === 'pending' || status === 'pending_approval') return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-2">Exchange Management</h2>
        <p className="text-slate-400">Monitor and manage secondary market exchange operations</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <FileCheck className="w-8 h-8 text-orange-400" />
            <span className="text-2xl font-semibold text-white">{stats.pendingListings}</span>
          </div>
          <div className="text-sm text-slate-400">Pending Listings</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-semibold text-white">{stats.activeOrders}</span>
          </div>
          <div className="text-sm text-slate-400">Active Orders</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-semibold text-white">${stats.totalVolume.toLocaleString()}</span>
          </div>
          <div className="text-sm text-slate-400">Total Volume</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-semibold text-white">${stats.platformRevenue.toLocaleString()}</span>
          </div>
          <div className="text-sm text-slate-400">Platform Revenue</div>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-700">
        {[
          { id: 'listings', label: 'Listings', icon: ShoppingCart },
          { id: 'orders', label: 'Orders', icon: FileCheck },
          { id: 'transactions', label: 'Transactions', icon: CheckCircle },
          { id: 'fees', label: 'Fee Configuration', icon: DollarSign },
          { id: 'tokenization', label: 'Tokenization', icon: Coins },
        ].map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                activeView === view.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{view.label}</span>
            </button>
          );
        })}
      </div>

      {activeView === 'listings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading listings...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No listings to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{listing.asset_name}</h3>
                        <span className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded ${getStatusColor(listing.status)} bg-slate-900`}>
                          {getStatusIcon(listing.status)}
                          <span>{listing.status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Listed by: {listing.client_profiles.full_name} ({listing.client_profiles.email})
                      </p>
                    </div>
                    {listing.status === 'pending_approval' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveListing(listing.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) handleRejectListing(listing.id, reason);
                          }}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Type</div>
                      <div className="text-white capitalize">{listing.asset_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Quantity</div>
                      <div className="text-white">{Number(listing.quantity_available).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Price/Unit</div>
                      <div className="text-white">${Number(listing.price_per_unit).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Total Value</div>
                      <div className="text-cyan-400 font-semibold">${Number(listing.total_value).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Created</div>
                      <div className="text-white">{new Date(listing.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No orders to process</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{order.marketplace_listings.asset_name}</h3>
                        <span className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded ${getStatusColor(order.status)} bg-slate-900`}>
                          {getStatusIcon(order.status)}
                          <span>{order.status}</span>
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1">
                        <div>Buyer: {order.buyer.full_name} ({order.buyer.email})</div>
                        <div>Seller: {order.seller.full_name} ({order.seller.email})</div>
                      </div>
                    </div>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleMatchOrder(order.id)}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Match Order
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Quantity</div>
                      <div className="text-white">{Number(order.quantity).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Price/Unit</div>
                      <div className="text-white">${Number(order.price_per_unit).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Total</div>
                      <div className="text-cyan-400 font-semibold">${Number(order.total_amount).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Placed</div>
                      <div className="text-white">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'transactions' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No completed transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div key={txn.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{txn.asset_name}</h3>
                      <div className="text-sm text-slate-400 space-y-1">
                        <div>Buyer: {txn.buyer.full_name}</div>
                        <div>Seller: {txn.seller.full_name}</div>
                      </div>
                    </div>
                    <span className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded ${getStatusColor(txn.status)} bg-slate-900`}>
                      {getStatusIcon(txn.status)}
                      <span>{txn.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Quantity</div>
                      <div className="text-white">{Number(txn.quantity).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Gross Amount</div>
                      <div className="text-white">${Number(txn.gross_amount).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Platform Fee</div>
                      <div className="text-green-400 font-semibold">${Number(txn.platform_fee).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Status</div>
                      <div className="text-white capitalize">{txn.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Date</div>
                      <div className="text-white">{new Date(txn.transaction_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'fees' && <FeeConfiguration />}
      {activeView === 'tokenization' && <TokenizationManagement requests={tokenRequests} onUpdate={loadData} />}
    </div>
  );
}

function FeeConfiguration() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    const { data } = await supabase
      .from('marketplace_fees')
      .select('*')
      .order('created_at', { ascending: false });

    setFees(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Fee Configuration</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          Add Fee Rule
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading fees...</div>
      ) : fees.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
          <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No fee rules configured</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Configure First Fee Rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fees.map((fee) => (
            <div key={fee.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-2">{fee.fee_name}</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 mb-1">Type</div>
                      <div className="text-white capitalize">{fee.fee_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Method</div>
                      <div className="text-white capitalize">{fee.calculation_method}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Rate/Amount</div>
                      <div className="text-cyan-400 font-semibold">
                        {fee.calculation_method === 'percentage'
                          ? `${(fee.percentage_rate * 100).toFixed(2)}%`
                          : `$${fee.fixed_amount}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Status</div>
                      <div className={fee.is_active ? 'text-green-400' : 'text-red-400'}>
                        {fee.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenizationManagement({ requests, onUpdate }: { requests: TokenizationRequest[]; onUpdate: () => void }) {
  const handleApprove = async (requestId: string) => {
    const { error } = await supabase
      .from('tokenization_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (!error) onUpdate();
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    const { error } = await supabase
      .from('tokenization_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (!error) onUpdate();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white">Tokenization Requests</h3>

      {requests.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <Coins className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No tokenization requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-2">{request.proposed_token_symbol}</h4>
                  <p className="text-sm text-slate-400 mb-2">
                    Requested by: {request.requester.full_name} ({request.requester.email})
                  </p>
                </div>
                {request.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-400 mb-1">Asset</div>
                  <div className="text-white">{request.asset_name}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Quantity</div>
                  <div className="text-white">{Number(request.asset_quantity).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Status</div>
                  <div className="text-cyan-400 capitalize">{request.status}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Requested</div>
                  <div className="text-white">{new Date(request.requested_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
