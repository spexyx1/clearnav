import { useState, useEffect } from 'react';
import { ShoppingCart, FileCheck, TrendingUp, DollarSign, Coins, CheckCircle, XCircle, Clock, AlertCircle, Plus, X } from 'lucide-react';
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
  const { currentTenant, user } = useAuth();
  const [activeView, setActiveView] = useState<'listings' | 'orders' | 'transactions' | 'fees' | 'tokenization'>('listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [listingFunds, setListingFunds] = useState<any[]>([]);
  const [savingListing, setSavingListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    asset_type: 'fund_share',
    fund_id: '',
    asset_name: '',
    quantity_available: '',
    price_per_unit: '',
    listing_type: 'sell',
    pricing_type: 'fixed',
    min_purchase_quantity: '',
    description: '',
    visibility: 'public',
    requires_accreditation: true,
    expires_at: '',
  });
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
      loadListingFunds();
    }
  }, [currentTenant, activeView]);

  const loadListingFunds = async () => {
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name, base_currency')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');
    setListingFunds(data || []);
  };

  const openCreateListing = () => {
    setListingForm({
      asset_type: 'fund_share', fund_id: '', asset_name: '', quantity_available: '', price_per_unit: '',
      listing_type: 'sell', pricing_type: 'fixed', min_purchase_quantity: '', description: '',
      visibility: 'public', requires_accreditation: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setShowCreateListing(true);
  };

  const handleCreateListing = async () => {
    if (!listingForm.asset_name || !listingForm.quantity_available || !listingForm.price_per_unit) return;
    setSavingListing(true);

    const qty = parseFloat(listingForm.quantity_available);
    const price = parseFloat(listingForm.price_per_unit);

    const { error } = await supabase
      .from('marketplace_listings')
      .insert({
        tenant_id: currentTenant?.id,
        lister_id: user?.id,
        asset_type: listingForm.asset_type,
        asset_id: listingForm.fund_id || null,
        asset_name: listingForm.asset_name,
        quantity_available: qty,
        quantity_original: qty,
        price_per_unit: price,
        total_value: qty * price,
        listing_type: listingForm.listing_type,
        pricing_type: listingForm.pricing_type,
        min_purchase_quantity: listingForm.min_purchase_quantity ? parseFloat(listingForm.min_purchase_quantity) : null,
        description: listingForm.description || null,
        visibility: listingForm.visibility,
        requires_accreditation: listingForm.requires_accreditation,
        expires_at: listingForm.expires_at ? new Date(listingForm.expires_at).toISOString() : null,
        status: 'pending_approval',
      });

    if (error) {
      alert('Error creating listing: ' + error.message);
    } else {
      setShowCreateListing(false);
      loadData();
      loadStats();
    }
    setSavingListing(false);
  };

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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Exchange <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Monitor and manage secondary market exchange operations</p>
        </div>
        <button
          onClick={openCreateListing}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Listing
        </button>
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

      {showCreateListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 flex items-center justify-between p-5 border-b border-slate-800 z-10">
              <h3 className="text-lg font-semibold text-white">Create Listing</h3>
              <button onClick={() => setShowCreateListing(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Asset Type</label>
                  <select
                    value={listingForm.asset_type}
                    onChange={(e) => setListingForm({ ...listingForm, asset_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="fund_share">Fund Share</option>
                    <option value="token">Token</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Listing Type</label>
                  <select
                    value={listingForm.listing_type}
                    onChange={(e) => setListingForm({ ...listingForm, listing_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="sell">Sell</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>

              {listingFunds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Fund</label>
                  <select
                    value={listingForm.fund_id}
                    onChange={(e) => {
                      const f = listingFunds.find((f: any) => f.id === e.target.value);
                      setListingForm({ ...listingForm, fund_id: e.target.value, asset_name: f ? `${f.fund_code} - ${f.fund_name}` : listingForm.asset_name });
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Select fund...</option>
                    {listingFunds.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.fund_code} - {f.fund_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Asset Name</label>
                <input
                  type="text"
                  value={listingForm.asset_name}
                  onChange={(e) => setListingForm({ ...listingForm, asset_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="e.g., Alpha Fund - Class A Shares"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={listingForm.quantity_available}
                    onChange={(e) => setListingForm({ ...listingForm, quantity_available: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Price Per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={listingForm.price_per_unit}
                    onChange={(e) => setListingForm({ ...listingForm, price_per_unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    placeholder="100.00"
                  />
                </div>
              </div>

              {listingForm.quantity_available && listingForm.price_per_unit && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-teal-300">Total Value</span>
                  <span className="text-lg font-semibold text-white">${(parseFloat(listingForm.quantity_available) * parseFloat(listingForm.price_per_unit)).toLocaleString()}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Pricing Type</label>
                  <select
                    value={listingForm.pricing_type}
                    onChange={(e) => setListingForm({ ...listingForm, pricing_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="negotiable">Negotiable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Min Purchase Qty</label>
                  <input
                    type="number"
                    value={listingForm.min_purchase_quantity}
                    onChange={(e) => setListingForm({ ...listingForm, min_purchase_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={listingForm.description}
                  onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="Describe the listing..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Expiration Date</label>
                  <input
                    type="date"
                    value={listingForm.expires_at}
                    onChange={(e) => setListingForm({ ...listingForm, expires_at: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Visibility</label>
                  <select
                    value={listingForm.visibility}
                    onChange={(e) => setListingForm({ ...listingForm, visibility: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer bg-slate-800/50 rounded-lg px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={listingForm.requires_accreditation}
                  onChange={(e) => setListingForm({ ...listingForm, requires_accreditation: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-300">Requires Accreditation</span>
              </label>
            </div>
            <div className="sticky bottom-0 bg-slate-900 flex justify-end gap-3 p-5 border-t border-slate-800">
              <button onClick={() => setShowCreateListing(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleCreateListing}
                disabled={savingListing || !listingForm.asset_name || !listingForm.quantity_available || !listingForm.price_per_unit}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {savingListing ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
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
