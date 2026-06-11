-- Extend the document_type check to include application_form
ALTER TABLE investor_vault_documents
  DROP CONSTRAINT investor_vault_documents_document_type_check;

ALTER TABLE investor_vault_documents
  ADD CONSTRAINT investor_vault_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'pitch_deck', 'term_sheet', 'one_pager',
    'trade_history', 'strategy_report', 'application_form', 'other'
  ]));

-- Insert the application form document for the arkline tenant
INSERT INTO investor_vault_documents (tenant_id, document_name, document_type, storage_path, description, is_active, sort_order)
SELECT 
  pt.id,
  'Investor Application Form',
  'application_form',
  'internal:/documents/Arkline_Trust_Application_Form_cleaned.pdf',
  'Download and complete the Arkline Trust application form. You may also apply online using the button below.',
  true,
  10
FROM platform_tenants pt
WHERE pt.slug = 'arkline'
ON CONFLICT DO NOTHING;