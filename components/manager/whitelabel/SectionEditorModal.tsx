import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { AssetManager } from '../AssetManager';

interface SectionEditorModalProps {
  sectionType: string;
  content: any;
  onSave: (content: any) => void;
  onClose: () => void;
}

export function SectionEditorModal({ sectionType, content, onSave, onClose }: SectionEditorModalProps) {
  const [formData, setFormData] = useState(content || {});
  const [showAssetPicker, setShowAssetPicker] = useState<string | null>(null);

  const aboutEditor = useEditor({
    extensions: [StarterKit, TiptapImage, Link],
    content: content?.text || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 border border-gray-300 rounded-lg',
      },
    },
  });

  const customEditor = useEditor({
    extensions: [StarterKit, TiptapImage, Link],
    content: content?.html || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4 border border-gray-300 rounded-lg',
      },
    },
  });

  useEffect(() => {
    return () => {
      aboutEditor?.destroy();
      customEditor?.destroy();
    };
  }, []);

  function handleSave() {
    const updatedContent = { ...formData };

    if (sectionType === 'about' && aboutEditor) {
      updatedContent.text = aboutEditor.getHTML();
    }

    if (sectionType === 'custom' && customEditor) {
      updatedContent.html = customEditor.getHTML();
    }

    onSave(updatedContent);
  }

  function handleAssetSelect(field: string, url: string) {
    setFormData({ ...formData, [field]: url });
    setShowAssetPicker(null);
  }

  function renderHeroEditor() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Headline</label>
          <input
            type="text"
            value={formData.headline || ''}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter headline..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subheadline</label>
          <textarea
            value={formData.subheadline || ''}
            onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter subheadline..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CTA Text</label>
            <input
              type="text"
              value={formData.ctaText || ''}
              onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Get Started"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CTA Link</label>
            <input
              type="text"
              value={formData.ctaLink || ''}
              onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="#contact"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.backgroundImage || ''}
              onChange={(e) => setFormData({ ...formData, backgroundImage: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Image URL..."
            />
            <button
              onClick={() => setShowAssetPicker('backgroundImage')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ImageIcon size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
          <select
            value={formData.alignment || 'center'}
            onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    );
  }

  function renderFeaturesEditor() {
    const features = formData.features || [];

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
          <input
            type="text"
            value={formData.subtitle || ''}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
          <select
            value={formData.columns || 3}
            onChange={(e) => setFormData({ ...formData, columns: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
            <option value={4}>4 Columns</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Features</label>
            <button
              onClick={() => {
                const newFeatures = [...features, { icon: 'Star', title: '', description: '' }];
                setFormData({ ...formData, features: newFeatures });
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Feature
            </button>
          </div>

          <div className="space-y-3">
            {features.map((feature: any, index: number) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={feature.icon || ''}
                    onChange={(e) => {
                      const newFeatures = [...features];
                      newFeatures[index] = { ...feature, icon: e.target.value };
                      setFormData({ ...formData, features: newFeatures });
                    }}
                    placeholder="Icon name (e.g., Star)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={feature.title || ''}
                    onChange={(e) => {
                      const newFeatures = [...features];
                      newFeatures[index] = { ...feature, title: e.target.value };
                      setFormData({ ...formData, features: newFeatures });
                    }}
                    placeholder="Feature title"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <textarea
                  value={feature.description || ''}
                  onChange={(e) => {
                    const newFeatures = [...features];
                    newFeatures[index] = { ...feature, description: e.target.value };
                    setFormData({ ...formData, features: newFeatures });
                  }}
                  placeholder="Feature description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => {
                    const newFeatures = features.filter((_: any, i: number) => i !== index);
                    setFormData({ ...formData, features: newFeatures });
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderAboutEditor() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <EditorContent editor={aboutEditor} />
          <div className="mt-2 flex gap-2 text-sm text-gray-500">
            <button
              onClick={() => aboutEditor?.chain().focus().toggleBold().run()}
              className={`px-2 py-1 rounded ${aboutEditor?.isActive('bold') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              Bold
            </button>
            <button
              onClick={() => aboutEditor?.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 rounded ${aboutEditor?.isActive('italic') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              Italic
            </button>
            <button
              onClick={() => aboutEditor?.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 rounded ${aboutEditor?.isActive('bulletList') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              Bullet List
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.image || ''}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Image URL..."
            />
            <button
              onClick={() => setShowAssetPicker('image')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ImageIcon size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image Position</label>
          <select
            value={formData.imagePosition || 'right'}
            onChange={(e) => setFormData({ ...formData, imagePosition: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    );
  }

  function renderContactEditor() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
          <input
            type="text"
            value={formData.subtitle || ''}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <textarea
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.showForm !== false}
              onChange={(e) => setFormData({ ...formData, showForm: e.target.checked })}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Show contact form</span>
          </label>
        </div>
      </div>
    );
  }

  function renderCustomEditor() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Custom HTML Content</label>
          <EditorContent editor={customEditor} />
          <div className="mt-2 flex gap-2 text-sm text-gray-500">
            <button
              onClick={() => customEditor?.chain().focus().toggleBold().run()}
              className={`px-2 py-1 rounded ${customEditor?.isActive('bold') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              Bold
            </button>
            <button
              onClick={() => customEditor?.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 rounded ${customEditor?.isActive('italic') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              Italic
            </button>
            <button
              onClick={() => customEditor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 rounded ${customEditor?.isActive('heading') ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              Heading
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
          <input
            type="text"
            value={formData.backgroundColor || ''}
            onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="#FFFFFF"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Padding</label>
          <select
            value={formData.padding || 'medium'}
            onChange={(e) => setFormData({ ...formData, padding: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Edit {sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Section
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAssetPicker ? (
            <AssetManager
              mode="picker"
              onSelectAsset={(url) => handleAssetSelect(showAssetPicker, url)}
            />
          ) : (
            <>
              {sectionType === 'hero' && renderHeroEditor()}
              {sectionType === 'features' && renderFeaturesEditor()}
              {sectionType === 'about' && renderAboutEditor()}
              {sectionType === 'contact' && renderContactEditor()}
              {sectionType === 'custom' && renderCustomEditor()}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {showAssetPicker && (
            <button
              onClick={() => setShowAssetPicker(null)}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Editor
            </button>
          )}
          {!showAssetPicker && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={20} />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
