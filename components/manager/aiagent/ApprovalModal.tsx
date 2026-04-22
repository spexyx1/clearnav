import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, MessageSquare, User, Building, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ApprovalModalProps {
  action: any;
  onApprove: (actionId: string, notes?: string) => void;
  onReject: (actionId: string, reason: string) => void;
  onClose: () => void;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function ApprovalModal({ action, onApprove, onReject, onClose }: ApprovalModalProps) {
  const [activeView, setActiveView] = useState<'details' | 'conversation'>('details');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [contactInfo, setContactInfo] = useState<any>(null);

  useEffect(() => {
    if (action.conversation_thread_id) {
      loadConversation();
    }
    if (action.contact_id) {
      loadContactInfo();
    }
  }, [action]);

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_conversation_messages')
        .select('*')
        .eq('thread_id', action.conversation_thread_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConversation(data || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadContactInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*, company:companies(name, industry)')
        .eq('id', action.contact_id)
        .maybeSingle();

      if (error) throw error;
      setContactInfo(data);
    } catch (error) {
      console.error('Error loading contact info:', error);
    }
  };

  const handleApproveClick = () => {
    onApprove(action.id, notes || undefined);
  };

  const handleRejectClick = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(action.id, rejectionReason);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Action Approval Review</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-2/3 border-r border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 flex">
              <button
                onClick={() => setActiveView('details')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeView === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Action Details
              </button>
              <button
                onClick={() => setActiveView('conversation')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeView === 'conversation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Conversation History
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeView === 'details' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Action Type</h3>
                    <p className="text-base text-gray-700 capitalize">
                      {action.action_type.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-base text-gray-700">{action.action_description}</p>
                  </div>

                  {action.ai_reasoning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        AI Reasoning
                      </h3>
                      <p className="text-sm text-blue-800">{action.ai_reasoning}</p>
                      {action.ai_confidence_score && (
                        <div className="mt-2 text-xs text-blue-700">
                          Confidence Score: {(action.ai_confidence_score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  )}

                  {action.risk_factors && action.risk_factors.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-orange-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Risk Factors
                      </h3>
                      <ul className="space-y-1">
                        {action.risk_factors.map((factor: string, idx: number) => (
                          <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {action.action_data && Object.keys(action.action_data).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Additional Details</h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(action.action_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Created: {new Date(action.created_at).toLocaleString()}
                    </div>
                    {action.approval_deadline && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        Deadline: {new Date(action.approval_deadline).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversation.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No conversation history available</p>
                  ) : (
                    conversation.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            msg.role === 'user'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="text-xs font-medium mb-1 opacity-70">
                            {msg.role === 'user' ? 'User' : 'AI Agent'}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className="text-xs opacity-70 mt-2">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-1/3 bg-gray-50 p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>

            {contactInfo ? (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{contactInfo.name}</div>
                      <div className="text-sm text-gray-600">{contactInfo.email}</div>
                    </div>
                  </div>

                  {contactInfo.phone && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Phone:</span> {contactInfo.phone}
                    </div>
                  )}

                  {contactInfo.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Building className="w-4 h-4" />
                      {contactInfo.company.name}
                      {contactInfo.company.industry && (
                        <span className="text-gray-500">• {contactInfo.company.industry}</span>
                      )}
                    </div>
                  )}

                  {contactInfo.lifetime_value && (
                    <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      LTV: ${contactInfo.lifetime_value.toLocaleString()}
                    </div>
                  )}

                  {contactInfo.tags && contactInfo.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {contactInfo.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {contactInfo.notes && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700">{contactInfo.notes}</p>
                  </div>
                )}
              </div>
            ) : action.contact ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900">{action.contact.name}</div>
                <div className="text-sm text-gray-600">{action.contact.email}</div>
                {action.contact.company_name && (
                  <div className="text-sm text-gray-600 mt-1">{action.contact.company_name}</div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No contact information available</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          {showRejectForm ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (required)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="Explain why this action is being rejected..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectClick}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Confirm Rejection
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Add any notes about this approval..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={handleApproveClick}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
