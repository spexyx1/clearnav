/*
  # Add Foreign Key Indexes - Part 2 of 3
  
  1. Performance Optimization
    - Add indexes for all unindexed foreign keys (Part 2: 150 indexes)
    - Continues index creation for remaining tables
  
  2. Tables Covered (C-N)
    - client_units through notifications
    - Covers CRM, community, compliance, documents, email, exchange, fees, funds, investments, newsletters
  
  3. Impact
    - Completes indexing for mid-alphabet tables
    - Enables efficient multi-tenant queries across CRM and communication systems
*/

CREATE INDEX IF NOT EXISTS idx_client_units_trust_account_id_fk ON client_units(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_client_id_fk ON communication_log(client_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_contact_id_fk ON communication_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_staff_id_fk ON communication_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_tenant_id_fk ON communication_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent_comment_id_fk ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id_fk ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_tenant_id_fk ON community_posts(author_tenant_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category_id_fk ON community_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_comment_id_fk ON community_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_post_id_fk ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_related_opportunity_id_fk ON competitive_intelligence(related_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_tenant_id_fk ON competitive_intelligence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_client_id_fk ON compliance_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_contact_id_fk ON compliance_documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_tenant_id_fk ON compliance_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_verified_by_fk ON compliance_documents(verified_by);
CREATE INDEX IF NOT EXISTS idx_contact_activities_tenant_id_fk ON contact_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id_fk ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_staff_id_fk ON contact_interactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_content_schedule_tenant_id_fk ON content_schedule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned_to_fk ON crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_converted_to_client_id_fk ON crm_contacts(converted_to_client_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant_id_fk ON crm_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_currency_conversions_tenant_id_fk ON currency_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_forms_tenant_id_fk ON custom_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_access_policies_tenant_id_fk ON data_access_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_id_fk ON direct_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_distribution_allocations_capital_account_id_fk ON distribution_allocations(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_distribution_allocations_distribution_id_fk ON distribution_allocations(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_allocations_transaction_id_fk ON distribution_allocations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_distributions_fund_id_fk ON distributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_distributions_share_class_id_fk ON distributions(share_class_id);
CREATE INDEX IF NOT EXISTS idx_distributions_tenant_id_fk ON distributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_extraction_results_created_fund_id_fk ON document_extraction_results(created_fund_id);
CREATE INDEX IF NOT EXISTS idx_document_extraction_results_fund_document_id_fk ON document_extraction_results(fund_document_id);
CREATE INDEX IF NOT EXISTS idx_document_extraction_results_tenant_id_fk ON document_extraction_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_fund_id_fk ON document_folders(fund_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_folder_id_fk ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_tenant_id_fk ON document_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_capital_account_id_fk ON document_requests(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_fund_id_fk ON document_requests(fund_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_tenant_id_fk ON document_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant_id_fk ON document_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id_fk ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_records_domain_id_fk ON domain_verification_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_email_account_access_account_id_fk ON email_account_access(account_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_tenant_id_fk ON email_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_message_id_fk ON email_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by_fk ON email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id_fk ON email_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_labels_tenant_id_fk ON email_labels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_message_labels_label_id_fk ON email_message_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_email_message_labels_message_id_fk ON email_message_labels(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account_id_fk ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id_fk ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_tenant_id_fk ON email_sequences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by_fk ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id_fk ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_account_id_fk ON email_threads(account_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant_id_fk ON encryption_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_holder_id_fk ON escrow_accounts(holder_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_order_id_fk ON escrow_accounts(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_tenant_id_fk ON escrow_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_transaction_id_fk ON escrow_accounts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_client_id_fk ON event_registrations(client_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_contact_id_fk ON event_registrations(contact_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id_fk ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_assigned_to_fk ON exchange_audit_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_requested_by_fk ON exchange_audit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_tenant_id_fk ON exchange_audit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_transaction_id_fk ON exchange_audit_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_buyer_id_fk ON exchange_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_listing_id_fk ON exchange_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_matched_by_fk ON exchange_orders(matched_by);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_seller_id_fk ON exchange_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_tenant_id_fk ON exchange_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_buyer_id_fk ON exchange_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_listing_id_fk ON exchange_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_order_id_fk ON exchange_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_processed_by_fk ON exchange_transactions(processed_by);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_seller_id_fk ON exchange_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_tenant_id_fk ON exchange_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_parent_category_id_fk ON expense_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_id_fk ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_tenant_id_fk ON faq_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_fund_id_fk ON fee_schedules(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_share_class_id_fk ON fee_schedules(share_class_id);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_tenant_id_fk ON fee_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_fund_id_fk ON fee_structures(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_share_class_id_fk ON fee_structures(share_class_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_capital_account_id_fk ON fee_transactions(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_fee_schedule_id_fk ON fee_transactions(fee_schedule_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_fund_id_fk ON fee_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_tenant_id_fk ON fee_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id_fk ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id_fk ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_id_fk ON form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fund_documents_fund_id_fk ON fund_documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_documents_tenant_id_fk ON fund_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funds_tenant_id_fk ON funds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_client_id_fk ON ibkr_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_setup_by_fk ON ibkr_connections(setup_by);
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_tenant_id_fk ON ibkr_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibkr_sync_log_trust_account_id_fk ON ibkr_sync_log(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_tenant_id_fk ON inquiries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investments_client_id_fk ON investments(client_id);
CREATE INDEX IF NOT EXISTS idx_investments_tenant_id_fk ON investments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_capital_account_id_fk ON investor_documents(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_folder_id_fk ON investor_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_fund_id_fk ON investor_documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_previous_version_id_fk ON investor_documents(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_tenant_id_fk ON investor_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_investor_events_host_staff_id_fk ON investor_events(host_staff_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_capital_account_id_fk ON investor_statements(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_fund_id_fk ON investor_statements(fund_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_report_id_fk ON investor_statements(report_id);
CREATE INDEX IF NOT EXISTS idx_investor_statements_tenant_id_fk ON investor_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_records_tenant_id_fk ON invoice_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_contact_id_fk ON kyc_aml_records(contact_id);
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_tenant_id_fk ON kyc_aml_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_verified_by_fk ON kyc_aml_records(verified_by);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_data_tenant_id_fk ON lead_enrichment_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_contact_id_fk ON lead_pipeline(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_tenant_id_fk ON lead_score_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_tenant_id_fk ON lead_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_tenant_id_fk ON lead_scoring_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_tenant_id_fk ON login_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by_fk ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_fees_created_by_fk ON marketplace_fees(created_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_fees_tenant_id_fk ON marketplace_fees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_approved_by_fk ON marketplace_listings(approved_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_lister_id_fk ON marketplace_listings(lister_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_tenant_id_fk ON marketplace_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id_fk ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_mfa_settings_tenant_id_fk ON mfa_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nav_calculation_details_nav_calculation_id_fk ON nav_calculation_details(nav_calculation_id);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_fund_id_fk ON nav_calculations(fund_id);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_share_class_id_fk ON nav_calculations(share_class_id);
CREATE INDEX IF NOT EXISTS idx_navigation_menus_tenant_id_fk ON navigation_menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_newsletter_id_fk ON newsletter_analytics(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_tenant_id_fk ON newsletter_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_newsletter_id_fk ON newsletter_recipients(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_recipients_tenant_id_fk ON newsletter_recipients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_tenant_id_fk ON newsletter_subscribers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_tenant_id_fk ON newsletters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_capital_account_id_fk ON notification_preferences(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant_id_fk ON notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_capital_account_id_fk ON notifications(capital_account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id_fk ON notifications(tenant_id);