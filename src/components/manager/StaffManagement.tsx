import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function StaffManagement() {
  const { staffAccount, userRole } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'general_manager') {
      loadStaff();
    }
  }, [userRole]);

  const loadStaff = async () => {
    const { data } = await supabase
      .from('staff_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    setStaff(data || []);
    setLoading(false);
  };

  if (userRole !== 'general_manager') {
    return (
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
        <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Access restricted to General Managers only</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    const colors: any = {
      general_manager: 'bg-red-500/20 text-red-300 border-red-500/30',
      compliance_manager: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      cfo: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      accountant: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      legal_counsel: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      admin: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return colors[role] || colors.admin;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Staff <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Manage team members and permissions</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors">
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{staff.filter(s => s.status === 'active').length}</div>
          <div className="text-sm text-slate-400">Active Staff</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{staff.filter(s => s.role === 'general_manager').length}</div>
          <div className="text-sm text-slate-400">General Managers</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{staff.length}</div>
          <div className="text-sm text-slate-400">Total Staff</div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No staff members found. Click "Add Staff Member" to get started.
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{member.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleColor(member.role)}`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{member.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${member.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </button>
                        {member.id !== staffAccount?.id && (
                          <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
