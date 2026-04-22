import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, DollarSign, MessageSquare, Mail, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/lib/hooks';
import ApprovalModal from './ApprovalModal';

interface PendingAction {
  id: string;
  action_type: string;
  action_description: string;
  approval_priority: 'low' | 'medium' | 'high' | 'urgent';
  approval_deadline: string;
  created_at: string;
  ai_reasoning: string;
  risk_factors: string[];
  ai_confidence_score: number;
  contact_id?: string;
  conversation_thread_id?: string;
  action_data: any;
  contact?: {
    name: string;
    email: string;
    company_name?: string;
  };
}

const priorityConfig = {
  urgent: { color: 'red', label: 'Urgent', icon: AlertCircle },
  high: { color: 'orange', label: 'High', icon: AlertCircle },
  medium: { color: 'yellow', label: 'Medium', icon: Clock },
  low: { color: 'gray', label: 'Low', icon: Clock },
};

const actionTypeConfig = {
  custom_pricing: { icon: DollarSign, label: 'Custom Pricing', color: 'purple' },
  pricing_discussion: { icon: DollarSign, label: 'Pricing Discussion', color: 'purple' },
  support_escalation: { icon: AlertCircle, label: 'Support Escalation', color: 'red' },
  escalate_ticket: { icon: AlertCircle, label: 'Support Escalation', color: 'red' },
  email_sequence_enrollment: { icon: Mail, label: 'Email Sequence', color: 'blue' },
  send_email_sequence: { icon: Mail, label: 'Email Sequence', color: 'blue' },
};

export default function PendingApprovals() {
  const { tenant } = useTenant();
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;
    loadPendingActions();
    const subscription = subscribeToActions();
    return () => {
      subscription.unsubscribe();
    };
  }, [tenant?.id]);

  const loadPendingActions = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_agent_actions')
        .select(`
          *,
          contact:crm_contacts(name, email, company_name)
        `)
        .eq('tenant_id', tenant.id)
        .eq('requires_approval', true)
        .eq('approval_status', 'pending')
        .order('approval_priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error loading pending actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToActions = () => {
    return supabase
      .channel('pending_actions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_agent_actions',
          filter: `tenant_id=eq.${tenant?.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.requires_approval && payload.new.approval_status === 'pending') {
            if (soundEnabled) {
              playNotificationSound();
            }
          }
          loadPendingActions();
        }
      )
      .subscribe();
  };

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHF2W77OihUBELTKXh8Lxf');
    audio.play().catch(() => {});
  };

  const handleApprove = async (actionId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('ai_agent_actions')
        .update({
          approval_status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes,
        })
        .eq('id', actionId);

      if (error) throw error;
      setSelectedAction(null);
      loadPendingActions();
    } catch (error) {
      console.error('Error approving action:', error);
    }
  };

  const handleReject = async (actionId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('ai_agent_actions')
        .update({
          approval_status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', actionId);

      if (error) throw error;
      setSelectedAction(null);
      loadPendingActions();
    } catch (error) {
      console.error('Error rejecting action:', error);
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return { text: 'Overdue', urgent: true };
    if (diffMins < 30) return { text: `${diffMins}m remaining`, urgent: true };
    if (diffMins < 120) return { text: `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`, urgent: false };
    return { text: `${Math.floor(diffMins / 60)}h remaining`, urgent: false };
  };

  const filteredActions = actions.filter(action => {
    if (filterPriority !== 'all' && action.approval_priority !== filterPriority) return false;
    if (filterType !== 'all' && action.action_type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Pending Approvals
            {filteredActions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredActions.length})
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Review AI actions that require your approval before execution
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Sound alerts
          </label>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="all">All Types</option>
              <option value="custom_pricing">Custom Pricing</option>
              <option value="support_escalation">Support Escalation</option>
              <option value="email_sequence_enrollment">Email Sequence</option>
            </select>
          </div>
        </div>
      </div>

      {filteredActions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
          <p className="text-gray-600">No pending approvals at the moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((action) => {
            const priority = priorityConfig[action.approval_priority];
            const PriorityIcon = priority.icon;
            const actionConfig = actionTypeConfig[action.action_type as keyof typeof actionTypeConfig] || {
              icon: MessageSquare,
              label: action.action_type,
              color: 'gray'
            };
            const ActionIcon = actionConfig.icon;
            const timeRemaining = getTimeRemaining(action.approval_deadline);

            return (
              <div
                key={action.id}
                className={`
                  bg-white border-2 rounded-lg p-5 hover:shadow-md transition-shadow
                  ${action.approval_priority === 'urgent' ? 'border-red-200' : 'border-gray-200'}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-${actionConfig.color}-100`}>
                      <ActionIcon className={`w-5 h-5 text-${actionConfig.color}-600`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{actionConfig.label}</h3>
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                          bg-${priority.color}-100 text-${priority.color}-700
                        `}>
                          <PriorityIcon className="w-3 h-3" />
                          {priority.label}
                        </span>
                      </div>

                      {action.contact && (
                        <p className="text-sm text-gray-600 mb-2">
                          {action.contact.name}
                          {action.contact.company_name && ` • ${action.contact.company_name}`}
                          <span className="text-gray-400 ml-2">{action.contact.email}</span>
                        </p>
                      )}

                      <p className="text-sm text-gray-700 mb-2">{action.action_description}</p>

                      {action.ai_reasoning && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2">
                          <p className="text-xs font-medium text-blue-900 mb-1">AI Reasoning</p>
                          <p className="text-sm text-blue-800">{action.ai_reasoning}</p>
                        </div>
                      )}

                      {action.risk_factors && action.risk_factors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {action.risk_factors.map((factor, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(action.created_at).toLocaleString()}
                        </span>
                        {action.ai_confidence_score && (
                          <span>
                            AI Confidence: {(action.ai_confidence_score * 100).toFixed(0)}%
                          </span>
                        )}
                        <span className={timeRemaining.urgent ? 'text-red-600 font-medium' : ''}>
                          {timeRemaining.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAction(action)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleApprove(action.id)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedAction(action)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAction && (
        <ApprovalModal
          action={selectedAction}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}
