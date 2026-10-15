/*
# Faster row-level security checks

## Plain-English summary
Most access rules call `auth.uid()` (and some `auth.jwt()` / `auth.role()`) once per
row. Wrapping them as `(select auth.uid())` lets Postgres evaluate them once per
query instead, which speeds up large list screens. The rules themselves are
unchanged: same tables, same roles, same conditions.

## Modified
- Every policy in the `public` schema whose USING / WITH CHECK expression calls
  `auth.uid()`, `auth.jwt()` or `auth.role()` without a wrapping SELECT.

## Notes
1. Idempotent: already-wrapped calls are skipped, so re-running is a no-op.
2. No tables, columns or data are changed.
*/

DO $$
DECLARE
  r record;
  v_using text;
  v_check text;
  v_sql text;
  v_pattern constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
BEGIN
  FOR r IN
    SELECT p.polname, c.relname,
           pg_get_expr(p.polqual, p.polrelid) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS wcheck
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
     WHERE c.relnamespace = 'public'::regnamespace
       AND (COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ~ v_pattern
         OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ v_pattern)
  LOOP
    v_using := CASE WHEN r.qual IS NOT NULL THEN regexp_replace(r.qual, v_pattern, '(SELECT auth.\1())', 'g') END;
    v_check := CASE WHEN r.wcheck IS NOT NULL THEN regexp_replace(r.wcheck, v_pattern, '(SELECT auth.\1())', 'g') END;
    v_sql := format('ALTER POLICY %I ON public.%I', r.polname, r.relname);
    IF v_using IS NOT NULL THEN v_sql := v_sql || format(' USING (%s)', v_using); END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || format(' WITH CHECK (%s)', v_check); END IF;
    EXECUTE v_sql;
  END LOOP;
END $$;
