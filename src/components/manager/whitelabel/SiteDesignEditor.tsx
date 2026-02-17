import React, { useState, useEffect } from 'react';
import { Palette, Upload, Save, Eye, RotateCcw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
}

interface Typography {
  headingFont: string;
  bodyFont: string;
  headingWeight: string;
  bodyWeight: string;
}

interface SiteTheme {
  id?: string;
  name: string;
  colors: ThemeColors;
  typography: Typography;
  logo_url: string | null;
  favicon_url: string | null;
  custom_css: string;
}

const defaultTheme: SiteTheme = {
  name: 'Default Theme',
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    headingWeight: '700',
    bodyWeight: '400',
  },
  logo_url: null,
  favicon_url: null,
  custom_css: '',
};

export default function SiteDesignEditor() {
  const { tenantId } = useAuth();
  const [theme, setTheme] = useState<SiteTheme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadTheme();
    }
  }, [tenantId]);

  const loadTheme = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_themes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setTheme(data);
      }
    } catch (err: any) {
      console.error('Error loading theme:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveTheme = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (theme.id) {
        const { error } = await supabase
          .from('site_themes')
          .update({
            name: theme.name,
            colors: theme.colors,
            typography: theme.typography,
            logo_url: theme.logo_url,
            favicon_url: theme.favicon_url,
            custom_css: theme.custom_css,
            updated_at: new Date().toISOString(),
          })
          .eq('id', theme.id);

        if (error) throw error;
      } else {
        await supabase.from('site_themes').update({ is_active: false }).eq('tenant_id', tenantId);

        const { data, error } = await supabase
          .from('site_themes')
          .insert({
            tenant_id: tenantId,
            name: theme.name,
            colors: theme.colors,
            typography: theme.typography,
            logo_url: theme.logo_url,
            favicon_url: theme.favicon_url,
            custom_css: theme.custom_css,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        setTheme(data);
      }

      setSuccess('Theme saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateColors = (key: keyof ThemeColors, value: string) => {
    setTheme((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }));
  };

  const updateTypography = (key: keyof Typography, value: string) => {
    setTheme((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        [key]: value,
      },
    }));
  };

  const resetToDefault = () => {
    if (confirm('Reset to default theme? This will discard all your customizations.')) {
      setTheme(defaultTheme);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Site Design</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize your website's appearance and branding
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={saveTheme}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color Scheme
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.colors.primary}
                    onChange={(e) => updateColors('primary', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.colors.primary}
                    onChange={(e) => updateColors('primary', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.colors.secondary}
                    onChange={(e) => updateColors('secondary', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.colors.secondary}
                    onChange={(e) => updateColors('secondary', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.colors.accent}
                    onChange={(e) => updateColors('accent', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.colors.accent}
                    onChange={(e) => updateColors('accent', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.colors.background}
                    onChange={(e) => updateColors('background', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.colors.background}
                    onChange={(e) => updateColors('background', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.colors.text}
                    onChange={(e) => updateColors('text', e.target.value)}
                    className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.colors.text}
                    onChange={(e) => updateColors('text', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Typography</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading Font
                </label>
                <select
                  value={theme.typography.headingFont}
                  onChange={(e) => updateTypography('headingFont', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Font
                </label>
                <select
                  value={theme.typography.bodyFont}
                  onChange={(e) => updateTypography('bodyFont', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heading Weight
                  </label>
                  <select
                    value={theme.typography.headingWeight}
                    onChange={(e) => updateTypography('headingWeight', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semibold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra Bold (800)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Weight
                  </label>
                  <select
                    value={theme.typography.bodyWeight}
                    onChange={(e) => updateTypography('bodyWeight', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="300">Light (300)</option>
                    <option value="400">Regular (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semibold (600)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding Assets</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={theme.logo_url || ''}
                  onChange={(e) => setTheme({ ...theme, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favicon URL
                </label>
                <input
                  type="text"
                  value={theme.favicon_url || ''}
                  onChange={(e) => setTheme({ ...theme, favicon_url: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom CSS</h3>
            <textarea
              value={theme.custom_css}
              onChange={(e) => setTheme({ ...theme, custom_css: e.target.value })}
              placeholder="/* Add your custom CSS here */"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        {showPreview && (
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
              <div
                className="border border-gray-300 rounded-lg p-6 space-y-4"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontFamily: theme.typography.bodyFont,
                  fontWeight: theme.typography.bodyWeight,
                }}
              >
                <div
                  style={{
                    color: theme.colors.primary,
                    fontFamily: theme.typography.headingFont,
                    fontWeight: theme.typography.headingWeight,
                    fontSize: '24px',
                  }}
                >
                  Your Company Name
                </div>
                <p style={{ color: theme.colors.textSecondary }}>
                  This is how your website content will look with the selected theme.
                </p>
                <div className="flex gap-3">
                  <button
                    style={{
                      backgroundColor: theme.colors.primary,
                      color: '#FFFFFF',
                      padding: '8px 16px',
                      borderRadius: '8px',
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    style={{
                      backgroundColor: theme.colors.secondary,
                      color: '#FFFFFF',
                      padding: '8px 16px',
                      borderRadius: '8px',
                    }}
                  >
                    Secondary Button
                  </button>
                </div>
                <div
                  style={{
                    backgroundColor: theme.colors.accent + '20',
                    color: theme.colors.accent,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.accent}`,
                  }}
                >
                  This is an accent-colored notification box
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
