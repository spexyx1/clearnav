import { Mail, Info, Shield } from 'lucide-react';
import EmailClient from '../manager/EmailClient';

const PLATFORM_ACCOUNTS = [
  {
    address: 'info@clearnav.cv',
    description: 'General platform inquiries, onboarding questions, and public-facing correspondence.',
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    address: 'compliance@clearnav.cv',
    description: 'Regulatory matters, AML/KYC escalations, audit requests, and legal correspondence.',
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

export default function PlatformEmailInbox() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Platform Inbox</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage the official ClearNav platform email addresses assigned to your account.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLATFORM_ACCOUNTS.map(({ address, description, icon: Icon, color, bg }) => (
          <div key={address} className={`flex items-start gap-3 p-4 rounded-xl border ${bg}`}>
            <div className={`mt-0.5 flex-shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${color}`}>{address}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
          <Mail className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">Email Client</span>
          <span className="ml-auto text-xs text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full">
            Platform accounts only
          </span>
        </div>
        <EmailClient />
      </div>
    </div>
  );
}
