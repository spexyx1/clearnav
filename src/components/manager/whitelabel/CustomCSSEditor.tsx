import React, { useState, useEffect } from 'react';
import { Code, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

export function CustomCSSEditor() {
  const { tenantId } = useAuth();
  const [css, setCss] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadCSS();
    }
  }, [tenantId]);

  async function loadCSS() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_custom_css')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCss(data.custom_css || '');
        setIsActive(data.is_active);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveCSS() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { error } = await supabase.from('website_custom_css').upsert(
        {
          tenant_id: tenantId,
          custom_css: css,
          compiled_css: css,
          is_active: isActive,
          last_published_at: isActive ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      );

      if (error) throw error;

      setSuccess('Custom CSS saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const exampleSnippets = [
    {
      name: 'Custom Font',
      code: `/* Import custom font */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

body {
  font-family: 'Poppins', sans-serif;
}`,
    },
    {
      name: 'Custom Colors',
      code: `/* Override theme colors */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
  --accent-color: #ec4899;
}

.btn-primary {
  background-color: var(--primary-color);
}`,
    },
    {
      name: 'Custom Animations',
      code: `/* Fade in animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.section {
  animation: fadeIn 0.6s ease-out;
}`,
    },
    {
      name: 'Custom Spacing',
      code: `/* Adjust section spacing */
.section {
  padding: 4rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}`,
    },
  ];

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
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Custom CSS</h3>
            <p className="text-sm text-gray-600">Add custom styles to your website</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Enable Custom CSS</span>
          </label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showPreview ? <EyeOff size={20} /> : <Eye size={20} />}
            {showPreview ? 'Hide' : 'Show'} Examples
          </button>
          <button
            onClick={saveCSS}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save CSS'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {showPreview && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">CSS Examples</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exampleSnippets.map((snippet) => (
              <div key={snippet.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{snippet.name}</h5>
                  <button
                    onClick={() => setCss(css + '\n\n' + snippet.code)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Insert
                  </button>
                </div>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Code size={16} />
              <span>style.css</span>
              <span className="text-xs text-gray-400">
                ({css.split('\n').length} lines, {css.length} characters)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>CSS3</span>
            </div>
          </div>
        </div>

        <textarea
          value={css}
          onChange={(e) => setCss(e.target.value)}
          className="w-full h-96 p-4 font-mono text-sm text-gray-900 bg-white focus:outline-none resize-none"
          placeholder={`/* Add your custom CSS here */

/* Example: Change primary button color */
.btn-primary {
  background-color: #3b82f6;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
}

/* Example: Add custom section styling */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 20px;
  color: white;
}

/* Your styles... */`}
          spellCheck={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <CheckCircle size={16} />
            Best Practices
          </h5>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>Use CSS custom properties (variables) for consistency</li>
            <li>Add comments to explain complex styles</li>
            <li>Follow a consistent naming convention</li>
            <li>Use specific selectors to avoid conflicts</li>
            <li>Test on different screen sizes</li>
          </ul>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h5 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            Important Notes
          </h5>
          <ul className="text-sm text-orange-900 space-y-1">
            <li>Custom CSS is applied after theme styles</li>
            <li>Use <code className="bg-orange-100 px-1 rounded">!important</code> sparingly</li>
            <li>Test thoroughly before publishing</li>
            <li>Invalid CSS may break your site</li>
            <li>Toggle off if issues occur</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h5 className="font-semibold text-gray-900 mb-3">Common Selectors</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.hero-section</code>
            <div className="text-xs text-gray-600 mt-1">Hero section</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.features-grid</code>
            <div className="text-xs text-gray-600 mt-1">Features grid</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.nav-header</code>
            <div className="text-xs text-gray-600 mt-1">Navigation header</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.footer</code>
            <div className="text-xs text-gray-600 mt-1">Footer section</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.btn</code>
            <div className="text-xs text-gray-600 mt-1">All buttons</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.btn-primary</code>
            <div className="text-xs text-gray-600 mt-1">Primary button</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.container</code>
            <div className="text-xs text-gray-600 mt-1">Content container</div>
          </div>
          <div className="bg-white p-3 rounded border border-gray-200">
            <code className="text-blue-600">.section</code>
            <div className="text-xs text-gray-600 mt-1">All sections</div>
          </div>
        </div>
      </div>
    </div>
  );
}
