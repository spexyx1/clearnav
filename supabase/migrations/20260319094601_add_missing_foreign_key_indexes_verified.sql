/*
  # Add Missing Foreign Key Indexes - Database Verified

  1. Performance Optimization
    - Adds indexes for 62 unindexed foreign key columns identified by database analysis
    - Improves JOIN performance and foreign key constraint checking
    - Reduces query execution time for related data lookups

  2. Tables Updated
    - ai_ab_test_variants: created_by
    - ai_agent_actions: approved_by
    - ai_agent_approval_settings: updated_by
    - ai_agent_scripts: created_by
    - ai_agent_training_data: created_by
    - ai_cadence_configurations: created_by
    - ai_conversation_threads: escalated_to_user_id
    - ai_email_send_history: sent_by
    - ai_email_sequence_enrollments: approved_by
    - ai_email_sequences: created_by
    - ai_email_templates: created_by
    - ai_help_requests: escalated_to_user_id
    - ai_journey_templates: created_by
    - ai_lead_assignments: escalated_to_user_id
    - ai_lead_imports: imported_by
    - ai_lead_lifecycle_events: triggered_by_user_id
    - ai_lead_queue: assigned_to_human_id
    - ai_meeting_bookings: assigned_to_user_id
    - ai_personalization_rules: created_by
    - ai_sales_campaigns: created_by
    - ai_sender_profiles: created_by
    - auditor_applications: reviewed_by
    - auditor_qualifications: verified_by
    - auditor_reviews: reviewer_id
    - auditor_tenant_preferences: set_by
    - blog_comments: author_user_id, moderated_by
    - blog_posts: author_id
    - client_invitations: invited_by
    - competitive_intelligence: verified_by
    - contact_activities: performed_by_user_id
    - content_reports: reporter_id, reviewed_by
    - content_schedule: created_by, executed_by
    - discount_codes: created_by
    - document_extraction_results: approved_by
    - email_account_access: granted_by
    - email_sequences: created_by
    - form_submissions: submitter_user_id
    - fund_documents: uploaded_by
    - lead_scoring_rules: created_by
    - login_attempts: user_id
    - message_threads: created_by
    - newsletters: created_by
    - opportunity_stage_history: changed_by_user_id
    - promotional_campaigns: created_by
    - report_schedules: created_by
    - security_alerts: user_id
    - staff_invitations: invited_by
    - subscription_change_requests: approved_by, requested_by
    - support_ticket_messages: user_id
    - support_tickets: created_by
    - tenant_notes: created_by
    - user_connections: requested_by
    - voice_agent_knowledge_base: created_by
    - voice_agent_scripts: created_by
    - voice_call_sessions: escalated_to_user_id
    - webhook_endpoints: created_by
    - win_loss_analysis: analyzed_by

  3. Security
    - No RLS policy changes required
    - Indexes only improve performance, do not affect security

  4. Important Notes
    - Uses IF NOT EXISTS to safely add indexes
    - All indexes follow naming convention: idx_<table>_<column>
    - These are the actual unindexed foreign keys from the database schema
*/

-- Add indexes for all unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_ai_ab_test_variants_created_by ON ai_ab_test_variants(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_approved_by ON ai_agent_actions(approved_by);
CREATE INDEX IF NOT EXISTS idx_ai_agent_approval_settings_updated_by ON ai_agent_approval_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_ai_agent_scripts_created_by ON ai_agent_scripts(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_agent_training_data_created_by ON ai_agent_training_data(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_cadence_configurations_created_by ON ai_cadence_configurations(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_threads_escalated_to_user_id ON ai_conversation_threads(escalated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_send_history_sent_by ON ai_email_send_history(sent_by);
CREATE INDEX IF NOT EXISTS idx_ai_email_sequence_enrollments_approved_by ON ai_email_sequence_enrollments(approved_by);
CREATE INDEX IF NOT EXISTS idx_ai_email_sequences_created_by ON ai_email_sequences(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_email_templates_created_by ON ai_email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_help_requests_escalated_to_user_id ON ai_help_requests(escalated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_journey_templates_created_by ON ai_journey_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_lead_assignments_escalated_to_user_id ON ai_lead_assignments(escalated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_imports_imported_by ON ai_lead_imports(imported_by);
CREATE INDEX IF NOT EXISTS idx_ai_lead_lifecycle_events_triggered_by_user_id ON ai_lead_lifecycle_events(triggered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_lead_queue_assigned_to_human_id ON ai_lead_queue(assigned_to_human_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_bookings_assigned_to_user_id ON ai_meeting_bookings(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_personalization_rules_created_by ON ai_personalization_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_sales_campaigns_created_by ON ai_sales_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_sender_profiles_created_by ON ai_sender_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_auditor_applications_reviewed_by ON auditor_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_auditor_qualifications_verified_by ON auditor_qualifications(verified_by);
CREATE INDEX IF NOT EXISTS idx_auditor_reviews_reviewer_id ON auditor_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_auditor_tenant_preferences_set_by ON auditor_tenant_preferences(set_by);
CREATE INDEX IF NOT EXISTS idx_blog_comments_author_user_id ON blog_comments(author_user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_moderated_by ON blog_comments(moderated_by);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_invited_by ON client_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_verified_by ON competitive_intelligence(verified_by);
CREATE INDEX IF NOT EXISTS idx_contact_activities_performed_by_user_id ON contact_activities(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reviewed_by ON content_reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_schedule_created_by ON content_schedule(created_by);
CREATE INDEX IF NOT EXISTS idx_content_schedule_executed_by ON content_schedule(executed_by);
CREATE INDEX IF NOT EXISTS idx_discount_codes_created_by ON discount_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_document_extraction_results_approved_by ON document_extraction_results(approved_by);
CREATE INDEX IF NOT EXISTS idx_email_account_access_granted_by ON email_account_access(granted_by);
CREATE INDEX IF NOT EXISTS idx_email_sequences_created_by ON email_sequences(created_by);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitter_user_id ON form_submissions(submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_fund_documents_uploaded_by ON fund_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_created_by ON lead_scoring_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_newsletters_created_by ON newsletters(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_changed_by_user_id ON opportunity_stage_history(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_created_by ON promotional_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_report_schedules_created_by ON report_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_invited_by ON staff_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_approved_by ON subscription_change_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_subscription_change_requests_requested_by ON subscription_change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_user_id ON support_ticket_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tenant_notes_created_by ON tenant_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_user_connections_requested_by ON user_connections(requested_by);
CREATE INDEX IF NOT EXISTS idx_voice_agent_knowledge_base_created_by ON voice_agent_knowledge_base(created_by);
CREATE INDEX IF NOT EXISTS idx_voice_agent_scripts_created_by ON voice_agent_scripts(created_by);
CREATE INDEX IF NOT EXISTS idx_voice_call_sessions_escalated_to_user_id ON voice_call_sessions(escalated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_created_by ON webhook_endpoints(created_by);
CREATE INDEX IF NOT EXISTS idx_win_loss_analysis_analyzed_by ON win_loss_analysis(analyzed_by);