import { useState, useEffect } from 'react';
import { ChevronLeft, ThumbsUp, MessageSquare, Send, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Post {
  id: string;
  author_user_id: string;
  title: string;
  content: string;
  tags: string[];
  reaction_count: number;
  comment_count: number;
  created_at: string;
  author_profile?: {
    display_name: string | null;
  };
  author_tenant?: {
    name: string;
  };
  category?: {
    name: string;
    color: string;
  };
}

interface Comment {
  id: string;
  author_user_id: string;
  content: string;
  reaction_count: number;
  created_at: string;
  author_profile?: {
    display_name: string | null;
  };
  user_reaction?: string | null;
}

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  onUpdate: () => void;
}

export default function PostDetail({ post, onBack, onUpdate }: PostDetailProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
    loadUserReaction();
  }, [post.id]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('community_comments')
      .select(`
        *,
        author_profile:user_profiles_public!author_user_id(display_name)
      `)
      .eq('post_id', post.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const commentsWithReactions = await Promise.all(
        data.map(async (comment) => {
          const { data: reactionData } = await supabase
            .from('community_reactions')
            .select('reaction_type')
            .eq('comment_id', comment.id)
            .eq('user_id', user?.id || '')
            .maybeSingle();

          return {
            ...comment,
            user_reaction: reactionData?.reaction_type || null
          };
        })
      );

      setComments(commentsWithReactions);
    }
  };

  const loadUserReaction = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('community_reactions')
      .select('reaction_type')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();

    setUserReaction(data?.reaction_type || null);
  };

  const handleReaction = async () => {
    if (!user) return;

    if (userReaction) {
      await supabase
        .from('community_reactions')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      setUserReaction(null);
    } else {
      await supabase
        .from('community_reactions')
        .insert({
          post_id: post.id,
          user_id: user.id,
          reaction_type: 'like'
        });

      setUserReaction('like');
    }

    onUpdate();
  };

  const handleCommentReaction = async (commentId: string, currentReaction: string | null) => {
    if (!user) return;

    if (currentReaction) {
      await supabase
        .from('community_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      setComments(comments.map(c =>
        c.id === commentId
          ? { ...c, user_reaction: null, reaction_count: c.reaction_count - 1 }
          : c
      ));
    } else {
      await supabase
        .from('community_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: 'like'
        });

      setComments(comments.map(c =>
        c.id === commentId
          ? { ...c, user_reaction: 'like', reaction_count: c.reaction_count + 1 }
          : c
      ));
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('community_comments')
      .insert({
        post_id: post.id,
        author_user_id: user.id,
        content: newComment.trim()
      });

    if (!error) {
      setNewComment('');
      loadComments();
      onUpdate();
    } else {
      console.error('Error posting comment:', error);
    }

    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment || comment.author_user_id !== user.id) return;

    if (!confirm('Delete this comment?')) return;

    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      setComments(comments.filter(c => c.id !== commentId));
      onUpdate();
    }
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="h-5 w-5" />
        Back to feed
      </button>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6">
          {post.category && (
            <span
              className="inline-block px-3 py-1 text-sm font-medium rounded-full mb-4"
              style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
            >
              {post.category.name}
            </span>
          )}

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
              {post.author_profile?.display_name?.[0] || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {post.author_profile?.display_name || 'Anonymous'}
                </span>
                {post.author_tenant && (
                  <span className="text-sm text-gray-500">
                    @ {post.author_tenant.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatRelativeTime(post.created_at)}
              </p>
            </div>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 py-4 border-y border-gray-200">
            <button
              onClick={handleReaction}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                userReaction
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ThumbsUp className={`h-5 w-5 ${userReaction ? 'fill-current' : ''}`} />
              <span>{post.reaction_count}</span>
            </button>

            <div className="flex items-center gap-2 text-gray-600">
              <MessageSquare className="h-5 w-5" />
              <span>{post.comment_count} comments</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>

          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-2 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>

          {comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {comment.author_profile?.display_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-gray-900">
                          {comment.author_profile?.display_name || 'Anonymous'}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      {user && comment.author_user_id === user.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-800 mb-2 whitespace-pre-wrap">{comment.content}</p>
                    <button
                      onClick={() => handleCommentReaction(comment.id, comment.user_reaction || null)}
                      className={`flex items-center gap-1 text-sm ${
                        comment.user_reaction
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${comment.user_reaction ? 'fill-current' : ''}`} />
                      <span>{comment.reaction_count}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
