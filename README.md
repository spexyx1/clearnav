# ClearNav Platform

A multi-tenant investment fund management platform built with React, Vite, TypeScript, and Supabase.

## Features

- Multi-tenant architecture with subdomain routing
- Client portal with portfolio tracking and analytics
- Manager portal with CRM, compliance, and reporting tools
- Platform admin portal for managing multiple investment funds
- Secure authentication and authorization
- Real-time data synchronization
- Interactive Brokers (IBKR) integration
- Document management and reporting

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Hosting**: Vercel (recommended)

## Getting Started Locally

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/clearnav-platform.git
   cd clearnav-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (if exists)
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your-supabase-project-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Deployment

Ready to deploy your ClearNav platform to production? We've made it easy!

### Quick Deploy (30 minutes)

See **QUICK_START.md** for a step-by-step guide to deploy your site with a custom domain in 30 minutes.

### Detailed Guide

See **DEPLOYMENT_GUIDE.md** for comprehensive deployment instructions, including:
- GitHub setup
- Vercel deployment
- Domain configuration
- Multi-tenant subdomain setup
- Troubleshooting tips

### Recommended Setup

- **Hosting**: Vercel (free tier)
- **Domain**: clearnav.cv (public platform site)
- **Tenant Domains**: Custom domains like arklinetrust.com or subdomains like tenant.clearnav.cv
- **Cost**: ~$20-40/year for domain only

## Project Structure

```
clearnav-platform/
├── src/
│   ├── components/          # React components
│   │   ├── manager/        # Manager portal components
│   │   ├── platform/       # Platform admin components
│   │   └── portal/         # Client portal components
│   ├── lib/                # Utilities and configurations
│   │   ├── auth.tsx        # Authentication context
│   │   ├── supabase.ts     # Supabase client
│   │   └── tenantResolver.ts  # Multi-tenant routing
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
└── public/                 # Static assets
```

## Multi-Tenant Architecture

The platform supports multiple investment funds (tenants) with subdomain routing:

- `clearnav.cv` - Main platform landing page
- `admin.clearnav.cv` - Platform administrator portal
- `arklinetrust.com` - Arkline Trust tenant (custom domain)
- `tenant.clearnav.cv` - Additional tenant subdomains

Each tenant has isolated data, branding, and configuration.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler check

## Environment Variables

Required environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for all sensitive operations
- Secure API key management
- HTTPS enforced in production
- XSS and CSRF protection

## Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [Quick Start](./QUICK_START.md) - Deploy in 30 minutes
- [Platform Guide](./PLATFORM_GUIDE.md) - Platform architecture overview
- [IBKR Integration](./IBKR_INTEGRATION.md) - Interactive Brokers setup

## Support

For issues or questions:
1. Check the documentation files listed above
2. Review Vercel deployment logs
3. Check Supabase dashboard for database issues

## License

Private and Proprietary

---

**Ready to deploy?** Start with [QUICK_START.md](./QUICK_START.md) and have your platform live in 30 minutes!
