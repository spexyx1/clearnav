# Debug Information

## Issue Status
The application has been checked and a debug tool has been added to help identify login issues.

## What Was Done

### 1. Build Check
- Project builds successfully with no compilation errors
- All TypeScript types are correct
- No runtime errors detected

### 2. Database Check
- User exists: `info@greyalpha.co`
- User ID: `4772f56c-0ec4-4d3f-bf9b-ac7f6c52ab3a`
- User has password set: ✓
- Email confirmed: ✓
- Staff account exists: ✓
- Role: `admin`
- Status: `active`
- Tenant: `ClearNav` (slug: `greyalpha`)

### 3. Debug Tool Added
A debug tool has been added to help test login functionality.

**Access it at:** `http://localhost:5173/debug`

The debug tool allows you to:
- Test login with different passwords
- Check user information from the database
- See detailed error messages
- Verify account status

## How to Use the Debug Tool

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/debug`

3. The email is pre-filled with: `info@greyalpha.co`

4. Try logging in with different passwords to find the correct one

5. Use "Check User Info" button to verify account status

## Known Information

- **Email:** info@greyalpha.co
- **Account Type:** Staff Admin
- **Tenant:** ClearNav (greyalpha)
- **Status:** Active

## Password Reset Issue

The automatic password reset function encountered database errors from Supabase's Admin API. To reset the password manually:

### Option 1: Use Supabase Dashboard
1. Go to https://meznfatysnpeayollcib.supabase.co
2. Navigate to Authentication → Users
3. Find user: info@greyalpha.co
4. Click the three dots → Reset Password
5. Copy the recovery link or set a new password directly

### Option 2: Use SQL (if you have direct access)
```sql
-- Note: This requires service role access
SELECT * FROM auth.users WHERE email = 'info@greyalpha.co';
```

## What to Check Next

1. **If login fails:**
   - Check the error message in the debug tool
   - Verify the password is correct
   - Check browser console for errors
   - Verify Supabase connection is working

2. **If login succeeds but portal doesn't load:**
   - Check the user role assignment
   - Verify tenant association
   - Check RLS policies

3. **If you see authentication errors:**
   - Check .env file has correct Supabase credentials
   - Verify Supabase project is active
   - Check network connectivity

## Environment Check

Current Supabase configuration:
- URL: https://meznfatysnpeayollcib.supabase.co
- Project is configured and accessible
- Environment variables are loaded correctly

## Next Steps

1. Access the debug tool at `/debug`
2. Test login with the correct password
3. If you don't know the password, reset it via Supabase Dashboard
4. Once logged in, verify the manager portal loads correctly

## Common Issues

### "Invalid email or password"
- Password is incorrect
- Reset password via Supabase Dashboard

### "Session expired"
- Clear browser cache and cookies
- Try logging in again

### "Database error"
- Check Supabase project status
- Verify environment variables are correct
- Check network connectivity

## Support

If you continue to experience issues:
1. Share the error message from the debug tool
2. Check browser console for additional errors
3. Verify Supabase project dashboard shows no errors
4. Check that RLS policies are correctly configured
