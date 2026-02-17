import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Save, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface ContentSection {
  id?: string;
  section_type: 'hero' | 'features' | 'about' | 'contact' | 'custom';
  section_order: number;
  content: any;
  is_published: boolean;
}

interface Page {
  id?: string;
  slug: string;
  title: string;
  meta_description: string;
  is_published: boolean;
  show_in_nav: boolean;
  template_type: string;
}

const sectionTypes = [
  { value: 'hero', label: 'Hero Section', description: 'Large headline with call-to-action' },
  { value: 'features', label: 'Features', description: 'Grid of features or services' },
  { value: 'about', label: 'About', description: 'About your company' },
  { value: 'contact', label: 'Contact', description: 'Contact information and form' },
  { value: 'custom', label: 'Custom Content', description: 'Custom HTML/text content' },
];

export default function PageContentBuilder() {
  const { tenantId } = useAuth();
  const [selectedPage, setSelectedPage] = useState<string>('home');
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadSections();
    } else {
      setLoading(false);
    }
  }, [tenantId, selectedPage]);

  const loadSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_content')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('page_slug', selectedPage)
        .order('section_order');

      if (error) throw error;
      setSections(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSection = (type: string) => {
    const newSection: ContentSection = {
      section_type: type as any,
      section_order: sections.length,
      is_published: false,
      content: getDefaultContent(type),
    };
    setSections([...sections, newSection]);
    setShowAddSection(false);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'hero':
        return {
          headline: 'Welcome to Our Platform',
          subheadline: 'Transform your business with our innovative solutions',
          cta_text: 'Get Started',
          cta_link: '#',
          background_image: '',
        };
      case 'features':
        return {
          title: 'Our Features',
          description: 'Everything you need to succeed',
          features: [
            {
              icon: 'star',
              title: 'Feature One',
              description: 'Description of feature one',
            },
            {
              icon: 'zap',
              title: 'Feature Two',
              description: 'Description of feature two',
            },
            {
              icon: 'shield',
              title: 'Feature Three',
              description: 'Description of feature three',
            },
          ],
        };
      case 'about':
        return {
          title: 'About Us',
          content: 'Tell your story here...',
          image: '',
        };
      case 'contact':
        return {
          title: 'Get In Touch',
          email: 'contact@example.com',
          phone: '+1 (555) 123-4567',
          address: '123 Main St, City, State 12345',
          show_form: true,
        };
      case 'custom':
        return {
          html: '<div class="text-center"><h2>Custom Section</h2><p>Add your content here</p></div>',
        };
      default:
        return {};
    }
  };

  const updateSection = (index: number, updates: Partial<ContentSection>) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    setSections(updated);
  };

  const updateSectionContent = (index: number, contentKey: string, value: any) => {
    const updated = [...sections];
    updated[index] = {
      ...updated[index],
      content: {
        ...updated[index].content,
        [contentKey]: value,
      },
    };
    setSections(updated);
  };

  const deleteSection = (index: number) => {
    if (!confirm('Delete this section?')) return;
    const updated = sections.filter((_, i) => i !== index);
    updated.forEach((section, i) => {
      section.section_order = i;
    });
    setSections(updated);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const updated = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((section, i) => {
      section.section_order = i;
    });
    setSections(updated);
  };

  const saveSections = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await supabase
        .from('website_content')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('page_slug', selectedPage);

      if (sections.length > 0) {
        const { error } = await supabase.from('website_content').insert(
          sections.map((section) => ({
            tenant_id: tenantId,
            page_slug: selectedPage,
            section_type: section.section_type,
            section_order: section.section_order,
            content: section.content,
            is_published: section.is_published,
          }))
        );

        if (error) throw error;
      }

      setSuccess('Page content saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      loadSections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderSectionEditor = (section: ContentSection, index: number) => {
    switch (section.section_type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Headline</label>
              <input
                type="text"
                value={section.content.headline}
                onChange={(e) => updateSectionContent(index, 'headline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subheadline</label>
              <input
                type="text"
                value={section.content.subheadline}
                onChange={(e) => updateSectionContent(index, 'subheadline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={section.content.cta_text}
                  onChange={(e) => updateSectionContent(index, 'cta_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Link
                </label>
                <input
                  type="text"
                  value={section.content.cta_link}
                  onChange={(e) => updateSectionContent(index, 'cta_link', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Image URL
              </label>
              <input
                type="text"
                value={section.content.background_image}
                onChange={(e) => updateSectionContent(index, 'background_image', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={section.content.title}
                onChange={(e) => updateSectionContent(index, 'title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={section.content.content}
                onChange={(e) => updateSectionContent(index, 'content', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="text"
                value={section.content.image}
                onChange={(e) => updateSectionContent(index, 'image', e.target.value)}
                placeholder="https://example.com/about.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={section.content.title}
                onChange={(e) => updateSectionContent(index, 'title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={section.content.email}
                  onChange={(e) => updateSectionContent(index, 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={section.content.phone}
                  onChange={(e) => updateSectionContent(index, 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={section.content.address}
                onChange={(e) => updateSectionContent(index, 'address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'custom':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">HTML Content</label>
            <textarea
              value={section.content.html}
              onChange={(e) => updateSectionContent(index, 'html', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="<div>Your HTML here</div>"
            />
          </div>
        );

      default:
        return <div>Content editor for {section.section_type}</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">No Tenant Context</h3>
          <p className="text-slate-300">
            A tenant context is required to edit page content. Please ensure you're accessing this from a valid tenant subdomain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Page Content</h2>
          <p className="text-sm text-gray-600 mt-1">
            Build your website pages with customizable sections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="home">Homepage</option>
            <option value="about">About Page</option>
            <option value="services">Services Page</option>
            <option value="contact">Contact Page</option>
          </select>
          <button
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
          <button
            onClick={saveSections}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Page'}
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

      {showAddSection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Add New Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectionTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => addSection(type.value)}
                className="text-left p-4 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50"
              >
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-600 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddSection(false)}
            className="mt-3 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <h3 className="font-medium text-gray-900">
                  {sectionTypes.find((t) => t.value === section.section_type)?.label}
                </h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.is_published}
                    onChange={(e) => updateSection(index, { is_published: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Published</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteSection(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {renderSectionEditor(section, index)}
          </div>
        ))}

        {sections.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No sections yet</h3>
            <p className="text-gray-600 mb-4">Add your first section to start building your page</p>
            <button
              onClick={() => setShowAddSection(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Section
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
