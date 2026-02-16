import { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, Clock, CheckCircle, XCircle, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Listing {
  id: string;
  asset_name: string;
  asset_type: string;
  quantity_available: number;
  price_per_unit: number;
  total_value: number;
  listing_type: string;
  status: string;
  pricing_type: string;
  description: string;
  lister_id: string;
  created_at: string;
}

interface Order {
  id: string;
  listing_id: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  status: string;
  order_type: string;
  created_at: string;
  marketplace_listings: {
    asset_name: string;
    asset_type: string;
  };
}

interface Transaction {
  id: string;
  asset_name: string;
  quantity: number;
  price_per_unit: number;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  transaction_date: string;
}

export default function Exchange({ profile }: { profile: any }) {
  const { currentTenant } = useAuth();
  const [activeView, setActiveView] = useState<'marketplace' | 'my_listings' | 'my_orders' | 'transactions'>('marketplace');
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (profile?.id && currentTenant) {
      loadData();
    }
  }, [profile, currentTenant, activeView]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeView === 'marketplace') {
        await loadMarketplaceListings();
      } else if (activeView === 'my_listings') {
        await loadMyListings();
      } else if (activeView === 'my_orders') {
        await loadMyOrders();
      } else if (activeView === 'transactions') {
        await loadTransactions();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadMarketplaceListings = async () => {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'active')
      .neq('lister_id', profile.id)
      .order('created_at', { ascending: false });

    setListings(data || []);
  };

  const loadMyListings = async () => {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('lister_id', profile.id)
      .order('created_at', { ascending: false });

    setMyListings(data || []);
  };

  const loadMyOrders = async () => {
    const { data } = await supabase
      .from('exchange_orders')
      .select('*, marketplace_listings(asset_name, asset_type)')
      .eq('buyer_id', profile.id)
      .order('created_at', { ascending: false });

    setMyOrders(data || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('exchange_transactions')
      .select('*')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('transaction_date', { ascending: false });

    setTransactions(data || []);
  };

  const handleBuyClick = (listing: Listing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-400',
      pending: 'text-yellow-400',
      completed: 'text-cyan-400',
      cancelled: 'text-red-400',
      pending_approval: 'text-orange-400',
      filled: 'text-blue-400',
    };
    return colors[status] || 'text-slate-400';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed' || status === 'filled') return <CheckCircle className="w-4 h-4" />;
    if (status === 'cancelled' || status === 'rejected') return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.asset_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || listing.asset_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-light text-white">Secondary Market Exchange</h2>
        <button
          onClick={() => setShowCreateListing(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Listing</span>
        </button>
      </div>

      <div className="flex space-x-2 border-b border-slate-700">
        {[
          { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
          { id: 'my_listings', label: 'My Listings', icon: TrendingUp },
          { id: 'my_orders', label: 'My Orders', icon: Clock },
          { id: 'transactions', label: 'Transaction History', icon: CheckCircle },
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

      {activeView === 'marketplace' && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Types</option>
              <option value="fund_share">Fund Shares</option>
              <option value="trust_unit">Trust Units</option>
              <option value="tokenized_asset">Tokenized Assets</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading marketplace...</div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No listings available at this time</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-cyan-400 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{listing.asset_name}</h3>
                      <p className="text-sm text-slate-400 capitalize">{listing.asset_type.replace('_', ' ')}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(listing.status)} bg-slate-900`}>
                      {listing.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Quantity Available:</span>
                      <span className="text-white font-medium">{Number(listing.quantity_available).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Price per Unit:</span>
                      <span className="text-white font-medium">${Number(listing.price_per_unit).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Value:</span>
                      <span className="text-cyan-400 font-semibold">${Number(listing.total_value).toLocaleString()}</span>
                    </div>
                  </div>

                  {listing.description && (
                    <p className="text-sm text-slate-300 mb-4 line-clamp-2">{listing.description}</p>
                  )}

                  <button
                    onClick={() => handleBuyClick(listing)}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium"
                  >
                    Place Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'my_listings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading your listings...</div>
          ) : myListings.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">You haven't created any listings yet</p>
              <button
                onClick={() => setShowCreateListing(true)}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Create Your First Listing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => (
                <div key={listing.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{listing.asset_name}</h3>
                        <span className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded ${getStatusColor(listing.status)} bg-slate-900`}>
                          {getStatusIcon(listing.status)}
                          <span>{listing.status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 capitalize mb-4">{listing.asset_type.replace('_', ' ')}</p>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Available</div>
                          <div className="text-white font-medium">{Number(listing.quantity_available).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Price/Unit</div>
                          <div className="text-white font-medium">${Number(listing.price_per_unit).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Total Value</div>
                          <div className="text-cyan-400 font-semibold">${Number(listing.total_value).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Listed</div>
                          <div className="text-white">{new Date(listing.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'my_orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading your orders...</div>
          ) : myOrders.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">You haven't placed any orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => (
                <div key={order.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{order.marketplace_listings.asset_name}</h3>
                        <span className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded ${getStatusColor(order.status)} bg-slate-900`}>
                          {getStatusIcon(order.status)}
                          <span>{order.status}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-4">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Quantity</div>
                          <div className="text-white font-medium">{Number(order.quantity).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Price/Unit</div>
                          <div className="text-white font-medium">${Number(order.price_per_unit).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Total</div>
                          <div className="text-cyan-400 font-semibold">${Number(order.total_amount).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Type</div>
                          <div className="text-white capitalize">{order.order_type}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Placed</div>
                          <div className="text-white">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
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
                      <h3 className="text-lg font-semibold text-white">{txn.asset_name}</h3>
                      <p className="text-sm text-slate-400">{new Date(txn.transaction_date).toLocaleString()}</p>
                    </div>
                    <span className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded ${getStatusColor(txn.status)} bg-slate-900`}>
                      {getStatusIcon(txn.status)}
                      <span>{txn.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Quantity</div>
                      <div className="text-white font-medium">{Number(txn.quantity).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Price/Unit</div>
                      <div className="text-white font-medium">${Number(txn.price_per_unit).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Gross Amount</div>
                      <div className="text-white font-medium">${Number(txn.gross_amount).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Platform Fee</div>
                      <div className="text-orange-400">${Number(txn.platform_fee).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Net Amount</div>
                      <div className="text-cyan-400 font-semibold">${Number(txn.net_amount).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateListing && (
        <CreateListingModal
          profile={profile}
          tenantId={currentTenant?.id}
          onClose={() => setShowCreateListing(false)}
          onSuccess={() => {
            setShowCreateListing(false);
            loadData();
          }}
        />
      )}

      {showBuyModal && selectedListing && (
        <BuyModal
          listing={selectedListing}
          profile={profile}
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => {
            setShowBuyModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CreateListingModal({ profile, tenantId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    asset_type: 'trust_unit',
    asset_name: '',
    quantity: '',
    price_per_unit: '',
    description: '',
    pricing_type: 'fixed',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('marketplace_listings').insert({
        tenant_id: tenantId,
        lister_id: profile.id,
        asset_type: formData.asset_type,
        asset_id: crypto.randomUUID(),
        asset_name: formData.asset_name,
        quantity_available: parseFloat(formData.quantity),
        quantity_original: parseFloat(formData.quantity),
        price_per_unit: parseFloat(formData.price_per_unit),
        listing_type: 'sell',
        pricing_type: formData.pricing_type,
        description: formData.description,
        status: 'pending_approval',
      });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-6">Create Listing</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Asset Type</label>
            <select
              value={formData.asset_type}
              onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              required
            >
              <option value="trust_unit">Trust Unit</option>
              <option value="fund_share">Fund Share</option>
              <option value="share_class_unit">Share Class Unit</option>
              <option value="tokenized_asset">Tokenized Asset</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Asset Name</label>
            <input
              type="text"
              value={formData.asset_name}
              onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Price per Unit ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Pricing Type</label>
            <select
              value={formData.pricing_type}
              onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="fixed">Fixed Price</option>
              <option value="negotiable">Negotiable</option>
              <option value="market">Market Price</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BuyModal({ listing, profile, onClose, onSuccess }: any) {
  const [quantity, setQuantity] = useState('');
  const [placing, setPlacing] = useState(false);

  const totalAmount = quantity ? parseFloat(quantity) * parseFloat(listing.price_per_unit) : 0;
  const platformFee = totalAmount * 0.02;
  const netAmount = totalAmount + platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacing(true);

    try {
      const { error } = await supabase.from('exchange_orders').insert({
        tenant_id: listing.tenant_id,
        listing_id: listing.id,
        buyer_id: profile.id,
        seller_id: listing.lister_id,
        order_type: 'market',
        quantity: parseFloat(quantity),
        price_per_unit: parseFloat(listing.price_per_unit),
        status: 'pending',
      });

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order');
    }
    setPlacing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Place Buy Order</h3>

        <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-white mb-2">{listing.asset_name}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Available:</span>
              <span className="text-white">{Number(listing.quantity_available).toLocaleString()} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Price per Unit:</span>
              <span className="text-white">${Number(listing.price_per_unit).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Quantity to Buy</label>
            <input
              type="number"
              step="0.01"
              max={listing.quantity_available}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              required
            />
          </div>

          {quantity && (
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-white">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Fee (2%):</span>
                <span className="text-orange-400">${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="text-white font-medium">Total:</span>
                <span className="text-cyan-400 font-semibold">${netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={placing || !quantity}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {placing ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
