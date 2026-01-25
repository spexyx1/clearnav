# Quick Start: Deploy ClearNav in 30 Minutes

Follow these steps to get your ClearNav platform live on the internet.

## Step 1: Push to GitHub (5 minutes)

```bash
# Initialize git (if not done already)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: ClearNav platform"

# Create a new repository on GitHub:
# 1. Go to https://github.com/new
# 2. Name it "clearnav-platform"
# 3. Keep it PRIVATE (important!)
# 4. Don't add README, .gitignore, or license
# 5. Click "Create repository"

# Connect your local repo to GitHub (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/clearnav-platform.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel (10 minutes)

1. **Sign up**: Go to https://vercel.com/signup
   - Click "Continue with GitHub"
   - Authorize Vercel to access your repositories

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Find your "clearnav-platform" repository
   - Click "Import"

3. **Configure**:
   - Vercel auto-detects everything, but verify:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`

4. **Add Environment Variables** (IMPORTANT):
   - Click "Environment Variables"
   - Add these from your `.env` file:
     ```
     VITE_SUPABASE_URL = your-supabase-project-url
     VITE_SUPABASE_ANON_KEY = your-supabase-anon-key
     ```

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `clearnav-platform.vercel.app`
   - Test it! Your site is now live!

## Step 3: Buy Domain (5 minutes)

### Recommended Domains:
- **clearnav.cv** - Your public-facing platform site
- **arklinetrust.com** - Your first hedge fund tenant (or any custom domain)
- Additional tenants can use subdomains like `tenant.clearnav.cv`

### Where to Buy:
1. Go to https://www.namecheap.com or https://www.cloudflare.com
2. Search for your domain
3. Add to cart and checkout
4. Complete registration (use your real email)

## Step 4: Connect Domain to Vercel (10 minutes)

### In Vercel:
1. Go to your project dashboard
2. Click "Settings" → "Domains"
3. Add your main platform domain: `clearnav.cv`
4. Add your tenant domain: `arklinetrust.com`
5. Add wildcard for subdomains: `*.clearnav.cv`
6. Click "Add" for each

### In Your Domain Registrar (Namecheap/Cloudflare):
1. Find "DNS Settings" or "Domain Management"
2. Add these records:

**For root domain:**
```
Type: A
Name: @ (or blank)
Value: 76.76.21.21
```

**For www:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**For wildcard subdomains (tenants):**
```
Type: A
Name: *
Value: 76.76.21.21
```

3. Save changes
4. Wait 10-60 minutes for DNS propagation
5. Repeat for arklinetrust.com with the same DNS records

## Step 5: Update Supabase Settings (5 minutes)

1. Go to your Supabase dashboard
2. Navigate to Authentication → URL Configuration
3. Update:
   - Site URL: `https://clearnav.cv`
   - Redirect URLs: Add:
     - `https://clearnav.cv/**`
     - `https://*.clearnav.cv/**`
     - `https://arklinetrust.com/**`

4. Go to Settings → API
5. Add your domain to allowed origins

## You're Live! 🎉

Your site is now accessible at:
- `https://clearnav.cv` (main ClearNav platform)
- `https://arklinetrust.com` (Arkline Trust tenant)
- `https://tenant.clearnav.cv` (additional tenant subdomains)

## Test Your Deployment

1. Visit your domain in a browser
2. Try creating a tenant
3. Visit the tenant subdomain
4. Test login and signup
5. Verify all features work

## Automatic Updates

Every time you push code to GitHub, Vercel automatically rebuilds and deploys your site!

```bash
# Make changes to your code
git add .
git commit -m "Update feature X"
git push

# Vercel automatically deploys in ~2 minutes!
```

## Costs

- Vercel: **FREE** (unlimited deployments, SSL, 100GB bandwidth)
- Domain: **$10-40/year** (one-time annual cost)
- Supabase: **FREE** (up to 500MB database, 50MB file storage)

**Total: ~$20/year to run a professional hedge fund platform!**

## Need Help?

- Check DEPLOYMENT_GUIDE.md for detailed troubleshooting
- Vercel Support: https://vercel.com/help
- Common issue: Wait longer for DNS (can take up to 24 hours)

---

**Next Steps After Launch:**
1. Set up custom email for professional communication
2. Configure additional security settings
3. Add your branding and logo
4. Invite your first tenants/clients
5. Monitor usage in Vercel dashboard
