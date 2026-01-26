/*
  # Remove Duplicate Indexes

  1. Purpose
    - Remove duplicate indexes that provide no additional benefit
    - Reduces storage overhead and write operation costs
    - Simplifies index maintenance

  2. Changes
    - Drops idx_ibkr_connections_tenant_id (duplicate of idx_ibkr_connections_tenant)
    - Keeps idx_ibkr_connections_tenant as it was created first

  3. Performance Impact
    - No negative impact on query performance
    - Reduces storage space
    - Improves write performance slightly
*/

-- Remove duplicate index (keep the one without _id suffix for consistency)
DROP INDEX IF EXISTS idx_ibkr_connections_tenant_id;
