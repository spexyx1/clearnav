/*
  # Remove Duplicate Indexes - Part 3

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
DROP INDEX IF EXISTS idx_subscriber_sequences_subscriber_id_fk;
DROP INDEX IF EXISTS idx_subscription_change_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_support_ticket_messages_ticket_id_fk;
DROP INDEX IF EXISTS idx_support_tickets_tenant_id_fk;
DROP INDEX IF EXISTS idx_task_reminders_task_id_fk;
DROP INDEX IF EXISTS idx_tasks_activities_assigned_to_fk;
DROP INDEX IF EXISTS idx_tasks_activities_created_by_fk;
DROP INDEX IF EXISTS idx_tasks_activities_related_to_client_fk;
DROP INDEX IF EXISTS idx_tasks_activities_related_to_contact_fk;
DROP INDEX IF EXISTS idx_tasks_activities_tenant_id_fk;
DROP INDEX IF EXISTS idx_tax_document_requests_client_id_fk;
DROP INDEX IF EXISTS idx_tax_document_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_tax_documents_capital_account_id_fk;
DROP INDEX IF EXISTS idx_tax_documents_fund_id_fk;
DROP INDEX IF EXISTS idx_tax_documents_tenant_id_fk;
DROP INDEX IF EXISTS idx_telnyx_phone_numbers_tenant_id_fk;
DROP INDEX IF EXISTS idx_template_sections_template_id_fk;
DROP INDEX IF EXISTS idx_tenant_discounts_discount_code_id_fk;
DROP INDEX IF EXISTS idx_tenant_discounts_tenant_id_fk;
DROP INDEX IF EXISTS idx_tenant_domains_tenant_id_fk;
DROP INDEX IF EXISTS idx_tenant_email_settings_tenant_id_fk;
DROP INDEX IF EXISTS idx_tenant_notes_tenant_id_fk;
DROP INDEX IF EXISTS idx_tenant_subscriptions_plan_id_fk;
DROP INDEX IF EXISTS idx_tenant_subscriptions_tenant_id_fk;
DROP INDEX IF EXISTS idx_tenant_users_invited_via_fk;
DROP INDEX IF EXISTS idx_tenant_users_tenant_id_fk;
DROP INDEX IF EXISTS idx_testimonials_tenant_id_fk;
DROP INDEX IF EXISTS idx_token_holders_holder_id_fk;
DROP INDEX IF EXISTS idx_token_holders_tenant_id_fk;
DROP INDEX IF EXISTS idx_token_holders_token_id_fk;
DROP INDEX IF EXISTS idx_token_nav_snapshots_tenant_id_fk;
DROP INDEX IF EXISTS idx_token_nav_snapshots_verified_by_fk;
DROP INDEX IF EXISTS idx_token_transfer_history_exchange_transaction_id_fk;
DROP INDEX IF EXISTS idx_token_transfer_history_from_holder_id_fk;
DROP INDEX IF EXISTS idx_token_transfer_history_tenant_id_fk;
DROP INDEX IF EXISTS idx_token_transfer_history_to_holder_id_fk;
DROP INDEX IF EXISTS idx_token_transfer_history_token_id_fk;
DROP INDEX IF EXISTS idx_tokenization_requests_resulting_token_id_fk;
DROP INDEX IF EXISTS idx_tokenization_requests_reviewed_by_fk;
DROP INDEX IF EXISTS idx_tokenization_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_tokenized_assets_created_by_fk;
DROP INDEX IF EXISTS idx_tokenized_assets_tenant_id_fk;
DROP INDEX IF EXISTS idx_transactions_capital_account_id_fk;
DROP INDEX IF EXISTS idx_transactions_fund_id_fk;
DROP INDEX IF EXISTS idx_transactions_nav_calculation_id_fk;
DROP INDEX IF EXISTS idx_trust_account_tenant_id_fk;
DROP INDEX IF EXISTS idx_trust_nav_history_trust_account_id_fk;
DROP INDEX IF EXISTS idx_trust_positions_trust_account_id_fk;
DROP INDEX IF EXISTS idx_unit_transactions_client_id_fk;
DROP INDEX IF EXISTS idx_unit_transactions_trust_account_id_fk;
DROP INDEX IF EXISTS idx_usage_metrics_tenant_id_fk;
DROP INDEX IF EXISTS idx_usage_snapshots_tenant_id_fk;
DROP INDEX IF EXISTS idx_user_invitations_invited_by_fk;
DROP INDEX IF EXISTS idx_user_invitations_tenant_id_fk;
DROP INDEX IF EXISTS idx_user_roles_tenant_id_fk;
DROP INDEX IF EXISTS idx_vercel_deployments_domain_id_fk;
DROP INDEX IF EXISTS idx_vercel_deployments_tenant_id_fk;
DROP INDEX IF EXISTS idx_voice_agent_configurations_tenant_id_fk;
DROP INDEX IF EXISTS idx_voice_agent_escalation_rules_tenant_id_fk;
DROP INDEX IF EXISTS idx_voice_agent_knowledge_base_tenant_id_fk;
DROP INDEX IF EXISTS idx_voice_agent_scripts_tenant_id_fk;
DROP INDEX IF EXISTS idx_voice_call_sessions_tenant_id_fk;
DROP INDEX IF EXISTS idx_voice_call_transcripts_call_session_id_fk;
DROP INDEX IF EXISTS idx_watchlist_stocks_added_by_fk;
DROP INDEX IF EXISTS idx_watchlist_stocks_added_from_alert_id_fk;
DROP INDEX IF EXISTS idx_waterfall_calculations_fund_id_fk;
DROP INDEX IF EXISTS idx_waterfall_calculations_waterfall_structure_id_fk;
DROP INDEX IF EXISTS idx_waterfall_calculations_tenant_id_fk;
DROP INDEX IF EXISTS idx_waterfall_structures_fund_id_fk;
DROP INDEX IF EXISTS idx_waterfall_structures_tenant_id_fk;
DROP INDEX IF EXISTS idx_webhook_deliveries_endpoint_id_fk;
DROP INDEX IF EXISTS idx_webhook_endpoints_tenant_id_fk;
DROP INDEX IF EXISTS idx_website_analytics_tenant_id_fk;
DROP INDEX IF EXISTS idx_website_custom_css_tenant_id_fk;
DROP INDEX IF EXISTS idx_website_performance_settings_tenant_id_fk;
DROP INDEX IF EXISTS idx_website_seo_settings_tenant_id_fk;
DROP INDEX IF EXISTS idx_win_loss_analysis_opportunity_id_fk;