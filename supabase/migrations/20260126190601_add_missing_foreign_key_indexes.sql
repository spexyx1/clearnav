/*
  # Add Missing Foreign Key Indexes

  1. Purpose
    - Add covering indexes for all foreign keys that don't have them
    - Improves query performance for JOIN operations and foreign key constraint checks
    - Prevents table scans when querying related data

  2. Performance Impact
    - Significantly improves performance of queries involving foreign key relationships
    - Reduces query execution time for JOIN operations
    - Improves database constraint validation performance

  3. Security
    - No RLS changes in this migration
    - Only adds performance indexes
*/

-- Accreditation Verification
CREATE INDEX IF NOT EXISTS idx_accreditation_verification_contact_id ON accreditation_verification(contact_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_verification_verification_document_id ON accreditation_verification(verification_document_id);
CREATE INDEX IF NOT EXISTS idx_accreditation_verification_verified_by ON accreditation_verification(verified_by);

-- Announcement Reads
CREATE INDEX IF NOT EXISTS idx_announcement_reads_capital_account_id ON announcement_reads(capital_account_id);

-- Announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- Billing Records
CREATE INDEX IF NOT EXISTS idx_billing_records_subscription_id ON billing_records(subscription_id);

-- Campaign Analytics
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_contact_id ON campaign_analytics(contact_id);

-- Capital Accounts
CREATE INDEX IF NOT EXISTS idx_capital_accounts_share_class_id ON capital_accounts(share_class_id);

-- Capital Calls
CREATE INDEX IF NOT EXISTS idx_capital_calls_created_by ON capital_calls(created_by);

-- Capital Transactions
CREATE INDEX IF NOT EXISTS idx_capital_transactions_approved_by ON capital_transactions(approved_by);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_created_by ON capital_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_related_transaction ON capital_transactions(related_transaction_id);

-- Carried Interest Accounts
CREATE INDEX IF NOT EXISTS idx_carried_interest_accounts_waterfall_structure_id ON carried_interest_accounts(waterfall_structure_id);

-- Clawback Provisions
CREATE INDEX IF NOT EXISTS idx_clawback_provisions_created_by ON clawback_provisions(created_by);

-- Communication Log
CREATE INDEX IF NOT EXISTS idx_communication_log_staff_id ON communication_log(staff_id);

-- Compliance Documents
CREATE INDEX IF NOT EXISTS idx_compliance_documents_verified_by ON compliance_documents(verified_by);

-- Contact Interactions
CREATE INDEX IF NOT EXISTS idx_contact_interactions_staff_id ON contact_interactions(staff_id);

-- CRM Contacts
CREATE INDEX IF NOT EXISTS idx_crm_contacts_converted_to_client_id ON crm_contacts(converted_to_client_id);

-- Distribution Allocations
CREATE INDEX IF NOT EXISTS idx_distribution_allocations_transaction_id ON distribution_allocations(transaction_id);

-- Distributions
CREATE INDEX IF NOT EXISTS idx_distributions_approved_by ON distributions(approved_by);
CREATE INDEX IF NOT EXISTS idx_distributions_created_by ON distributions(created_by);

-- Document Folders
CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON document_folders(created_by);

-- Document Requests
CREATE INDEX IF NOT EXISTS idx_document_requests_created_by ON document_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_document_requests_reviewed_by ON document_requests(reviewed_by);

-- Document Templates
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);

-- Email Campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON email_campaigns(created_by);

-- Email Templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);

-- Escrow Accounts
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_holder_id ON escrow_accounts(holder_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_order_id ON escrow_accounts(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_tenant_id ON escrow_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_transaction_id ON escrow_accounts(transaction_id);

-- Event Registrations
CREATE INDEX IF NOT EXISTS idx_event_registrations_client_id ON event_registrations(client_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_contact_id ON event_registrations(contact_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);

-- Exchange Audit Requests
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_assigned_to ON exchange_audit_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_requested_by ON exchange_audit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_tenant_id ON exchange_audit_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_audit_requests_transaction_id ON exchange_audit_requests(transaction_id);

-- Exchange Orders
CREATE INDEX IF NOT EXISTS idx_exchange_orders_matched_by ON exchange_orders(matched_by);

-- Exchange Transactions
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_listing_id ON exchange_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_order_id ON exchange_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_processed_by ON exchange_transactions(processed_by);

-- Fee Structures
CREATE INDEX IF NOT EXISTS idx_fee_structures_share_class_id ON fee_structures(share_class_id);

-- Fee Transactions
CREATE INDEX IF NOT EXISTS idx_fee_transactions_created_by ON fee_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_fee_schedule_id ON fee_transactions(fee_schedule_id);

-- IBKR Connections
CREATE INDEX IF NOT EXISTS idx_ibkr_connections_setup_by ON ibkr_connections(setup_by);

-- Investor Documents
CREATE INDEX IF NOT EXISTS idx_investor_documents_previous_version_id ON investor_documents(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_investor_documents_uploaded_by ON investor_documents(uploaded_by);

-- Investor Events
CREATE INDEX IF NOT EXISTS idx_investor_events_host_staff_id ON investor_events(host_staff_id);

-- Investor Statements
CREATE INDEX IF NOT EXISTS idx_investor_statements_created_by ON investor_statements(created_by);
CREATE INDEX IF NOT EXISTS idx_investor_statements_report_id ON investor_statements(report_id);

-- KYC AML Records
CREATE INDEX IF NOT EXISTS idx_kyc_aml_records_verified_by ON kyc_aml_records(verified_by);

-- Marketing Campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON marketing_campaigns(created_by);

-- Marketplace Fees
CREATE INDEX IF NOT EXISTS idx_marketplace_fees_created_by ON marketplace_fees(created_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_fees_tenant_id ON marketplace_fees(tenant_id);

-- Marketplace Listings
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_approved_by ON marketplace_listings(approved_by);

-- NAV Calculations
CREATE INDEX IF NOT EXISTS idx_nav_calculations_approved_by ON nav_calculations(approved_by);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_calculated_by ON nav_calculations(calculated_by);
CREATE INDEX IF NOT EXISTS idx_nav_calculations_share_class_id ON nav_calculations(share_class_id);

-- Notification Preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant_id ON notification_preferences(tenant_id);

-- Onboarding Workflows
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_compliance_approved_by ON onboarding_workflows(compliance_approved_by);

-- Performance Metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_share_class_id ON performance_metrics(share_class_id);

-- Portfolio Risk Metrics
CREATE INDEX IF NOT EXISTS idx_portfolio_risk_metrics_trust_account_id ON portfolio_risk_metrics(trust_account_id);

-- Redemption Requests
CREATE INDEX IF NOT EXISTS idx_redemption_requests_approved_by ON redemption_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_requested_by ON redemption_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_reviewed_by ON redemption_requests(reviewed_by);

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);

-- Screen Alerts
CREATE INDEX IF NOT EXISTS idx_screen_alerts_screen_id ON screen_alerts(screen_id);

-- Secure Messages
CREATE INDEX IF NOT EXISTS idx_secure_messages_parent_message_id ON secure_messages(parent_message_id);

-- Signup Requests
CREATE INDEX IF NOT EXISTS idx_signup_requests_tenant_id ON signup_requests(tenant_id);

-- SMS Templates
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_by ON sms_templates(created_by);

-- Staff Accounts
CREATE INDEX IF NOT EXISTS idx_staff_accounts_auth_user_id ON staff_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_created_by ON staff_accounts(created_by);

-- Staff Permissions
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON staff_permissions(staff_id);

-- Stock Screens
CREATE INDEX IF NOT EXISTS idx_stock_screens_created_by ON stock_screens(created_by);

-- Task Reminders
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);

-- Tasks Activities
CREATE INDEX IF NOT EXISTS idx_tasks_activities_created_by ON tasks_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_activities_related_to_client ON tasks_activities(related_to_client);
CREATE INDEX IF NOT EXISTS idx_tasks_activities_related_to_contact ON tasks_activities(related_to_contact);

-- Tax Documents
CREATE INDEX IF NOT EXISTS idx_tax_documents_created_by ON tax_documents(created_by);

-- Tenant Domains
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON tenant_domains(tenant_id);

-- Tenant Subscriptions
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_plan_id ON tenant_subscriptions(plan_id);

-- Tenant Users
CREATE INDEX IF NOT EXISTS idx_tenant_users_invited_via ON tenant_users(invited_via);

-- Token Holders
CREATE INDEX IF NOT EXISTS idx_token_holders_tenant_id ON token_holders(tenant_id);

-- Token NAV Snapshots
CREATE INDEX IF NOT EXISTS idx_token_nav_snapshots_tenant_id ON token_nav_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_nav_snapshots_verified_by ON token_nav_snapshots(verified_by);

-- Token Transfer History
CREATE INDEX IF NOT EXISTS idx_token_transfer_history_exchange_transaction_id ON token_transfer_history(exchange_transaction_id);
CREATE INDEX IF NOT EXISTS idx_token_transfer_history_tenant_id ON token_transfer_history(tenant_id);

-- Tokenization Requests
CREATE INDEX IF NOT EXISTS idx_tokenization_requests_resulting_token_id ON tokenization_requests(resulting_token_id);
CREATE INDEX IF NOT EXISTS idx_tokenization_requests_reviewed_by ON tokenization_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_tokenization_requests_tenant_id ON tokenization_requests(tenant_id);

-- Tokenized Assets
CREATE INDEX IF NOT EXISTS idx_tokenized_assets_created_by ON tokenized_assets(created_by);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_nav_calculation_id ON transactions(nav_calculation_id);

-- Unit Transactions
CREATE INDEX IF NOT EXISTS idx_unit_transactions_trust_account_id ON unit_transactions(trust_account_id);

-- User Invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);

-- Watchlist Stocks
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_added_by ON watchlist_stocks(added_by);
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_added_from_alert_id ON watchlist_stocks(added_from_alert_id);

-- Waterfall Calculations
CREATE INDEX IF NOT EXISTS idx_waterfall_calculations_created_by ON waterfall_calculations(created_by);
