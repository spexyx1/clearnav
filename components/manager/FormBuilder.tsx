import React, { useState, useEffect } from 'react';
import { FileText, Plus, CreditCard as Edit2, Trash2, Save, X, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';

interface Form {
  id: string;
  name: string;
  slug: string;
  description: string;
  submit_button_text: string;
  success_message: string;
  is_active: boolean;
}

interface FormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  placeholder: string;
  is_required: boolean;
  display_order: number;
}

interface Submission {
  id: string;
  submission_data: any;
  submitter_email: string;
  submitted_at: string;
  status: string;
}

export function FormBuilder() {
  const { tenantId } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editing, setEditing] = useState<Partial<Form> | null>(null);
  const [editingField, setEditingField] = useState<Partial<FormField> | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'submissions'>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) loadForms();
  }, [tenantId]);

  useEffect(() => {
    if (selectedForm) {
      loadFields();
      loadSubmissions();
    }
  }, [selectedForm]);

  async function loadForms() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFields() {
    if (!selectedForm) return;

    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', selectedForm.id)
        .order('display_order');

      if (error) throw error;
      setFields(data || []);
    } catch (err: any) {
      console.error('Error loading fields:', err);
    }
  }

  async function loadSubmissions() {
    if (!selectedForm) return;

    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', selectedForm.id)
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Error loading submissions:', err);
    }
  }

  async function saveForm() {
    try {
      if (!editing) return;
      setError(null);

      const slug = editing.slug || editing.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const data = { ...editing, tenant_id: tenantId, slug };

      if (editing.id) {
        const { error } = await supabase.from('custom_forms').update(data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data: newForm, error } = await supabase.from('custom_forms').insert([data]).select().single();
        if (error) throw error;
        setSelectedForm(newForm);
      }

      setSuccess('Form saved!');
      setEditing(null);
      setView('edit');
      loadForms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function saveField() {
    try {
      if (!editingField || !selectedForm) return;
      setError(null);

      const data = { ...editingField, form_id: selectedForm.id };

      if (editingField.id) {
        const { error } = await supabase.from('form_fields').update(data).eq('id', editingField.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('form_fields').insert([data]);
        if (error) throw error;
      }

      setSuccess('Field saved!');
      setEditingField(null);
      loadFields();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteForm(id: string) {
    if (!confirm('Delete this form and all its data?')) return;

    try {
      const { error } = await supabase.from('custom_forms').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Form deleted!');
      setSelectedForm(null);
      setView('list');
      loadForms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteField(id: string) {
    if (!confirm('Delete this field?')) return;

    try {
      const { error } = await supabase.from('form_fields').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Field deleted!');
      loadFields();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  if (view === 'submissions' && selectedForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Submissions: {selectedForm.name}</h3>
          <button onClick={() => setView('edit')} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Back to Form</button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Email</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Date</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Status</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No submissions yet</td></tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{s.submitter_email || 'Anonymous'}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(s.submitted_at).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded ${s.status === 'new' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{s.status}</span></td>
                    <td className="px-6 py-4"><pre className="text-xs text-gray-600 max-w-md overflow-auto">{JSON.stringify(s.submission_data, null, 2)}</pre></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === 'edit' && selectedForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Edit Form: {selectedForm.name}</h3>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedForm(null); setView('list'); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Back</button>
            <button onClick={() => setView('submissions')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Inbox size={20} /> Submissions ({submissions.length})</button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

        {editingField ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{editingField.id ? 'Edit' : 'New'} Field</h4>
              <button onClick={() => setEditingField(null)} className="p-2 text-gray-600 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Field Name</label><input type="text" value={editingField.field_name || ''} onChange={(e) => setEditingField({ ...editingField, field_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="email" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Label</label><input type="text" value={editingField.field_label || ''} onChange={(e) => setEditingField({ ...editingField, field_label: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Email Address" /></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Type</label><select value={editingField.field_type || 'text'} onChange={(e) => setEditingField({ ...editingField, field_type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option><option value="textarea">Textarea</option><option value="number">Number</option><option value="select">Select</option><option value="checkbox">Checkbox</option><option value="date">Date</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Placeholder</label><input type="text" value={editingField.placeholder || ''} onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="flex items-center gap-2 mt-8"><input type="checkbox" checked={editingField.is_required || false} onChange={(e) => setEditingField({ ...editingField, is_required: e.target.checked })} className="w-4 h-4 text-blue-600" /><span className="text-sm text-gray-700">Required</span></label></div>
            </div>

            <button onClick={saveField} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Save size={20} /> Save Field</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Form Fields</h4>
              <button onClick={() => setEditingField({ display_order: fields.length, is_required: false, field_type: 'text' })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20} /> Add Field</button>
            </div>

            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div><div className="font-medium text-gray-900">{field.field_label} <span className="text-xs text-gray-500">({field.field_type})</span></div><div className="text-sm text-gray-600">{field.field_name}{field.is_required && <span className="text-red-600 ml-1">*</span>}</div></div>
                  <div className="flex gap-2"><button onClick={() => setEditingField(field)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button><button onClick={() => deleteField(field.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button></div>
                </div>
              ))}
              {fields.length === 0 && <div className="text-center py-8 text-gray-500">No fields yet. Add your first field!</div>}
            </div>
          </>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{editing.id ? 'Edit' : 'New'} Form</h3>
          <div className="flex gap-2"><button onClick={() => setEditing(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"><X size={20} /></button><button onClick={saveForm} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Save size={20} /> Save</button></div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Form Name</label><input type="text" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Contact Form" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Description</label><input type="text" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Submit Button Text</label><input type="text" value={editing.submit_button_text || 'Submit'} onChange={(e) => setEditing({ ...editing, submit_button_text: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Success Message</label><input type="text" value={editing.success_message || 'Thank you!'} onChange={(e) => setEditing({ ...editing, success_message: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /></div></div>
          <div><label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_active !== false} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="w-4 h-4 text-blue-600" /><span className="text-sm text-gray-700">Active</span></label></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><FileText className="w-6 h-6 text-blue-600" /><div><h3 className="text-xl font-semibold text-gray-900">Form Builder</h3><p className="text-sm text-gray-600">Create custom forms</p></div></div>
        <button onClick={() => setEditing({ is_active: true, submit_button_text: 'Submit', success_message: 'Thank you for your submission!' })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20} /> New Form</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-500">No forms yet. Create your first one!</div>
        ) : (
          forms.map((form) => (
            <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between"><div><div className="font-semibold text-gray-900">{form.name}</div>{form.description && <div className="text-sm text-gray-600 mt-1">{form.description}</div>}</div><div className="flex gap-2"><button onClick={() => { setEditing(form); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button><button onClick={() => deleteForm(form.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button></div></div>
              <button onClick={() => { setSelectedForm(form); setView('edit'); }} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit Fields & View Submissions</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
