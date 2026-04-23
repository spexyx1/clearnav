import { useState, useEffect } from 'react';
import { TrendingUp, Zap, Shield, ChevronRight, Mail, Building2, FileText, BarChart3, Lock, Globe, Users, Bell, FileCheck, CreditCard, LineChart, Calculator, BookOpen, HelpCircle, Bot, Layers, Brain, Rocket, Send, Calendar, Target, MessageSquare, ShieldCheck, Award, Clock } from 'lucide-react';
import InquiryForm from './InquiryForm';
import PageFooter from './shared/PageFooter';
import { useAuth } from '../lib/auth';
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
  const { currentTenant } = useAuth();
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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-cyan-500" role="status" aria-label="Loading" />
      </div>
    );
  }

  const branding = settings?.branding || {
    logo_url: '',
    company_name: currentTenant?.name || 'ClearNAV',
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
      title: 'Enterprise Fund Operations Platform',
      subtitle: 'Complete Fund Administration & Investor Management',
      description: 'White-label technology infrastructure powering private investments, family offices, and fund managers with institutional-grade tools for capital management, compliance, reporting, and investor relations.',
      cta_text: 'Get Started',
      background_image: '',
    },
    features: [
      {
        title: 'Automated Operations',
        description: 'Streamline NAV calculations, capital calls, distributions, and redemptions with intelligent workflows that eliminate manual processes.',
        icon: 'TrendingUp',
      },
      {
        title: 'White-Label Platform',
        description: 'Launch your branded investor portal in minutes. Full customization of colors, logos, and domain with enterprise multi-tenancy.',
        icon: 'Zap',
      },
      {
        title: 'Built-in Compliance',
        description: 'KYC/AML verification, document management, audit trails, and regulatory reporting integrated into every workflow.',
        icon: 'Shield',
      },
    ],
    stats: [
      { label: 'Setup Time', value: '<5 min' },
      { label: 'Automated Workflows', value: '20+' },
      { label: 'Security', value: 'Bank-Grade' },
      { label: 'Uptime', value: '99.9%' },
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

  const primaryColor = branding.colors.primary || '#0E7490';

  return (
    <div className="min-h-screen bg-slate-950">

      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.company_name} className="h-8" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <span className="text-white text-xs font-bold">{branding.company_name.charAt(0)}</span>
                </div>
                <span className="text-xl font-semibold tracking-wide text-white">{branding.company_name}</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-8">
            <a href="#about" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">ABOUT</a>
            <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">FEATURES</a>
            <a href="#platform" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">PLATFORM</a>
            <button onClick={() => setShowFAQ(true)} className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded">FAQ</button>
            <a href="#contact" className="text-sm text-slate-300 hover:text-white transition-colors tracking-wide">CONTACT</a>
            <button
              onClick={onLoginClick}
              style={{ backgroundColor: primaryColor }}
              className="px-6 py-2 text-white text-sm font-medium rounded tracking-wide hover:opacity-90 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-cyan-400"
            >
              CLIENT LOGIN
            </button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="inline-block mb-6 px-4 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full">
              <span className="text-xs font-medium tracking-widest text-slate-300">{landingPage.hero.subtitle.toUpperCase()}</span>
            </div>
            <h1 className="text-6xl font-semibold text-white mb-6 leading-tight">
              {landingPage.hero.title}
            </h1>
            <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-2xl">
              {landingPage.hero.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowInquiryForm(true)}
                style={{ backgroundColor: primaryColor }}
                className="px-8 py-3.5 text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-150 flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <span>{landingPage.hero.cta_text}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" aria-hidden />
              </button>
              <button
                onClick={onLoginClick}
                className="px-8 py-3.5 border border-slate-700 text-white rounded-lg font-medium hover:bg-slate-800/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Access Portal
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                <span className="text-sm text-slate-500">14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                <span className="text-sm text-slate-500">No Credit Card Required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Social Proof Section */}
        <div className="max-w-7xl mx-auto mt-24">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              {[
                { value: '$500M+', label: 'Assets Administered', note: 'across active funds' },
                { value: '100+', label: 'Active Funds', note: 'on the platform' },
                { value: '99.9%', label: 'Platform Uptime', note: 'SLA guaranteed' },
                { value: '<5 min', label: 'Setup Time', note: 'from signup to live' },
              ].map(({ value, label, note }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-white mb-1 tabular-nums">{value}</div>
                  <div className="text-sm font-medium text-slate-300 mb-0.5">{label}</div>
                  <div className="text-xs text-slate-500">{note}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-800 pt-8">
              <p className="text-xs text-slate-500 text-center mb-5 uppercase tracking-widest">Security & Compliance</p>
              <div className="flex flex-wrap items-center justify-center gap-6">
                {[
                  { Icon: ShieldCheck, label: 'AES-256 Encryption' },
                  { Icon: Award, label: 'SOC 2 Type II Ready' },
                  { Icon: Lock, label: 'GDPR Compliant' },
                  { Icon: Shield, label: 'ISO 27001 Controls' },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" aria-hidden style={{ color: primaryColor }} />
                    <span className="text-sm text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-32 grid grid-cols-3 gap-8">
          {landingPage.features.map((feature, index) => {
            const Icon = getIcon(feature.icon);
            return (
              <div key={index} className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group" style={{ '--hover-border': `${primaryColor}30` } as React.CSSProperties}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                  <Icon className="w-6 h-6" style={{ color: primaryColor }} />
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
              <div className="text-xs font-medium tracking-widest mb-4 text-slate-400 uppercase">About The Platform</div>
              <h2 className="text-4xl font-semibold text-white mb-6">
                Complete Back-Office In One System
              </h2>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                Replace spreadsheets, disparate tools, and manual processes with a unified platform built specifically for fund operations. From investor onboarding to quarterly reporting, every workflow is automated and compliant.
              </p>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                Multi-tenant architecture enables white-label deployment for administrators serving multiple clients, or dedicated instances for individual fund managers requiring full control.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Real-time portfolio syncing through Interactive Brokers integration ensures NAV calculations are always accurate, while automated capital call and distribution workflows keep investors informed.
              </p>
            </div>
            <div className="space-y-4">
              {landingPage.stats.map((stat, index) => (
                <div key={index} className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-5">
                  <div className="text-3xl font-bold text-white tabular-nums shrink-0">{stat.value}</div>
                  <div className="text-sm text-slate-400 leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="py-32 px-6 border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-medium tracking-widest mb-4 text-slate-400 uppercase">Comprehensive Features</div>
            <h2 className="text-4xl font-semibold text-white mb-6">
              Every Tool Fund Managers Actually Need
            </h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              Enterprise-grade infrastructure covering capital management, investor relations, compliance, performance reporting, and operations—replacing entire stacks of disparate software with one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <LineChart className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">NAV Calculation Engine</h3>
              <p className="text-slate-400 leading-relaxed">
                Automated net asset value calculations with Interactive Brokers real-time sync, multi-share class support, waterfall structures, carried interest tracking, and side pocket accounting.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <CreditCard className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Capital Operations</h3>
              <p className="text-slate-400 leading-relaxed">
                Complete workflows for capital calls, distributions, and redemptions with automated investor notifications, payment tracking, real-time capital account balances, and transaction history.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Globe className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">IBKR Integration</h3>
              <p className="text-slate-400 leading-relaxed">
                Real-time Interactive Brokers portfolio syncing for positions, cash balances, and trades with automated reconciliation and scheduled updates.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Users className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Investor Portal</h3>
              <p className="text-slate-400 leading-relaxed">
                White-label branded portals on custom domains with real-time performance dashboards, document access, capital activity, and secure communication.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Lock className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Compliance Center</h3>
              <p className="text-slate-400 leading-relaxed">
                Complete KYC/AML workflows with document verification, accreditation tracking, comprehensive audit trails, approval workflows, and automated regulatory reporting for all investor activities.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <FileCheck className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Document Vault</h3>
              <p className="text-slate-400 leading-relaxed">
                Secure encrypted storage and automated distribution for subscription agreements, PPMs, K-1s, quarterly letters, investor statements with version control, e-signatures, and watermarking.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <BarChart3 className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Performance Reporting</h3>
              <p className="text-slate-400 leading-relaxed">
                Automated generation of investor statements, tear sheets, and performance reports with attribution analysis and risk metrics across time periods.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Calculator className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Fee Automation</h3>
              <p className="text-slate-400 leading-relaxed">
                Intelligent calculation of management fees, performance fees with high water marks, hurdle rates, and customizable fee structures per share class.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Bell className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Investor Relations</h3>
              <p className="text-slate-400 leading-relaxed">
                CRM with contact management, newsletter system with engagement analytics, automated notifications for capital events, and secure two-way messaging between managers and investors.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Bot className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">AI Sales Agent</h3>
              <p className="text-slate-400 leading-relaxed">
                Multi-channel AI-powered BDR agent handling voice calls, emails, SMS, and chat with customizable personality, conversation flows, sentiment analysis, and automated lead qualification.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Layers className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Accounting Platform Sync</h3>
              <p className="text-slate-400 leading-relaxed">
                Native integrations with Xero, QuickBooks Online, FreshBooks, Wave, and Sage for automated financial data synchronization, reconciliation, and multi-directional syncing.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Brain className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Predictive Lead Scoring</h3>
              <p className="text-slate-400 leading-relaxed">
                AI-powered lead intelligence with automated data enrichment, firmographic analysis, behavioral tracking, and predictive scoring to prioritize high-value prospects.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Rocket className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Automated Trial Provisioning</h3>
              <p className="text-slate-400 leading-relaxed">
                Self-service trial account creation with AI-driven engagement tracking, conversion optimization, automated intervention triggers, and usage analytics for trial success.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Send className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Email Sequence Automation</h3>
              <p className="text-slate-400 leading-relaxed">
                Multi-step AI-personalized email campaigns with dynamic content, A/B testing, engagement tracking, open rate analytics, and automated follow-up sequences based on behavior.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Calendar className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Meeting Scheduler</h3>
              <p className="text-slate-400 leading-relaxed">
                Integrated calendar booking system for demo scheduling, automated meeting reminders, time zone handling, and post-meeting follow-up workflows with AI-generated summaries.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <Target className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Competitive Intelligence</h3>
              <p className="text-slate-400 leading-relaxed">
                Win/loss analysis tracking, competitor feature comparison, market positioning insights, and automated competitive alerts to refine sales strategies and messaging.
              </p>
            </div>

            <div className="p-8 bg-slate-900/50 border border-slate-800/50 rounded-lg hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:opacity-80 transition-opacity" style={{ backgroundColor: `${primaryColor}1a` }}>
                <MessageSquare className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Multi-Channel CRM</h3>
              <p className="text-slate-400 leading-relaxed">
                Unified contact management across voice, email, SMS, and chat channels with complete conversation history, activity tracking, and intelligent lead routing workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-32 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-medium tracking-widest mb-4 text-slate-400 uppercase">Get In Touch</div>
          <h2 className="text-4xl font-semibold text-white mb-6">
            Ready to Transform Operations
          </h2>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            Join forward-thinking fund managers who have eliminated spreadsheets and manual processes. Schedule a demo to see how our platform can streamline your fund operations.
          </p>

          <div className="flex justify-center space-x-8 mb-16">
            {landingPage.contact.email && (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8" style={{ color: primaryColor }} />
                </div>
                <div className="text-sm text-slate-500 mb-1">Email</div>
                <div className="text-slate-300">{landingPage.contact.email}</div>
              </div>
            )}
            {landingPage.contact.address && (
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8" style={{ color: primaryColor }} />
                </div>
                <div className="text-sm text-slate-500 mb-1">Location</div>
                <div className="text-slate-300">{landingPage.contact.address}</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowInquiryForm(true)}
            style={{ backgroundColor: primaryColor }}
            className="px-10 py-3.5 text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
              <span className="text-sm font-semibold tracking-wide text-slate-400">{branding.company_name}</span>
            )}
          </div>
        </div>
      </footer>

      <PageFooter companyName={branding.company_name} theme="dark" />

      {showInquiryForm && <InquiryForm onClose={() => setShowInquiryForm(false)} />}
      {showFAQ && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-slate-800">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-6 h-6" style={{ color: primaryColor }} />
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
                <h3 className="text-lg font-semibold text-white mb-2">How quickly can we get started?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Your white-label portal can be live in under 5 minutes. Complete the onboarding questionnaire, configure your branding, and start inviting investors immediately. No technical setup or IT involvement required.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can we use our own domain?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. The platform supports full white-label deployment with custom domains, your logo, color scheme, and company name. Each tenant operates as a completely isolated instance with its own subdomain or custom domain.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Does it integrate with Interactive Brokers?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. Our built-in IBKR integration syncs positions, cash balances, and trades in real-time. Portfolio data automatically updates NAV calculations and performance reporting without manual data entry.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">How does NAV calculation work?</h3>
                <p className="text-slate-400 leading-relaxed">
                  The NAV engine supports multiple share classes, waterfall distributions, carried interest calculations, and side pocket accounting. Calculations are automated based on your fund structure and update in real-time as portfolio values change.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Can investors access their information 24/7?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Absolutely. Each investor receives secure portal access to view real-time performance, capital account activity, statements, tax documents, and fund communications. All document delivery is automated with email notifications.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Is the platform secure and compliant?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Yes. Bank-grade encryption, multi-factor authentication, complete audit trails, and role-based access controls. Built-in KYC/AML workflows and document verification ensure compliance with regulatory requirements.
                </p>
              </div>
              <div className="border-b border-slate-800 pb-6">
                <h3 className="text-lg font-semibold text-white mb-2">What happens to our existing data?</h3>
                <p className="text-slate-400 leading-relaxed">
                  We provide migration assistance for importing your existing investor data, capital accounts, and historical performance. The platform integrates with your current workflows rather than forcing you to change processes.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How is pricing structured?</h3>
                <p className="text-slate-400 leading-relaxed">
                  Contact us for pricing details. We offer flexible plans based on AUM, number of investors, and feature requirements. Multi-tenant fund administrators receive volume pricing for managing multiple client funds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
