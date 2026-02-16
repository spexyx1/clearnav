import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Shield,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  raw_user_meta_data: any;
  tenant_connections: {
    tenant_id: string;
    role: string;
    tenant_name: string;
  }[];
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('*')
        .order('created_at', { ascending: false });

      if (authError) {
        const { data: rawData, error: rawError } = await supabase.rpc(
          'get_all_platform_users'
        );
        if (!rawError && rawData) {
          setUsers(rawData);
        }
      } else {
        const usersWithTenants = await Promise.all(
          (authUsers || []).map(async (user) => {
            const { data: tenantData } = await supabase
              .from('tenant_users')
              .select('tenant_id, role, platform_tenants(name)')
              .eq('user_id', user.id);

            return {
              ...user,
              tenant_connections:
                tenantData?.map((t: any) => ({
                  tenant_id: t.tenant_id,
                  role: t.role,
                  tenant_name: t.platform_tenants?.name || 'Unknown',
                })) || [],
            };
          })
        );
        setUsers(usersWithTenants);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.raw_user_meta_data?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              User Management
            </h2>
            <p className="text-slate-600">
              Manage users across all tenants on the platform
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-4 py-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-slate-600">Total Users:</span>
              <span className="ml-2 text-lg font-bold text-blue-600">
                {users.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tenants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(
                            user.raw_user_meta_data?.full_name?.[0] ||
                            user.email?.[0] ||
                            '?'
                          ).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-slate-900">
                            {user.raw_user_meta_data?.full_name || 'No name'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {user.tenant_connections.length} tenant
                          {user.tenant_connections.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {user.tenant_connections.length > 0 && (
                        <div className="mt-1 text-xs text-slate-500">
                          {user.tenant_connections[0].tenant_name}
                          {user.tenant_connections.length > 1 &&
                            ` +${user.tenant_connections.length - 1} more`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(user.last_sign_in_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetail(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          className="text-slate-600 hover:text-slate-900"
                          title="More Actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {showUserDetail && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowUserDetail(false);
            setSelectedUser(null);
          }}
          onRefresh={loadUsers}
        />
      )}
    </div>
  );
}

interface UserDetailModalProps {
  user: User;
  onClose: () => void;
  onRefresh: () => void;
}

function UserDetailModal({ user, onClose, onRefresh }: UserDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {(
                  user.raw_user_meta_data?.full_name?.[0] ||
                  user.email?.[0] ||
                  '?'
                ).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {user.raw_user_meta_data?.full_name || 'No name'}
                </h2>
                <p className="text-slate-600">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              Account Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600">User ID</label>
                <p className="font-mono text-sm text-slate-900 mt-1">
                  {user.id}
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-600">Joined</label>
                <p className="text-sm text-slate-900 mt-1">
                  {new Date(user.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-600">Last Sign In</label>
                <p className="text-sm text-slate-900 mt-1">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-600">Email Confirmed</label>
                <p className="text-sm text-slate-900 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Confirmed
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              Tenant Connections
            </h3>
            {user.tenant_connections.length > 0 ? (
              <div className="space-y-2">
                {user.tenant_connections.map((connection, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-900">
                          {connection.tenant_name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {connection.tenant_id}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {connection.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                No tenant connections found
              </p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              Admin Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                <Mail className="w-4 h-4" />
                <span>Send Email</span>
              </button>
              <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                <Shield className="w-4 h-4" />
                <span>Reset Password</span>
              </button>
              <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                <Ban className="w-4 h-4" />
                <span>Suspend Account</span>
              </button>
              <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                <Eye className="w-4 h-4" />
                <span>View Activity Log</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
