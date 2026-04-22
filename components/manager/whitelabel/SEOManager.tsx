import React, { useState, useEffect } from 'react';
import { Search, Globe, Image as ImageIcon, Save, Eye, Code } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import { AssetManager } from '../AssetManager';

interface SEOSettings {
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  canonical_url: string;
  robots_directives: string[];
  og_title: string;
  og_description: string;
  og_image_url: string;
  og_type: string;
  twitter_card_type: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image_url: string;
  twitter_site: string;
  twitter_creator: string;
  schema_markup: any;
}

export function SEOManager() {
  const { tenantId } = useAuth();
  const [selectedPage, setSelectedPage] = useState('home');
  const [settings, setSettings] = useState<Partial<SEOSettings>>({
    robots_directives: ['index', 'follow'],
    og_type: 'website',
    twitter_card_type: 'summary_large_image',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState<'og' | 'twitter' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadSettings();
    }
  }, [tenantId, selectedPage]);

  async function loadSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_seo_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('page_slug', selectedPage)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        setSettings({
          robots_directives: ['index', 'follow'],
          og_type: 'website',
          twitter_card_type: 'summary_large_image',
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('website_seo_settings')
        .upsert(
          {
            tenant_id: tenantId,
            page_slug: selectedPage,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,page_slug' }
        );

      if (error) throw error;

      setSuccess('SEO settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleAssetSelect(type: 'og' | 'twitter', url: string) {
    if (type === 'og') {
      setSettings({ ...settings, og_image_url: url });
    } else {
      setSettings({ ...settings, twitter_image_url: url });
    }
    setShowAssetPicker(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (showAssetPicker) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Select Image</h3>
          <button
            onClick={() => setShowAssetPicker(null)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
        <AssetManager
          mode="picker"
          onSelectAsset={(url) => handleAssetSelect(showAssetPicker, url)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">SEO Settings</h3>
            <p className="text-sm text-gray-600">Optimize your website for search engines</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="home">Homepage</option>
            <option value="about">About Page</option>
            <option value="contact">Contact Page</option>
          </select>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye size={20} />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save SEO'}
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

      {showPreview && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-900">Google Search Preview</h4>
          <div className="space-y-2">
            <div className="text-blue-600 text-xl hover:underline cursor-pointer">
              {settings.meta_title || 'Your Page Title'}
            </div>
            <div className="text-green-700 text-sm">
              https://example.com/{selectedPage}
            </div>
            <div className="text-gray-600 text-sm">
              {settings.meta_description || 'Your page description will appear here...'}
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 mt-6">Social Media Preview</h4>
          <div className="border border-gray-300 rounded-lg overflow-hidden max-w-lg">
            {settings.og_image_url && (
              <img src={settings.og_image_url} alt="OG" className="w-full h-48 object-cover" />
            )}
            <div className="p-4 bg-gray-50">
              <div className="font-semibold text-gray-900">
                {settings.og_title || settings.meta_title || 'Your Page Title'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {settings.og_description || settings.meta_description || 'Description'}
              </div>
              <div className="text-xs text-gray-500 mt-2">example.com</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Search size={20} className="text-blue-600" />
            Basic SEO
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Title
              <span className="text-gray-500 ml-2 text-xs">
                ({(settings.meta_title || '').length}/60 characters)
              </span>
            </label>
            <input
              type="text"
              value={settings.meta_title || ''}
              onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })}
              maxLength={60}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Engaging page title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Description
              <span className="text-gray-500 ml-2 text-xs">
                ({(settings.meta_description || '').length}/160 characters)
              </span>
            </label>
            <textarea
              value={settings.meta_description || ''}
              onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
              maxLength={160}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Compelling description that encourages clicks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canonical URL (optional)
            </label>
            <input
              type="url"
              value={settings.canonical_url || ''}
              onChange={(e) => setSettings({ ...settings, canonical_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/page"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Robots Directives
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(settings.robots_directives || []).includes('index')}
                  onChange={(e) => {
                    const directives = settings.robots_directives || [];
                    if (e.target.checked) {
                      setSettings({
                        ...settings,
                        robots_directives: [...directives.filter((d) => d !== 'noindex'), 'index'],
                      });
                    } else {
                      setSettings({
                        ...settings,
                        robots_directives: [
                          ...directives.filter((d) => d !== 'index'),
                          'noindex',
                        ],
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Allow indexing</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(settings.robots_directives || []).includes('follow')}
                  onChange={(e) => {
                    const directives = settings.robots_directives || [];
                    if (e.target.checked) {
                      setSettings({
                        ...settings,
                        robots_directives: [
                          ...directives.filter((d) => d !== 'nofollow'),
                          'follow',
                        ],
                      });
                    } else {
                      setSettings({
                        ...settings,
                        robots_directives: [
                          ...directives.filter((d) => d !== 'follow'),
                          'nofollow',
                        ],
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Allow following links</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Globe size={20} className="text-blue-600" />
            Open Graph (Facebook, LinkedIn)
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OG Title</label>
            <input
              type="text"
              value={settings.og_title || ''}
              onChange={(e) => setSettings({ ...settings, og_title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to use Meta Title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OG Description
            </label>
            <textarea
              value={settings.og_description || ''}
              onChange={(e) => setSettings({ ...settings, og_description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to use Meta Description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OG Image</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings.og_image_url || ''}
                onChange={(e) => setSettings({ ...settings, og_image_url: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="1200x630px recommended"
              />
              <button
                onClick={() => setShowAssetPicker('og')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <ImageIcon size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OG Type</label>
            <select
              value={settings.og_type || 'website'}
              onChange={(e) => setSettings({ ...settings, og_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="website">Website</option>
              <option value="article">Article</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Code size={20} className="text-blue-600" />
          Twitter Card
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Title</label>
            <input
              type="text"
              value={settings.twitter_title || ''}
              onChange={(e) => setSettings({ ...settings, twitter_title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to use OG Title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter Card Type
            </label>
            <select
              value={settings.twitter_card_type || 'summary_large_image'}
              onChange={(e) => setSettings({ ...settings, twitter_card_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">Summary Large Image</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Site</label>
            <input
              type="text"
              value={settings.twitter_site || ''}
              onChange={(e) => setSettings({ ...settings, twitter_site: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="@yourbrand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter Creator
            </label>
            <input
              type="text"
              value={settings.twitter_creator || ''}
              onChange={(e) => setSettings({ ...settings, twitter_creator: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="@author"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Image</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={settings.twitter_image_url || ''}
              onChange={(e) => setSettings({ ...settings, twitter_image_url: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty to use OG Image"
            />
            <button
              onClick={() => setShowAssetPicker('twitter')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <ImageIcon size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Twitter Description
          </label>
          <textarea
            value={settings.twitter_description || ''}
            onChange={(e) => setSettings({ ...settings, twitter_description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Leave empty to use OG Description"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>SEO Tips:</strong> Use unique, descriptive titles and descriptions for each page.
          Include your primary keyword naturally. Add high-quality images with proper dimensions
          (1200x630px for Open Graph). Test your meta tags using{' '}
          <a
            href="https://cards-dev.twitter.com/validator"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Twitter
          </a>{' '}
          and{' '}
          <a
            href="https://developers.facebook.com/tools/debug/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Facebook
          </a>{' '}
          validators.
        </p>
      </div>
    </div>
  );
}
