/*
# Performance: index foreign keys and remove duplicate indexes

1. New indexes (foreign keys that had no supporting index)
- fund_movement_labels: share_class_id, set_by
- fund_price_marks: updated_by
- ibkr_flex_connections: tenant_id, created_by
- redemption_requests: capital_transaction_id
- unit_subscriptions: tenant_id, client_id, capital_transaction_id, created_by, share_class_id

2. Removed indexes (no data affected)
- Every non-unique index whose columns, expressions and filter exactly match a
  unique or primary-key index on the same table. The unique index already serves
  the same lookups, so the duplicate only slowed down writes.
- trade_uploads: two identical non-unique indexes on fund_id; one is kept.

3. Security
- No changes to row level security or permissions.
*/

CREATE INDEX IF NOT EXISTS idx_fund_movement_labels_share_class_id ON fund_movement_labels (share_class_id);
CREATE INDEX IF NOT EXISTS idx_fund_movement_labels_set_by ON fund_movement_labels (set_by);
CREATE INDEX IF NOT EXISTS idx_fund_price_marks_updated_by ON fund_price_marks (updated_by);
CREATE INDEX IF NOT EXISTS idx_ibkr_flex_connections_tenant_id ON ibkr_flex_connections (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_flex_connections_created_by ON ibkr_flex_connections (created_by);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_capital_transaction_id ON redemption_requests (capital_transaction_id);
CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_tenant_id ON unit_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_client_id ON unit_subscriptions (client_id);
CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_capital_transaction_id ON unit_subscriptions (capital_transaction_id);
CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_created_by ON unit_subscriptions (created_by);
CREATE INDEX IF NOT EXISTS idx_unit_subscriptions_share_class_id ON unit_subscriptions (share_class_id);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT d.indexrelid::regclass AS idx
    FROM pg_index d
    JOIN pg_class c ON c.oid = d.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT d.indisunique AND NOT d.indisprimary
      AND EXISTS (
        SELECT 1 FROM pg_index u
        WHERE u.indrelid = d.indrelid AND u.indexrelid <> d.indexrelid AND u.indisunique
          AND u.indkey::text = d.indkey::text
          AND coalesce(pg_get_expr(u.indexprs, u.indrelid), '') = coalesce(pg_get_expr(d.indexprs, d.indrelid), '')
          AND coalesce(pg_get_expr(u.indpred, u.indrelid), '') = coalesce(pg_get_expr(d.indpred, d.indrelid), '')
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %s', r.idx);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.idx_fk_trade_uploads_fund_id;
