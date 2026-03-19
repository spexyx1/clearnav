/*
  # Remove Duplicate Indexes - Part 2

  1. Performance Optimization
    - Continues removing duplicate indexes that cover the same columns
    - Keeps more descriptive index names, removes generic _fk suffixed duplicates
    - Reduces storage overhead and improves write performance
    - Next 100 duplicate pairs

  2. Indexes Removed
    - Duplicate indexes across 100+ tables identified by database analysis
    - Only removing exact duplicates (same table, same columns, same uniqueness)

  3. Security
    - No RLS policy changes
    - No impact on query performance (keeping one index per column set)

  4. Important Notes
    - Uses DROP INDEX IF EXISTS for safe removal
    - Keeps indexes with more descriptive names
    - Removes indexes with generic _fk suffix
*/

-- Remove duplicate indexes (keeping more descriptive names)
DROP INDEX IF EXISTS idx_clawback_provisions_fund_id_fk;
DROP INDEX IF EXISTS idx_clawback_provisions_tenant_id_fk;
DROP INDEX IF EXISTS idx_client_invitations_tenant_id_fk;
DROP INDEX IF EXISTS idx_client_profiles_tenant_id_fk;
DROP INDEX IF EXISTS idx_client_units_client_id_fk;
DROP INDEX IF EXISTS idx_client_units_tenant_id_fk;
DROP INDEX IF EXISTS idx_client_units_trust_account_id_fk;
DROP INDEX IF EXISTS idx_communication_log_client_id_fk;
DROP INDEX IF EXISTS idx_communication_log_contact_id_fk;
DROP INDEX IF EXISTS idx_communication_log_staff_id_fk;
DROP INDEX IF EXISTS idx_communication_log_tenant_id_fk;
DROP INDEX IF EXISTS idx_community_comments_parent_comment_id_fk;
DROP INDEX IF EXISTS idx_community_comments_post_id_fk;
DROP INDEX IF EXISTS idx_community_posts_category_id_fk;
DROP INDEX IF EXISTS idx_community_reactions_comment_id_fk;
DROP INDEX IF EXISTS idx_community_reactions_post_id_fk;
DROP INDEX IF EXISTS idx_reactions_comment_id;
DROP INDEX IF EXISTS idx_reactions_post_id;
DROP INDEX IF EXISTS idx_competitive_intelligence_tenant_id_fk;
DROP INDEX IF EXISTS idx_compliance_documents_client_id_fk;
DROP INDEX IF EXISTS idx_compliance_documents_contact_id_fk;
DROP INDEX IF EXISTS idx_compliance_documents_tenant_id_fk;
DROP INDEX IF EXISTS idx_compliance_documents_verified_by_fk;
DROP INDEX IF EXISTS idx_contact_activities_tenant_id_fk;
DROP INDEX IF EXISTS idx_contact_interactions_contact_id_fk;
DROP INDEX IF EXISTS idx_contact_interactions_staff_id_fk;
DROP INDEX IF EXISTS idx_content_schedule_tenant_id_fk;
DROP INDEX IF EXISTS idx_crm_contacts_assigned_to_fk;
DROP INDEX IF EXISTS idx_crm_contacts_converted_to_client_id_fk;
DROP INDEX IF EXISTS idx_crm_contacts_tenant_id_fk;
DROP INDEX IF EXISTS idx_currency_conversions_tenant_id_fk;
DROP INDEX IF EXISTS idx_custom_forms_tenant_id_fk;
DROP INDEX IF EXISTS idx_data_access_policies_tenant_id_fk;
DROP INDEX IF EXISTS idx_direct_messages_thread_id_fk;
DROP INDEX IF EXISTS idx_distribution_allocations_capital_account_id_fk;
DROP INDEX IF EXISTS idx_distribution_allocations_distribution_id_fk;
DROP INDEX IF EXISTS idx_distribution_allocations_transaction_id_fk;
DROP INDEX IF EXISTS idx_distributions_share_class_id_fk;
DROP INDEX IF EXISTS idx_distributions_fund_id_fk;
DROP INDEX IF EXISTS idx_distributions_tenant_id_fk;
DROP INDEX IF EXISTS idx_document_extraction_results_fund_document_id_fk;
DROP INDEX IF EXISTS idx_document_extraction_results_tenant_id_fk;
DROP INDEX IF EXISTS idx_document_folders_fund_id_fk;
DROP INDEX IF EXISTS idx_document_folders_parent_folder_id_fk;
DROP INDEX IF EXISTS idx_document_folders_tenant_id_fk;
DROP INDEX IF EXISTS idx_document_requests_capital_account_id_fk;
DROP INDEX IF EXISTS idx_document_requests_fund_id_fk;
DROP INDEX IF EXISTS idx_document_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_document_templates_tenant_id_fk;
DROP INDEX IF EXISTS idx_documents_tenant_id_fk;
DROP INDEX IF EXISTS idx_domain_verification_records_domain_id_fk;
DROP INDEX IF EXISTS idx_email_account_access_account_id_fk;
DROP INDEX IF EXISTS idx_email_accounts_tenant_id_fk;
DROP INDEX IF EXISTS idx_email_attachments_message_id_fk;
DROP INDEX IF EXISTS idx_email_campaigns_tenant_id;
DROP INDEX IF EXISTS idx_email_campaigns_tenant_id_fk;
DROP INDEX IF EXISTS idx_email_campaigns_created_by_fk;
DROP INDEX IF EXISTS idx_email_labels_tenant_id_fk;
DROP INDEX IF EXISTS idx_email_message_labels_label_id_fk;
DROP INDEX IF EXISTS idx_email_message_labels_message_id_fk;
DROP INDEX IF EXISTS idx_email_messages_account_id_fk;
DROP INDEX IF EXISTS idx_email_messages_thread_id_fk;
DROP INDEX IF EXISTS idx_email_sequences_tenant_id_fk;
DROP INDEX IF EXISTS idx_email_templates_created_by_fk;
DROP INDEX IF EXISTS idx_email_templates_tenant_id_fk;
DROP INDEX IF EXISTS idx_email_threads_account_id_fk;
DROP INDEX IF EXISTS idx_encryption_keys_tenant_id_fk;
DROP INDEX IF EXISTS idx_escrow_accounts_holder_id_fk;
DROP INDEX IF EXISTS idx_escrow_accounts_order_id_fk;
DROP INDEX IF EXISTS idx_escrow_accounts_tenant_id_fk;
DROP INDEX IF EXISTS idx_escrow_accounts_transaction_id_fk;
DROP INDEX IF EXISTS idx_event_registrations_client_id_fk;
DROP INDEX IF EXISTS idx_event_registrations_contact_id_fk;
DROP INDEX IF EXISTS idx_event_registrations_event_id_fk;
DROP INDEX IF EXISTS idx_exchange_audit_requests_assigned_to_fk;
DROP INDEX IF EXISTS idx_exchange_audit_requests_requested_by_fk;
DROP INDEX IF EXISTS idx_exchange_audit_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_exchange_audit_requests_transaction_id_fk;
DROP INDEX IF EXISTS idx_exchange_orders_buyer_id_fk;
DROP INDEX IF EXISTS idx_exchange_orders_listing_id_fk;
DROP INDEX IF EXISTS idx_exchange_orders_matched_by_fk;
DROP INDEX IF EXISTS idx_exchange_orders_seller_id_fk;
DROP INDEX IF EXISTS idx_exchange_orders_tenant_id_fk;
DROP INDEX IF EXISTS idx_exchange_transactions_buyer_id_fk;
DROP INDEX IF EXISTS idx_exchange_transactions_listing_id_fk;
DROP INDEX IF EXISTS idx_exchange_transactions_order_id_fk;
DROP INDEX IF EXISTS idx_exchange_transactions_processed_by_fk;
DROP INDEX IF EXISTS idx_exchange_transactions_seller_id_fk;
DROP INDEX IF EXISTS idx_exchange_transactions_tenant_id_fk;
DROP INDEX IF EXISTS idx_expense_categories_tenant_id_fk;
DROP INDEX IF EXISTS idx_faq_items_tenant_id_fk;
DROP INDEX IF EXISTS idx_fee_schedules_share_class_id_fk;
DROP INDEX IF EXISTS idx_fee_schedules_fund_id_fk;
DROP INDEX IF EXISTS idx_fee_schedules_tenant_id_fk;
DROP INDEX IF EXISTS idx_fee_structures_fund_id_fk;
DROP INDEX IF EXISTS idx_fee_structures_share_class_id_fk;
DROP INDEX IF EXISTS idx_fee_transactions_capital_account_id_fk;