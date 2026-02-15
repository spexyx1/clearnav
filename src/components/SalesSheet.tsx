import { ArrowLeft, Shield, Lock, Award, FileCheck, Globe, Clock } from 'lucide-react';

interface SalesSheetProps {
  onBack: () => void;
}

export default function SalesSheet({ onBack }: SalesSheetProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-sky-500 to-teal-500 text-white py-16 px-6 relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center space-x-2 text-white hover:bg-white/10 px-4 py-2 rounded transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">ClearNav</h1>
          <div className="text-2xl md:text-3xl font-light mb-6">Complete Fund Operations Platform - All-in-One Infrastructure</div>
          <div className="text-lg md:text-xl">
            clearnav.io | sales@clearnav.io | (555) 123-4567
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-4 border-sky-500 rounded-xl p-10 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-sky-900 mb-10">Replace Your $150K Fund Administrator with a $600/Month Platform</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border-2 border-sky-500 rounded-lg p-8">
              <div className="text-5xl font-bold text-sky-500 mb-3">95%</div>
              <div className="text-lg font-semibold text-gray-900">Cost Reduction vs. Traditional Administrators</div>
            </div>
            <div className="bg-white border-2 border-sky-500 rounded-lg p-8">
              <div className="text-5xl font-bold text-sky-500 mb-3">5 Minutes</div>
              <div className="text-lg font-semibold text-gray-900">Launch Time vs. 3-6 Month Onboarding</div>
            </div>
            <div className="bg-white border-2 border-sky-500 rounded-lg p-8">
              <div className="text-5xl font-bold text-sky-500 mb-3">All-in-One</div>
              <div className="text-lg font-semibold text-gray-900">Platform Replacing 5+ Separate Tools</div>
            </div>
          </div>
        </div>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-8 pb-4 border-b-4 border-sky-500">Comprehensive Feature Suite</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📊', title: 'NAV Calculation Engine', description: 'Automated daily NAV calculations with multi-share class support, side pockets, and waterfall distributions. Handles complex fee structures including management fees, performance fees, and high water marks.' },
              { icon: '💰', title: 'Capital Operations', description: 'Complete capital account management with automated capital calls, distributions, redemptions, and subscription tracking. Real-time balance calculations and transaction histories.' },
              { icon: '🎨', title: 'White-Label Investor Portals', description: 'Launch professional, branded investor portals on your custom domain in minutes. Complete control over branding, colors, and content. Mobile-responsive design for 24/7 access.' },
              { icon: '✅', title: 'Compliance Center', description: 'Built-in KYC/AML workflows, accredited investor verification, document collection, and regulatory reporting. Automated compliance task management with audit trails.' },
              { icon: '🔗', title: 'Interactive Brokers Integration', description: 'Real-time portfolio synchronization with IBKR accounts. Automatic position updates, transaction imports, and P&L reconciliation. Supports multiple broker accounts.' },
              { icon: '💬', title: 'Investor Relations CRM', description: 'Complete CRM with lead tracking, pipeline management, investor communications, and engagement analytics. Built-in messaging and newsletter system with AI-powered BDR agent.' },
              { icon: '📈', title: 'Performance Reporting', description: 'Automated generation of investor statements, performance reports, tax documents (K-1s, 1099s), and quarterly reports. Custom report templates with white-label branding.' },
              { icon: '📁', title: 'Document Management', description: 'Secure document vault with version control, e-signature integration, and automated distribution. Organize by investor, fund, or document type with granular access controls.' },
              { icon: '⚙️', title: 'Fee Automation', description: 'Automated calculation and tracking of management fees, performance fees, carried interest, and hurdle rates. Supports crystallization, clawback provisions, and complex waterfall structures.' },
            ].map((feature, index) => (
              <div key={index} className="bg-slate-50 border-l-4 border-sky-500 p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h4 className="text-xl font-semibold text-sky-900 mb-3">{feature.title}</h4>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-8 pb-4 border-b-4 border-sky-500">Enterprise-Grade Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Lock className="w-8 h-8" />, text: 'AES-256 Encryption\nBank-Grade Protection' },
              { icon: <FileCheck className="w-8 h-8" />, text: 'SOC 2 Type II Certified\nIndependently Audited' },
              { icon: <Shield className="w-8 h-8" />, text: 'Multi-Factor Authentication\nEnforced for All Users' },
              { icon: <Globe className="w-8 h-8" />, text: 'Complete Tenant Isolation\nRow-Level Security' },
              { icon: <FileCheck className="w-8 h-8" />, text: 'Immutable Audit Trails\nEvery Action Logged' },
              { icon: <Award className="w-8 h-8" />, text: 'GDPR & CCPA Compliant\nGlobal Data Protection' },
            ].map((badge, index) => (
              <div key={index} className="bg-gradient-to-br from-teal-700 to-sky-900 text-white p-6 rounded-lg text-center font-semibold flex flex-col items-center justify-center space-y-3">
                {badge.icon}
                <div className="whitespace-pre-line">{badge.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-8 pb-4 border-b-4 border-sky-500">Competitive Comparison: ClearNav vs. Traditional Fund Administrators</h2>
          <div className="overflow-x-auto shadow-lg rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-sky-500 to-teal-500 text-white">
                  <th className="py-4 px-6 text-left text-lg font-semibold">Feature</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold">ClearNav</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold">Traditional (SS&C, Citco, Northern Trust, BNY Mellon)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Annual Cost', clearnav: '$3,600 - $15,600', traditional: '$50,000 - $200,000+' },
                  { feature: 'Setup Time', clearnav: '5 Minutes', traditional: '3-6 Months' },
                  { feature: 'Implementation Cost', clearnav: '$0', traditional: '$10,000 - $50,000' },
                  { feature: 'White-Label Portal', clearnav: '✓ Full Control', traditional: '✗ Limited or Co-Branded' },
                  { feature: 'Real-Time Data', clearnav: '✓ Instant Updates', traditional: '✗ Batch Processing (24-48hr delay)' },
                  { feature: 'Custom Branding', clearnav: '✓ Complete Customization', traditional: '✗ Generic Templates' },
                  { feature: 'Secondary Market', clearnav: '✓ Built-In Exchange', traditional: '✗ Not Available' },
                  { feature: 'Contract Length', clearnav: 'Monthly (Cancel Anytime)', traditional: '3-5 Years (Long-Term Lock-In)' },
                  { feature: 'Technology Stack', clearnav: 'Modern Cloud-Native', traditional: 'Legacy Systems (1990s-2000s)' },
                  { feature: 'API Access', clearnav: '✓ Full API & Webhooks', traditional: '✗ Limited or No API' },
                  { feature: 'Account Manager', clearnav: 'Self-Service + Support', traditional: 'Dedicated (Added Cost)' },
                  { feature: 'Pricing Model', clearnav: 'Transparent Flat Fee', traditional: 'Opaque AUM-Based Pricing' },
                ].map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-4 px-6 font-semibold">{row.feature}</td>
                    <td className="py-4 px-6 bg-green-50 font-semibold text-green-900">{row.clearnav}</td>
                    <td className="py-4 px-6 text-red-900">{row.traditional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-8 pb-4 border-b-4 border-sky-500">ROI Analysis & Cost Savings</h2>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-green-500 rounded-xl p-10">
            <h3 className="text-3xl font-bold text-green-900 text-center mb-10">Annual Savings Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-2xl font-semibold mb-4 text-red-900 text-center">Traditional Approach</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Fund Administrator', value: '$100,000' },
                    { label: 'CRM Software', value: '$10,000' },
                    { label: 'Compliance Software', value: '$8,000' },
                    { label: 'Document Management', value: '$5,000' },
                    { label: 'Reporting Tools', value: '$7,000' },
                    { label: 'Staff Time (Manual Work)', value: '$40,000' },
                  ].map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded flex justify-between">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                  <div className="bg-red-100 p-5 rounded font-bold text-xl flex justify-between">
                    <span>Total Annual Cost</span>
                    <strong>$170,000</strong>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-semibold mb-4 text-green-900 text-center">ClearNav Platform</h4>
                <div className="space-y-3">
                  {[
                    { label: 'ClearNav Professional', value: '$7,200' },
                    { label: 'All Features Included', value: '$0' },
                    { label: 'Setup & Onboarding', value: '$0' },
                    { label: 'Additional Software', value: '$0' },
                    { label: 'Integration Costs', value: '$0' },
                    { label: 'Staff Time Saved', value: '-$32,000' },
                  ].map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded flex justify-between">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                  <div className="bg-green-100 p-5 rounded font-bold text-xl flex justify-between">
                    <span>Total Annual Cost</span>
                    <strong>$7,200</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-green-500 text-white p-6 text-center text-3xl font-bold rounded-lg mt-8">
              Net Annual Savings: $162,800 | 3-Year Savings: $488,400
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-8 pb-4 border-b-4 border-sky-500">Novel Liquidity Generation: Built-In Secondary Marketplace</h2>
          <div className="bg-slate-50 p-8 rounded-xl">
            <p className="text-xl text-sky-900 font-semibold mb-6">
              ClearNav includes a unique feature that traditional fund administrators like SS&C, Citco, Northern Trust, and BNY Mellon cannot provide: an integrated secondary marketplace for fund interests.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Peer-to-Peer Trading', description: 'Enable investors to trade fund interests directly with each other, reducing redemption pressure and improving fund liquidity without impacting your AUM.' },
                { title: 'Tokenization Ready', description: 'Convert fund interests into digital assets for enhanced tradability, fractional ownership, and automated settlement processes.' },
                { title: 'Secure Escrow Processing', description: 'Built-in escrow and transaction processing ensures secure, compliant transfers with automated documentation and regulatory reporting.' },
                { title: 'Market-Driven Price Discovery', description: 'Allow market forces to establish secondary market prices, providing real-time valuation insights and transparency for your fund.' },
                { title: 'Regulatory Compliance Built-In', description: 'Automated approval workflows ensure all transfers comply with fund documents, right of first refusal provisions, and regulatory requirements.' },
                { title: 'Competitive Advantage', description: 'Offer investors liquidity options that aren\'t available from traditional administrators, making your fund more attractive to sophisticated investors.' },
              ].map((item, index) => (
                <div key={index} className="bg-white p-5 border-l-4 border-sky-500 rounded">
                  <strong className="text-sky-900 block mb-2">{item.title}</strong>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-bold text-sky-900 mb-8 pb-4 border-b-4 border-sky-500">Transparent Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter',
                price: '$299',
                period: 'per month',
                popular: false,
                features: ['Up to 25 investors', 'Single fund', 'White-label portal', 'NAV calculation', 'Capital operations', 'Document management', 'Basic reporting', 'Email support'],
              },
              {
                name: 'Professional',
                price: '$599',
                period: 'per month',
                popular: true,
                features: ['Up to 100 investors', 'Multiple funds', 'Everything in Starter, plus:', 'IBKR integration', 'Advanced reporting', 'CRM & investor relations', 'Compliance center', 'Secondary marketplace', 'Priority support'],
              },
              {
                name: 'Enterprise',
                price: '$1,299',
                period: 'per month',
                popular: false,
                features: ['Unlimited investors', 'Unlimited funds', 'Everything in Professional, plus:', 'Multi-tenant management', 'Custom integrations', 'AI BDR agent', 'Advanced analytics', 'Dedicated support', 'Custom SLA'],
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white border-2 rounded-xl p-8 text-center shadow-lg relative ${
                  plan.popular ? 'border-sky-500 border-4 transform scale-105' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-sky-500 text-white px-6 py-1 rounded-full text-sm font-semibold">
                    MOST POPULAR
                  </div>
                )}
                <h4 className="text-2xl font-bold text-sky-900 mb-4">{plan.name}</h4>
                <div className="text-5xl font-bold text-sky-500 mb-2">{plan.price}</div>
                <div className="text-gray-600 mb-6">{plan.period}</div>
                <ul className="text-left space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="py-2 border-b border-gray-100 text-gray-700">
                      <span className="text-green-600 font-bold mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-xl text-sky-900 mt-8 font-semibold">
            Annual Prepayment Discount: Save 15% with annual billing<br />
            <span className="text-gray-600 text-base">No per-user charges • No setup fees • No hidden costs • Cancel anytime</span>
          </p>
        </section>

        <div className="bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-6">Start Your 14-Day Free Trial Today</h2>
          <p className="text-xl mb-8">Launch your white-label investor portal in under 5 minutes. No credit card required.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="bg-white text-sky-900 px-10 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
              Start Free Trial
            </button>
            <button className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors">
              Schedule Demo
            </button>
            <button className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors">
              Contact Sales
            </button>
          </div>
          <p className="text-lg mt-8">
            Full feature access during trial • No implementation fees • Cancel anytime
          </p>
        </div>
      </div>

      <div className="bg-slate-800 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-6">Transform Your Fund Operations Today</h3>
          <div className="space-y-3 mb-8 text-lg">
            <p>💰 <strong>Save $40,000-$200,000 annually</strong> compared to traditional fund administrators</p>
            <p>⚡ <strong>Launch in 5 minutes</strong>, not 6 months with complex onboarding projects</p>
            <p>🎯 <strong>Provide institutional-grade investor experience</strong> with your own branded portal</p>
          </div>
          <div className="pt-8 border-t border-slate-700">
            <p className="text-lg mb-4">
              <strong>Website:</strong> clearnav.io | <strong>Email:</strong> sales@clearnav.io | <strong>Phone:</strong> (555) 123-4567
            </p>
            <p className="text-sm opacity-80">
              © 2026 ClearNav Platform. All rights reserved. SOC 2 Type II Certified.<br />
              Securities offered through registered broker-dealers. ClearNav is a technology platform provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
