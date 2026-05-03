import type { TutorialStep } from './types';

export const CLIENT_STEPS: TutorialStep[] = [
  { id: 'welcome', title: 'Welcome to Your Investor Portal', body: 'This is your personal investor portal. We will walk you through the key sections so you know exactly where to find everything.', target: '[data-tour="client-header"]', placement: 'bottom', route: null },
  { id: 'dashboard', title: 'Your Dashboard', body: 'Your dashboard gives you a real-time overview of your portfolio value, recent performance, and any pending actions.', target: '[data-tour="client-tab-dashboard"]', placement: 'bottom', route: 'dashboard' },
  { id: 'returns', title: 'Returns and Performance', body: 'Track your investment returns over time with charts showing monthly, quarterly, and annual performance.', target: '[data-tour="client-tab-returns"]', placement: 'bottom', route: 'returns' },
  { id: 'risk', title: 'Risk Metrics', body: 'Understand your investment risk profile including volatility, Sharpe ratio, max drawdown, and Value at Risk.', target: '[data-tour="client-tab-risk"]', placement: 'bottom', route: 'risk' },
  { id: 'documents', title: 'Your Documents', body: 'Access all fund documents including subscription agreements, offering memoranda, side letters, and regulatory filings.', target: '[data-tour="client-tab-documents"]', placement: 'bottom', route: 'documents' },
  { id: 'tax', title: 'Tax Documents', body: 'Download your annual K-1s, PFIC statements, and other tax-related documents. New documents are notified by email.', target: '[data-tour="client-tab-tax"]', placement: 'bottom', route: 'tax' },
  { id: 'kyc', title: 'Identity Verification', body: 'Complete your KYC and AML verification here. Required before your investment is fully active — takes under 5 minutes.', target: '[data-tour="client-tab-kyc"]', placement: 'bottom', route: 'verification' },
  { id: 'redemptions', title: 'Redemptions', body: 'Submit redemption requests here. Your fund manager will review and process them according to the fund schedule.', target: '[data-tour="client-tab-redemptions"]', placement: 'bottom', route: 'redemptions' },
  { id: 'settings', title: 'Your Settings', body: 'Update your contact information, communication preferences, banking details, and two-factor authentication.', target: '[data-tour="client-tab-settings"]', placement: 'bottom', route: 'settings' },
  { id: 'help', title: 'AI Help Assistant', body: 'The help button gives you instant access to our AI assistant. Ask it anything about your portal and it will guide you step by step.', target: '[data-tour="help-button"]', placement: 'bottom', route: null },
];

export const MANAGER_STEPS: TutorialStep[] = [
  { id: 'welcome', title: 'Welcome to Your Manager Portal', body: 'This is your fund operations hub. We will walk through each section so you can hit the ground running.', target: '[data-tour="manager-header"]', placement: 'bottom', route: null },
  { id: 'portfolio', title: 'Portfolio Management', body: 'Covers your funds, share classes, capital accounts, NAV calculations, and transaction history.', target: '[data-tour="sidebar-portfolio"]', placement: 'right', route: 'dashboard' },
  { id: 'nav', title: 'NAV Calculator', body: 'Record and verify your Net Asset Value with a full audit trail. Supports multiple share classes, side pockets, and carried interest.', target: '[data-tour="sidebar-nav"]', placement: 'right', route: 'nav' },
  { id: 'operations', title: 'Fund Operations', body: 'Manage capital calls, distributions, redemptions, and fees. Each workflow includes approval steps and automated investor notifications.', target: '[data-tour="sidebar-operations"]', placement: 'right', route: 'capital_calls' },
  { id: 'reporting', title: 'Reporting', body: 'Generate investor statements, performance reports, and tax documents. Schedule automatic delivery and archive for audit.', target: '[data-tour="sidebar-reporting"]', placement: 'right', route: 'statements' },
  { id: 'crm', title: 'CRM and Investor Relations', body: 'Track your investor pipeline from lead to active client. Manage contacts, onboarding workflows, and interaction history.', target: '[data-tour="sidebar-crm"]', placement: 'right', route: 'crm' },
  { id: 'communications', title: 'Communications', body: 'Send newsletters, manage your email inbox, build invitation templates, and run targeted campaigns.', target: '[data-tour="sidebar-communications"]', placement: 'right', route: 'email' },
  { id: 'agents', title: 'AI and Voice Agents', body: 'Configure AI agents for lead outreach, investor Q&A, and automated voice campaigns. Monitor all activity in real time.', target: '[data-tour="sidebar-agents"]', placement: 'right', route: 'ai_agents' },
  { id: 'website', title: 'Your White-Label Website', body: 'Build and publish your fund marketing website with no code. Edit pages visually, manage blog, testimonials, FAQs, and SEO.', target: '[data-tour="sidebar-website"]', placement: 'right', route: 'blog' },
  { id: 'compliance', title: 'Compliance and KYC', body: 'Review KYC and AML status for all investors, manage regulatory frameworks, and access the full compliance audit log.', target: '[data-tour="sidebar-admin"]', placement: 'right', route: 'compliance' },
  { id: 'help', title: 'AI Help Assistant', body: 'Use the help button at any time to ask our AI assistant about any feature. It knows your current screen and can navigate you there.', target: '[data-tour="help-button"]', placement: 'left', route: null },
];

export const PLATFORM_ADMIN_STEPS: TutorialStep[] = [
  { id: 'welcome', title: 'Welcome, Platform Admin', body: 'This is the master control panel for the ClearNAV platform. Manage all tenant accounts, billing, and platform settings.', target: '[data-tour="platform-header"]', placement: 'bottom', route: null },
  { id: 'tenants', title: 'Tenant Management', body: 'View, create, and manage all tenant accounts. Drill into any tenant to see settings, users, subscription status, and usage.', target: '[data-tour="platform-tab-tenants"]', placement: 'bottom', route: 'tenants' },
  { id: 'users', title: 'Platform Users', body: 'Manage all users across every tenant. Reset passwords, adjust roles, and investigate platform-wide activity.', target: '[data-tour="platform-tab-users"]', placement: 'bottom', route: 'users' },
  { id: 'billing', title: 'Billing and Subscriptions', body: 'Monitor subscription revenue, manage plans, apply discounts, and view invoicing history across all tenants.', target: '[data-tour="platform-tab-billing"]', placement: 'bottom', route: 'billing' },
  { id: 'analytics', title: 'Platform Analytics', body: 'Track platform-wide growth: active tenants, user counts, feature adoption, AI agent usage, and revenue trends.', target: '[data-tour="platform-tab-analytics"]', placement: 'bottom', route: 'analytics' },
  { id: 'support', title: 'Support and AI Conversations', body: 'Review AI help conversations from all users. Escalate to human support and reply within any conversation thread.', target: '[data-tour="platform-tab-support"]', placement: 'bottom', route: 'support' },
  { id: 'settings', title: 'Platform Settings', body: 'Configure global defaults, manage tutorial content, toggle per-tenant feature flags, and set compliance policies.', target: '[data-tour="platform-tab-settings"]', placement: 'bottom', route: 'settings' },
  { id: 'help', title: 'AI Help Assistant', body: 'The help assistant is available here too. Ask it about any platform administration task for context-aware answers.', target: '[data-tour="help-button"]', placement: 'left', route: null },
];

export const FALLBACK_STEPS: Record<string, TutorialStep[]> = {
  client_first_run: CLIENT_STEPS,
  manager_first_run: MANAGER_STEPS,
  platform_admin_first_run: PLATFORM_ADMIN_STEPS,
};
