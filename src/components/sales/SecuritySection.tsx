import { Lock, FileCheck, Shield, Globe, ClipboardList, Award } from 'lucide-react';

const badges = [
  { icon: Lock, title: 'AES-256 Encryption', subtitle: 'Bank-Grade Protection' },
  { icon: FileCheck, title: 'SOC 2 Type II Certified', subtitle: 'Independently Audited' },
  { icon: Shield, title: 'Multi-Factor Authentication', subtitle: 'Enforced for All Users' },
  { icon: Globe, title: 'Complete Tenant Isolation', subtitle: 'Row-Level Security' },
  { icon: ClipboardList, title: 'Immutable Audit Trails', subtitle: 'Every Action Logged' },
  { icon: Award, title: 'GDPR & CCPA Compliant', subtitle: 'Global Data Protection' },
];

export default function SecuritySection() {
  return (
    <section className="py-20 px-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Enterprise-Grade Security</h2>
          <p className="text-lg text-slate-400">Your data is protected by the same standards used by the world's largest financial institutions.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex items-center gap-4 transition-all duration-200 hover:border-sky-500/40">
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="font-semibold text-white">{badge.title}</div>
                  <div className="text-sm text-slate-400">{badge.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
