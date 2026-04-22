import React, { useState, useEffect } from 'react';
import { Mail, Plus, CreditCard as Edit2, Copy, Trash2, Eye, Save, X, Palette } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useTenantInfo } from '@/lib/hooks';

interface InvitationTemplate {
  id: string;
  template_name: string;
  template_type: 'staff_invitation' | 'client_invitation' | 'reminder' | 'welcome';
  is_default: boolean;
  subject_line: string;
  preview_text: string;
  header_text: string;
  greeting_text: string;
  body_text: string;
  cta_text: string;
  footer_text: string;
  design_config: {
    header_bg_color: string;
    header_text_color: string;
    body_bg_color: string;
    body_text_color: string;
    accent_color: string;
    button_bg_color: string;
    button_text_color: string;
    font_family: string;
    font_size: number;
  };
  status: string;
  created_at: string;
}

export default function InvitationTemplateManager() {
  const { tenantInfo } = useTenantInfo();
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvitationTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    template_name: '',
    template_type: 'client_invitation' as InvitationTemplate['template_type'],
    is_default: false,
    subject_line: '',
    preview_text: '',
    header_text: '',
    greeting_text: '',
    body_text: '',
    cta_text: 'Accept Invitation',
    footer_text: '',
    header_bg_color: '#0891b2',
    header_text_color: '#ffffff',
    body_bg_color: '#ffffff',
    body_text_color: '#333333',
    accent_color: '#0891b2',
    button_bg_color: '#0891b2',
    button_text_color: '#ffffff',
    font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
        .from('invitation_templates')
        .select('*')
        .eq('tenant_id', tenantInfo.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantInfo?.id || !formData.template_name) {
      setError('Please fill in template name');
      return;
    }

    try {
      const designConfig = {
        header_bg_color: formData.header_bg_color,
        header_text_color: formData.header_text_color,
        body_bg_color: formData.body_bg_color,
        body_text_color: formData.body_text_color,
        accent_color: formData.accent_color,
        button_bg_color: formData.button_bg_color,
        button_text_color: formData.button_text_color,
        font_family: formData.font_family,
        font_size: formData.font_size,
      };

      const templateData = {
        tenant_id: tenantInfo.id,
        template_name: formData.template_name,
        template_type: formData.template_type,
        is_default: formData.is_default,
        subject_line: formData.subject_line,
        preview_text: formData.preview_text,
        header_text: formData.header_text,
        greeting_text: formData.greeting_text,
        body_text: formData.body_text,
        cta_text: formData.cta_text,
        footer_text: formData.footer_text,
        design_config: designConfig,
        status: 'active',
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('invitation_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invitation_templates')
          .insert(templateData);

        if (error) throw error;
      }

      resetForm();
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const editTemplate = (template: InvitationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      is_default: template.is_default,
      subject_line: template.subject_line,
      preview_text: template.preview_text || '',
      header_text: template.header_text,
      greeting_text: template.greeting_text,
      body_text: template.body_text,
      cta_text: template.cta_text,
      footer_text: template.footer_text || '',
      header_bg_color: template.design_config.header_bg_color,
      header_text_color: template.design_config.header_text_color,
      body_bg_color: template.design_config.body_bg_color,
      body_text_color: template.design_config.body_text_color,
      accent_color: template.design_config.accent_color,
      button_bg_color: template.design_config.button_bg_color,
      button_text_color: template.design_config.button_text_color,
      font_family: template.design_config.font_family,
      font_size: template.design_config.font_size,
    });
    setShowEditor(true);
  };

  const duplicateTemplate = async (template: InvitationTemplate) => {
    try {
      const { error } = await supabase
        .from('invitation_templates')
        .insert({
          tenant_id: tenantInfo?.id,
          template_name: `${template.template_name} (Copy)`,
          template_type: template.template_type,
          is_default: false,
          subject_line: template.subject_line,
          preview_text: template.preview_text,
          header_text: template.header_text,
          greeting_text: template.greeting_text,
          body_text: template.body_text,
          cta_text: template.cta_text,
          footer_text: template.footer_text,
          design_config: template.design_config,
          status: 'active',
        });

      if (error) throw error;
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('invitation_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      template_type: 'client_invitation',
      is_default: false,
      subject_line: '',
      preview_text: '',
      header_text: '',
      greeting_text: '',
      body_text: '',
      cta_text: 'Accept Invitation',
      footer_text: '',
      header_bg_color: '#0891b2',
      header_text_color: '#ffffff',
      body_bg_color: '#ffffff',
      body_text_color: '#333333',
      accent_color: '#0891b2',
      button_bg_color: '#0891b2',
      button_text_color: '#ffffff',
      font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      font_size: 14,
    });
    setEditingTemplate(null);
    setShowEditor(false);
    setError(null);
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      staff_invitation: 'bg-blue-100 text-blue-700',
      client_invitation: 'bg-green-100 text-green-700',
      reminder: 'bg-orange-100 text-orange-700',
      welcome: 'bg-purple-100 text-purple-700',
    };
    const labels = {
      staff_invitation: 'Staff',
      client_invitation: 'Client',
      reminder: 'Reminder',
      welcome: 'Welcome',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[type as keyof typeof styles]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Template Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Template Type
                  </label>
                  <select
                    value={formData.template_type}
                    onChange={(e) => setFormData({ ...formData, template_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="client_invitation">Client Invitation</option>
                    <option value="staff_invitation">Staff Invitation</option>
                    <option value="reminder">Reminder</option>
                    <option value="welcome">Welcome</option>
                  </select>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Set as default template for this type</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={formData.subject_line}
                    onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                    placeholder="You're invited to join {{tenant_name}}"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Variables: {'{{tenant_name}}'}, {'{{recipient_name}}'}, {'{{role}}'}, {'{{custom_message}}'}
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
                    placeholder="This appears in email preview..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Header Text
                  </label>
                  <input
                    type="text"
                    value={formData.header_text}
                    onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                    placeholder="Welcome to the Team"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Greeting
                  </label>
                  <input
                    type="text"
                    value={formData.greeting_text}
                    onChange={(e) => setFormData({ ...formData, greeting_text: e.target.value })}
                    placeholder="Hello {{recipient_name}},"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Body Content (HTML supported)
                  </label>
                  <textarea
                    value={formData.body_text}
                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                    rows={8}
                    placeholder="<p>You've been invited...</p>"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Footer Text (HTML supported)
                  </label>
                  <textarea
                    value={formData.footer_text}
                    onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    rows={3}
                    placeholder="<p>Best regards,<br><strong>The Team</strong></p>"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                <Palette className="w-5 h-5" />
                Design Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Header Background
                  </label>
                  <input
                    type="color"
                    value={formData.header_bg_color}
                    onChange={(e) => setFormData({ ...formData, header_bg_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Header Text
                  </label>
                  <input
                    type="color"
                    value={formData.header_text_color}
                    onChange={(e) => setFormData({ ...formData, header_text_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Body Background
                  </label>
                  <input
                    type="color"
                    value={formData.body_bg_color}
                    onChange={(e) => setFormData({ ...formData, body_bg_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Body Text
                  </label>
                  <input
                    type="color"
                    value={formData.body_text_color}
                    onChange={(e) => setFormData({ ...formData, body_text_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Button Background
                  </label>
                  <input
                    type="color"
                    value={formData.button_bg_color}
                    onChange={(e) => setFormData({ ...formData, button_bg_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Button Text
                  </label>
                  <input
                    type="color"
                    value={formData.button_text_color}
                    onChange={(e) => setFormData({ ...formData, button_text_color: e.target.value })}
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
                  style={{
                    backgroundColor: formData.header_bg_color,
                    color: formData.header_text_color,
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                    {formData.header_text || 'Header Text'}
                  </h1>
                </div>

                <div
                  style={{
                    backgroundColor: formData.body_bg_color,
                    color: formData.body_text_color,
                    padding: '24px',
                    fontFamily: formData.font_family,
                    fontSize: `${formData.font_size}px`,
                  }}
                >
                  <p style={{ marginTop: 0 }}>{formData.greeting_text || 'Greeting'}</p>
                  <div dangerouslySetInnerHTML={{ __html: formData.body_text || '<p>Body content...</p>' }} />

                  <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <a
                      href="#"
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: formData.button_bg_color,
                        color: formData.button_text_color,
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                      }}
                    >
                      {formData.cta_text}
                    </a>
                  </div>

                  {formData.footer_text && (
                    <div dangerouslySetInnerHTML={{ __html: formData.footer_text }} />
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
          <h2 className="text-2xl font-bold text-slate-900">Invitation Templates</h2>
          <p className="text-slate-600">Customize email templates for staff and client invitations</p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{template.template_name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {getTypeBadge(template.template_type)}
                  {template.is_default && (
                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                      Default
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm">
                <span className="text-slate-600">Subject:</span>
                <span className="text-slate-900 ml-2 font-medium">{template.subject_line}</span>
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
            <p className="mb-4">No custom templates created yet</p>
            <p className="text-sm mb-4">System default templates are being used</p>
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
