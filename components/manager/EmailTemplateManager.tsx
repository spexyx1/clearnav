import React, { useState, useEffect } from 'react';
import { Mail, Plus, CreditCard as Edit2, Copy, Trash2, Eye, TrendingUp, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTenantInfo } from '@/lib/hooks';

interface EmailTemplate {
  id: string;
  template_name: string;
  description: string;
  category: string;
  subject_line: string;
  preview_text: string;
  html_content: string;
  plain_text_content: string;
  design_config: any;
  has_cta: boolean;
  cta_text: string;
  cta_url: string;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  times_sent: number;
  status: string;
}

export default function EmailTemplateManager() {
  const { tenantInfo } = useTenantInfo();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    category: 'cold_outreach',
    subject_line: '',
    preview_text: '',
    html_content: '',
    plain_text_content: '',
    has_cta: true,
    cta_text: 'Book a Demo',
    cta_url: '',
    background_color: '#ffffff',
    text_color: '#333333',
    link_color: '#0066cc',
    button_bg_color: '#0066cc',
    button_text_color: '#ffffff',
    font_family: 'Arial, sans-serif',
    font_size: 14,
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchTemplates();
    }
  }, [tenantInfo?.id]);

  const fetchTemplates = async () => {
    if (!tenantInfo?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_email_templates')
        .select('*')
        .eq('tenant_id', tenantInfo.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantInfo?.id || !formData.template_name) {
      alert('Please fill in template name');
      return;
    }

    try {
      const designConfig = {
        layout: 'single_column',
        width: 600,
        background_color: formData.background_color,
        font_family: formData.font_family,
        font_size: formData.font_size,
        line_height: 1.6,
        text_color: formData.text_color,
        link_color: formData.link_color,
        button_style: {
          background_color: formData.button_bg_color,
          text_color: formData.button_text_color,
          border_radius: 4,
          padding: '12px 24px',
        },
      };

      const templateData = {
        tenant_id: tenantInfo.id,
        template_name: formData.template_name,
        description: formData.description,
        category: formData.category,
        subject_line: formData.subject_line,
        preview_text: formData.preview_text,
        html_content: generateHTML(),
        plain_text_content: formData.plain_text_content,
        design_config: designConfig,
        has_cta: formData.has_cta,
        cta_text: formData.cta_text,
        cta_url: formData.cta_url,
        status: 'active',
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('ai_email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_email_templates')
          .insert(templateData);

        if (error) throw error;
      }

      alert('Template saved successfully');
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const generateHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formData.subject_line}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${formData.font_family}; font-size: ${formData.font_size}px; line-height: 1.6; color: ${formData.text_color}; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${formData.background_color}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              ${formData.html_content}
              ${formData.has_cta ? `
              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: ${formData.button_bg_color}; padding: 12px 24px; border-radius: 4px;">
                    <a href="${formData.cta_url}" style="color: ${formData.button_text_color}; text-decoration: none; font-weight: bold; display: block;">${formData.cta_text}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="margin-top: 30px; font-size: 12px; color: #999;">
                Best regards,<br>
                {{sender_name}}<br>
                {{sender_title}} at {{sender_company}}
              </p>
            </td>
          </tr>
        </table>
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="text-align: center; font-size: 11px; color: #999;">
              <a href="{{unsubscribe_url}}" style="color: #999;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const editTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || '',
      category: template.category,
      subject_line: template.subject_line,
      preview_text: template.preview_text || '',
      html_content: template.html_content,
      plain_text_content: template.plain_text_content,
      has_cta: template.has_cta,
      cta_text: template.cta_text || '',
      cta_url: template.cta_url || '',
      background_color: template.design_config?.background_color || '#ffffff',
      text_color: template.design_config?.text_color || '#333333',
      link_color: template.design_config?.link_color || '#0066cc',
      button_bg_color: template.design_config?.button_style?.background_color || '#0066cc',
      button_text_color: template.design_config?.button_style?.text_color || '#ffffff',
      font_family: template.design_config?.font_family || 'Arial, sans-serif',
      font_size: template.design_config?.font_size || 14,
    });
    setShowEditor(true);
  };

  const duplicateTemplate = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('ai_email_templates')
        .insert({
          ...template,
          id: undefined,
          template_name: `${template.template_name} (Copy)`,
          times_sent: 0,
          times_opened: 0,
          times_clicked: 0,
          times_replied: 0,
          open_rate: 0,
          click_rate: 0,
          reply_rate: 0,
        });

      if (error) throw error;
      alert('Template duplicated');
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('ai_email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      description: '',
      category: 'cold_outreach',
      subject_line: '',
      preview_text: '',
      html_content: '',
      plain_text_content: '',
      has_cta: true,
      cta_text: 'Book a Demo',
      cta_url: '',
      background_color: '#ffffff',
      text_color: '#333333',
      link_color: '#0066cc',
      button_bg_color: '#0066cc',
      button_text_color: '#ffffff',
      font_family: 'Arial, sans-serif',
      font_size: 14,
    });
    setEditingTemplate(null);
    setShowEditor(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={resetForm}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Template Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cold_outreach">Cold Outreach</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="demo_invite">Demo Invite</option>
                    <option value="trial_nurture">Trial Nurture</option>
                    <option value="renewal">Renewal</option>
                    <option value="upsell">Upsell</option>
                    <option value="re_engagement">Re-engagement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    value={formData.subject_line}
                    onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                    placeholder="Quick question about {{company}}"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Use variables: {'{'}first_name{'}'}, {'{'}company{'}'}, {'{'}industry{'}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preview Text
                  </label>
                  <input
                    type="text"
                    value={formData.preview_text}
                    onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                    placeholder="This appears in inbox preview..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Content *
                  </label>
                  <textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    rows={10}
                    placeholder="Hi {{first_name}},&#10;&#10;I noticed {{company}} is..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Call to Action</h3>

              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_cta}
                    onChange={(e) => setFormData({ ...formData, has_cta: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Include CTA Button</span>
                </label>

                {formData.has_cta && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={formData.cta_text}
                        onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Button URL
                      </label>
                      <input
                        type="url"
                        value={formData.cta_url}
                        onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                        placeholder="https://calendly.com/..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Design Settings</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Link Color
                  </label>
                  <input
                    type="color"
                    value={formData.link_color}
                    onChange={(e) => setFormData({ ...formData, link_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Button Color
                  </label>
                  <input
                    type="color"
                    value={formData.button_bg_color}
                    onChange={(e) => setFormData({ ...formData, button_bg_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-3 py-1 text-sm rounded ${previewMode === 'desktop' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-3 py-1 text-sm rounded ${previewMode === 'mobile' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Mobile
                  </button>
                </div>
              </div>

              <div className={`border border-slate-200 rounded-lg overflow-hidden ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
                <div className="bg-slate-100 p-3 border-b border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">{formData.subject_line || 'Subject Line'}</div>
                  {formData.preview_text && (
                    <div className="text-xs text-slate-600 mt-1">{formData.preview_text}</div>
                  )}
                </div>

                <div
                  className="p-6"
                  style={{
                    backgroundColor: formData.background_color,
                    color: formData.text_color,
                    fontFamily: formData.font_family,
                    fontSize: `${formData.font_size}px`,
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: formData.html_content.replace(/\n/g, '<br />') }} />

                  {formData.has_cta && (
                    <div className="mt-6">
                      <a
                        href={formData.cta_url}
                        style={{
                          backgroundColor: formData.button_bg_color,
                          color: formData.button_text_color,
                          padding: '12px 24px',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontWeight: 'bold',
                        }}
                      >
                        {formData.cta_text}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Email Templates</h2>
          <p className="text-slate-600">Create and manage email templates for AI outreach</p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{template.template_name}</h3>
                <p className="text-sm text-slate-600">{template.description}</p>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded mt-2">
                  {template.category.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm">
                <span className="text-slate-600">Subject:</span>
                <span className="text-slate-900 ml-2 font-medium">{template.subject_line}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{template.open_rate}%</div>
                  <div className="text-xs text-slate-600">Open Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{template.click_rate}%</div>
                  <div className="text-xs text-slate-600">Click Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{template.reply_rate}%</div>
                  <div className="text-xs text-slate-600">Reply Rate</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 text-center pt-2">
                Sent {template.times_sent} times
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => editTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => duplicateTemplate(template)}
                className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteTemplate(template.id)}
                className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="mb-4">No templates created yet</p>
            <button
              onClick={() => setShowEditor(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Your First Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}