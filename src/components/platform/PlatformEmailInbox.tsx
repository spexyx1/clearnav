import { useState } from 'react';
import { Info, Shield } from 'lucide-react';
import EmailClient from '../manager/EmailClient';

const PLATFORM_ACCOUNTS = [
  {
    id: '00000000-0000-0000-0001-000000000001',
    address: 'info@clearnav.cv',
    label: 'Info',
    description: 'General platform inquiries, onboarding questions, and public-facing correspondence.',
    icon: Info,
    color: 'text-blue-400',
    activeBg: 'bg-blue-600',
    inactiveBg: 'bg-slate-800 border border-slate-700 hover:border-blue-500/50',
  },
  {
    id: '00000000-0000-0000-0001-000000000002',
    address: 'compliance@clearnav.cv',
    label: 'Compliance',
    description: 'Regulatory matters, AML/KYC escalations, audit requests, and legal correspondence.',
    icon: Shield,
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-600',
    inactiveBg: 'bg-slate-800 border border-slate-700 hover:border-emerald-500/50',
  },
];

export default function PlatformEmailInbox() {
  const [activeId, setActiveId] = useState(PLATFORM_ACCOUNTS[0].id);

  return (
    <div className="flex flex-col h-full">
      {/* Account tab bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-6 pt-5 pb-3">
        {PLATFORM_ACCOUNTS.map(({ id, address, label, icon: Icon, color, activeBg, inactiveBg }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => setActiveId(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? `${activeBg} text-white shadow-md`
                  : `${inactiveBg} text-slate-400 hover:text-slate-200`
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : color}`} />
              {label}
              <span className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                {address}
              </span>
            </button>
          );
        })}
      </div>

      {/* EmailClient — key forces remount when account changes so it opens the correct inbox */}
      <div className="flex-1 min-h-0">
        <EmailClient key={activeId} initialAccountId={activeId} />
      </div>
    </div>
  );
}
