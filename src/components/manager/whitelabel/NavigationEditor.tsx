import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Save, ExternalLink, Navigation } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

interface MenuState {
  header: NavItem[];
  footer: NavItem[];
}

export default function NavigationEditor() {
  const { tenantId } = useAuth();
  const [menus, setMenus] = useState<MenuState>({ header: [], footer: [] });
  const [activeMenu, setActiveMenu] = useState<'header' | 'footer'>('header');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (tenantId) loadMenus();
  }, [tenantId]);

  async function loadMenus() {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('navigation_menus')
        .select('menu_type, items')
        .eq('tenant_id', tenantId);

      if (err) throw err;

      const header = data?.find((m) => m.menu_type === 'header')?.items as NavItem[] || [];
      const footer = data?.find((m) => m.menu_type === 'footer')?.items as NavItem[] || [];
      setMenus({ header, footer });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveMenu() {
    if (!tenantId) return;
    try {
      setSaving(true);
      setError(null);
      const items = menus[activeMenu];

      const { error: err } = await supabase
        .from('navigation_menus')
        .upsert(
          { tenant_id: tenantId, menu_type: activeMenu, items },
          { onConflict: 'tenant_id,menu_type' }
        );

      if (err) throw err;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, field: keyof NavItem, value: string | boolean) {
    setMenus((prev) => {
      const items = [...prev[activeMenu]];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [activeMenu]: items };
    });
  }

  function addItem() {
    setMenus((prev) => ({
      ...prev,
      [activeMenu]: [...prev[activeMenu], { label: 'New Link', href: '/' }],
    }));
  }

  function removeItem(index: number) {
    setMenus((prev) => ({
      ...prev,
      [activeMenu]: prev[activeMenu].filter((_, i) => i !== index),
    }));
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= menus[activeMenu].length) return;
    setMenus((prev) => {
      const items = [...prev[activeMenu]];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...prev, [activeMenu]: items };
    });
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveItem(dragIndex, index);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  const items = menus[activeMenu];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Navigation Menus</h2>
          <p className="text-sm text-gray-600 mt-1">
            Edit the links shown in your site header and footer
          </p>
        </div>
        <button
          onClick={saveMenu}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Menu'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          Menu saved successfully.
        </div>
      )}

      {/* Menu type toggle */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['header', 'footer'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveMenu(type)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              activeMenu === type
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {type === 'header' ? 'Header Navigation' : 'Footer Navigation'}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            No menu items yet. Click "Add Link" to get started.
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-3 bg-white border rounded-lg transition-shadow ${
              dragIndex === index ? 'shadow-lg border-cyan-400 opacity-80' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="cursor-grab text-gray-400 hover:text-gray-600 flex-shrink-0" title="Drag to reorder">
              <GripVertical size={18} />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g. About"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL / Path</label>
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => updateItem(index, 'href', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g. /about or https://…"
                />
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0 cursor-pointer" title="Open in new tab">
              <input
                type="checkbox"
                checked={!!item.external}
                onChange={(e) => updateItem(index, 'external', e.target.checked)}
                className="rounded border-gray-300"
              />
              <ExternalLink size={13} />
              External
            </label>

            <button
              onClick={() => removeItem(index)}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 hover:border-cyan-400 hover:text-cyan-600 rounded-lg text-sm font-medium transition-colors w-full justify-center"
      >
        <Plus size={16} />
        Add Link
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1 flex items-center gap-2">
          <Navigation size={15} />
          Tips
        </p>
        <ul className="space-y-1 text-blue-700 list-disc list-inside">
          <li>Use relative paths (e.g. <code className="bg-blue-100 px-1 rounded">/about</code>) for internal pages</li>
          <li>Check "External" for links that should open in a new tab</li>
          <li>Drag the grip icon to reorder items</li>
          <li>Save each menu (header/footer) separately</li>
        </ul>
      </div>
    </div>
  );
}
