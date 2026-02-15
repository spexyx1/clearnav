import { useState, useEffect } from 'react';
import { Bell, MessageSquare, ThumbsUp, UserPlus, Check, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  content: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, filter]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);

    let query = supabase
      .from('community_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (!error && data) {
      setNotifications(data);
    }

    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('community_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('community_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    loadNotifications();
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase
      .from('community_notifications')
      .delete()
      .eq('id', notificationId);

    setNotifications(notifications.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_comment':
      case 'post_reply':
        return MessageSquare;
      case 'post_reaction':
        return ThumbsUp;
      case 'connection_request':
        return UserPlus;
      case 'message':
        return MessageSquare;
      default:
        return Bell;
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium relative ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-600">
            {filter === 'unread' ? "You're all caught up!" : "You don't have any notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const Icon = getNotificationIcon(notification.notification_type);

            return (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow p-4 flex items-start gap-4 ${
                  !notification.is_read ? 'border-l-4 border-blue-600' : ''
                }`}
              >
                <div className={`p-2 rounded-full ${
                  !notification.is_read ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    !notification.is_read ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${
                    !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {notification.title}
                  </h3>
                  {notification.content && (
                    <p className="text-sm text-gray-600 mt-1">{notification.content}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
