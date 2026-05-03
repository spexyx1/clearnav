import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Users, BarChart3, CheckCircle, SkipForward, Clock, CreditCard as Edit2, Eye, Loader2, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TutorialDef {
  id: string;
  key: string;
  portal: string;
  title: string;
  description: string;
  steps: Array<{ id: string; title: string; body: string }>;
  version: number;
  is_active: boolean;
}

interface ProgressStats {
  tutorial_key: string;
  total: number;
  not_started: number;
  in_progress: number;
  completed: number;
  skipped: number;
}

const PORTAL_LABELS: Record<string, string> = {
  client: 'Client Portal',
  manager: 'Manager Portal',
  platform_admin: 'Platform Admin',
};

export default function TutorialManager() {
  const [tutorials, setTutorials] = useState<TutorialDef[]>([]);
  const [stats, setStats] = useState<ProgressStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: defs }, { data: prog }] = await Promise.all([
      supabase.from('tutorial_definitions').select('*').order('portal'),
      supabase
        .from('user_tutorial_progress')
        .select('tutorial_key, status'),
    ]);

    setTutorials((defs as TutorialDef[]) ?? []);

    // Aggregate stats client-side
    const aggregated: Record<string, ProgressStats> = {};
    for (const row of (prog ?? []) as Array<{ tutorial_key: string; status: string }>) {
      if (!aggregated[row.tutorial_key]) {
        aggregated[row.tutorial_key] = { tutorial_key: row.tutorial_key, total: 0, not_started: 0, in_progress: 0, completed: 0, skipped: 0 };
      }
      aggregated[row.tutorial_key].total++;
      const key = row.status as keyof Omit<ProgressStats, 'tutorial_key' | 'total'>;
      if (key in aggregated[row.tutorial_key]) {
        (aggregated[row.tutorial_key][key] as number)++;
      }
    }
    setStats(Object.values(aggregated));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    await supabase
      .from('tutorial_definitions')
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq('id', id);
    setTutorials((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !current } : t));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users Tracked', value: stats.reduce((s, r) => s + r.total, 0), icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Completed', value: stats.reduce((s, r) => s + r.completed, 0), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Skipped', value: stats.reduce((s, r) => s + r.skipped, 0), icon: SkipForward, color: 'text-amber-600 bg-amber-50' },
          { label: 'In Progress', value: stats.reduce((s, r) => s + r.in_progress, 0), icon: Clock, color: 'text-slate-600 bg-slate-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tutorial cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Tutorial Definitions</h3>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {tutorials.map((tut) => {
          const tutStats = stats.find((s) => s.tutorial_key === tut.key);
          const completionRate = tutStats && tutStats.total > 0
            ? Math.round((tutStats.completed / tutStats.total) * 100)
            : 0;
          const isExpanded = expandedKey === tut.key;

          return (
            <div key={tut.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                        {PORTAL_LABELS[tut.portal] ?? tut.portal}
                      </span>
                      <span className="text-xs text-slate-400">v{tut.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tut.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {tut.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm">{tut.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{tut.steps?.length ?? 0} steps</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(tut.id, tut.is_active)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        tut.is_active
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {tut.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setExpandedKey(isExpanded ? null : tut.key)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {/* Completion bar */}
                {tutStats && tutStats.total > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Completion rate</span>
                      <span className="font-medium">{completionRate}% ({tutStats.completed}/{tutStats.total})</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                      <span>{tutStats.in_progress} in progress</span>
                      <span>{tutStats.skipped} skipped</span>
                      <span>{tutStats.not_started} not started</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step list */}
              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {(tut.steps ?? []).map((step, i) => (
                    <div key={step.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{step.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
