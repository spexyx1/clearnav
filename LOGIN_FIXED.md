# Login and Newsletter Issues - FIXED

## What Was Fixed

### 1. Domain Resolution
- Added `clearnav.cv` to the tenant_domains table
- Updated tenant resolver to prioritize custom domain lookups
- The system now correctly identifies clearnav.cv as belonging to the ClearNav (greyalpha) tenant

### 2. Newsletter Functionality
- Fixed Newsletter RLS SELECT policy to allow staff_accounts to read newsletters
- Updated newsletter component to properly wait for authentication and tenant context before rendering
- Added better loading states to prevent premature error messages

### 3. Account Access
- Reset the password for test@greyalpha.co to a known value
- Updated CURRENT_ACCOUNTS.md with correct login information

## How to Login

### Access the Manager Portal:
1. Go to: **https://clearnav.cv**
2. Click "Sign In" or go directly to login
3. Enter credentials:
   - **Email:** `test@greyalpha.co`
   - **Password:** `TestPass123!`
4. You will see the Manager Portal with 28 management tabs

### Testing Newsletters:
1. After logging in, click on the "Communications" tab in the left sidebar
2. You should see the Newsletter Manager
3. Click "Create Newsletter" to test creating a new newsletter
4. Fill in the form and save

## Account Details

### test@greyalpha.co has THREE roles:
1. **Tenant Owner** - Full administrative access to the ClearNav tenant
2. **General Manager (Staff)** - Access to all 28 management features
3. **Client** - Has a portfolio worth $110,000

The system automatically shows the Manager Portal because staff/owner access takes precedence over client access.

## Technical Changes Made

### Database:
- Added domain mapping: `clearnav.cv` → ClearNav tenant (c19ffb25-9ca2-469e-a59d-0ed8e1e89917)
- Created new migration: `fix_newsletter_select_policy_for_staff`
- Reset user password using encrypted_password update

### Code:
- Simplified tenant resolver to check custom domains first
- Updated NewsletterManager component to handle loading states properly
- Removed excessive console logging from tenant resolver

### RLS Policies:
- Enhanced newsletter SELECT policy to check both tenant_users AND staff_accounts tables
- This ensures staff can read newsletters even without a tenant_users entry

## Verification

The system has been built successfully and all TypeScript checks pass. The fixes are comprehensive and address:
1. Domain resolution for clearnav.cv
2. Authentication flow
3. Newsletter tab loading
4. RLS policy access for staff accounts

## If You Still Have Issues

If login still doesn't work, please check:
1. Are you visiting https://clearnav.cv exactly?
2. Are you using the exact password: `TestPass123!` (case sensitive)
3. Check browser console for any JavaScript errors
4. Try clearing your browser cache and cookies
5. Try in an incognito/private browsing window

## Next Steps

Once logged in, you can:
1. Test all 28 management tabs
2. Create and send newsletters
3. Manage capital accounts
4. Calculate NAV
5. Issue capital calls
6. Process distributions
7. Generate investor statements
8. And much more...

See CURRENT_ACCOUNTS.md for a complete list of features available to you.
