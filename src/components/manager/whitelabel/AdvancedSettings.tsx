import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Save, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface AnalyticsSettings {
  google_analytics_id: string;
  google_tag_manager_id: string;
  facebook_pixel_id: string;
  plausible_domain: string;
  hotjar_site_id: string;
  custom_header_scripts: string;
  custom_footer_scripts: string;
  enable_cookie_consent: boolean;
  anonymize_ip: boolean;
  is_active: boolean;
}

interface PerformanceSettings {
  enable_browser_caching: boolean;
  cache_duration_days: number;
  enable_lazy_loading: boolean;
  enable_image_optimization: boolean;
  image_quality: number;
  defer_javascript: boolean;
  minify_css: boolean;
  minify_js: boolean;
  enable_preload_fonts: boolean;
  enable_critical_css: boolean;
  cdn_url: string;
  enable_cdn: boolean;
}

export function AdvancedSettings() {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'performance' | 'sitemap'>('analytics');
  const [analytics, setAnalytics] = useState<Partial<AnalyticsSettings>>({
    enable_cookie_consent: true,
    anonymize_ip: true,
    is_active: true,
  });
  const [performance, setPerformance] = useState<Partial<PerformanceSettings>>({
    enable_browser_caching: true,
    cache_duration_days: 7,
    enable_lazy_loading: true,
    enable_image_optimization: true,
    image_quality: 85,
    defer_javascript: true,
    minify_css: true,
    minify_js: true,
    enable_preload_fonts: true,
    enable_critical_css: false,
    enable_cdn: false,
  });
  const [sitemapXml, setSitemapXml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSitemap, setGeneratingSitemap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadSettings();
    }
  }, [tenantId]);

  async function loadSettings() {
    try {
      setLoading(true);

      const [analyticsRes, performanceRes] = await Promise.all([
        supabase.from('website_analytics').select('*').eq('tenant_id', tenantId).maybeSingle(),
        supabase
          .from('website_performance_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]);

      if (analyticsRes.error) throw analyticsRes.error;
      if (performanceRes.error) throw performanceRes.error;

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }

      if (performanceRes.data) {
        setPerformance(performanceRes.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAnalytics() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase.from('website_analytics').upsert(
        {
          tenant_id: tenantId,
          ...analytics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      );

      if (error) throw error;

      setSuccess('Analytics settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePerformance() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase.from('website_performance_settings').upsert(
        {
          tenant_id: tenantId,
          ...performance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      );

      if (error) throw error;

      setSuccess('Performance settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateSitemap() {
    try {
      setGeneratingSitemap(true);
      setError(null);

      const { data, error } = await supabase.rpc('generate_sitemap_xml', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;

      setSitemapXml(data);
      setSuccess('Sitemap generated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingSitemap(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Advanced Settings</h3>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 size={20} />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap size={20} />
              Performance
            </button>
            <button
              onClick={() => setActiveTab('sitemap')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sitemap'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText size={20} />
              Sitemap
            </button>
          </nav>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
              <CheckCircle size={20} />
              {success}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Connect analytics and tracking tools to your website
                </p>
                <button
                  onClick={saveAnalytics}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save Analytics'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Analytics ID
                  </label>
                  <input
                    type="text"
                    value={analytics.google_analytics_id || ''}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, google_analytics_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Tag Manager ID
                  </label>
                  <input
                    type="text"
                    value={analytics.google_tag_manager_id || ''}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, google_tag_manager_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="GTM-XXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={analytics.facebook_pixel_id || ''}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, facebook_pixel_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plausible Domain
                  </label>
                  <input
                    type="text"
                    value={analytics.plausible_domain || ''}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, plausible_domain: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="yourdomain.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hotjar Site ID
                  </label>
                  <input
                    type="text"
                    value={analytics.hotjar_site_id || ''}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, hotjar_site_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Header Scripts
                </label>
                <textarea
                  value={analytics.custom_header_scripts || ''}
                  onChange={(e) =>
                    setAnalytics({ ...analytics, custom_header_scripts: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="<script><!-- Your custom scripts --></script>"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Footer Scripts
                </label>
                <textarea
                  value={analytics.custom_footer_scripts || ''}
                  onChange={(e) =>
                    setAnalytics({ ...analytics, custom_footer_scripts: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="<script><!-- Your custom scripts --></script>"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analytics.enable_cookie_consent ?? true}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, enable_cookie_consent: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Cookie Consent Banner
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analytics.anonymize_ip ?? true}
                    onChange={(e) =>
                      setAnalytics({ ...analytics, anonymize_ip: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Anonymize IP Addresses (GDPR compliant)
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analytics.is_active ?? true}
                    onChange={(e) => setAnalytics({ ...analytics, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Analytics Tracking
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Optimize your website's performance and loading speed
                </p>
                <button
                  onClick={savePerformance}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save Performance'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Caching</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.enable_browser_caching ?? true}
                      onChange={(e) =>
                        setPerformance({ ...performance, enable_browser_caching: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Enable Browser Caching</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cache Duration (days)
                    </label>
                    <input
                      type="number"
                      value={performance.cache_duration_days ?? 7}
                      onChange={(e) =>
                        setPerformance({
                          ...performance,
                          cache_duration_days: parseInt(e.target.value),
                        })
                      }
                      min={1}
                      max={365}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Images</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.enable_lazy_loading ?? true}
                      onChange={(e) =>
                        setPerformance({ ...performance, enable_lazy_loading: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Enable Lazy Loading</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.enable_image_optimization ?? true}
                      onChange={(e) =>
                        setPerformance({
                          ...performance,
                          enable_image_optimization: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Optimize Image Quality</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image Quality (%)
                    </label>
                    <input
                      type="number"
                      value={performance.image_quality ?? 85}
                      onChange={(e) =>
                        setPerformance({
                          ...performance,
                          image_quality: parseInt(e.target.value),
                        })
                      }
                      min={1}
                      max={100}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Scripts & Styles</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.defer_javascript ?? true}
                      onChange={(e) =>
                        setPerformance({ ...performance, defer_javascript: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Defer JavaScript Loading</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.minify_css ?? true}
                      onChange={(e) =>
                        setPerformance({ ...performance, minify_css: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Minify CSS</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.minify_js ?? true}
                      onChange={(e) =>
                        setPerformance({ ...performance, minify_js: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Minify JavaScript</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Advanced</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.enable_preload_fonts ?? true}
                      onChange={(e) =>
                        setPerformance({ ...performance, enable_preload_fonts: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Preload Fonts</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.enable_critical_css ?? false}
                      onChange={(e) =>
                        setPerformance({ ...performance, enable_critical_css: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Extract Critical CSS</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={performance.enable_cdn ?? false}
                      onChange={(e) =>
                        setPerformance({ ...performance, enable_cdn: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Enable CDN</span>
                  </label>

                  {performance.enable_cdn && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CDN URL
                      </label>
                      <input
                        type="url"
                        value={performance.cdn_url || ''}
                        onChange={(e) =>
                          setPerformance({ ...performance, cdn_url: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="https://cdn.example.com"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sitemap' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Generate an XML sitemap for search engines
                </p>
                <button
                  onClick={generateSitemap}
                  disabled={generatingSitemap}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <FileText size={20} />
                  {generatingSitemap ? 'Generating...' : 'Generate Sitemap'}
                </button>
              </div>

              {sitemapXml && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">sitemap.xml</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(sitemapXml);
                        setSuccess('Sitemap copied to clipboard!');
                        setTimeout(() => setSuccess(null), 2000);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-gray-900 bg-white overflow-x-auto max-h-96">
                    {sitemapXml}
                  </pre>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 mb-2">About Sitemaps</h5>
                <p className="text-sm text-blue-900">
                  A sitemap helps search engines discover and index your website pages. Once
                  generated, submit it to Google Search Console and Bing Webmaster Tools for better
                  SEO.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
