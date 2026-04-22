import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Plus, Trash2, Save, GripVertical, CreditCard as Edit, Eye, EyeOff, Sparkles } from 'lucide-react';
import { createClient as _mkClient } from '@/lib/supabase/client';
const supabase = _mkClient();;
import { useAuth } from '@/lib/auth';
import { SectionEditorModal } from './SectionEditorModal';
import { TemplateSelector } from './TemplateSelector';

interface ContentSection {
  id: string;
  section_type: 'hero' | 'features' | 'about' | 'contact' | 'custom';
  section_order: number;
  content: any;
  is_published: boolean;
}

const sectionTypes = [
  { value: 'hero', label: 'Hero Section', icon: '🎯', description: 'Large headline with call-to-action' },
  { value: 'features', label: 'Features', icon: '⭐', description: 'Grid of features or services' },
  { value: 'about', label: 'About', icon: '📖', description: 'About your company' },
  { value: 'contact', label: 'Contact', icon: '📧', description: 'Contact information and form' },
  { value: 'custom', label: 'Custom', icon: '✏️', description: 'Custom HTML/text content' },
];

function SortableSection({ section, onEdit, onDelete, onTogglePublish }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sectionType = sectionTypes.find((t) => t.value === section.section_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-lg"
        >
          <GripVertical size={20} className="text-gray-400" />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-2xl">{sectionType?.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{sectionType?.label}</h3>
            <p className="text-sm text-gray-500">{sectionType?.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTogglePublish(section.id)}
            className={`p-2 rounded-lg transition-colors ${
              section.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={section.is_published ? 'Published' : 'Draft'}
          >
            {section.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          <button
            onClick={() => onEdit(section)}
            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Edit size={18} />
          </button>

          <button
            onClick={() => onDelete(section.id)}
            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="mt-3 pl-11 text-sm text-gray-600">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          {section.section_type === 'hero' && (
            <div>
              <strong>{section.content.headline || 'No headline'}</strong>
              <p className="text-xs mt-1">{section.content.subheadline || 'No subheadline'}</p>
            </div>
          )}
          {section.section_type === 'features' && (
            <div>
              <strong>{section.content.title || 'No title'}</strong>
              <p className="text-xs mt-1">{section.content.features?.length || 0} features</p>
            </div>
          )}
          {section.section_type === 'about' && (
            <div>
              <strong>{section.content.title || 'No title'}</strong>
              <p className="text-xs mt-1">About section content</p>
            </div>
          )}
          {section.section_type === 'contact' && (
            <div>
              <strong>{section.content.title || 'Contact Us'}</strong>
              <p className="text-xs mt-1">{section.content.email || 'No email'}</p>
            </div>
          )}
          {section.section_type === 'custom' && (
            <div>
              <strong>Custom HTML</strong>
              <p className="text-xs mt-1">Custom content section</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VisualPageBuilder() {
  const { tenantId } = useAuth();
  const [selectedPage, setSelectedPage] = useState<string>('home');
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingSection, setEditingSection] = useState<ContentSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (tenantId) {
      loadSections();
    } else {
      setLoading(false);
    }
  }, [tenantId, selectedPage]);

  async function loadSections() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_content')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('page_slug', selectedPage)
        .order('section_order');

      if (error) throw error;

      const sectionsWithIds = (data || []).map((section, index) => ({
        ...section,
        id: section.id || `temp-${index}`,
      }));

      setSections(sectionsWithIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getDefaultContent(type: string) {
    switch (type) {
      case 'hero':
        return {
          headline: 'Welcome to Our Platform',
          subheadline: 'Transform your business with our innovative solutions',
          ctaText: 'Get Started',
          ctaLink: '#contact',
          alignment: 'center',
        };
      case 'features':
        return {
          title: 'Our Features',
          subtitle: 'Everything you need to succeed',
          columns: 3,
          features: [
            { icon: 'Star', title: 'Feature One', description: 'Description of feature one' },
            { icon: 'Zap', title: 'Feature Two', description: 'Description of feature two' },
            { icon: 'Shield', title: 'Feature Three', description: 'Description of feature three' },
          ],
        };
      case 'about':
        return {
          title: 'About Us',
          text: '<p>Tell your story here...</p>',
          imagePosition: 'right',
        };
      case 'contact':
        return {
          title: 'Get In Touch',
          subtitle: 'We\'d love to hear from you',
          email: 'contact@example.com',
          phone: '+1 (555) 123-4567',
          address: '123 Main St, City, State 12345',
          showForm: true,
        };
      case 'custom':
        return {
          html: '<div class="text-center"><h2>Custom Section</h2><p>Add your content here</p></div>',
          padding: 'medium',
        };
      default:
        return {};
    }
  }

  function addSection(type: string) {
    const newSection: ContentSection = {
      id: `temp-${Date.now()}`,
      section_type: type as any,
      section_order: sections.length,
      is_published: false,
      content: getDefaultContent(type),
    };
    setSections([...sections, newSection]);
    setShowAddSection(false);
    setEditingSection(newSection);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({
          ...item,
          section_order: index,
        }));
      });
    }
  }

  function handleTogglePublish(id: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, is_published: !section.is_published } : section
      )
    );
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this section?')) return;

    setSections((prev) => {
      const filtered = prev.filter((section) => section.id !== id);
      return filtered.map((section, index) => ({
        ...section,
        section_order: index,
      }));
    });
  }

  function handleSaveSection(content: any) {
    if (!editingSection) return;

    setSections((prev) =>
      prev.map((section) =>
        section.id === editingSection.id ? { ...section, content } : section
      )
    );

    setEditingSection(null);
  }

  async function saveSections() {
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

      setSuccess('Page saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await loadSections();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tenant Context</h3>
          <p className="text-gray-600">
            A tenant context is required to edit page content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Visual Page Builder</h2>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop sections to build your website
          </p>
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
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles size={20} />
            Templates
          </button>
          <button
            onClick={() => setShowAddSection(!showAddSection)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Section
          </button>
          <button
            onClick={saveSections}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="bg-white rounded-lg border-2 border-purple-200 p-6">
          <TemplateSelector
            onTemplateApplied={() => {
              setShowTemplates(false);
              loadSections();
            }}
          />
        </div>
      )}

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
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-lg">Add New Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {sectionTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => addSection(type.value)}
                className="text-center p-6 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="text-4xl mb-2">{type.icon}</div>
                <div className="font-semibold text-gray-900 text-sm">{type.label}</div>
                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddSection(false)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sections yet</h3>
            <p className="text-gray-600 mb-6">Add your first section to start building your page</p>
            <button
              onClick={() => setShowAddSection(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Section
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  onEdit={setEditingSection}
                  onDelete={handleDelete}
                  onTogglePublish={handleTogglePublish}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editingSection && (
        <SectionEditorModal
          sectionType={editingSection.section_type}
          content={editingSection.content}
          onSave={handleSaveSection}
          onClose={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}
