import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle, Globe } from 'lucide-react';
import { getPlatformAdminUrl } from '../lib/tenantResolver';

export default function ClearNavLandingPage() {
  const navigateToAdmin = () => {
    window.location.href = getPlatformAdminUrl();
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
                onClick={navigateToAdmin}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Admin Login
              </button>
              <button
                onClick={navigateToContact}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all"
              >
                Get Started
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
                onClick={navigateToContact}
                className="group flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all text-lg font-medium"
              >
                <span>Request Demo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={navigateToAdmin}
                className="px-8 py-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-lg font-medium border border-slate-700"
              >
                Platform Login
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
                  onClick={navigateToContact}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  Get Started
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
            Join leading hedge funds using ClearNav to power their operations
          </p>
          <button
            onClick={navigateToContact}
            className="group inline-flex items-center space-x-2 px-10 py-5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all text-lg font-medium"
          >
            <span>Schedule a Demo</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
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
    </div>
  );
}
