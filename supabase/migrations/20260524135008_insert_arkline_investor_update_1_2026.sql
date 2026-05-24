/*
  # Insert Arkline Investor Update #1 2026 into vault

  Adds the first investor report as a document in the Arkline investor vault.
  The storage_path uses the sentinel prefix "internal:" to indicate this is a
  branded in-app report rendered at /vault/report rather than a file download.

  1. Document details
    - document_name: Investor Update #1 — 2026
    - document_type: strategy_report
    - sort_order: 1 (appears first in the grid)
    - is_active: true
*/

INSERT INTO investor_vault_documents (
  tenant_id,
  document_name,
  document_type,
  storage_path,
  description,
  sort_order,
  is_active
)
SELECT
  id,
  'Investor Update #1 — 2026',
  'strategy_report',
  'internal:/vault/report',
  'Overview of the Arkline Investment Fund and its two portfolio strategies — Opportunistic and Quant-Value — including performance analysis for 2025 and YTD 2026.',
  1,
  true
FROM platform_tenants
WHERE slug = 'arkline'
ON CONFLICT DO NOTHING;
