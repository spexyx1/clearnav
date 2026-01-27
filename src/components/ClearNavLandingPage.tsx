import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle, Globe, HelpCircle } from 'lucide-react';
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
      icon: BarChart3,
      title: 'Complete Portfolio Management',
      description: 'Real-time portfolio tracking, performance analytics, and comprehensive reporting tools for hedge fund managers and their clients.',
    },
    {
      icon: Shield,
      title: 'Enterprise-Grade Security',
      description: 'Bank-level security with advanced compliance tools, KYC/AML workflows, and comprehensive audit trails.',
    },
    {
      icon: Users,
      title: 'Client Relationship Management',
      description: 'Built-in CRM, onboarding workflows, and communication tools designed specifically for hedge fund operations.',
    },
    {
      icon: Zap,
      title: 'IBKR Integration',
      description: 'Seamless Interactive Brokers integration for automated portfolio syncing and real-time position tracking.',
    },
    {
      icon: Globe,
      title: 'Multi-Tenant Architecture',
      description: 'Each hedge fund gets their own isolated instance with custom branding, domains, and complete data separation.',
    },
    {
      icon: CheckCircle,
      title: 'White-Label Ready',
      description: 'Fully customizable branding, landing pages, and email templates. Make it your own.',
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
              The Complete
              <span className="block mt-2 font-semibold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                Hedge Fund Platform
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-12 leading-relaxed">
              Launch your hedge fund platform in minutes. Complete portfolio management, CRM, compliance tools, and IBKR integration—all in one multi-tenant SaaS solution.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={navigateToSignup}
                className="group flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all text-lg font-medium shadow-lg shadow-blue-500/25"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={navigateToContact}
                className="px-8 py-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-lg font-medium border border-slate-700"
              >
                Request Demo
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-teal-400 mb-2">99.9%</div>
              <div className="text-slate-400">Uptime SLA</div>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-blue-400 mb-2">SOC 2</div>
              <div className="text-slate-400">Certified Secure</div>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <div className="text-4xl font-bold text-teal-400 mb-2">24/7</div>
              <div className="text-slate-400">Support Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-white mb-4">
              Everything You Need to <span className="font-semibold">Run Your Hedge Fund</span>
            </h2>
            <p className="text-xl text-slate-400">
              Built by hedge fund operators, for hedge fund operators
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
            Ready to Launch Your <span className="font-semibold">Hedge Fund Platform?</span>
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Join leading hedge funds using ClearNav to power their operations. Start your 30-day free trial today.
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
                  ClearNav is a complete SaaS platform built for hedge fund managers and investors. It provides portfolio management, CRM, compliance tools, IBKR integration, and a white-label investor portal—everything needed to run a modern hedge fund operation.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">How quickly can we launch our platform?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Most hedge funds go live within days. You get a fully branded, multi-tenant instance, custom domain setup, and complete investor portal with a single subscription. No lengthy implementation process—just configure your branding and start onboarding investors.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What's included in each pricing tier?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Starter includes CRM, compliance tools, and document management. Professional adds IBKR integration and custom domains. Enterprise includes API access, unlimited storage, and dedicated support. All tiers include investor portal access and full white-labeling capabilities.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Does ClearNav integrate with Interactive Brokers?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. Professional and Enterprise plans include seamless IBKR integration for real-time portfolio syncing, automated position tracking, and accurate performance calculations. Starter tier can integrate custom data sources.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is our data secure?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Absolutely. We maintain SOC 2 certification, bank-level encryption, multi-factor authentication, comprehensive audit trails, and complete data isolation in our multi-tenant architecture. Each hedge fund's data is completely separated from others.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can we customize the platform for our fund?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. Full white-labeling means complete brand customization, custom domains, tailored email templates, and branding throughout the investor portal. Enterprise plans include custom integrations and API access for additional flexibility.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What's the difference between a subdomain and custom domain?</h3>
                <p className="text-slate-400 leading-relaxed">
                  All plans include a clearnav.cv subdomain (e.g., yourfund.clearnav.cv). Professional and Enterprise plans support custom domains (e.g., investors.yourfund.com) for complete brand consistency.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What support do you provide?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Starter includes email support. Professional includes priority support. Enterprise includes dedicated account management and 24/7 support. All plans include comprehensive documentation and our onboarding team helps you get set up quickly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
