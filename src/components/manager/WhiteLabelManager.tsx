import React, { useState } from 'react';
import { Globe, Palette, FileText, Rocket, Mail, Search, Code, Settings } from 'lucide-react';
import DomainManagement from './whitelabel/DomainManagement';
import SiteDesignEditor from './whitelabel/SiteDesignEditor';
import VisualPageBuilder from './whitelabel/VisualPageBuilder';
import DeploymentManager from './whitelabel/DeploymentManager';
import { TenantEmailClaiming } from './whitelabel/TenantEmailClaiming';
import { SEOManager } from './whitelabel/SEOManager';
import { CustomCSSEditor } from './whitelabel/CustomCSSEditor';
import { AdvancedSettings } from './whitelabel/AdvancedSettings';

type TabType = 'domains' | 'design' | 'content' | 'seo' | 'css' | 'settings' | 'deploy' | 'email';

export default function WhiteLabelManager() {
  const [activeTab, setActiveTab] = useState<TabType>('domains');

  const tabs = [
    { id: 'domains' as TabType, label: 'Custom Domains', icon: Globe },
    { id: 'email' as TabType, label: 'Email Address', icon: Mail },
    { id: 'design' as TabType, label: 'Site Design', icon: Palette },
    { id: 'content' as TabType, label: 'Page Content', icon: FileText },
    { id: 'seo' as TabType, label: 'SEO', icon: Search },
    { id: 'css' as TabType, label: 'Custom CSS', icon: Code },
    { id: 'settings' as TabType, label: 'Advanced', icon: Settings },
    { id: 'deploy' as TabType, label: 'Deployment', icon: Rocket },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'domains':
        return <DomainManagement />;
      case 'email':
        return <TenantEmailClaiming />;
      case 'design':
        return <SiteDesignEditor />;
      case 'content':
        return <VisualPageBuilder />;
      case 'seo':
        return <SEOManager />;
      case 'css':
        return <CustomCSSEditor />;
      case 'settings':
        return <AdvancedSettings />;
      case 'deploy':
        return <DeploymentManager />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-t-lg mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">White Label Platform</h1>
        </div>
        <p className="text-slate-300">
          Customize your branded website with custom domains and design your pages
        </p>
      </div>

      <div className="bg-slate-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-slate-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
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

        <div className="p-6 bg-slate-900">{renderContent()}</div>
      </div>
    </div>
  );
}
