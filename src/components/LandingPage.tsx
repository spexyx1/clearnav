import { useState, useEffect } from 'react';
import { TrendingUp, Zap, Shield, ChevronRight, Mail, Building2, FileText, BarChart3, Lock, Globe, Users, Bell, FileCheck, CreditCard, LineChart, Calculator, BookOpen, HelpCircle } from 'lucide-react';
import InquiryForm from './InquiryForm';
import { usePlatform } from '../lib/platformContext';
import { supabase } from '../lib/supabase';
import * as LucideIcons from 'lucide-react';

interface TenantSettings {
  branding: {
    logo_url: string;
    company_name: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
  };
  landing_page: {
    hero: {
      title: string;
      subtitle: string;
      description: string;
      cta_text: string;
      background_image: string;
    };
    features: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
    stats: Array<{
      label: string;
      value: string;
    }>;
    contact: {
      email: string;
      phone: string;
      address: string;
    };
  };
}

export default function LandingPage({ onLoginClick }: { onLoginClick: () => void }) {
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const { currentTenant } = usePlatform();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantSettings();
  }, [currentTenant]);

  const loadTenantSettings = async () => {
    if (!currentTenant) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('branding, landing_page')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data as TenantSettings);
      }
    } catch (error) {
      console.error('Error loading tenant settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-cyan-500"></div>
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const branding = settings?.branding || {
    logo_url: '',
    company_name: currentTenant?.name || 'ClearNav',
    colors: {
      primary: '#06b6d4',
      secondary: '#0ea5e9',
      accent: '#22d3ee',
      background: '#020617',
      text: '#ffffff',
    },
  };

  const landingPage = settings?.landing_page || {
    hero: {
      title: 'Next-Generation Investment Intelligence',
      subtitle: 'Quantitative Research & Trading',
      description: 'Combining advanced quantitative research with proprietary technology to deliver superior risk-adjusted performance in global markets.',
      cta_text: 'Get Started',
      background_image: '',
    },
    features: [
      {
        title: 'Systematic Alpha',
        description: 'Proprietary algorithms identify and exploit market inefficiencies across asset classes with precision execution.',
        icon: 'TrendingUp',
      },
      {
        title: 'Advanced Technology',
        description: 'In-house developed infrastructure enables real-time analysis and execution at institutional scale.',
        icon: 'Zap',
      },
      {
        title: 'Risk Management',
        description: 'Multi-layered risk controls and portfolio optimization ensure capital preservation and consistent returns.',
        icon: 'Shield',
      },
    ],
    stats: [
      { label: 'AUM', value: '$4M' },
      { label: 'Target Return', value: '12-24%' },
      { label: 'In Operation', value: '3 Years' },
      { label: 'Experience', value: 'Decades' },
    ],
    contact: {
      email: 'invest@greyalpha.co',
      phone: '',
      address: 'Jerusalem, Israel',
    },
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || TrendingUp;
    return Icon;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
      style={{
        '--primary-color': branding.colors.primary,
        '--secondary-color': branding.colors.secondary,
        '--accent-color': branding.colors.accent,
      } as React.CSSProperties}>
      <style>{`
        .btn-primary { background-color: ${branding.colors.primary}; }
        .btn-primary:hover { filter: brightness(1.1); }
        .text-primary { color: ${branding.colors.primary}; }
        .border-primary { border-color: ${branding.colors.primary}; }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.company_name} className="h-8" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-sm" style={{ background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})` }}></div>
                <span className="text-2xl font-light tracking-wider text-white">
                  {branding.company_name.split(' ')[0].toUpperCase()}
                  <span className="font-semibold">{branding.company_name.split(' ')[1]?.toUpperCase() || ''}</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-8">
            <a href="#about" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">ABOUT</a>
            <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">FEATURES</a>
            <a href="#platform" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">PLATFORM</a>
            <button onClick={() => setShowFAQ(true)} className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">FAQ</button>
            <a href="#contact" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">CONTACT</a>
            <button
              onClick={onLoginClick}
              className="px-6 py-2 text-white text-sm font-medium rounded tracking-wide transition-all duration-200 btn-primary"
              style={{ backgroundColor: branding.colors.primary }}
            >
              CLIENT LOGIN
            </button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="inline-block mb-6 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full">
              <span className="text-xs font-medium tracking-widest text-primary" style={{ color: branding.colors.primary }}>{landingPage.hero.subtitle.toUpperCase()}</span>
            </div>
            <h1 className="text-7xl font-light text-white mb-6 leading-tight">
              {landingPage.hero.title.split(' ').slice(0, -2).join(' ')}<br />
              <span className="font-semibold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})` }}>{landingPage.hero.title.split(' ').slice(-2).join(' ')}</span>
            </h1>
            <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl font-light">
              {landingPage.hero.description}
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowInquiryForm(true)}
                className="px-8 py-4 bg-white text-slate-900 rounded font-medium hover:bg-slate-100 transition-all duration-200 flex items-center space-x-2 group"
              >
                <span>{landingPage.hero.cta_text}</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onLoginClick}
                className="px-8 py-4 border border-slate-700 text-white rounded font-medium hover:bg-slate-800 transition-all duration-200"
              >
                Access Portal
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-32 grid grid-cols-3 gap-8">
          {landingPage.features.map((feature, index) => {
            const Icon = getIcon(feature.icon);
            return (
              <div key={index} className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group" style={{ '--hover-border': `${branding.colors.primary}30` } as React.CSSProperties}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                  <Icon className="w-6 h-6" style={{ color: branding.colors.primary }} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="about" className="py-32 px-6 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-medium tracking-widest mb-4" style={{ color: branding.colors.primary }}>ABOUT {branding.company_name.toUpperCase()}</div>
              <h2 className="text-5xl font-light text-white mb-6">
                Institutional-Grade<br />
                <span className="font-semibold">Investment Management</span>
              </h2>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                {branding.company_name} delivers sophisticated portfolio management and investment solutions with advanced technology and comprehensive reporting.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Our platform combines real-time analytics, compliance tools, and seamless brokerage integration to provide a complete investment management solution.
              </p>
            </div>
            <div className="space-y-6">
              {landingPage.stats.map((stat, index) => (
                <div key={index} className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-lg">
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-400 tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="py-32 px-6 border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-medium tracking-widest mb-4" style={{ color: branding.colors.primary }}>COMPREHENSIVE PLATFORM</div>
            <h2 className="text-5xl font-light text-white mb-6">
              Everything You Need to <span className="font-semibold">Succeed</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              Access powerful tools for portfolio management, client communication, compliance, and detailed reporting—all in one integrated platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <BarChart3 className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Portfolio Analytics</h3>
              <p className="text-slate-400 leading-relaxed">
                Real-time performance tracking, attribution analysis, and comprehensive reporting with customizable dashboards.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <Lock className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Compliance Suite</h3>
              <p className="text-slate-400 leading-relaxed">
                KYC/AML workflows, document verification, regulatory reporting, and comprehensive audit trails for full compliance.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <Globe className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">IBKR Integration</h3>
              <p className="text-slate-400 leading-relaxed">
                Seamless Interactive Brokers connectivity for automated portfolio syncing, real-time position tracking, and trade reconciliation.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <Users className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Client Portal</h3>
              <p className="text-slate-400 leading-relaxed">
                Branded investor portals with real-time access to statements, documents, and performance metrics with secure login.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <Bell className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Communication Hub</h3>
              <p className="text-slate-400 leading-relaxed">
                Automated email notifications, investor updates, and secure messaging with full communication history tracking.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <FileCheck className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Document Management</h3>
              <p className="text-slate-400 leading-relaxed">
                Centralized storage for subscription docs, K-1s, quarterly reports with version control and secure sharing.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <CreditCard className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Capital Management</h3>
              <p className="text-slate-400 leading-relaxed">
                Track capital calls, distributions, redemptions, and side pockets with automated calculations and investor notifications.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <LineChart className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">NAV Calculation</h3>
              <p className="text-slate-400 leading-relaxed">
                Automated net asset value calculations with support for multiple share classes, waterfalls, and carried interest.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${branding.colors.primary}1a` }}>
                <Calculator className="w-6 h-6" style={{ color: branding.colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Fee Management</h3>
              <p className="text-slate-400 leading-relaxed">
                Automated management and performance fee calculations with high water marks and customizable fee structures.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-32 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-medium tracking-widest mb-4" style={{ color: branding.colors.primary }}>GET IN TOUCH</div>
          <h2 className="text-5xl font-light text-white mb-6">
            Start Your <span className="font-semibold">Investment Journey</span>
          </h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            Connect with our team to learn more about investment opportunities and how we can help you achieve your financial goals.
          </p>

          <div className="flex justify-center space-x-8 mb-16">
            {landingPage.contact.email && (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8" style={{ color: branding.colors.primary }} />
                </div>
                <div className="text-sm text-slate-500 mb-1">Email</div>
                <div className="text-slate-300">{landingPage.contact.email}</div>
              </div>
            )}
            {landingPage.contact.address && (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" style={{ color: branding.colors.primary }} />
                </div>
                <div className="text-sm text-slate-500 mb-1">Location</div>
                <div className="text-slate-300">{landingPage.contact.address}</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowInquiryForm(true)}
            className="px-12 py-4 text-white rounded font-medium transition-all duration-200"
            style={{
              background: `linear-gradient(to right, ${branding.colors.primary}, ${branding.colors.secondary})`,
              boxShadow: `0 10px 30px ${branding.colors.primary}20`
            }}
          >
            Submit Inquiry
          </button>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.company_name} className="h-6" />
            ) : (
              <>
                <div className="w-6 h-6 rounded-sm" style={{ background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})` }}></div>
                <span className="text-lg font-light tracking-wider text-slate-400">
                  {branding.company_name.split(' ')[0].toUpperCase()}
                  <span className="font-semibold">{branding.company_name.split(' ')[1]?.toUpperCase() || ''}</span>
                </span>
              </>
            )}
          </div>
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} {branding.company_name}. All rights reserved.
          </div>
        </div>
      </footer>

      {showInquiryForm && <InquiryForm onClose={() => setShowInquiryForm(false)} />}
      {showFAQ && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-slate-800">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-6 h-6" style={{ color: branding.colors.primary }} />
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
                <h3 className="text-lg font-semibold text-white mb-2">How do I access my investor account?</h3>
                <p className="text-slate-400 leading-relaxed">
                  You'll receive an email invitation with secure login credentials. Click the link in the email to set your password and access your personalized investor portal where you can view performance, documents, and statements 24/7.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What documents will I receive?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Investors receive monthly statements, quarterly performance reports, annual audited financials, and tax documents (K-1s). All documents are securely stored in your portal and you'll receive email notifications when new documents are available.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">How often is performance updated?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Portfolio performance is updated in real-time through our Interactive Brokers integration. NAV calculations and official performance reports are typically updated monthly, with detailed attribution analysis and risk metrics.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What are the minimum investment requirements?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Minimum investment amounts vary by fund structure and investor type. Contact us directly to discuss specific requirements and investment opportunities that match your capital allocation goals.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">How do redemptions work?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Redemption terms are outlined in the fund documents. You can submit redemption requests through your investor portal. The system tracks notice periods, processing dates, and redemption queues automatically.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is my data secure?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. We employ bank-level security with encryption at rest and in transit, multi-factor authentication, regular security audits, and comprehensive access controls. All data is stored in secure, SOC 2 compliant infrastructure.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can I make additional investments?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Additional investments are typically accepted during designated subscription periods. You can submit subscription requests through your portal, and our team will coordinate the capital call process and required documentation.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How do I contact support?</h3>
                <p className="text-slate-400 leading-relaxed">
                  You can reach our team via email at {landingPage.contact.email}, through the secure messaging system in your investor portal, or by submitting an inquiry through the contact form on this website. We aim to respond to all inquiries within one business day.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
