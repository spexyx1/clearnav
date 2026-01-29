import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle, Globe, HelpCircle, LineChart, CreditCard, Calculator, FileCheck, Bell, Lock } from 'lucide-react';
import { useState } from 'react';

interface ClearNavLandingPageProps {
  onLoginClick: () => void;
}

export default function ClearNavLandingPage({ onLoginClick }: ClearNavLandingPageProps) {
  const [showFAQ, setShowFAQ] = useState(false);

  const navigateToSignup = () => {
    window.location.href = '/signup';
  };

  const navigateToContact = () => {
    window.location.hash = '#contact';
    window.scrollTo({ top: document.getElementById('contact')?.offsetTop || 0, behavior: 'smooth' });
  };

  const features = [
    {
      icon: LineChart,
      title: 'NAV Calculation Engine',
      description: 'Automated net asset value calculations with multi-share class support, waterfall structures, carried interest tracking, and side pocket accounting.',
    },
    {
      icon: CreditCard,
      title: 'Capital Operations',
      description: 'Complete workflows for capital calls, distributions, and redemptions with automated investor notifications and payment tracking.',
    },
    {
      icon: Globe,
      title: 'IBKR Integration',
      description: 'Real-time Interactive Brokers portfolio syncing for positions, cash balances, and trades with automated reconciliation.',
    },
    {
      icon: Users,
      title: 'White-Label Portals',
      description: 'Fully branded investor portals on custom domains with real-time dashboards, document access, and secure communication.',
    },
    {
      icon: Lock,
      title: 'Compliance Center',
      description: 'Complete KYC/AML workflows with document verification, accreditation tracking, audit trails, and regulatory reporting.',
    },
    {
      icon: FileCheck,
      title: 'Document Management',
      description: 'Secure storage and distribution for subscription agreements, PPMs, K-1s, quarterly reports with version control.',
    },
    {
      icon: BarChart3,
      title: 'Performance Reporting',
      description: 'Automated generation of investor statements, tear sheets, and performance reports with attribution analysis.',
    },
    {
      icon: Calculator,
      title: 'Fee Automation',
      description: 'Intelligent management and performance fee calculations with high water marks and customizable structures.',
    },
    {
      icon: Bell,
      title: 'Investor Relations',
      description: 'Built-in CRM with contact management, email campaigns, automated notifications, and secure two-way messaging.',
    },
  ];

  const pricing = [
    {
      name: 'Starter',
      price: '$299',
      description: 'Perfect for emerging hedge funds',
      features: [
        'Up to 25 clients',
        'CRM & onboarding tools',
        'Compliance workflows',
        'Tax document management',
        '10GB storage',
        'Email support',
      ],
    },
    {
      name: 'Professional',
      price: '$599',
      description: 'For growing hedge funds',
      features: [
        'Up to 100 clients',
        'Everything in Starter',
        'IBKR integration',
        'Custom domain',
        '50GB storage',
        'Priority support',
      ],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$1,299',
      description: 'For established funds',
      features: [
        'Unlimited clients',
        'Everything in Professional',
        'API access',
        'Unlimited storage',
        'Dedicated support',
        'Custom integrations',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-sm"></div>
              <span className="text-2xl font-light tracking-wider text-white">
                Clear<span className="font-semibold">Nav</span>
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">
                Pricing
              </a>
              <button
                onClick={() => setShowFAQ(true)}
                className="text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <HelpCircle className="w-4 h-4" />
                <span>FAQ</span>
              </button>
              <button
                onClick={onLoginClick}
                className="px-5 py-2 text-slate-300 hover:text-white transition-all duration-200 font-medium border border-slate-700 hover:border-slate-500 rounded-lg hover:bg-slate-800/50"
              >
                Login
              </button>
              <button
                onClick={navigateToSignup}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl font-light text-white mb-6 leading-tight">
              Complete Fund Operations
              <span className="block mt-2 font-semibold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                All-in-One Platform
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-12 leading-relaxed">
              White-label infrastructure for hedge funds and fund administrators. NAV calculation, capital operations, compliance, investor portals, and IBKR integration—launch in under 5 minutes.
            </p>
            <div className="flex justify-center">
              <button
                onClick={navigateToSignup}
                className="group flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all text-lg font-medium shadow-lg shadow-blue-500/25"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-teal-400 mb-2">&lt;5 min</div>
              <div className="text-slate-400">Setup Time</div>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-blue-400 mb-2">20+</div>
              <div className="text-slate-400">Automated Workflows</div>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-teal-400 mb-2">Bank-Grade</div>
              <div className="text-slate-400">Security</div>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-blue-400 mb-2">99.9%</div>
              <div className="text-slate-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-white mb-4">
              Complete Back-Office <span className="font-semibold">In One System</span>
            </h2>
            <p className="text-xl text-slate-400">
              Replace spreadsheets and disparate tools with enterprise-grade infrastructure built for fund operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-8 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-teal-500/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-white mb-4">
              Simple, <span className="font-semibold">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-slate-400">
              Flat monthly fees. No per-user charges. No surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-xl border ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-blue-900/20 to-teal-900/20 border-teal-500 scale-105'
                    : 'bg-slate-800/30 border-slate-700/50'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-teal-400 text-sm font-semibold mb-4">MOST POPULAR</div>
                )}
                <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={navigateToSignup}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-6 bg-gradient-to-r from-blue-900/20 to-teal-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-light text-white mb-6">
            Ready to <span className="font-semibold">Transform Operations?</span>
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Join forward-thinking fund managers who have eliminated spreadsheets and manual processes. Launch your white-label portal in minutes.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={navigateToSignup}
              className="group inline-flex items-center space-x-2 px-10 py-5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all text-lg font-medium shadow-lg shadow-blue-500/25"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={navigateToContact}
              className="inline-flex items-center space-x-2 px-10 py-5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-lg font-medium border border-slate-700"
            >
              <span>Schedule a Demo</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-sm"></div>
              <span className="text-xl font-light tracking-wider text-white">
                Clear<span className="font-semibold">Nav</span>
              </span>
            </div>
            <div className="text-slate-400">
              © 2026 ClearNav. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {showFAQ && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-slate-800">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-6 h-6 text-teal-400" />
                <h2 className="text-2xl font-semibold text-white">Frequently Asked Questions</h2>
              </div>
              <button onClick={() => setShowFAQ(false)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What is ClearNav?</h3>
                <p className="text-slate-400 leading-relaxed">
                  ClearNav is an enterprise fund operations platform providing complete infrastructure for hedge funds and fund administrators. It includes NAV calculation, capital operations, compliance tools, IBKR integration, white-label investor portals, and automated reporting—everything needed to run fund operations.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">How quickly can we get started?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Your white-label portal can be live in under 5 minutes. Complete the onboarding questionnaire, configure your branding, and start inviting investors immediately. No technical setup or IT involvement required.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">How does NAV calculation work?</h3>
                <p className="text-slate-400 leading-relaxed">
                  The NAV engine supports multiple share classes, waterfall distributions, carried interest calculations, and side pocket accounting. Calculations are automated based on your fund structure and update in real-time as portfolio values change through IBKR integration.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Does it integrate with Interactive Brokers?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. Our built-in IBKR integration syncs positions, cash balances, and trades in real-time. Portfolio data automatically updates NAV calculations and performance reporting without manual data entry.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is the platform secure and compliant?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. Bank-grade encryption, multi-factor authentication, complete audit trails, and role-based access controls. Built-in KYC/AML workflows and document verification ensure compliance with regulatory requirements. Complete data isolation in multi-tenant architecture.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can we use our own domain?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. The platform supports full white-label deployment with custom domains, your logo, color scheme, and company name. Each tenant operates as a completely isolated instance with its own subdomain or custom domain.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What capital operations are supported?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Complete workflows for capital calls, distributions, and redemptions with automated investor notifications, payment tracking, and capital account management. The system handles multi-share class structures and complex waterfall calculations automatically.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Is this suitable for fund administrators?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Absolutely. The multi-tenant architecture is designed for fund administrators serving multiple clients. Each client fund operates as an isolated instance with separate data, branding, and custom domains. Volume pricing available for managing multiple funds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
