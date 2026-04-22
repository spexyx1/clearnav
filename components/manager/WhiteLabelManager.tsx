import React, { useState, useEffect } from 'react';
import { Globe, Palette, FileText, Rocket, Mail, Search, Code, Settings, Navigation, ExternalLink } from 'lucide-react';
import DomainManagement from './whitelabel/DomainManagement';
import SiteDesignEditor from './whitelabel/SiteDesignEditor';
import VisualPageBuilder from './whitelabel/VisualPageBuilder';
import DeploymentManager from './whitelabel/DeploymentManager';
import NavigationEditor from './whitelabel/NavigationEditor';
import { TenantEmailClaiming } from './whitelabel/TenantEmailClaiming';
import { SEOManager } from './whitelabel/SEOManager';
import { CustomCSSEditor } from './whitelabel/CustomCSSEditor';
import { AdvancedSettings } from './whitelabel/AdvancedSettings';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';

type TabType = 'domains' | 'nav' | 'design' | 'content' | 'seo' | 'css' | 'settings' | 'deploy' | 'email';

export default function WhiteLabelManager() {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('domains');
  const [primaryDomain, setPrimaryDomain] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from('tenant_domains')
      .select('domain')
      .eq('tenant_id', tenantId)
      .eq('is_verified', true)
      .eq('is_primary', true)
      .maybeSingle()
      .then(({ data }) => setPrimaryDomain(data?.domain || null));

    supabase
      .from('platform_tenants')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle()
      .then(({ data }) => setTenantSlug(data?.slug || null));
  }, [tenantId]);

  const getPreviewUrl = () => {
    if (primaryDomain) return `https://${primaryDomain}`;
    if (tenantSlug) {
      const { protocol, host } = window.location;
      return `${protocol}//${host}?tenant=${tenantSlug}`;
    }
    return null;
  };

  const tabs = [
    { id: 'domains' as TabType, label: 'Custom Domains', icon: Globe },
    { id: 'email' as TabType, label: 'Email Address', icon: Mail },
    { id: 'design' as TabType, label: 'Site Design', icon: Palette },
    { id: 'nav' as TabType, label: 'Navigation', icon: Navigation },
    { id: 'content' as TabType, label: 'Page Content', icon: FileText },
    { id: 'seo' as TabType, label: 'SEO', icon: Search },
    { id: 'css' as TabType, label: 'Custom CSS', icon: Code },
    { id: 'settings' as TabType, label: 'Advanced', icon: Settings },
    { id: 'deploy' as TabType, label: 'Deployment', icon: Rocket },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'domains': return <DomainManagement />;
      case 'email': return <TenantEmailClaiming />;
      case 'design': return <SiteDesignEditor />;
      case 'nav': return <NavigationEditor />;
      case 'content': return <VisualPageBuilder />;
      case 'seo': return <SEOManager />;
      case 'css': return <CustomCSSEditor />;
      case 'settings': return <AdvancedSettings />;
      case 'deploy': return <DeploymentManager />;
      default: return null;
    }
  };

  const previewUrl = getPreviewUrl();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-t-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">White Label Platform</h1>
              <p className="text-slate-300 text-sm mt-0.5">
                Customize your branded website with custom domains and design your pages
              </p>
            </div>
          </div>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink size={15} />
              Preview Site
            </a>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-slate-700 overflow-x-auto">
          <nav className="flex space-x-1 px-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
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

        <div className="p-6 bg-slate-900">{renderContent()}</div>
      </div>
    </div>
  );
}
