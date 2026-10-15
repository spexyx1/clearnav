/*
# Index cleanup: add missing foreign-key indexes, remove exact duplicates

## Plain-English summary
1. Adds an index for every foreign key in `public` that has no index starting with
   its columns. This speeds up joins, related-record lookups and deletes.
   New indexes are named `idx_fk_<table>_<columns>` (truncated to fit).
2. Removes indexes that are exact copies of another index on the same table
   (same columns, same operator classes, same expressions and conditions).
   Indexes backing a primary key / unique constraint are always kept.

## Notes
- No table data is touched; only indexes.
- Unused (but distinct) indexes are left alone.
- Idempotent: re-running finds nothing new to do.
*/

DO $$
DECLARE
  r record;
  v_name text;
BEGIN
  FOR r IN
    SELECT c.conrelid, cl.relname AS tbl, c.conkey,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord) AS cols,
           string_agg(a.attname, '_' ORDER BY k.ord) AS col_names
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.contype = 'f'
       AND cl.relnamespace = 'public'::regnamespace
       AND NOT EXISTS (
         SELECT 1 FROM pg_index i
          WHERE i.indrelid = c.conrelid
            AND (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
            AND (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey
       )
     GROUP BY c.oid, c.conrelid, cl.relname, c.conkey
  LOOP
    v_name := left('idx_fk_' || r.tbl || '_' || r.col_names, 63);
    IF to_regclass('public.' || quote_ident(v_name)) IS NULL THEN
      EXECUTE format('CREATE INDEX %I ON public.%I (%s)', v_name, r.tbl, r.cols);
    END IF;
  END LOOP;

  FOR r IN
    SELECT dup.indexrelid::regclass AS idx
      FROM pg_index dup
      JOIN pg_class ic ON ic.oid = dup.indexrelid
     WHERE ic.relnamespace = 'public'::regnamespace
       AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = dup.indexrelid)
       AND EXISTS (
         SELECT 1 FROM pg_index keep
          WHERE keep.indrelid = dup.indrelid
            AND keep.indexrelid <> dup.indexrelid
            AND keep.indkey = dup.indkey
            AND keep.indclass = dup.indclass
            AND keep.indisunique = dup.indisunique
            AND COALESCE(pg_get_expr(keep.indexprs, keep.indrelid), '') = COALESCE(pg_get_expr(dup.indexprs, dup.indrelid), '')
            AND COALESCE(pg_get_expr(keep.indpred, keep.indrelid), '') = COALESCE(pg_get_expr(dup.indpred, dup.indrelid), '')
            AND (
              EXISTS (SELECT 1 FROM pg_constraint con2 WHERE con2.conindid = keep.indexrelid)
              OR keep.indexrelid < dup.indexrelid
            )
       )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %s', r.idx);
  END LOOP;
END $$;
