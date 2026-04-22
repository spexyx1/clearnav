const plans = [
  {
    name: 'Starter',
    summary: 'For emerging managers launching their first fund.',
    price: '$299',
    period: 'per month',
    popular: false,
    features: ['Up to 25 investors', 'Single fund', 'White-label portal', 'NAV calculation', 'Capital operations', 'Document management', 'Basic reporting', 'Email support'],
  },
  {
    name: 'Professional',
    summary: 'For growing funds that need the full toolkit.',
    price: '$599',
    period: 'per month',
    popular: true,
    features: ['Up to 100 investors', 'Multiple funds', 'Everything in Starter, plus:', 'IBKR integration', 'Advanced reporting', 'CRM & investor relations', 'Compliance center', 'Secondary marketplace', 'Priority support'],
  },
  {
    name: 'Enterprise',
    summary: 'For administrators managing multiple funds.',
    price: '$1,299',
    period: 'per month',
    popular: false,
    features: ['Unlimited investors', 'Unlimited funds', 'Everything in Professional, plus:', 'Multi-tenant management', 'Custom integrations', 'AI BDR agent', 'Advanced analytics', 'Dedicated support', 'Custom SLA'],
  },
];

export default function PricingSection() {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Transparent Pricing</h2>
          <p className="text-lg text-slate-500">No per-user charges. No setup fees. No hidden costs. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative bg-white rounded-2xl p-8 text-center shadow-sm transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? 'border-2 border-sky-500 ring-4 ring-sky-100 scale-[1.03]'
                  : 'border border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-5 py-1 rounded-full text-xs font-semibold tracking-wide">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-slate-500 mb-5">{plan.summary}</p>
              <div className="text-4xl font-bold text-sky-600 mb-1">{plan.price}</div>
              <div className="text-sm text-slate-400 mb-6">{plan.period}</div>
              <ul className="text-left space-y-2.5">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm text-slate-600 py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-slate-600 mt-10 font-medium">
          Annual Prepayment Discount: Save 15% with annual billing
        </p>
      </div>
    </section>
  );
}
