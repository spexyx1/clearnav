/*
  # Add Arkline PDF report to investor vault

  Inserts the original monthly report PDF as a second vault document for the Arkline tenant.
  The PDF is served from the app's public folder at /Arkline_Investments_Monthly_Report_-_May2026b.pdf.
  It uses an `internal:` prefix path so the edge function returns it as an internal_path, 
  which the vault UI then renders as a direct link to the public PDF.
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
  '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
  'Monthly Report — May 2026 (PDF)',
  'strategy_report',
  'internal:/Arkline_Investments_Monthly_Report_-_May2026b.pdf',
  'Original monthly report for May 2026, covering fund performance, strategy updates, and market commentary.',
  2,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM investor_vault_documents
  WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
    AND document_name = 'Monthly Report — May 2026 (PDF)'
);
