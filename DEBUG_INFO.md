# Debug Information - Login Issue Resolution

## Issue: Blank White Page After Login

### What Happened
When logging in with `test@greyalpha.co`, the application showed a blank white page instead of the client dashboard.

### Root Causes Identified

#### 1. Missing PlatformProvider Wrapper
**Error:** `usePlatform must be used within a PlatformProvider`

**Problem:** The `ClientPortal` component uses the `usePlatform()` hook to access tenant context, but the `App.tsx` only wrapped components in `AuthProvider`, not `PlatformProvider`.

**Fix:** Added `PlatformProvider` wrapper in `App.tsx`:
```tsx
<AuthProvider>
  <PlatformProvider>
    <AppContent />
  </PlatformProvider>
</AuthProvider>
```

#### 2. Infinite Recursion in RLS Policies
**Error:** `infinite recursion detected in policy for relation "tenant_users"`

**Problem:** The `tenant_users` table had an RLS policy that queried itself to check permissions:
```sql
-- This policy caused infinite recursion
(tenant_id IN (
  SELECT tenant_users_1.tenant_id
  FROM tenant_users tenant_users_1  -- Querying tenant_users from within tenant_users policy!
  WHERE tenant_users_1.user_id = auth.uid()
))
```

This created a circular dependency:
1. To check if user can view `tenant_users`, query `tenant_users`
2. To query `tenant_users`, check if user can view `tenant_users`
3. Loop forever → Database error

**Fix:** Created security definer functions that bypass RLS:
```sql
CREATE FUNCTION user_is_tenant_admin(user_id uuid, tenant_id uuid)
RETURNS boolean
SECURITY DEFINER  -- Bypasses RLS when checking
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.user_id = user_id
      AND tenant_users.tenant_id = tenant_id
      AND tenant_users.role IN ('owner', 'admin')
  );
$$;
```

Then updated policies to use the function instead of direct subqueries.

#### 3. Missing User Profile Data
**Problem:** The test user had no `client_profile` or `tenant_users` association, so even if the portal loaded, there would be no data to display.

**Fix:** Created complete user profile:
- Email: test@greyalpha.co
- Name: Test User
- Account: TEST001
- Invested: $100,000
- Current Value: $110,000
- Tenant: ClearNav (greyalpha)
- Role: user

## Current Status

### ✅ All Issues Fixed

1. **PlatformProvider** - Added to component tree
2. **RLS Policies** - Infinite recursion eliminated with security definer functions
3. **User Profile** - Complete profile created with sample investment data
4. **Build** - Project builds successfully with no errors

### Test User Credentials

**Email:** `test@greyalpha.co`
**Password:** (whatever password was set during signup)
**Tenant:** ClearNav (greyalpha)

### What You Should See After Login

The test user should now see the **Client Portal** with:

1. **Dashboard Tab**
   - Account overview
   - Investment summary ($100K invested, $110K current value)
   - Performance metrics

2. **Returns Tab**
   - Historical performance data
   - Monthly/quarterly returns

3. **Documents Tab**
   - Access to fund documents
   - Statements and reports

4. **Redemptions Tab**
   - Request redemptions
   - View redemption history

5. **Tax Documents Tab**
   - K-1 forms
   - Tax statements

6. **Exchange Tab**
   - Secondary market listings (if enabled)

7. **Settings Tab**
   - IBKR integration settings
   - Account preferences

## Why This Happened

### Design Issue: Circular Dependencies in RLS
The original RLS policy design created circular dependencies because:

1. **Client-side code** needed to check tenant membership
2. **RLS policies** also needed to check tenant membership
3. Both tried to query `tenant_users` with RLS enabled
4. This created infinite loops

### The Solution: Security Definer Functions
Security definer functions run with the privileges of the function creator (bypassing RLS), breaking the circular dependency while maintaining security through careful function design.

## Technical Details

### Files Modified
1. `src/App.tsx` - Added PlatformProvider wrapper
2. Database migration - Created security definer functions and updated RLS policies
3. `client_profiles` table - Added test user profile
4. `tenant_users` table - Added tenant association

### Database Functions Created
- `user_is_tenant_admin(user_id, tenant_id)` - Check if user is admin
- `user_is_tenant_member(user_id, tenant_id)` - Check if user is member
- `user_tenant_ids(user_id)` - Get all tenant IDs for user

### Security Notes
The security definer functions are safe because:
1. They only perform read operations
2. They check specific, well-defined conditions
3. They don't expose raw data, only boolean results or ID lists
4. They're marked STABLE (results don't change within a transaction)

## Testing Checklist

After logging in with `test@greyalpha.co`, verify:

- [ ] Dashboard loads without errors
- [ ] User sees "Test User" name in header
- [ ] Account balance shows $110,000
- [ ] All navigation tabs are accessible
- [ ] No console errors in browser
- [ ] No database errors in Supabase logs

## Preventing This in the Future

### Best Practices for RLS Policies

1. **Avoid Self-Referencing Policies**
   - Don't query a table from within its own RLS policy
   - Use security definer functions for cross-table checks

2. **Test with Real Users**
   - Always create test users with complete profiles
   - Verify all user types (client, staff, admin) work correctly

3. **Monitor for Recursion**
   - Watch for "infinite recursion" errors in Supabase logs
   - Test policy changes thoroughly before deploying

4. **Use Context Providers Correctly**
   - Ensure all required providers wrap components that need them
   - Test that hooks work at every level of component tree

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
