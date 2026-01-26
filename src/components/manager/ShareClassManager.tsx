import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Layers, DollarSign, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface ShareClass {
  id: string;
  fund_id: string;
  class_code: string;
  class_name: string;
  currency: string;
  management_fee_pct: number;
  performance_fee_pct: number;
  hurdle_rate_pct: number;
  high_water_mark: boolean;
  share_price_precision: number;
  minimum_investment: number;
  status: string;
  created_at: string;
}

export default function ShareClassManager() {
  const { currentTenant } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ShareClass | null>(null);
  const [formData, setFormData] = useState({
    class_code: '',
    class_name: '',
    currency: 'USD',
    management_fee_pct: 2.0,
    performance_fee_pct: 20.0,
    hurdle_rate_pct: 8.0,
    high_water_mark: true,
    share_price_precision: 4,
    minimum_investment: 100000,
  });

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadShareClasses();
    }
  }, [selectedFund]);

  const loadFunds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name, base_currency')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');

    if (data) {
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    }
    setLoading(false);
  };

  const loadShareClasses = async () => {
    const { data } = await supabase
      .from('share_classes')
      .select('*')
      .eq('fund_id', selectedFund)
      .order('class_code');

    if (data) {
      setShareClasses(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingClass) {
      const { error } = await supabase
        .from('share_classes')
        .update(formData)
        .eq('id', editingClass.id);

      if (!error) {
        closeModal();
        loadShareClasses();
      }
    } else {
      const { error } = await supabase
        .from('share_classes')
        .insert({
          fund_id: selectedFund,
          ...formData,
          status: 'active',
        });

      if (!error) {
        closeModal();
        loadShareClasses();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this share class?')) {
      const { error } = await supabase
        .from('share_classes')
        .delete()
        .eq('id', id);

      if (!error) {
        loadShareClasses();
      }
    }
  };

  const openModal = (shareClass?: ShareClass) => {
    if (shareClass) {
      setEditingClass(shareClass);
      setFormData({
        class_code: shareClass.class_code,
        class_name: shareClass.class_name,
        currency: shareClass.currency,
        management_fee_pct: shareClass.management_fee_pct,
        performance_fee_pct: shareClass.performance_fee_pct,
        hurdle_rate_pct: shareClass.hurdle_rate_pct,
        high_water_mark: shareClass.high_water_mark,
        share_price_precision: shareClass.share_price_precision,
        minimum_investment: shareClass.minimum_investment,
      });
    } else {
      setEditingClass(null);
      setFormData({
        class_code: '',
        class_name: '',
        currency: funds.find(f => f.id === selectedFund)?.base_currency || 'USD',
        management_fee_pct: 2.0,
        performance_fee_pct: 20.0,
        hurdle_rate_pct: 8.0,
        high_water_mark: true,
        share_price_precision: 4,
        minimum_investment: 100000,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClass(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const selectedFundData = funds.find(f => f.id === selectedFund);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Share Class Management</h2>
          <p className="text-slate-400 mt-1">Configure share classes and fee structures</p>
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
            onClick={() => openModal()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Share Class</span>
          </button>
        </div>
      </div>

      {shareClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shareClasses.map((sc) => (
            <div
              key={sc.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Class {sc.class_code}
                  </div>
                  <h3 className="text-lg font-bold text-white">{sc.class_name}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  sc.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {sc.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Currency</span>
                  <span className="text-white font-medium">{sc.currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Management Fee</span>
                  <span className="text-cyan-400 font-medium">{sc.management_fee_pct}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Performance Fee</span>
                  <span className="text-emerald-400 font-medium">{sc.performance_fee_pct}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Hurdle Rate</span>
                  <span className="text-amber-400 font-medium">{sc.hurdle_rate_pct}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">High Water Mark</span>
                  <span className={`font-medium ${sc.high_water_mark ? 'text-green-400' : 'text-slate-400'}`}>
                    {sc.high_water_mark ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Min Investment</span>
                  <span className="text-white font-medium">
                    {sc.currency} {(sc.minimum_investment / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>

              <div className="flex space-x-2 mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openModal(sc)}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(sc.id)}
                  className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/30 rounded-xl p-12 border-2 border-dashed border-slate-700 text-center">
          <Layers className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Share Classes</h3>
          <p className="text-slate-400 mb-6">
            Create share classes to support different investor types with varying fee structures
          </p>
          <button
            onClick={() => openModal()}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg inline-flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create First Share Class</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">
                {editingClass ? 'Edit Share Class' : 'Create Share Class'}
              </h3>
              <p className="text-slate-400 mt-1">
                {selectedFundData?.fund_name}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Class Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.class_code}
                    onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
                    placeholder="A, B, INST"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="Class A - Retail"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Management Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.management_fee_pct}
                    onChange={(e) => setFormData({ ...formData, management_fee_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Performance Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.performance_fee_pct}
                    onChange={(e) => setFormData({ ...formData, performance_fee_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hurdle Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hurdle_rate_pct}
                    onChange={(e) => setFormData({ ...formData, hurdle_rate_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Share Price Precision
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="8"
                    value={formData.share_price_precision}
                    onChange={(e) => setFormData({ ...formData, share_price_precision: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Minimum Investment
                  </label>
                  <input
                    type="number"
                    value={formData.minimum_investment}
                    onChange={(e) => setFormData({ ...formData, minimum_investment: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="high_water_mark"
                  checked={formData.high_water_mark}
                  onChange={(e) => setFormData({ ...formData, high_water_mark: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                />
                <label htmlFor="high_water_mark" className="text-slate-300 cursor-pointer">
                  Use High Water Mark for performance fee calculation
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                >
                  {editingClass ? 'Update' : 'Create'} Share Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
