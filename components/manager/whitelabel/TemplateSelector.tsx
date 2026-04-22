import React, { useState, useEffect } from 'react';
import { Check, Loader, Sparkles } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
}

interface TemplateSelectorProps {
  onTemplateApplied?: () => void;
}

export function TemplateSelector({ onTemplateApplied }: TemplateSelectorProps) {
  const { tenantId } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_templates')
        .select('id, name, slug, description, category, theme')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyTemplate(templateId: string, templateName: string) {
    if (!tenantId) return;

    if (!confirm(`Apply the "${templateName}" template? This will replace your current homepage content.`)) {
      return;
    }

    try {
      setApplying(templateId);
      setError(null);
      setSuccess(null);

      const { data, error } = await supabase.rpc('apply_template_to_tenant', {
        p_template_id: templateId,
        p_tenant_id: tenantId,
        p_page_slug: 'home',
      });

      if (error) throw error;

      setSuccess(`"${templateName}" template applied successfully!`);
      setTimeout(() => setSuccess(null), 5000);

      if (onTemplateApplied) {
        onTemplateApplied();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(null);
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
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Quick Start Templates</h3>
          <p className="text-sm text-gray-600">Choose a template to get started quickly</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={20} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-all"
          >
            <div
              className="h-32 flex items-center justify-center text-white text-2xl font-bold"
              style={{
                background: `linear-gradient(135deg, ${template.theme.colors.primary} 0%, ${template.theme.colors.accent} 100%)`,
              }}
            >
              {template.name}
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                  <span className="inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded mt-1">
                    {template.category}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{template.description}</p>

              <div className="flex gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: template.theme.colors.primary }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: template.theme.colors.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-8 h-8 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: template.theme.colors.accent }}
                  title="Accent"
                />
              </div>

              <button
                onClick={() => applyTemplate(template.id, template.name)}
                disabled={applying === template.id}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {applying === template.id ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Use Template
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Applying a template will replace your current homepage content. Your theme settings will also be updated. Other pages will remain unchanged.
        </p>
      </div>
    </div>
  );
}
