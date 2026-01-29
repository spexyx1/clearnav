import React, { useState } from 'react';
import { Globe, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getTenantUrl, getPlatformAdminUrl } from '../../lib/tenantResolver';

export default function TenantSubdomainInfo() {
  const { currentTenant } = useAuth();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!currentTenant) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <p>No tenant information available</p>
        </div>
      </div>
    );
  }

  const tenantUrl = getTenantUrl(currentTenant.slug);
  const adminUrl = getPlatformAdminUrl();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Tenant Access Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tenant Name
            </label>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <p className="text-white font-medium">{currentTenant.company_name}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Subdomain Slug
            </label>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <code className="text-cyan-400 font-mono">{currentTenant.slug}</code>
                <button
                  onClick={() => copyToClipboard(currentTenant.slug, 'slug')}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {copiedUrl === 'slug' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Client Portal URL
            </label>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <a
                  href={tenantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors flex-1 truncate font-mono text-sm"
                >
                  {tenantUrl}
                </a>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(tenantUrl, 'url')}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    {copiedUrl === 'url' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <a
                    href={tenantUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Share this URL with your clients to access their portal
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Status
            </label>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    currentTenant.status === 'active'
                      ? 'bg-green-400'
                      : currentTenant.status === 'trial'
                      ? 'bg-yellow-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-white capitalize">{currentTenant.status}</span>
              </div>
            </div>
          </div>

          {currentTenant.subscription_tier && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Subscription Tier
              </label>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-white capitalize">{currentTenant.subscription_tier}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-400 mb-1">
              White-Label Branding
            </h3>
            <p className="text-sm text-slate-300">
              Your clients will see your company name and branding when they access the portal.
              Customize your logo and colors in the Branding settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
