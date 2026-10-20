/*
# Reporting and document review access

## Plain-English summary
Fund managers (tenant admins) could not save performance results or tax documents because those
tables only trusted a legacy staff list that has no members. Uploaded fund documents could not be
fully deleted. This migration lets tenant admins manage these records for their own tenant only,
adds a "ready" status for statements and tax documents, and adds room to store one investor's
details read from an application or subscription form.

## 1. Modified tables
- `performance_metrics`
  - New unique index on (fund_id, share_class_id, period_type, metric_date), treating an empty
    share class (the whole-trust row) as one value, so recalculating replaces instead of duplicating.
- `tax_documents`
  - `tax_breakdown` (jsonb): the manager-entered tax components (e.g. franked distributions, capital gains).
  - `register_facts` (jsonb): facts taken from the unit register (units held, class, distributions paid).
  - Status list gains `ready`.
- `investor_statements`: status list gains `ready`.
- `document_extraction_results`
  - `extracted_investor` (jsonb): investor details found by the reader in an application form.
  - `approved_investor` (jsonb): the manager-checked investor details.
  - `created_application_id` (uuid): the onboarding application created on approval.

## 2. Security
- `performance_metrics`, `tax_documents`: tenant admins get separate select/insert/update/delete
  policies scoped to their own tenant via `user_is_tenant_admin`.
- `fund_documents`, `document_extraction_results`: tenant admins can delete their own tenant's rows.
- Existing policies are left in place.

## 3. Notes
1. No data is removed; status lists are only widened.
2. Safe to re-run.
*/

CREATE UNIQUE INDEX IF NOT EXISTS performance_metrics_fund_class_period_uidx
  ON performance_metrics (fund_id, share_class_id, period_type, metric_date) NULLS NOT DISTINCT;

ALTER TABLE tax_documents ADD COLUMN IF NOT EXISTS tax_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE tax_documents ADD COLUMN IF NOT EXISTS register_facts jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE tax_documents DROP CONSTRAINT IF EXISTS tax_documents_document_status_check;
ALTER TABLE tax_documents ADD CONSTRAINT tax_documents_document_status_check
  CHECK (document_status = ANY (ARRAY['draft','review','finalized','ready','sent','filed']));

ALTER TABLE investor_statements DROP CONSTRAINT IF EXISTS investor_statements_status_check;
ALTER TABLE investor_statements ADD CONSTRAINT investor_statements_status_check
  CHECK (status = ANY (ARRAY['draft','finalized','ready','sent','viewed']));

ALTER TABLE document_extraction_results ADD COLUMN IF NOT EXISTS extracted_investor jsonb;
ALTER TABLE document_extraction_results ADD COLUMN IF NOT EXISTS approved_investor jsonb;
ALTER TABLE document_extraction_results ADD COLUMN IF NOT EXISTS created_application_id uuid
  REFERENCES investor_applications(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS document_extraction_results_created_application_idx
  ON document_extraction_results (created_application_id);

DROP POLICY IF EXISTS "tenant_admin_select_performance_metrics" ON performance_metrics;
CREATE POLICY "tenant_admin_select_performance_metrics" ON performance_metrics FOR SELECT
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_insert_performance_metrics" ON performance_metrics;
CREATE POLICY "tenant_admin_insert_performance_metrics" ON performance_metrics FOR INSERT
  TO authenticated WITH CHECK (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_update_performance_metrics" ON performance_metrics;
CREATE POLICY "tenant_admin_update_performance_metrics" ON performance_metrics FOR UPDATE
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id))
  WITH CHECK (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_delete_performance_metrics" ON performance_metrics;
CREATE POLICY "tenant_admin_delete_performance_metrics" ON performance_metrics FOR DELETE
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id));

DROP POLICY IF EXISTS "tenant_admin_select_tax_documents" ON tax_documents;
CREATE POLICY "tenant_admin_select_tax_documents" ON tax_documents FOR SELECT
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_insert_tax_documents" ON tax_documents;
CREATE POLICY "tenant_admin_insert_tax_documents" ON tax_documents FOR INSERT
  TO authenticated WITH CHECK (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_update_tax_documents" ON tax_documents;
CREATE POLICY "tenant_admin_update_tax_documents" ON tax_documents FOR UPDATE
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id))
  WITH CHECK (user_is_tenant_admin((select auth.uid()), tenant_id));
DROP POLICY IF EXISTS "tenant_admin_delete_tax_documents" ON tax_documents;
CREATE POLICY "tenant_admin_delete_tax_documents" ON tax_documents FOR DELETE
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id));

DROP POLICY IF EXISTS "tenant_admin_delete_fund_documents" ON fund_documents;
CREATE POLICY "tenant_admin_delete_fund_documents" ON fund_documents FOR DELETE
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id));

DROP POLICY IF EXISTS "tenant_admin_delete_extraction_results" ON document_extraction_results;
CREATE POLICY "tenant_admin_delete_extraction_results" ON document_extraction_results FOR DELETE
  TO authenticated USING (user_is_tenant_admin((select auth.uid()), tenant_id));
