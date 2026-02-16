import { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, MessageSquare, ThumbsUp, Bookmark, Share2, MoreVertical, ChevronDown, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { sanitizeText } from '../../lib/sanitize';
import CreatePostModal from './CreatePostModal';
import PostDetail from './PostDetail';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  post_count: number;
}

interface Post {
  id: string;
  author_user_id: string;
  author_tenant_id: string | null;
  category_id: string;
  post_type: string;
  title: string;
  content: string;
  tags: string[];
  view_count: number;
  comment_count: number;
  reaction_count: number;
  is_pinned: boolean;
  marketplace_price: number | null;
  marketplace_currency: string | null;
  marketplace_sold: boolean;
  job_location: string | null;
  job_type: string | null;
  job_salary_range: string | null;
  job_filled: boolean;
  created_at: string;
  author_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  author_tenant?: {
    name: string;
  };
  category?: Category;
  user_reaction?: string | null;
  is_saved?: boolean;
}

export default function CommunityFeed() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'trending'>('recent');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    loadCategories();
    loadPosts();
  }, [selectedCategory, sortBy]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('community_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (!error && data) {
      setCategories(data);
    }
  };

  const loadPosts = async () => {
    setLoading(true);

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        author_profile:user_profiles_public!author_user_id(display_name, avatar_url),
        author_tenant:platform_tenants!author_tenant_id(name),
        category:community_categories!category_id(*)
      `)
      .eq('status', 'active');

    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory);
    }

    if (sortBy === 'recent') {
      query = query.order('is_pinned', { ascending: false });
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('is_pinned', { ascending: false });
      query = query.order('reaction_count', { ascending: false });
      query = query.order('comment_count', { ascending: false });
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      if (user) {
        const { data: userDataMap } = await supabase.rpc('get_feed_posts', { p_user_id: user.id });
        const lookup = new Map<string, { user_reaction: string | null; is_saved: boolean }>();
        if (Array.isArray(userDataMap)) {
          userDataMap.forEach((item: { post_id: string; user_reaction: string | null; is_saved: boolean }) => {
            lookup.set(item.post_id, { user_reaction: item.user_reaction, is_saved: item.is_saved });
          });
        }
        setPosts(data.map(post => ({
          ...post,
          user_reaction: lookup.get(post.id)?.user_reaction || null,
          is_saved: lookup.get(post.id)?.is_saved || false
        })));
      } else {
        setPosts(data.map(post => ({ ...post, user_reaction: null, is_saved: false })));
      }
    }

    setLoading(false);
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.user_reaction === reactionType) {
      await supabase
        .from('community_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType);

      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, user_reaction: null, reaction_count: p.reaction_count - 1 }
          : p
      ));
    } else {
      if (post.user_reaction) {
        await supabase
          .from('community_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      }

      await supabase
        .from('community_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType
        });

      const increment = post.user_reaction ? 0 : 1;

      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, user_reaction: reactionType, reaction_count: p.reaction_count + increment }
          : p
      ));
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_saved) {
      await supabase
        .from('saved_posts')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      setPosts(posts.map(p =>
        p.id === postId ? { ...p, is_saved: false } : p
      ));
    } else {
      await supabase
        .from('saved_posts')
        .insert({
          post_id: postId,
          user_id: user.id
        });

      setPosts(posts.map(p =>
        p.id === postId ? { ...p, is_saved: true } : p
      ));
    }
  };

  const incrementViewCount = async (postId: string) => {
    await supabase.rpc('increment_post_views', { post_id: postId });
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    incrementViewCount(post.id);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (selectedPost) {
    return <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} onUpdate={loadPosts} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Community</h1>
          <p className="text-gray-600">Connect, collaborate, and share with the ClearNav network</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Post
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedCategory === 'all'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Posts
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs">{category.icon}</span>
                  <span className="flex-1">{category.name}</span>
                  <span className="text-xs text-gray-500">{category.post_count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Trending Tags</h3>
            <div className="flex flex-wrap gap-2">
              {['fund-management', 'compliance', 'nav-calculation', 'tax', 'investor-relations'].map(tag => (
                <button
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    sortBy === 'recent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => setSortBy('trending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
                    sortBy === 'trending'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading posts...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600 mb-4">Be the first to start a conversation!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="p-4">
                    {post.is_pinned && (
                      <div className="mb-2 flex items-center gap-1 text-xs font-medium text-blue-600">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2L2 8h3v10h10V8h3L10 2z" />
                        </svg>
                        Pinned Post
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {post.author_profile?.display_name?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {post.author_profile?.display_name || 'Anonymous'}
                          </span>
                          {post.author_tenant && (
                            <span className="text-sm text-gray-500">
                              @ {post.author_tenant.name}
                            </span>
                          )}
                          <span className="text-sm text-gray-400">
                            · {formatRelativeTime(post.created_at)}
                          </span>
                        </div>
                        {post.category && (
                          <span
                            className="inline-block px-2 py-0.5 text-xs font-medium rounded mt-1"
                            style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                          >
                            {post.category.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-gray-700 mb-3 line-clamp-3">{sanitizeText(post.content)}</p>

                    {post.marketplace_price && (
                      <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-lg font-bold text-amber-900">
                          {post.marketplace_currency} ${post.marketplace_price}
                        </p>
                        {post.marketplace_sold && (
                          <span className="text-sm text-amber-700 font-medium">SOLD</span>
                        )}
                      </div>
                    )}

                    {post.job_location && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 text-sm text-purple-900">
                          <span className="font-medium">{post.job_type}</span>
                          <span>·</span>
                          <span>{post.job_location}</span>
                          {post.job_salary_range && (
                            <>
                              <span>·</span>
                              <span>{post.job_salary_range}</span>
                            </>
                          )}
                        </div>
                        {post.job_filled && (
                          <span className="text-sm text-purple-700 font-medium">Position Filled</span>
                        )}
                      </div>
                    )}

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(post.id, 'like');
                          }}
                          className={`flex items-center gap-1 text-sm ${
                            post.user_reaction === 'like'
                              ? 'text-blue-600 font-medium'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${post.user_reaction === 'like' ? 'fill-current' : ''}`} />
                          <span>{post.reaction_count}</span>
                        </button>

                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comment_count}</span>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Eye className="h-4 w-4" />
                          <span>{post.view_count}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSavePost(post.id);
                          }}
                          className={`p-1.5 rounded-lg ${
                            post.is_saved
                              ? 'text-blue-600 bg-blue-50'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Bookmark className={`h-4 w-4 ${post.is_saved ? 'fill-current' : ''}`} />
                        </button>

                        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}
