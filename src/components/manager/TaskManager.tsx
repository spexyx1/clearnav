import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function TaskManager() {
  const { staffAccount } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  const loadTasks = async () => {
    let query = supabase
      .from('tasks_activities')
      .select('*, crm_contacts(full_name), client_profiles(full_name), staff_accounts!tasks_activities_assigned_to_fkey(full_name)')
      .order('due_date', { ascending: true });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setTasks(data || []);
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-white mb-1">
            Task <span className="font-semibold">Management</span>
          </h2>
          <p className="text-slate-400">Track and manage team tasks and activities</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors">
          <Filter className="w-4 h-4" />
          <span>More Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{task.title}</h3>
                  {task.description && <p className="text-sm text-slate-400">{task.description}</p>}
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">
                    Type: <span className="text-white">{task.task_type.replace('_', ' ')}</span>
                  </span>
                  {task.due_date && (
                    <span className="text-slate-400">
                      Due: <span className="text-white">{new Date(task.due_date).toLocaleDateString()}</span>
                    </span>
                  )}
                  <span className="text-slate-400">
                    Assigned: <span className="text-white">{task.staff_accounts?.full_name || 'Unassigned'}</span>
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${task.status === 'completed' ? 'bg-green-500/20 text-green-300' : task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
