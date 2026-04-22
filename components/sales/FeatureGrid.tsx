import {
  Calculator, Wallet, Settings, Layers,
  Users, Mail, Megaphone, BarChart3, FileText,
  Shield, FolderLock, UserCog, ListTodo, ClipboardCheck,
} from 'lucide-react';

const categories = [
  {
    title: 'Fund Operations',
    icon: Calculator,
    color: 'sky',
    features: [
      { icon: Calculator, name: 'NAV Calculation Engine', desc: 'Automated daily NAV with multi-share class support, side pockets, and high water marks.' },
      { icon: Wallet, name: 'Capital Operations', desc: 'Capital calls, distributions, redemptions, and subscription tracking in real time.' },
      { icon: Settings, name: 'Fee Automation', desc: 'Management fees, performance fees, carried interest, hurdle rates, and waterfalls.' },
      { icon: Layers, name: 'Share Class Management', desc: 'Multiple share classes with independent fee structures and allocation rules.' },
    ],
  },
  {
    title: 'Investor Experience',
    icon: Users,
    color: 'teal',
    features: [
      { icon: Users, name: 'CRM & Pipeline', desc: 'Lead tracking, pipeline management, and investor engagement analytics.' },
      { icon: Mail, name: 'Communications', desc: 'Newsletters, secure messaging, and automated investor notifications.' },
      { icon: Megaphone, name: 'Campaign Builder', desc: 'Multi-step investor outreach campaigns with performance tracking.' },
      { icon: BarChart3, name: 'Performance Reporting', desc: 'Automated investor statements, quarterly reports, and custom templates.' },
      { icon: FileText, name: 'Tax Documents', desc: 'K-1, 1099, and international tax document generation and distribution.' },
    ],
  },
  {
    title: 'Compliance & Administration',
    icon: Shield,
    color: 'emerald',
    features: [
      { icon: ClipboardCheck, name: 'KYC/AML Compliance', desc: 'Accredited investor verification, document collection, and regulatory workflows.' },
      { icon: FolderLock, name: 'Document Vault', desc: 'Version-controlled storage with e-signatures and granular access controls.' },
      { icon: UserCog, name: 'Staff & Roles', desc: 'Role-based access with granular permissions across your entire organization.' },
      { icon: ListTodo, name: 'Task Management', desc: 'Compliance task tracking with deadlines, assignments, and audit trails.' },
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; heading: string }> = {
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-600', heading: 'text-sky-800' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600', heading: 'text-teal-800' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', heading: 'text-emerald-800' },
};

export default function FeatureGrid() {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Complete Feature Suite</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">Everything you need to run fund operations, serve investors, and stay compliant -- in one platform.</p>
        </div>
        <div className="space-y-12">
          {categories.map((cat, ci) => {
            const CatIcon = cat.icon;
            const c = colorMap[cat.color];
            return (
              <div key={ci}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center ${c.icon}`}>
                    <CatIcon className="w-5 h-5" />
                  </div>
                  <h3 className={`text-2xl font-bold ${c.heading}`}>{cat.title}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cat.features.map((f, fi) => {
                    const FIcon = f.icon;
                    return (
                      <div
                        key={fi}
                        className={`bg-white border ${c.border} rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                      >
                        <FIcon className={`w-5 h-5 ${c.icon} mb-3`} />
                        <h4 className="font-semibold text-slate-900 mb-1.5">{f.name}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
