
-- Diagnostic: check what the platform admin user can see in email_account_access
-- This uses a DO block so it runs as superuser and bypasses RLS
DO $$
DECLARE
  admin_id uuid;
  access_count int;
  accounts_count int;
BEGIN
  SELECT user_id INTO admin_id FROM platform_admin_users WHERE role = 'super_admin' LIMIT 1;
  SELECT COUNT(*) INTO access_count FROM email_account_access WHERE user_id = admin_id;
  SELECT COUNT(*) INTO accounts_count FROM email_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'Platform admin user_id: %, email_account_access rows: %, platform email accounts: %',
    admin_id, access_count, accounts_count;
END $$;
