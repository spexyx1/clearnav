import React from 'react';
import { AlertCircle, Home } from 'lucide-react';
import { getPlatformAdminUrl } from '../lib/tenantResolver';

interface InvalidTenantProps {
  error: 'not_found' | 'inactive' | 'invalid_subdomain';
  subdomain: string | null;
}

export default function InvalidTenant({ error, subdomain }: InvalidTenantProps) {
  const adminUrl = getPlatformAdminUrl();

  const errorMessages = {
    not_found: {
      title: 'Tenant Not Found',
      description: `The subdomain "${subdomain}" does not exist or has not been set up yet.`,
      suggestion: 'Please check the URL and try again, or contact support if you believe this is an error.',
    },
    inactive: {
      title: 'Tenant Inactive',
      description: `The account for "${subdomain}" is currently inactive.`,
      suggestion: 'Please contact support to reactivate this account.',
    },
    invalid_subdomain: {
      title: 'Invalid Subdomain',
      description: `The subdomain "${subdomain}" is not valid.`,
      suggestion: 'Subdomains must be 3-63 characters long and contain only lowercase letters, numbers, and hyphens.',
    },
  };

  const message = errorMessages[error];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">{message.title}</h1>

          <p className="text-slate-300 mb-2">{message.description}</p>

          <p className="text-sm text-slate-400 mb-8">{message.suggestion}</p>

          <div className="space-y-3">
            <a
              href={adminUrl}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors w-full justify-center font-medium"
            >
              <Home className="w-5 h-5" />
              Go to Platform Home
            </a>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Refresh Page
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-500">
              Need help?{' '}
              <a href="mailto:support@clearnav.cv" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
