import React, { useState } from 'react';
import { Bot, Clock, CheckCircle, XCircle, Settings, History } from 'lucide-react';
import PendingApprovals from './aiagent/PendingApprovals';
import ApprovalSettings from './aiagent/ApprovalSettings';
import ActionHistory from './aiagent/ActionHistory';

type TabType = 'pending' | 'settings' | 'history';

export default function AIAgentManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  const tabs = [
    { id: 'pending' as TabType, label: 'Pending Approvals', icon: Clock },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
    { id: 'history' as TabType, label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AI Agent Management</h1>
          </div>
          <p className="text-gray-600 ml-14">
            Review and approve AI agent actions that require human oversight
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && <PendingApprovals />}
            {activeTab === 'settings' && <ApprovalSettings />}
            {activeTab === 'history' && <ActionHistory />}
          </div>
        </div>
      </div>
    </div>
  );
}
