# Current Test Accounts

## Available Test Accounts

### 1. Client/Investor Account ✅
**Email:** `test@greyalpha.co`
**Password:** (your password from signup)
**Access:** Client Portal
**Tenant:** ClearNav (greyalpha)
**Role:** Client/Investor

**What you can do:**
- View investment dashboard ($110K portfolio)
- Check performance and returns
- Download documents and statements
- Request redemptions
- Access tax documents
- View secondary market exchange

---

### 2. Tenant Owner/Manager Account ✅
**Email:** `info@greyalpha.co`
**Password:** (Set via Supabase dashboard or password reset flow)
**Suggested Password:** `GreyAlpha2026!`
**Access:** Manager Portal (Full Access)
**Tenant:** ClearNav (greyalpha)
**Role:** General Manager / Owner

**To reset password:**
- Use Supabase Dashboard → Authentication → Users → Find user → Reset Password
- Or use the "Forgot Password" link on the login page

**What you can manage:**

#### Fund Management
- Fund setup and configuration
- Share class creation and management
- Capital account tracking for all investors
- NAV calculation and publication
- Transaction recording

#### Investor Operations
- Client/investor management
- Capital call issuance
- Distribution processing
- Redemption request handling
- Statement generation
- Performance report creation

#### Financial Administration
- Fee calculation (management + performance)
- Waterfall/profit allocation
- Carried interest tracking
- Side pocket management
- Tax document generation (K-1s)

#### CRM & Operations
- Contact/lead management
- Investor onboarding workflows
- Email communications
- Task management
- Analytics and reporting

#### Compliance & Governance
- Regulatory compliance tracking
- Document management
- Accredited investor verification
- AML/KYC documentation

#### Team Management
- Add/remove staff members
- Assign roles and permissions
- User access control

#### Settings
- Tenant branding customization
- IBKR integration setup
- Secondary market configuration
- Subscription management

**Total Features:** 28+ management tabs covering every aspect of hedge fund operations

---

### 3. Platform Admin Account (To Be Created)
**Email:** `admin@clearnav.io`
**Password:** `ClearNav2026!` (change after first login)
**Access:** Platform Admin Portal
**Role:** Super Admin

**How to create:**
1. Sign up at your platform admin domain with `admin@clearnav.io`
2. After signup, run this SQL:
```sql
-- Get the user ID
SELECT id FROM auth.users WHERE email = 'admin@clearnav.io';

-- Grant platform admin access (replace USER_ID with actual ID)
INSERT INTO platform_admin_users (user_id, role, permissions)
VALUES (
  'USER_ID',
  'super_admin',
  '{"can_create_tenants": true, "can_delete_tenants": true, "can_manage_billing": true}'::jsonb
);
```

**What you can manage:**
- All tenants across the platform
- Create/suspend/delete tenant accounts
- Platform-wide billing and subscriptions
- Revenue analytics and metrics
- System settings and configurations
- Support access to any tenant

---

## Tenant Information

### ClearNav (Active)
- **Slug:** greyalpha
- **ID:** c19ffb25-9ca2-469e-a59d-0ed8e1e89917
- **Status:** Active
- **Owner:** info@greyalpha.co
- **Clients:** 1 (test@greyalpha.co)

### Arkline (Active - No Users Yet)
- **Slug:** arkline
- **ID:** 4f53b21f-895d-4fa1-865a-8b8643f18495
- **Status:** Active
- **Owner:** Not assigned
- **Clients:** 0

---

## Testing Scenarios

### As Client (`test@greyalpha.co`)
1. Log in and see your investment dashboard
2. Check your account value: $110,000
3. View your investment: $100,000
4. Browse available documents
5. Submit a redemption request
6. Check performance returns

### As Tenant Owner (`info@greyalpha.co`)
1. Log in to see the Manager Portal (28 tabs)
2. Go to **Clients** tab → See test@greyalpha.co listed
3. Go to **Capital Accounts** tab → Manage investor accounts
4. Go to **NAV** tab → Calculate fund NAV
5. Go to **Capital Calls** tab → Issue capital calls
6. Go to **Distributions** tab → Process distributions
7. Go to **Statements** tab → Generate investor statements
8. Go to **Compliance** tab → Track regulatory requirements
9. Go to **Staff** tab → Add team members
10. Go to **Fund Management** tab → Configure fund details
11. Go to **Exchange** tab → Enable secondary market
12. Test IBKR integration in Settings

### As Platform Admin (`admin@clearnav.io` - after creation)
1. Log in to see Platform Admin Portal
2. Go to **Tenants** tab → See ClearNav and Arkline
3. Click on ClearNav → View tenant details
4. Go to **Billing** tab → View revenue metrics
5. Go to **Analytics** tab → See platform-wide stats
6. Create a new test tenant
7. Configure platform settings

---

## Key Differences

| Feature | Client | Tenant Owner | Platform Admin |
|---------|--------|--------------|----------------|
| Portal Access | Client Portal | Manager Portal | Platform Admin Portal |
| Sees | Own portfolio | All investors in their fund | All tenants |
| Can Manage | Own profile | Entire fund operations | All tenants |
| User Count in View | 1 (self) | All clients in tenant | All users across all tenants |
| Financial Access | Own balance | All fund finances | Platform billing |
| Admin Rights | None | Full (for their tenant) | Full (for entire platform) |

---

## Sample Data Available

### For test@greyalpha.co (Client)
- Account Number: TEST001
- Total Invested: $100,000
- Current Value: $110,000
- Gain: $10,000 (10%)
- Tenant: ClearNav

### For info@greyalpha.co (Manager)
- Full access to ClearNav tenant
- Can see 1 client (test@greyalpha.co)
- Can manage all fund operations
- Owner role with general_manager permissions

---

## Next Steps

1. **Test the Client Portal**
   - Log in as `test@greyalpha.co`
   - Explore the 7 client-facing tabs

2. **Test the Manager Portal**
   - Log in as `info@greyalpha.co`
   - Explore the 28 management tabs
   - Try adding sample data (funds, share classes, etc.)

3. **Create Platform Admin**
   - Sign up `admin@clearnav.io`
   - Run the SQL to grant admin access
   - Test tenant management

4. **Add More Test Data**
   - Create additional investors
   - Set up fund details
   - Configure share classes
   - Import positions from IBKR
   - Calculate NAV
   - Issue a capital call
   - Process a distribution

---

## Quick Login Guide

### To access Client Portal:
- URL: `https://[tenant-slug].yourdomain.com` (e.g., greyalpha.yourdomain.com)
- Login with: `test@greyalpha.co`
- See: Investment portfolio and documents

### To access Manager Portal:
- URL: Same as client portal (role-based routing)
- Login with: `info@greyalpha.co`
- See: Full fund management interface

### To access Platform Admin Portal:
- URL: `https://admin.yourdomain.com` OR detected via domain check
- Login with: `admin@clearnav.io` (after creation)
- See: Multi-tenant management console

---

## Architecture Notes

The system automatically routes users to the correct portal based on:
1. **Platform Admin Check:** If user is in `platform_admin_users` → Platform Admin Portal
2. **Staff Check:** If user is in `staff_accounts` → Manager Portal
3. **Client Check:** If user is in `client_profiles` → Client Portal
4. **Default:** Landing page

This means the same login URL can show different portals to different users based on their role.

---

## Password Security Note

⚠️ **IMPORTANT:** The passwords listed here are for testing only. In production:
- Change all default passwords immediately
- Use strong, unique passwords
- Enable 2FA for admin accounts
- Use a password manager
- Rotate credentials regularly
- Never commit passwords to version control

---

## Support

For more details on each portal's capabilities, see:
- **ADMIN_ACCOUNTS_GUIDE.md** - Complete feature breakdown
- **PLATFORM_GUIDE.md** - Platform architecture
- **Database migrations** - Schema details
