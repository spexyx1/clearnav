/*
# Let fund screens read the IBKR report sections list

1. Modified Tables
- `ibkr_flex_connections`: signed-in users can now read the `sections_found` column. Row access is still
  limited by the existing admin/staff policy.

2. Why
- `sections_found` was added after the original column-by-column grant and was never included in it. The fund
  screens request this column, so every lookup failed with "permission denied" and the screen wrongly showed
  the connection as missing.

3. Security
- The `token` column stays unreadable from the browser. No other privileges or policies change.
*/

GRANT SELECT (sections_found) ON public.ibkr_flex_connections TO authenticated;