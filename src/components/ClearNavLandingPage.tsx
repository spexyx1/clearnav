import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle, Globe, HelpCircle, LineChart, CreditCard, Calculator, FileCheck, Bell, Lock, Bot, Layers, Brain, Rocket, Send, Calendar, Target, MessageSquare, Database, ShieldCheck } from 'lucide-react';
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
      title: 'NAV Calculation',
      description: 'Automated calculations with multi-share class support, waterfall structures, and carried interest tracking.',
    },
    {
      icon: CreditCard,
      title: 'Capital Operations',
      description: 'Complete workflows for capital calls, distributions, and redemptions with automated notifications.',
    },
    {
      icon: Users,
      title: 'White-Label Portals',
      description: 'Fully branded investor portals on custom domains with real-time dashboards and secure access.',
    },
    {
      icon: Lock,
      title: 'Compliance Center',
      description: 'Complete KYC/AML workflows with document verification, audit trails, and regulatory reporting.',
    },
    {
      icon: BarChart3,
      title: 'Performance Reporting',
      description: 'Automated investor statements, tear sheets, and performance reports with attribution analysis.',
    },
    {
      icon: FileCheck,
      title: 'Document Management',
      description: 'Secure storage for subscription agreements, PPMs, K-1s, and quarterly reports with version control.',
    },
    {
      icon: Globe,
      title: 'Broker Integration',
      description: 'Real-time portfolio synchronization with Interactive Brokers for positions, cash balances, and trades with automated reconciliation.',
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
      description: 'Perfect for emerging funds',
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
      description: 'For growing funds',
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
                className="text-slate-300 hover:text-white transition-colors"
              >
                FAQ
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
              White-label infrastructure for administrators. NAV calculation, capital operations, compliance, investor portals, and IBKR integration—launch in under 5 minutes.
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

          {/* Security & Infrastructure */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <div className="p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-lg mb-3 group-hover:bg-emerald-500/20 transition-colors">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">AES-256 Encryption</h3>
              <p className="text-slate-400 text-xs">Bank-grade encryption at rest and in transit</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-lg mb-3 group-hover:bg-emerald-500/20 transition-colors">
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Tenant Isolation</h3>
              <p className="text-slate-400 text-xs">Complete data separation per fund</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-lg mb-3 group-hover:bg-emerald-500/20 transition-colors">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Database Security</h3>
              <p className="text-slate-400 text-xs">Row-level security with audit logging</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-lg mb-3 group-hover:bg-emerald-500/20 transition-colors">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">SOC 2 Compliant</h3>
              <p className="text-slate-400 text-xs">Enterprise security standards</p>
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
          <div className="bg-slate-900 rounded-xl max-w-5xl w-full max-h-[85vh] overflow-y-auto border border-slate-800">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between z-10">
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
            <div className="p-8 space-y-10">

              {/* Platform Overview */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Rocket className="w-5 h-5 text-teal-400" />
                  <h3 className="text-xl font-bold text-white">Platform Overview</h3>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What is ClearNav?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      ClearNav is an enterprise fund operations platform providing complete infrastructure for investments and administrators. It includes NAV calculation, capital operations, compliance tools, IBKR integration, white-label investor portals, and automated reporting—everything needed to run fund operations without spreadsheets or manual processes.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">How quickly can we get started?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Your white-label portal can be live in under 5 minutes. Complete the onboarding questionnaire, configure your branding, and start inviting investors immediately. No technical setup or IT involvement required. Our self-service signup process guides you through fund setup, share class configuration, and initial investor onboarding.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Is this suitable for administrators?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Absolutely. The multi-tenant architecture is designed for administrators serving multiple clients. Each client fund operates as an isolated instance with separate data, branding, and custom domains. Manage dozens or hundreds of funds from a single platform admin portal with centralized billing and consolidated reporting. Volume pricing available for managing multiple funds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Features & Capabilities */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Zap className="w-5 h-5 text-teal-400" />
                  <h3 className="text-xl font-bold text-white">Features & Capabilities</h3>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">How does NAV calculation work?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      The NAV engine supports multiple share classes, waterfall distributions, carried interest calculations, and side pocket accounting. Calculations are automated based on your fund structure and update in real-time as portfolio values change through IBKR integration. The system handles complex fee structures including management fees, performance fees with high water marks, hurdle rates, and clawback provisions.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Does it integrate with Interactive Brokers?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. Our built-in IBKR integration syncs positions, cash balances, and trades in real-time. Portfolio data automatically updates NAV calculations and performance reporting without manual data entry. The system performs automated reconciliation between IBKR data and internal records, flagging discrepancies for review. Scheduled syncs run automatically at customizable intervals.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What capital operations are supported?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Complete workflows for capital calls, distributions, and redemptions with automated investor notifications, payment tracking, and capital account management. The system handles multi-share class structures and complex waterfall calculations automatically. Create capital calls with customizable payment terms, track investor commitments versus funded capital, process distribution requests with approval workflows, and manage redemption queues with gating provisions.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Can we use our own domain?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. The platform supports full white-label deployment with custom domains, your logo, color scheme, and company name. Each tenant operates as a completely isolated instance with its own subdomain or custom domain. You can configure custom email sender domains for investor communications, ensuring all emails appear to come directly from your fund.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What accounting integrations are available?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      ClearNav integrates with major accounting platforms including QuickBooks Online, Xero, and NetSuite. Automatically sync capital transactions, fee calculations, and investor distributions to your accounting system. The integration supports bi-directional data flow with configurable mapping for chart of accounts, classes, and departments. Journal entries are automatically generated and can be reviewed before posting.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">How does the AI BDR agent work?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Our AI-powered Business Development Representative agent automates lead engagement and qualification. The system monitors inbound inquiries, engages prospects through intelligent conversations, qualifies leads based on your criteria, and schedules meetings with your team. The AI agent learns from interactions and can be trained on your fund's specific messaging, investment strategy, and qualification criteria. All conversations are logged with sentiment analysis and lead scoring.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What CRM capabilities are included?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Built-in CRM with contact management, deal pipeline tracking, email campaigns, automated workflows, and task management. Track investor relationships from initial inquiry through onboarding and ongoing communications. Enhanced lead intelligence provides enrichment data, social profiles, company information, and engagement scoring. Email integration allows you to sync conversations and track all touchpoints with prospects and investors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security & Compliance */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                  <h3 className="text-xl font-bold text-white">Security & Compliance</h3>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Is the platform secure and compliant?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. ClearNav implements bank-grade AES-256 encryption for data at rest and in transit, multi-factor authentication, complete audit trails, and granular role-based access controls. Built-in KYC/AML workflows and document verification ensure compliance with regulatory requirements. Complete data isolation in multi-tenant architecture with row-level security ensures each fund's data is completely separated.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What security certifications does ClearNav have?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      ClearNav is SOC 2 Type II compliant, demonstrating adherence to strict security, availability, and confidentiality standards. Our infrastructure undergoes regular third-party security audits and penetration testing. We maintain compliance with GDPR, CCPA, and other data protection regulations. Annual security assessments and continuous monitoring ensure ongoing compliance.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">How is sensitive data protected?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      All sensitive investor data including SSNs, bank account details, and personal information is encrypted at the application level using AES-256 encryption before storage. Encryption keys are managed through a secure vault with automatic rotation. Access to sensitive data requires explicit permissions and is logged in immutable audit trails. Multi-factor authentication is enforced for all user accounts, and session security includes device fingerprinting and anomaly detection.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What audit and monitoring capabilities exist?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Comprehensive security audit system logs all user actions, data access, configuration changes, and system events. The audit trail is immutable and tamper-proof with cryptographic verification. Real-time security monitoring detects suspicious activities including failed login attempts, unusual data access patterns, and policy violations. Automated alerts notify administrators of critical security events. Full audit reports can be generated for compliance reviews and regulatory examinations.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">How does tenant isolation work?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Each fund operates as a completely isolated tenant with separate databases, authentication realms, and access controls. Row-level security policies enforce data separation at the database level, making it impossible for one tenant to access another tenant's data. Staff accounts are scoped to specific tenants, and platform administrators can only access tenant data through explicit audit-logged actions. Cross-tenant data leakage is prevented through multiple layers of isolation.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What compliance workflows are supported?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Built-in KYC/AML workflows with automated document collection, identity verification, accredited investor qualification, and risk assessment. Configurable approval processes with multi-level review and electronic signatures. Automated compliance monitoring flags suspicious activities and generates regulatory reports. Document retention policies ensure proper archival of required records. Integration with third-party verification services for enhanced due diligence.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing & Billing */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <CreditCard className="w-5 h-5 text-teal-400" />
                  <h3 className="text-xl font-bold text-white">Pricing & Billing</h3>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">How does pricing work?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Simple flat monthly fees with no per-user charges. Starter plan at $299/month supports up to 25 clients, Professional at $599/month for up to 100 clients, and Enterprise at $1,299/month for unlimited clients. All plans include the complete feature set with differences only in client limits, storage, and support level. No setup fees, no hidden costs, and you can upgrade or downgrade anytime.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Is there a free trial?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. All new accounts receive a 14-day free trial with full access to all platform features. No credit card required to start the trial. You can test the complete system including NAV calculations, investor portal, IBKR integration, and all administrative functions before committing to a paid plan.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What's included in each plan?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Starter includes CRM, onboarding tools, compliance workflows, tax document management, and email support. Professional adds IBKR integration, custom domain, increased storage, and priority support. Enterprise includes API access, unlimited storage, dedicated support, custom integrations, and white-glove onboarding assistance. All plans include unlimited staff users and the full feature set—only client limits and support levels differ.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Are there volume discounts for administrators?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. Administrators and multi-fund organizations can receive volume pricing when managing multiple client funds. Contact our sales team for custom pricing based on the number of funds under administration. Volume discounts typically start at 5+ funds with increasing discounts at higher volumes.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What payment methods are accepted?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      We accept all major credit cards, ACH transfers, and wire transfers for annual subscriptions. Invoicing is available for Enterprise customers. Annual prepayment receives a 15% discount. All billing is handled securely through encrypted payment processing with PCI DSS compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Support & Migration */}
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Users className="w-5 h-5 text-teal-400" />
                  <h3 className="text-xl font-bold text-white">Support & Migration</h3>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">What support is available?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Email support for Starter plan, priority email and chat support for Professional, and dedicated support with phone access for Enterprise. All plans include comprehensive documentation, video tutorials, and access to our knowledge base. Enterprise customers receive a dedicated account manager and white-glove onboarding assistance.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Can you help migrate from our current system?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. We provide migration assistance to help transfer your existing data from spreadsheets, legacy systems, or other fund administration platforms. Our team can help map your current data structure, import historical transactions, and validate the migration. Enterprise customers receive hands-on migration support including data extraction, transformation, and validation.
                    </p>
                  </div>
                  <div className="border-b border-slate-800 pb-6">
                    <h4 className="text-lg font-semibold text-white mb-2">Is training provided?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Yes. All new customers receive onboarding training covering platform navigation, key workflows, and best practices. Professional and Enterprise plans include additional training sessions for your team. We offer both live training sessions and self-paced video courses covering all aspects of the platform. Custom training programs available for larger organizations.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">What if we need custom features?</h4>
                    <p className="text-slate-400 leading-relaxed">
                      Enterprise customers can request custom features and integrations. We offer professional services for custom development including specialized reporting, unique workflow requirements, and integration with proprietary systems. Our API allows you to build your own integrations and extend the platform to meet specific needs. Contact our team to discuss your requirements and receive a custom quote.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
