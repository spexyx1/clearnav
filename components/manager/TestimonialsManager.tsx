import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, CreditCard as Edit2, Trash2, Star, Save, X } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';

interface Testimonial {
  id: string;
  client_name: string;
  client_position: string;
  client_company: string;
  client_photo_url: string;
  testimonial_text: string;
  rating: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

export function TestimonialsManager() {
  const { tenantId } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) loadTestimonials();
  }, [tenantId]);

  async function loadTestimonials() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');

      if (error) throw error;
      setTestimonials(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveTestimonial() {
    try {
      if (!editing) return;
      setError(null);

      const data = { ...editing, tenant_id: tenantId };

      if (editing.id) {
        const { error } = await supabase.from('testimonials').update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('testimonials').insert([data]);
        if (error) throw error;
      }

      setSuccess('Testimonial saved!');
      setEditing(null);
      loadTestimonials();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteTestimonial(id: string) {
    if (!confirm('Delete this testimonial?')) return;

    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Testimonial deleted!');
      loadTestimonials();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {editing.id ? 'Edit' : 'New'} Testimonial
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
            <button onClick={saveTestimonial} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Save size={20} /> Save
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
              <input type="text" value={editing.client_name || ''} onChange={(e) => setEditing({ ...editing, client_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <input type="text" value={editing.client_position || ''} onChange={(e) => setEditing({ ...editing, client_position: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="CEO" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
              <input type="text" value={editing.client_company || ''} onChange={(e) => setEditing({ ...editing, client_company: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Company Inc." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo URL</label>
              <input type="url" value={editing.client_photo_url || ''} onChange={(e) => setEditing({ ...editing, client_photo_url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Testimonial</label>
            <textarea value={editing.testimonial_text || ''} onChange={(e) => setEditing({ ...editing, testimonial_text: e.target.value })} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Write the testimonial..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <select value={editing.rating || 5} onChange={(e) => setEditing({ ...editing, rating: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} Stars</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 mt-8">
                <input type="checkbox" checked={editing.is_featured || false} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">Featured</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 mt-8">
                <input type="checkbox" checked={editing.is_active !== false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="w-4 h-4 text-blue-600" />
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
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Testimonials</h3>
            <p className="text-sm text-gray-600">Client reviews and feedback</p>
          </div>
        </div>
        <button onClick={() => setEditing({ is_active: true, rating: 5 })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Add Testimonial
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testimonials.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-500">No testimonials yet. Add your first one!</div>
        ) : (
          testimonials.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {t.client_photo_url && (
                    <img src={t.client_photo_url} alt={t.client_name} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">{t.client_name}</div>
                    <div className="text-sm text-gray-600">{t.client_position} at {t.client_company}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteTestimonial(t.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>

              <p className="text-gray-700 text-sm">{t.testimonial_text}</p>

              <div className="flex gap-2">
                {t.is_featured && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Featured</span>}
                {!t.is_active && <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Inactive</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
