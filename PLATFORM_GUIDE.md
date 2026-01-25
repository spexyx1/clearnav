# Multi-Tenant Platform Guide

## Overview

Your hedge fund management system has been transformed into a comprehensive **multi-tenant SaaS platform**. This allows you to host multiple hedge fund clients, each with their own isolated instance, branding, and data.

## Platform Architecture

### Domain Structure

The platform uses domain-based tenant resolution:

- **Platform Admin Portal**: `admin.yourdomain.com`
- **Tenant Subdomains**: `[tenant-slug].yourdomain.com` (e.g., `acme-capital.yourdomain.com`)
- **Custom Domains**: Tenants can use their own domains (e.g., `portal.acmecapital.com`)

### Key Features Implemented

#### 1. Platform Admin Portal
Access at `admin.yourdomain.com`

**Tenant Management**
- Create new tenants with automatic provisioning
- View all tenants with real-time status
- Manage tenant lifecycle (trial, active, suspended, cancelled)
- Configure database type (Managed or BYOD)
- Track user counts per tenant

**Billing Management**
- View total platform revenue
- Monitor pending payments
- Track billing history by tenant
- See user overage charges
- Manage subscription plans

**Analytics Dashboard**
- Total tenant count
- Active vs trial tenants
- Total user count across platform
- Database type distribution
- Growth metrics

**Platform Settings**
- Security configurations
- Notification preferences
- Domain settings
- SSL management

#### 2. Tenant Isolation
- Complete data separation between tenants
- Row Level Security (RLS) policies enforce isolation
- Each tenant can only access their own data
- Platform admins have oversight across all tenants

#### 3. Subscription Management
- Two default plans:
  - **Managed Database**: $499/month base + $25/user overage
  - **BYOD Plan**: $399/month (20% discount) + $25/user overage
- 30-day free trials with demo database
- Automatic billing period tracking
- Flexible plan upgrades/downgrades

#### 4. User & Role Management
- **Platform Admin Users**: Super admins, support, billing roles
- **Tenant Users**: Owner, admin, user roles per tenant
- Multiple tenants per user supported
- Fine-grained permissions

## Database Schema

### Core Platform Tables

**platform_tenants**
- Stores each hedge fund tenant
- Tracks status, database type, trial periods
- Contains tenant metadata and settings

**subscription_plans**
- Defines available subscription tiers
- Configures pricing and features
- Supports both managed and BYOD options

**tenant_subscriptions**
- Active subscriptions per tenant
- Billing period tracking
- Cancellation management

**billing_records**
- Complete billing history
- User count and overage tracking
- Payment status tracking

**tenant_users**
- Maps users to tenants with roles
- Supports multi-tenant access
- Role-based permissions

**tenant_domains**
- Custom domain management
- SSL certificate tracking
- Domain verification status

**usage_metrics**
- Tracks usage for billing
- Supports various metric types
- Time-series data for analytics

**tenant_settings**
- Tenant branding configuration
- Feature flag management
- Integration settings
- Notification preferences

**platform_admin_users**
- Platform administrator accounts
- Role-based admin permissions
- Audit trail for admin actions

## Getting Started

### Creating Your First Platform Admin

1. Sign up a user account through the regular authentication flow
2. Add them as a platform admin by running this SQL in the Supabase dashboard:

```sql
INSERT INTO platform_admin_users (user_id, role, permissions)
VALUES (
  'USER_ID_FROM_AUTH_USERS',
  'super_admin',
  '{}'
);
```

3. Navigate to `admin.yourdomain.com` and log in

### Creating a New Tenant

1. Log in to the platform admin portal
2. Click "Add Tenant"
3. Fill in:
   - Tenant name (e.g., "Acme Capital")
   - Subdomain slug (auto-generated, e.g., "acme-capital")
   - Database type (Managed or BYOD)
   - Subscription plan
   - Enable trial (optional, 30 days)
4. Click "Create Tenant"

The system automatically:
- Creates the tenant record
- Sets up the subscription
- Initializes tenant settings
- Prepares the isolated environment

### Accessing a Tenant Portal

Navigate to `[tenant-slug].yourdomain.com` and log in with tenant user credentials.

## Pricing Structure

### Managed Database Plan - $499/month
- Platform hosts and manages the database
- Automatic backups included
- Base includes 10 users
- $25 per additional user
- Email support
- Custom domain support
- API access

### BYOD Plan - $399/month
- 20% discount for bringing your own database
- Base includes 10 users
- $25 per additional user
- Email support
- Custom domain support
- API access

### Trial Period
- 30 days free trial
- Full feature access
- Demo database provided
- No credit card required
- Automatic conversion to paid plan

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with strict policies:
- Tenants can only access their own data
- Platform admins can view all tenants
- Users authenticated by Supabase Auth
- No data leakage between tenants

### Authentication
- Supabase Auth integration
- Email/password authentication
- Session management
- Secure token handling

### Data Isolation
- Database-level isolation via RLS
- Tenant context validation on every request
- Encrypted database connections for BYOD
- Audit logging for admin actions

## Custom Domains

To add a custom domain for a tenant:

1. Create a CNAME record pointing to your platform domain
2. Add the domain in Tenant Details modal
3. System generates verification token
4. Verify domain ownership
5. SSL certificate provisioned automatically

## API Integration

Each tenant has isolated API access through their own domain. Platform admins can:
- View API usage per tenant
- Set rate limits
- Monitor API health
- Generate tenant-specific API keys

## Monitoring & Analytics

Platform admins can monitor:
- Tenant growth trends
- Revenue metrics
- User adoption rates
- Churn analysis
- Support ticket volume
- System health metrics

## Billing & Invoicing

The system tracks:
- Monthly recurring revenue (MRR)
- User count per tenant
- Overage charges
- Payment status
- Invoice generation
- Failed payment handling

## Next Steps

### Phase 2 Implementation
To complete the platform, implement:

1. **Tenant Branding**
   - Logo uploads
   - Color scheme customization
   - Email template customization
   - White-label options

2. **Onboarding Workflow**
   - Self-service tenant signup
   - Guided setup wizard
   - Email verification
   - Trial activation

3. **Usage Tracking**
   - Real-time metrics collection
   - API call tracking
   - Storage usage monitoring
   - Automated billing calculations

4. **Provisioning Automation**
   - Edge function for tenant setup
   - Database schema migration
   - Initial data seeding
   - Webhook notifications

5. **Support Tools**
   - In-app messaging
   - Ticket management
   - Knowledge base
   - Chat support

## Technical Details

### Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: Vite build, static hosting
- **Database**: PostgreSQL with RLS
- **Authentication**: Supabase Auth

### File Structure
```
src/
├── components/
│   ├── platform/              # Platform admin components
│   │   ├── PlatformAdminPortal.tsx
│   │   ├── TenantManagement.tsx
│   │   ├── CreateTenantModal.tsx
│   │   ├── TenantDetailsModal.tsx
│   │   ├── BillingOverview.tsx
│   │   ├── PlatformAnalytics.tsx
│   │   └── PlatformSettings.tsx
│   ├── ClientPortal.tsx      # Tenant client view
│   └── ManagerPortal.tsx     # Tenant manager view
├── lib/
│   ├── platformContext.tsx   # Platform state management
│   ├── tenantResolver.ts     # Domain resolution logic
│   ├── supabase.ts           # Supabase client
│   └── auth.tsx              # Authentication context
└── types/
    └── database.ts           # TypeScript types
```

### Environment Variables
Ensure these are set in your `.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Support

For issues or questions about the platform implementation, review:
- Database migrations in `supabase/migrations/`
- Component implementations in `src/components/platform/`
- Context providers in `src/lib/`

## License

This multi-tenant platform system is part of your hedge fund management application.
