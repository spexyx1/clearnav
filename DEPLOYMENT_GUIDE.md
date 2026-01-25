# ClearNav Deployment Guide

This guide will help you deploy your ClearNav platform to production with custom domains.

## Recommended Domain Setup

For your hedge fund platform, here's the recommended domain architecture:

### Primary Domains:
- **clearnav.cv** - Your public-facing platform site where potential clients learn about your SaaS offering
- **arklinetrust.com** - Your first hedge fund tenant (custom domain example)
- **admin.clearnav.cv** - Platform administrator portal (subdomain)

### Tenant Domains:
- **Custom Domains**: Each tenant can have their own domain (e.g., arklinetrust.com)
- **Subdomains**: Or use subdomains like tenant.clearnav.cv for additional hedge funds

**Where to buy:** Namecheap, Cloudflare, or Google Domains (best prices and features)

---

## Deployment Steps

### Step 1: Set Up GitHub Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ClearNav platform ready for deployment"
   ```

2. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Name it "clearnav-platform" or similar
   - Keep it private (important for security)
   - Don't initialize with README (you already have files)
   - Click "Create repository"

3. **Connect and Push**:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/clearnav-platform.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel (FREE)

Vercel is the best free option for React/Vite projects - used by major companies and handles everything automatically.

1. **Create Vercel Account**:
   - Go to https://vercel.com/signup
   - Sign up with your GitHub account (easiest)
   - This automatically connects your repositories

2. **Import Project**:
   - Click "Add New Project"
   - Select your "clearnav-platform" repository
   - Vercel will auto-detect Vite settings:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click "Deploy"

3. **Configure Environment Variables**:
   Before the first deployment, add your Supabase credentials:
   - Click "Environment Variables"
   - Add these variables from your `.env` file:
     ```
     VITE_SUPABASE_URL=your-supabase-url
     VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - Click "Deploy"

4. **Initial Deployment**:
   - Vercel will build and deploy your site (takes 2-3 minutes)
   - You'll get a temporary URL like: `clearnav-platform.vercel.app`
   - Test this URL to make sure everything works

### Step 3: Connect Custom Domains

1. **Purchase Domains**:
   - Go to Namecheap.com or Cloudflare.com
   - Purchase clearnav.cv for your platform site
   - Purchase arklinetrust.com (or your chosen tenant domain)
   - Complete purchase (takes 5 minutes)

2. **Add Domains to Vercel**:
   - In Vercel dashboard, go to your project
   - Click "Settings" → "Domains"
   - Add `clearnav.cv` (your main platform)
   - Add `arklinetrust.com` (your first tenant)
   - Add `*.clearnav.cv` (for wildcard subdomains)
   - Click "Add" for each

3. **Configure DNS**:
   Vercel will show you DNS records to add. In your domain registrar:

   **For root domain (winset.io):**
   - Type: A Record
   - Name: @ (or leave blank)
   - Value: 76.76.21.21

   **For www subdomain:**
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com

4. **Wait for DNS Propagation**:
   - Takes 5 minutes to 48 hours (usually within 1 hour)
   - Vercel will automatically provision SSL certificate
   - Your site will be live at your custom domain with HTTPS

### Step 4: Set Up Wildcard Subdomains for Multi-Tenancy

Your platform supports tenant-specific subdomains (e.g., `tenant.clearnav.cv`).

1. **In Vercel**:
   - Go to "Settings" → "Domains"
   - Add wildcard domain: `*.clearnav.cv`
   - Click "Add"

2. **In DNS Settings** (for clearnav.cv):
   - Type: A Record
   - Name: *
   - Value: 76.76.21.21

   This allows any subdomain to work automatically.

### Step 5: Configure Supabase for Production

1. **Update Supabase Site URL**:
   - Go to Supabase Dashboard
   - Settings → Authentication
   - Add your production domain to "Site URL": `https://clearnav.cv`
   - Add redirect URLs:
     - `https://clearnav.cv/**`
     - `https://*.clearnav.cv/**`
     - `https://arklinetrust.com/**`

2. **Update Allowed Origins**:
   - Go to Settings → API
   - Add your domain to allowed origins

---

## Post-Deployment

### Automatic Deployments
Every time you push to GitHub, Vercel automatically rebuilds and deploys your site. No manual updates needed!

### Monitoring
- Vercel provides analytics in the dashboard
- Monitor performance, visits, and errors
- View deployment logs if issues occur

### Cost Breakdown

**Free Tier (Vercel):**
- Unlimited deployments
- 100 GB bandwidth/month
- Automatic SSL
- Custom domains
- Perfect for starting out

**Paid Options (if you grow):**
- Vercel Pro: $20/month (better performance, more bandwidth)
- Domain: $10-50/year depending on extension
- Supabase Pro: $25/month (if you need more than free tier)

---

## Recommended Next Steps After Deployment

1. **Set up monitoring**: Add error tracking (Sentry is free for small projects)
2. **Configure email**: Set up email for password resets and invitations
3. **Custom branding**: Upload your logo and customize colors
4. **Test thoroughly**: Test all features on production
5. **Backup strategy**: Ensure Supabase backups are enabled

---

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### Domain Not Working
- Wait longer (DNS can take up to 48 hours)
- Verify DNS records are correct
- Use https:// not http://

### Subdomain Issues
- Ensure wildcard DNS record is set
- Check Supabase redirect URLs include wildcards
- Test with a specific tenant subdomain

---

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- GitHub Documentation: https://docs.github.com

---

## Quick Start Checklist

- [ ] Initialize Git repository locally
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Create Vercel account
- [ ] Connect GitHub to Vercel
- [ ] Add environment variables
- [ ] Deploy to Vercel
- [ ] Purchase domain name
- [ ] Configure DNS records
- [ ] Add domain to Vercel
- [ ] Set up wildcard subdomain
- [ ] Update Supabase settings
- [ ] Test production site
- [ ] Celebrate launch! 🎉

---

**Estimated Total Time:** 2-3 hours (including DNS propagation)
**Estimated Cost:** $10-40/year for domain only (everything else free)
