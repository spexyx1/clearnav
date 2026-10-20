/*
# Consolidate overlapping access policies on core fund tables

1. What changes
- Tables: capital_transactions, investor_statements, redemption_requests,
  client_profiles, trade_uploads, trade_upload_items.
- Where a table had several permissive policies for the SAME action
  (select/insert/update/delete) and the SAME roles, they are replaced by ONE
  policy whose rule is the OR of the originals.

2. Why access is unchanged
- Postgres already ORs permissive policies together, so one combined policy
  allows exactly the same rows. For updates, each original's write check
  (or its read rule when it had no write check) is ORed into the new check.
- FOR ALL policies, restrictive policies, and any group with a missing rule are
  left untouched.

3. Performance
- Postgres evaluates one policy per row instead of several.
*/

DO $$
DECLARE
  g record;
  p record;
  new_name text;
  using_expr text;
  check_expr text;
BEGIN
  FOR g IN
    SELECT tablename, cmd, roles, array_agg(policyname ORDER BY policyname) AS names
    FROM pg_policies
    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE' AND cmd <> 'ALL'
      AND tablename IN ('capital_transactions','investor_statements','redemption_requests','client_profiles','trade_uploads','trade_upload_items')
    GROUP BY tablename, cmd, roles
    HAVING count(*) > 1
       AND bool_and(CASE cmd WHEN 'INSERT' THEN with_check IS NOT NULL ELSE qual IS NOT NULL END)
  LOOP
    SELECT string_agg('(' || qual || ')', ' OR ' ORDER BY policyname),
           string_agg('(' || coalesce(with_check, qual) || ')', ' OR ' ORDER BY policyname)
      INTO using_expr, check_expr
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = g.tablename AND policyname = ANY (g.names);

    new_name := g.tablename || '_' || lower(g.cmd) || '_' || replace(array_to_string(g.roles, '_'), ' ', '') || '_combined';

    FOR p IN SELECT unnest(g.names) AS n LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.n, g.tablename);
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', new_name, g.tablename);

    IF g.cmd = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO %s WITH CHECK (%s)',
        new_name, g.tablename, array_to_string(g.roles, ', '), check_expr);
    ELSIF g.cmd = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        new_name, g.tablename, array_to_string(g.roles, ', '), using_expr, check_expr);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO %s USING (%s)',
        new_name, g.tablename, g.cmd, array_to_string(g.roles, ', '), using_expr);
    END IF;
  END LOOP;
END $$;
