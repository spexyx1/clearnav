import { ArrowLeft, Compass, Zap, Clock, Layers } from 'lucide-react';
import FlagshipCapabilities from './sales/FlagshipCapabilities';
import FeatureGrid from './sales/FeatureGrid';
import HowItWorks from './sales/HowItWorks';
import ComparisonTable from './sales/ComparisonTable';
import ROISection from './sales/ROISection';
import SecuritySection from './sales/SecuritySection';
import PricingSection from './sales/PricingSection';

interface SalesSheetProps {
  onBack: () => void;
}

const stats = [
  { icon: Zap, value: '95%', label: 'Cost reduction vs. traditional administrators' },
  { icon: Clock, value: '5 min', label: 'Launch time vs. 3-6 month onboarding' },
  { icon: Layers, value: 'All-in-One', label: 'Replaces 5+ separate tools' },
];

export default function SalesSheet({ onBack }: SalesSheetProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 to-teal-900/20" />
        <div className="relative max-w-7xl mx-auto px-6 pt-8 pb-16 md:pb-20">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Compass className="w-10 h-10 text-sky-400" />
              <span className="text-3xl md:text-4xl font-bold tracking-tight">ClearNAV</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
              The Operating System for Modern Investment Funds
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-4 leading-relaxed">
              NAV calculations, capital operations, investor portals, compliance, CRM, and a built-in secondary marketplace -- all from a single platform.
            </p>
            <p className="text-sm text-slate-400">clearnav.cv &middot; sales@clearnav.cv</p>
          </div>
        </div>
        <div className="relative bg-slate-800/60 border-t border-slate-700/50">
          <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-4 justify-center sm:justify-start">
                  <Icon className="w-5 h-5 text-sky-400 flex-shrink-0" />
                  <div>
                    <div className="text-xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <FlagshipCapabilities />
      <FeatureGrid />
      <HowItWorks />
      <ComparisonTable />
      <ROISection />
      <SecuritySection />
      <PricingSection />

      <section className="bg-gradient-to-r from-sky-600 to-teal-600 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Your 14-Day Free Trial</h2>
          <p className="text-lg text-sky-100 mb-8">Launch your white-label investor portal in under 5 minutes. No credit card required.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="bg-white text-sky-700 px-8 py-3.5 rounded-lg font-semibold hover:bg-sky-50 transition-colors shadow-lg shadow-sky-900/20">
              Start Free Trial
            </button>
            <button className="border-2 border-white/60 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Schedule Demo
            </button>
            <button className="border-2 border-white/60 text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Contact Sales
            </button>
          </div>
          <p className="text-sm text-sky-200 mt-6">
            Full feature access during trial &middot; No implementation fees &middot; Cancel anytime
          </p>
        </div>
      </section>

      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-xl font-bold mb-5">Transform Your Fund Operations Today</h3>
          <div className="space-y-2 mb-8 text-slate-300">
            <p><strong className="text-white">Save $40,000-$200,000 annually</strong> compared to traditional fund administrators</p>
            <p><strong className="text-white">Launch in 5 minutes</strong>, not 6 months with complex onboarding</p>
            <p><strong className="text-white">Institutional-grade investor experience</strong> with your own branded portal</p>
          </div>
          <div className="pt-6 border-t border-slate-800">
            <p className="text-sm text-slate-400 mb-2">
              <strong className="text-slate-300">Website:</strong> clearnav.cv &middot; <strong className="text-slate-300">Email:</strong> sales@clearnav.cv
            </p>
            <p className="text-xs text-slate-500">
              &copy; 2026 ClearNAV Platform. All rights reserved. SOC 2 Type II Certified.<br />
              Securities offered through registered broker-dealers. ClearNAV is a technology platform provider.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
