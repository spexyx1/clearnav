-- Vault: add information_memorandum to the document_type check, point app form to 2026.1, add IM slot.

-- 1. Extend the check constraint to include information_memorandum
ALTER TABLE investor_vault_documents DROP CONSTRAINT investor_vault_documents_document_type_check;
ALTER TABLE investor_vault_documents ADD CONSTRAINT investor_vault_documents_document_type_check
  CHECK (document_type = ANY (ARRAY['pitch_deck', 'term_sheet', 'one_pager', 'trade_history', 'strategy_report', 'application_form', 'information_memorandum', 'other']));

-- 2. Fix the application form document to use the 2026.1 PDF (not _cleaned)
UPDATE investor_vault_documents
SET storage_path = 'internal:/documents/Arkline_Trust_Application_Form.pdf',
    document_name = 'Application Form — Version 2026.1',
    description = 'The current Arkline Trust application form (Version 2026.1, 11 pages). Required for all new applications.'
WHERE id = '674a1c98-79d8-47fe-81ea-c57099fe333b';

-- 3. Add the Investment Memorandum slot (inactive until the file is supplied)
INSERT INTO investor_vault_documents (tenant_id, document_name, document_type, storage_path, description, sort_order, is_active)
SELECT '66aa0d61-696b-46e1-b2d3-4efcb8a315af',
       'Investment Memorandum — 21 May 2026',
       'information_memorandum',
       'internal:/documents/Arkline_Trust_Investment_Memorandum_2026.pdf',
       'The Arkline Trust Investment Memorandum dated 21 May 2026. This document will be available once uploaded.',
       9,
       false
WHERE NOT EXISTS (
  SELECT 1 FROM investor_vault_documents
  WHERE tenant_id = '66aa0d61-696b-46e1-b2d3-4efcb8a315af'
    AND document_type = 'information_memorandum'
);
