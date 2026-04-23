# User Migration from mezn to xiel

## Status

**Database Migration:** Complete (all 115 migrations applied to xiel)  
**Data Access:** Limited (mezn service role key unavailable)  
**Platform Readiness:** Ready for new user onboarding with password reset flow

## What Was Migrated

✓ All database schema (tables, indexes, RLS policies, functions)  
✓ Seed data (website templates, legal docs, auditor questions, Arkline branding)  
✓ Edge functions (all 16 functions deployed and active)  
✓ Platform configuration and multi-tenancy setup

## What Was NOT Migrated

✗ Historical user accounts (mezn service role key unavailable)  
✗ Legacy user data (posts, documents, activity logs)  
✗ Storage files (tenant logos, documents)

**Why:** The mezn Supabase project became inaccessible, preventing data export. Without the service role key, we cannot authenticate to extract user data via the REST API.

## User Onboarding Strategy

### For Existing mezn Users

Instead of data migration, use the **password reset flow** to re-onboard users:

1. **User List Collection**
   - Gather email addresses from mezn's client list, investor roster, or manual export
   - Format: CSV or JSON array of email strings

2. **Create Users on xiel**
   ```bash
   # Option A: Use the migrate-users.ts script
   # Edit scripts/migrate-users.ts with user list, then run:
   deno run --allow-env --allow-net scripts/migrate-users.ts
   
   # Option B: Use the Supabase CLI
   supabase link --project-ref xielqbwkiibeaajljamo
   supabase auth admin create-user --email user@example.com
   ```

3. **Generate Password Reset Links**
   - Script automatically generates recovery links for each user
   - Send links via email (see below)

4. **Email Users**
   - Use the existing `send-email` edge function to deliver reset links
   - Sample email template:
     ```
     Subject: Welcome to [Tenant Name] — Reset Your Password
     
     We've migrated to a new platform. To get started:
     
     1. Click the link below to reset your password
     2. Set a secure new password
     3. You'll have full access to your account
     
     [Reset Link]
     
     If you don't recognize this email, contact support.
     ```

### For New Users

Self-service signup is fully operational:

1. Users navigate to custom domain (e.g., arklinetrust.com)
2. Sign up with email and password
3. Auto-provisioned tenant with default branding, pages, and website
4. Immediate access to manager portal

## Recovery Scenarios

### If User Lost Password Reset Link

1. Admin logs into xiel with tenant credentials
2. Opens `supabase/functions/admin-update-password` endpoint
3. Provides user email; system generates new reset link
4. User receives new link via email

### If User Email Is Wrong

Edit in Supabase Dashboard → Authentication → Users → modify email  
(Or use Supabase CLI: `supabase auth admin update-user-by-email old@example.com --new-email new@example.com`)

### If User Account Creation Fails

Check logs in Supabase → Functions → migrate-users-bulk (once deployed)  
Review error messages and retry failed emails

## Files Reference

- **Migration Script:** `scripts/migrate-users.ts` — Bulk user creation with recovery links
- **Database:** xiel (https://xielqbwkiibeaajljamo.supabase.co)
- **Frontend:** Existing code (fully compatible, no changes needed)
- **Email:** Uses `send-email` edge function (already deployed)

## Next Steps

1. Collect user email list from mezn
2. Run `scripts/migrate-users.ts` to create users
3. Send password reset emails
4. Monitor user onboarding (check auth logs in Supabase Dashboard)
5. Decommission mezn Supabase project

## Support

For questions or issues:
- Check Supabase Dashboard → Logs for function errors
- Review `migration-results-*.json` output files
- Contact Supabase support if authentication fails
