/*
  # Remove Duplicate Indexes - Part 1

  1. Performance Optimization
    - Removes duplicate indexes that cover the same columns
    - Keeps more descriptive index names, removes generic _fk suffixed duplicates
    - Reduces storage overhead and improves write performance
    - First 50 duplicate pairs

  2. Indexes Removed
    - Duplicate indexes across 50 tables identified by database analysis
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
DROP INDEX IF EXISTS idx_accounting_integrations_tenant_id_fk;
DROP INDEX IF EXISTS idx_accounting_sync_log_integration_id_fk;
DROP INDEX IF EXISTS idx_accounting_sync_log_tenant_id_fk;
DROP INDEX IF EXISTS idx_accounting_transactions_fund_id_fk;
DROP INDEX IF EXISTS idx_accounting_transactions_integration_id_fk;
DROP INDEX IF EXISTS idx_accounting_transactions_tenant_id_fk;
DROP INDEX IF EXISTS idx_accreditation_verification_contact_id_fk;
DROP INDEX IF EXISTS idx_accreditation_verification_tenant_id_fk;
DROP INDEX IF EXISTS idx_accreditation_verification_verification_document_id_fk;
DROP INDEX IF EXISTS idx_accreditation_verification_verified_by_fk;
DROP INDEX IF EXISTS idx_ai_ab_test_variants_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_agent_actions_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_agent_configs_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_agent_performance_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_agent_scripts_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_agent_training_data_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_approval_notifications_action_id_fk;
DROP INDEX IF EXISTS idx_ai_cadence_configurations_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_call_logs_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_campaign_performance_campaign_id_fk;
DROP INDEX IF EXISTS idx_ai_chat_widget_configs_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_conversation_threads_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_customer_health_scores_subscription_lifecycle_id_fk;
DROP INDEX IF EXISTS idx_ai_email_sequence_enrollments_sequence_id_fk;
DROP INDEX IF EXISTS idx_ai_email_sequences_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_email_templates_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_help_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_journey_instances_journey_template_id_fk;
DROP INDEX IF EXISTS idx_ai_journey_instances_lead_queue_id_fk;
DROP INDEX IF EXISTS idx_ai_journey_instances_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_journey_templates_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_assignments_agent_config_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_assignments_lead_queue_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_enrichment_data_lead_queue_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_imports_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_lifecycle_events_lead_queue_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_lifecycle_events_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_lead_queue_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_meeting_bookings_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_onboarding_progress_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_payment_requests_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_personalization_rules_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_sales_campaigns_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_sender_profiles_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_subscription_lifecycle_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_support_tickets_tenant_id_fk;
DROP INDEX IF EXISTS idx_ai_touchpoint_schedule_campaign_id_fk;
DROP INDEX IF EXISTS idx_ai_touchpoint_schedule_lead_queue_id_fk;
DROP INDEX IF EXISTS idx_ai_trial_accounts_tenant_id_fk;