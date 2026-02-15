import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { usePlatform } from '../../lib/platformContext';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CreatePostModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({ categories, onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();
  const { currentTenant } = usePlatform();

  const [formData, setFormData] = useState({
    category_id: categories[0]?.id || '',
    post_type: 'discussion',
    title: '',
    content: '',
    tags: '',
    marketplace_price: '',
    marketplace_currency: 'USD',
    job_location: '',
    job_type: 'full-time' as const,
    job_salary_range: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setSubmitting(true);

    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const postData: any = {
      author_user_id: user.id,
      author_tenant_id: currentTenant?.id || null,
      category_id: formData.category_id,
      post_type: formData.post_type,
      title: formData.title,
      content: formData.content,
      tags,
      status: 'active'
    };

    if (formData.post_type === 'marketplace' && formData.marketplace_price) {
      postData.marketplace_price = parseFloat(formData.marketplace_price);
      postData.marketplace_currency = formData.marketplace_currency;
    }

    if (formData.post_type === 'job') {
      postData.job_location = formData.job_location;
      postData.job_type = formData.job_type;
      postData.job_salary_range = formData.job_salary_range;
    }

    const { error } = await supabase
      .from('community_posts')
      .insert(postData);

    if (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } else {
      onSuccess();
    }

    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create New Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Post Type
            </label>
            <select
              value={formData.post_type}
              onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="discussion">Discussion</option>
              <option value="question">Question</option>
              <option value="marketplace">Marketplace Listing</option>
              <option value="job">Job Posting</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a descriptive title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your thoughts, questions, or details..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          {formData.post_type === 'marketplace' && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
              <h3 className="font-medium text-amber-900">Marketplace Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.marketplace_price}
                    onChange={(e) => setFormData({ ...formData, marketplace_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.marketplace_currency}
                    onChange={(e) => setFormData({ ...formData, marketplace_currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {formData.post_type === 'job' && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
              <h3 className="font-medium text-purple-900">Job Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  value={formData.job_type}
                  onChange={(e) => setFormData({ ...formData, job_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.job_location}
                  onChange={(e) => setFormData({ ...formData, job_location: e.target.value })}
                  placeholder="e.g., New York, NY or Remote"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary Range (optional)
                </label>
                <input
                  type="text"
                  value={formData.job_salary_range}
                  onChange={(e) => setFormData({ ...formData, job_salary_range: e.target.value })}
                  placeholder="e.g., $80,000 - $120,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., nav-calculation, compliance, reporting"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add relevant tags to help others find your post
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post to Community'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
