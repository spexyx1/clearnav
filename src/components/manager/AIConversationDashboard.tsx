import React, { useState, useEffect } from 'react';
import {
  Phone, Mail, MessageSquare, TrendingUp, TrendingDown, Minus,
  Clock, CheckCircle, AlertCircle, ArrowUpRight, Filter, Search,
  Calendar, User, Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePlatformContext } from '../../lib/platformContext';

interface Conversation {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  channel: string;
  direction: string;
  status: string;
  sentiment_score: number | null;
  sentiment_trend: string | null;
  intent_detected: string | null;
  qualification_score: number | null;
  outcome: string | null;
  message_count: number;
  started_at: string;
  last_activity_at: string;
  call_duration_seconds: number | null;
}

export default function AIConversationDashboard() {
  const { tenant } = usePlatformContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      loadConversations();
      const interval = setInterval(loadConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [tenant?.id, filterChannel, filterStatus]);

  const loadConversations = async () => {
    if (!tenant?.id) return;

    try {
      let query = supabase
        .from('ai_conversation_threads')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('last_activity_at', { ascending: false })
        .limit(50);

      if (filterChannel !== 'all') {
        query = query.eq('channel', filterChannel);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'voice':
        return <Phone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
      case 'chat':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'voice':
        return 'bg-blue-100 text-blue-700';
      case 'email':
        return 'bg-green-100 text-green-700';
      case 'sms':
        return 'bg-purple-100 text-purple-700';
      case 'chat':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'escalated':
        return 'bg-yellow-100 text-yellow-700';
      case 'abandoned':
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSentimentIcon = (trend: string | null) => {
    if (!trend) return <Minus className="w-4 h-4 text-gray-400" />;
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.contact_name?.toLowerCase().includes(query) ||
      conv.contact_email?.toLowerCase().includes(query) ||
      conv.contact_phone?.includes(query)
    );
  });

  const stats = {
    active: conversations.filter(c => c.status === 'active').length,
    completed: conversations.filter(c => c.status === 'completed').length,
    escalated: conversations.filter(c => c.status === 'escalated').length,
    avgSentiment: conversations.reduce((sum, c) => sum + (c.sentiment_score || 0), 0) / (conversations.length || 1)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Conversation Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Monitor and manage all AI agent conversations in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
          <p className="text-xs text-gray-600 mt-1">In progress now</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Completed</span>
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
          <p className="text-xs text-gray-600 mt-1">Finished conversations</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Escalated</span>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.escalated}</p>
          <p className="text-xs text-gray-600 mt-1">Needs human review</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Sentiment</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(stats.avgSentiment * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">Positive interactions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Channels</option>
                <option value="voice">Voice</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="chat">Chat</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="escalated">Escalated</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredConversations.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 ${getChannelColor(conv.channel)} rounded-lg`}>
                    {getChannelIcon(conv.channel)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{conv.contact_name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-600">{conv.contact_email || conv.contact_phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 ${getStatusColor(conv.status)} rounded text-xs font-medium`}>
                          {conv.status}
                        </span>
                        {conv.status === 'active' && (
                          <span className="text-xs text-gray-600">{formatTimeAgo(conv.last_activity_at)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{conv.message_count} messages</span>
                      </div>

                      {conv.call_duration_seconds && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(conv.call_duration_seconds)}</span>
                        </div>
                      )}

                      {conv.sentiment_score !== null && (
                        <div className="flex items-center gap-1">
                          {getSentimentIcon(conv.sentiment_trend)}
                          <span>{(conv.sentiment_score * 100).toFixed(0)}% sentiment</span>
                        </div>
                      )}

                      {conv.qualification_score !== null && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          <span>{conv.qualification_score}/100 qualified</span>
                        </div>
                      )}

                      {conv.intent_detected && (
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="w-4 h-4" />
                          <span>{conv.intent_detected}</span>
                        </div>
                      )}

                      {conv.outcome && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-600">{conv.outcome.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedConversation.contact_name || 'Unknown'}</h3>
                <p className="text-gray-600">{selectedConversation.contact_email || selectedConversation.contact_phone}</p>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Channel</span>
                <p className="font-medium text-gray-900 capitalize">{selectedConversation.channel}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Direction</span>
                <p className="font-medium text-gray-900 capitalize">{selectedConversation.direction}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Status</span>
                <p className="font-medium text-gray-900 capitalize">{selectedConversation.status}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Messages</span>
                <p className="font-medium text-gray-900">{selectedConversation.message_count}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Full conversation history and transcript will be displayed here. Integration with conversation storage coming soon.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedConversation(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedConversation.status === 'escalated' && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Take Over Conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
