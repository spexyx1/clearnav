import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, MessageSquare, Users, MapPin, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { sanitizeText } from '../../lib/sanitize';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  job_title: string | null;
  show_tenant: boolean;
  tenant?: {
    name: string;
  };
  connection_status?: 'none' | 'pending' | 'accepted' | 'sent';
}

export default function UserNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'connections' | 'requests'>('discover');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'discover') {
      loadDiscoverUsers();
    } else if (activeTab === 'connections') {
      loadConnections();
    } else if (activeTab === 'requests') {
      loadConnectionRequests();
    }
  }, [activeTab, searchQuery]);

  const loadDiscoverUsers = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('user_profiles_public')
      .select(`
        user_id,
        display_name,
        bio,
        location,
        company,
        job_title,
        show_tenant
      `)
      .eq('profile_visibility', 'public')
      .neq('user_id', user.id)
      .limit(50);

    if (searchQuery) {
      const sanitized = searchQuery.replace(/[%_\\(),.*]/g, '');
      if (sanitized) {
        query = query.or(`display_name.ilike.%${sanitized}%,company.ilike.%${sanitized}%`);
      }
    }

    const { data } = await query;

    if (data) {
      const profileIds = data.map(p => p.user_id);
      const { data: statuses } = await supabase.rpc('get_user_connection_statuses', {
        p_user_id: user.id,
        p_profile_ids: profileIds
      });

      const statusMap = new Map<string, { status: string; connection_user_id: string }>();
      if (Array.isArray(statuses)) {
        statuses.forEach((s: { profile_user_id: string; status: string; connection_user_id: string }) => {
          statusMap.set(s.profile_user_id, { status: s.status, connection_user_id: s.connection_user_id });
        });
      }

      const usersWithStatus = data.map(profile => {
        const conn = statusMap.get(profile.user_id);
        let connectionStatus: 'none' | 'pending' | 'accepted' | 'sent' = 'none';
        if (conn) {
          if (conn.status === 'accepted') {
            connectionStatus = 'accepted';
          } else if (conn.connection_user_id === user.id) {
            connectionStatus = 'sent';
          } else {
            connectionStatus = 'pending';
          }
        }
        return { ...profile, connection_status: connectionStatus };
      });

      setUsers(usersWithStatus);
    }

    setLoading(false);
  };

  const loadConnections = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('user_connections')
      .select('user_id, connected_user_id')
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .eq('connection_type', 'connection');

    if (data) {
      const connectedUserIds = data.map(c =>
        c.user_id === user.id ? c.connected_user_id : c.user_id
      );

      if (connectedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles_public')
          .select('user_id, display_name, bio, location, company, job_title, show_tenant')
          .in('user_id', connectedUserIds);

        setConnections(profiles || []);
      } else {
        setConnections([]);
      }
    }

    setLoading(false);
  };

  const loadConnectionRequests = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('user_connections')
      .select('user_id')
      .eq('connected_user_id', user.id)
      .eq('status', 'pending')
      .eq('connection_type', 'connection');

    if (data && data.length > 0) {
      const requesterIds = data.map(r => r.user_id);

      const { data: profiles } = await supabase
        .from('user_profiles_public')
        .select('user_id, display_name, bio, location, company, job_title, show_tenant')
        .in('user_id', requesterIds);

      setRequests(profiles || []);
    } else {
      setRequests([]);
    }

    setLoading(false);
  };

  const handleConnect = async (recipientId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_connections')
      .insert({
        user_id: user.id,
        connected_user_id: recipientId,
        connection_type: 'connection',
        status: 'pending',
        requested_by: user.id
      });

    if (!error) {
      loadDiscoverUsers();
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_connections')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('user_id', requesterId)
      .eq('connected_user_id', user.id);

    if (!error) {
      loadConnectionRequests();
      loadConnections();
    }
  };

  const handleDeclineRequest = async (requesterId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_connections')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('user_id', requesterId)
      .eq('connected_user_id', user.id);

    if (!error) {
      loadConnectionRequests();
    }
  };

  const renderUserCard = (profile: UserProfile, showActions: boolean = true) => (
    <div key={profile.user_id} className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
          {profile.display_name?.[0] || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {profile.display_name || 'Anonymous User'}
          </h3>
          {profile.job_title && profile.company && (
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Briefcase className="h-3 w-3" />
              {profile.job_title} at {profile.company}
            </p>
          )}
          {profile.location && (
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{sanitizeText(profile.bio)}</p>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-4 flex gap-2">
          {profile.connection_status === 'none' && (
            <button
              onClick={() => handleConnect(profile.user_id)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Connect
            </button>
          )}
          {profile.connection_status === 'sent' && (
            <button
              disabled
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed"
            >
              Request Sent
            </button>
          )}
          {profile.connection_status === 'accepted' && (
            <button className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Network</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-2 rounded-lg font-medium ${
              activeTab === 'discover'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-6 py-2 rounded-lg font-medium ${
              activeTab === 'connections'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            My Connections
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-2 rounded-lg font-medium relative ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'discover' && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search people by name or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : (
        <div>
          {activeTab === 'discover' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No users found</p>
                </div>
              ) : (
                users.map(profile => renderUserCard(profile))
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No connections yet</p>
                  <p className="text-sm text-gray-500 mt-2">Start connecting with people to build your network</p>
                </div>
              ) : (
                connections.map(profile => renderUserCard({ ...profile, connection_status: 'accepted' }))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending requests</p>
                </div>
              ) : (
                requests.map(profile => (
                  <div key={profile.user_id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
                        {profile.display_name?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {profile.display_name || 'Anonymous User'}
                        </h3>
                        {profile.job_title && profile.company && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Briefcase className="h-3 w-3" />
                            {profile.job_title} at {profile.company}
                          </p>
                        )}
                        {profile.bio && (
                          <p className="text-sm text-gray-700 mt-2">{sanitizeText(profile.bio)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(profile.user_id)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(profile.user_id)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
