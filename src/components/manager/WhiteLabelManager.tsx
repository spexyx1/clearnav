import React, { useState } from 'react';
import { Globe, Palette, FileText, Users, Settings, Rocket } from 'lucide-react';
import DomainManagement from './whitelabel/DomainManagement';
import SiteDesignEditor from './whitelabel/SiteDesignEditor';
import PageContentBuilder from './whitelabel/PageContentBuilder';
import ClientInvitationManager from './whitelabel/ClientInvitationManager';
import DeploymentManager from './whitelabel/DeploymentManager';

type TabType = 'domains' | 'design' | 'content' | 'invitations' | 'deploy';

export default function WhiteLabelManager() {
  const [activeTab, setActiveTab] = useState<TabType>('domains');

  const tabs = [
    { id: 'domains' as TabType, label: 'Custom Domains', icon: Globe },
    { id: 'design' as TabType, label: 'Site Design', icon: Palette },
    { id: 'content' as TabType, label: 'Page Content', icon: FileText },
    { id: 'invitations' as TabType, label: 'Client Invitations', icon: Users },
    { id: 'deploy' as TabType, label: 'Deployment', icon: Rocket },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'domains':
        return <DomainManagement />;
      case 'design':
        return <SiteDesignEditor />;
      case 'content':
        return <PageContentBuilder />;
      case 'invitations':
        return <ClientInvitationManager />;
      case 'deploy':
        return <DeploymentManager />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">White Label Platform</h1>
        </div>
        <p className="text-gray-600">
          Customize your branded website with custom domains, design your pages, and invite clients
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
}
