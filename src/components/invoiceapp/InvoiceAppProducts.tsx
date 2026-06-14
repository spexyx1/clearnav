import { useState, useEffect } from 'react';
import { Plus, Trash2, CreditCard as Edit2, Search, Package, Loader2, X, AlertCircle, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SavedProduct } from './types';
import { formatCurrency, CURRENCIES } from '../manager/invoicing/types';

interface Props {
  userId: string;
}

const EMPTY_FORM = {
  description: '',
  default_price: '',
  default_tax_rate: '',
  default_quantity: '1',
  unit: '',
};

export default function InvoiceAppProducts({ userId }: Props) {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedProduct | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [userId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('invoice_saved_products')
      .select('*')
      .eq('user_id', userId)
      .order('description');
    setProducts(data ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(product: SavedProduct) {
    setEditing(product);
    setForm({
      description: product.description,
      default_price: String(product.default_price),
      default_tax_rate: String(product.default_tax_rate),
      default_quantity: String(product.default_quantity),
      unit: product.unit ?? '',
    });
    setError(null);
    setModalOpen(true);
  }

  async function saveProduct() {
    if (!form.description.trim()) { setError('Description is required.'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      user_id: userId,
      description: form.description.trim(),
      default_price: parseFloat(form.default_price) || 0,
      default_tax_rate: parseFloat(form.default_tax_rate) || 0,
      default_quantity: parseFloat(form.default_quantity) || 1,
      unit: form.unit.trim() || null,
    };

    if (editing) {
      const { error: err } = await supabase
        .from('invoice_saved_products')
        .update(payload)
        .eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from('invoice_saved_products')
        .insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('invoice_saved_products').delete().eq('id', id);
    setDeleting(null);
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  const filtered = products.filter(p =>
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    (p.unit ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products &amp; Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Saved items for quick line-item entry on invoices
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products and services..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">
            {search ? 'No products match your search' : 'No products yet'}
          </p>
          {!search && (
            <p className="text-gray-400 text-sm mt-1">
              Add products to quickly fill in line items when creating invoices
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Default Price
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Qty
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Tax %
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Unit
                </th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{product.description}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-700 font-medium hidden sm:table-cell">
                    {formatCurrency(product.default_price, 'USD')}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500 hidden sm:table-cell">
                    {product.default_quantity}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500 hidden md:table-cell">
                    {product.default_tax_rate > 0 ? `${product.default_tax_rate}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500 hidden md:table-cell">
                    {product.unit || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={deleting === product.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      >
                        {deleting === product.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Product' : 'Add Product / Service'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Web Design, Consulting Hour, Monthly Retainer"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Default Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number" min="0" step="any"
                      value={form.default_price}
                      onChange={e => setForm(p => ({ ...p, default_price: e.target.value }))}
                      placeholder="0.00"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Default Qty</label>
                  <input
                    type="number" min="0" step="any"
                    value={form.default_quantity}
                    onChange={e => setForm(p => ({ ...p, default_quantity: e.target.value }))}
                    placeholder="1"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                  <input
                    type="number" min="0" max="100" step="any"
                    value={form.default_tax_rate}
                    onChange={e => setForm(p => ({ ...p, default_tax_rate: e.target.value }))}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <input
                    value={form.unit}
                    onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                    placeholder="hr, month, item..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : (editing ? 'Save Changes' : 'Add Product')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
