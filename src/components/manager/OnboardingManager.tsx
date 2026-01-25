import { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, FileCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function OnboardingManager() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    const { data } = await supabase
      .from('onboarding_workflows')
      .select('*, crm_contacts(full_name, email)')
      .order('started_at', { ascending: false });
    setWorkflows(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      started: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      in_progress: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      pending_approval: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      approved: 'bg-green-500/20 text-green-300 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
      completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };
    return colors[status] || colors.started;
  };

  const calculateProgress = (workflow: any) => {
    const steps = [
      workflow.accreditation_verified,
      workflow.kyc_aml_completed,
      workflow.fatca_completed,
      workflow.subscription_agreement_signed,
      workflow.banking_info_collected,
      workflow.risk_tolerance_assessed,
      workflow.suitability_approved,
    ];
    const completed = steps.filter(Boolean).length;
    return (completed / steps.length) * 100;
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
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          Onboarding <span className="font-semibold">Workflows</span>
        </h2>
        <p className="text-slate-400">Track KYC/AML, accreditation verification, and compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{workflows.filter(w => w.status === 'in_progress').length}</div>
          <div className="text-sm text-slate-400">In Progress</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-400">{workflows.filter(w => w.status === 'pending_approval').length}</div>
          <div className="text-sm text-slate-400">Pending Approval</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{workflows.filter(w => w.status === 'completed').length}</div>
          <div className="text-sm text-slate-400">Completed</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{workflows.filter(w => w.status === 'rejected').length}</div>
          <div className="text-sm text-slate-400">Rejected</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {workflows.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-12 text-center">
            <FileCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No onboarding workflows yet</p>
          </div>
        ) : (
          workflows.map((workflow) => {
            const progress = calculateProgress(workflow);
            return (
              <div key={workflow.id} className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{workflow.crm_contacts?.full_name}</h3>
                    <p className="text-sm text-slate-400">{workflow.crm_contacts?.email}</p>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded border ${getStatusColor(workflow.status)}`}>
                    {workflow.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-white font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    {workflow.accreditation_verified ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-300">Accreditation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {workflow.kyc_aml_completed ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-300">KYC/AML</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {workflow.fatca_completed ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-300">FATCA</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {workflow.subscription_agreement_signed ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-sm text-slate-300">Agreement</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
