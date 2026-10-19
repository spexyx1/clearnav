/*
# Fund dealing terms from the trust deed and IM

1. Changes to existing tables
- `fund_documents.extraction_status` may now also be `awaiting_review`: the document is stored but no
  automatic reader is configured, so the terms are filled in by a reviewer instead of invented.
- `document_extraction_results`:
  - `extracted_terms` (jsonb): dealing and fee terms found in the document; each term is
    `{ value, clause, page, quote }` so every number points back to its source.
  - `approved_terms` (jsonb): the terms as edited/confirmed by the manager.
  - `class_mapping` (jsonb): `{ "<class name in document>": "<existing share_class_id>" }`.
  - `extraction_source` (text): `ai` | `reviewer`.

2. New table `fund_dealing_terms` (one row per fund)
- `fund_id` (uuid, unique, references funds)
- `tenant_id` (uuid, references platform_tenants)
- `terms` (jsonb): the approved dealing rules used by the dealing engine
  (dealing_frequency, valuation_point, application_cutoff_business_days, redemption_notice_days,
  launch_unit_price, minimum_initial_investment, minimum_additional_investment, fee terms, ...).
- `source_document_ids` (uuid[]): documents the terms were approved from.
- `approved_by`, `approved_at`, `created_at`, `updated_at`.

3. Security
- RLS enabled on `fund_dealing_terms`; tenant admins and investor-app staff of the tenant can
  select/insert/update. No delete policy (history is kept by overwriting with approval metadata).
*/

ALTER TABLE fund_documents DROP CONSTRAINT IF EXISTS fund_documents_extraction_status_check;
ALTER TABLE fund_documents ADD CONSTRAINT fund_documents_extraction_status_check
  CHECK (extraction_status = ANY (ARRAY['pending','processing','awaiting_review','extracted','approved','failed']));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_extraction_results' AND column_name='extracted_terms') THEN
    ALTER TABLE document_extraction_results ADD COLUMN extracted_terms jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_extraction_results' AND column_name='approved_terms') THEN
    ALTER TABLE document_extraction_results ADD COLUMN approved_terms jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_extraction_results' AND column_name='class_mapping') THEN
    ALTER TABLE document_extraction_results ADD COLUMN class_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_extraction_results' AND column_name='extraction_source') THEN
    ALTER TABLE document_extraction_results ADD COLUMN extraction_source text NOT NULL DEFAULT 'ai';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS fund_dealing_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL UNIQUE REFERENCES funds(id) ON DELETE CASCADE,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_document_ids uuid[] NOT NULL DEFAULT '{}',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fund_dealing_terms_tenant ON fund_dealing_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fund_dealing_terms_approved_by ON fund_dealing_terms(approved_by);

ALTER TABLE fund_dealing_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_fund_dealing_terms" ON fund_dealing_terms;
CREATE POLICY "admin_select_fund_dealing_terms" ON fund_dealing_terms FOR SELECT TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "admin_insert_fund_dealing_terms" ON fund_dealing_terms;
CREATE POLICY "admin_insert_fund_dealing_terms" ON fund_dealing_terms FOR INSERT TO authenticated
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));

DROP POLICY IF EXISTS "admin_update_fund_dealing_terms" ON fund_dealing_terms;
CREATE POLICY "admin_update_fund_dealing_terms" ON fund_dealing_terms FOR UPDATE TO authenticated
  USING (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id))
  WITH CHECK (user_is_tenant_admin((SELECT auth.uid()), tenant_id) OR is_investor_app_staff(tenant_id));