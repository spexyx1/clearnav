import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, CreditCard as Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_active: boolean;
  view_count: number;
  helpful_count: number;
}

export function FAQManager() {
  const { tenantId } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [editing, setEditing] = useState<Partial<FAQ> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) loadFAQs();
  }, [tenantId]);

  async function loadFAQs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');

      if (error) throw error;
      setFaqs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveFAQ() {
    try {
      if (!editing) return;
      setError(null);

      const data = { ...editing, tenant_id: tenantId };

      if (editing.id) {
        const { error } = await supabase.from('faq_items').update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faq_items').insert([data]);
        if (error) throw error;
      }

      setSuccess('FAQ saved!');
      setEditing(null);
      loadFAQs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteFAQ(id: string) {
    if (!confirm('Delete this FAQ?')) return;

    try {
      const { error } = await supabase.from('faq_items').delete().eq('id', id);
      if (error) throw error;
      setSuccess('FAQ deleted!');
      loadFAQs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const categories = Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)));
  const filteredFaqs =
    categoryFilter === 'all' ? faqs : faqs.filter((f) => f.category === categoryFilter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{editing.id ? 'Edit' : 'New'} FAQ</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
            <button
              onClick={saveFAQ}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save size={20} /> Save
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
            <input
              type="text"
              value={editing.question || ''}
              onChange={(e) => setEditing({ ...editing, question: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="What is...?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
            <textarea
              value={editing.answer || ''}
              onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="The answer is..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <input
                type="text"
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="General"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
              <input
                type="number"
                value={editing.display_order || 0}
                onChange={(e) =>
                  setEditing({ ...editing, display_order: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 mt-8">
                <input
                  type="checkbox"
                  checked={editing.is_active !== false}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">FAQ Manager</h3>
            <p className="text-sm text-gray-600">Frequently asked questions</p>
          </div>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, display_order: faqs.length })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} /> Add FAQ
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {categories.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({faqs.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat} ({faqs.filter((f) => f.category === cat).length})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
            No FAQs yet. Add your first one!
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <div key={faq.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{faq.question}</div>
                  {faq.category && (
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {faq.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {faq.view_count} views · {faq.helpful_count} helpful
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(faq);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFAQ(faq.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                  {expandedId === faq.id ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </div>

              {expandedId === faq.id && (
                <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
