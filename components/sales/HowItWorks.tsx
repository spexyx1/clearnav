import { UserPlus, Palette, ClipboardCheck, LayoutDashboard } from 'lucide-react';

const steps = [
  { icon: UserPlus, number: '1', title: 'Sign Up & Configure', desc: 'Set up your fund in 5 minutes with a guided onboarding flow.' },
  { icon: Palette, number: '2', title: 'Customize Your Portal', desc: 'Apply branding, colors, and connect your custom domain.' },
  { icon: ClipboardCheck, number: '3', title: 'Onboard Investors', desc: 'Automated compliance checks and document collection.' },
  { icon: LayoutDashboard, number: '4', title: 'Manage Everything', desc: 'Run all operations from one unified dashboard.' },
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">How It Works</h2>
          <p className="text-lg text-slate-500">Go from sign-up to a fully operational fund portal in under five minutes.</p>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-sky-200 via-sky-400 to-sky-200" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center relative">
                  <div className="relative z-10 w-14 h-14 rounded-full bg-sky-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-sky-200 mb-4">
                    {step.number}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">{step.title}</h3>
                  <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
