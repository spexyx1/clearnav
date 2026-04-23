import { Bot, ArrowLeftRight, Globe, Link } from 'lucide-react';

const flagships = [
  {
    icon: Bot,
    title: 'AI-Powered Intelligence',
    description: 'Automate investor outreach and communications with machine learning that works around the clock.',
    bullets: ['AI BDR agent for lead qualification', 'Voice agent with live call dashboard', 'Automated investor communications', 'Predictive engagement analytics'],
  },
  {
    icon: ArrowLeftRight,
    title: 'Built-In Secondary Marketplace',
    description: 'Offer liquidity options no traditional fund administrator can match.',
    bullets: ['Peer-to-peer fund interest trading', 'Tokenization-ready architecture', 'Secure escrow and settlement', 'Automated compliance workflows'],
  },
  {
    icon: Globe,
    title: 'White-Label Investor Portals',
    description: 'Launch a fully branded, institutional-grade portal on your own domain in minutes.',
    bullets: ['Custom domain and branding', 'Mobile-responsive design', '24/7 self-service investor access', 'Complete content control'],
  },
  {
    icon: Link,
    title: 'Real-Time Broker Integration',
    description: 'Synchronize portfolio data directly from Interactive Brokers with zero manual effort.',
    bullets: ['Automatic position updates', 'Transaction import and reconciliation', 'Real-time P&L tracking', 'Multi-account support'],
  },
];

export default function FlagshipCapabilities() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">What Sets ClearNAV Apart</h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">Four capabilities that no traditional fund administrator can offer at any price.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {flagships.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="group relative bg-slate-50 border border-slate-200 rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:border-sky-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-500 mb-4 leading-relaxed">{item.description}</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.bullets.map((b, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
