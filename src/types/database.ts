export interface Database {
  public: {
    Tables: {
      client_profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          account_number: string;
          total_invested: number;
          current_value: number;
          inception_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          account_number: string;
          total_invested?: number;
          current_value?: number;
          inception_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          account_number?: string;
          total_invested?: number;
          current_value?: number;
          inception_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      investments: {
        Row: {
          id: string;
          client_id: string;
          investment_name: string;
          amount_invested: number;
          current_value: number;
          shares: number;
          investment_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          investment_name: string;
          amount_invested: number;
          current_value: number;
          shares: number;
          investment_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          investment_name?: string;
          amount_invested?: number;
          current_value?: number;
          shares?: number;
          investment_date?: string;
          created_at?: string;
        };
      };
      performance_returns: {
        Row: {
          id: string;
          client_id: string;
          period: string;
          return_percentage: number;
          portfolio_value: number;
          benchmark_return: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          period: string;
          return_percentage: number;
          portfolio_value: number;
          benchmark_return?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          period?: string;
          return_percentage?: number;
          portfolio_value?: number;
          benchmark_return?: number | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          document_type: string;
          period: string;
          file_url: string;
          public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          document_type: string;
          period: string;
          file_url: string;
          public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          document_type?: string;
          period?: string;
          file_url?: string;
          public?: boolean;
          created_at?: string;
        };
      };
      redemption_requests: {
        Row: {
          id: string;
          client_id: string;
          amount: number;
          redemption_type: 'partial' | 'full';
          reason: string | null;
          status: 'pending' | 'approved' | 'completed' | 'rejected';
          requested_date: string;
          processed_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          amount: number;
          redemption_type: 'partial' | 'full';
          reason?: string | null;
          status?: 'pending' | 'approved' | 'completed' | 'rejected';
          requested_date?: string;
          processed_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          amount?: number;
          redemption_type?: 'partial' | 'full';
          reason?: string | null;
          status?: 'pending' | 'approved' | 'completed' | 'rejected';
          requested_date?: string;
          processed_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      tax_document_requests: {
        Row: {
          id: string;
          client_id: string;
          document_type: string;
          tax_year: number;
          status: 'pending' | 'completed';
          requested_date: string;
          completed_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          document_type: string;
          tax_year: number;
          status?: 'pending' | 'completed';
          requested_date?: string;
          completed_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          document_type?: string;
          tax_year?: number;
          status?: 'pending' | 'completed';
          requested_date?: string;
          completed_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      inquiries: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string | null;
          message: string;
          status: 'new' | 'read' | 'responded';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          company?: string | null;
          message: string;
          status?: 'new' | 'read' | 'responded';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          company?: string | null;
          message?: string;
          status?: 'new' | 'read' | 'responded';
          created_at?: string;
        };
      };
      trust_account: {
        Row: {
          id: string;
          name: string;
          ibkr_account_id: string | null;
          total_aum: number;
          total_units_outstanding: number;
          current_nav_per_unit: number;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          ibkr_account_id?: string | null;
          total_aum?: number;
          total_units_outstanding?: number;
          current_nav_per_unit?: number;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          ibkr_account_id?: string | null;
          total_aum?: number;
          total_units_outstanding?: number;
          current_nav_per_unit?: number;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      client_units: {
        Row: {
          id: string;
          client_id: string;
          trust_account_id: string;
          units_owned: number;
          cost_basis: number;
          cost_basis_per_unit: number;
          purchase_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          trust_account_id: string;
          units_owned?: number;
          cost_basis?: number;
          cost_basis_per_unit?: number;
          purchase_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          trust_account_id?: string;
          units_owned?: number;
          cost_basis?: number;
          cost_basis_per_unit?: number;
          purchase_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      trust_positions: {
        Row: {
          id: string;
          trust_account_id: string;
          symbol: string;
          asset_class: string;
          quantity: number;
          average_cost: number;
          current_price: number;
          market_value: number;
          unrealized_pnl: number;
          currency: string;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trust_account_id: string;
          symbol: string;
          asset_class: string;
          quantity: number;
          average_cost?: number;
          current_price?: number;
          market_value?: number;
          unrealized_pnl?: number;
          currency?: string;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trust_account_id?: string;
          symbol?: string;
          asset_class?: string;
          quantity?: number;
          average_cost?: number;
          current_price?: number;
          market_value?: number;
          unrealized_pnl?: number;
          currency?: string;
          last_updated?: string;
          created_at?: string;
        };
      };
      trust_nav_history: {
        Row: {
          id: string;
          trust_account_id: string;
          timestamp: string;
          nav_per_unit: number;
          total_aum: number;
          total_units: number;
          total_cash: number;
          total_positions_value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          trust_account_id: string;
          timestamp?: string;
          nav_per_unit: number;
          total_aum: number;
          total_units: number;
          total_cash?: number;
          total_positions_value?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          trust_account_id?: string;
          timestamp?: string;
          nav_per_unit?: number;
          total_aum?: number;
          total_units?: number;
          total_cash?: number;
          total_positions_value?: number;
          created_at?: string;
        };
      };
      unit_transactions: {
        Row: {
          id: string;
          client_id: string;
          trust_account_id: string;
          transaction_type: 'subscription' | 'redemption';
          units: number;
          amount: number;
          nav_per_unit: number;
          transaction_date: string;
          status: 'pending' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          trust_account_id: string;
          transaction_type: 'subscription' | 'redemption';
          units: number;
          amount: number;
          nav_per_unit: number;
          transaction_date?: string;
          status?: 'pending' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          trust_account_id?: string;
          transaction_type?: 'subscription' | 'redemption';
          units?: number;
          amount?: number;
          nav_per_unit?: number;
          transaction_date?: string;
          status?: 'pending' | 'completed' | 'cancelled';
          notes?: string | null;
          created_at?: string;
        };
      };
      staff_accounts: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          full_name: string;
          role: 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin';
          phone: string | null;
          status: 'active' | 'suspended' | 'inactive';
          permissions: any;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          full_name: string;
          role: 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin';
          phone?: string | null;
          status?: 'active' | 'suspended' | 'inactive';
          permissions?: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string;
          full_name?: string;
          role?: 'general_manager' | 'compliance_manager' | 'accountant' | 'cfo' | 'legal_counsel' | 'admin';
          phone?: string | null;
          status?: 'active' | 'suspended' | 'inactive';
          permissions?: any;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      crm_contacts: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          company: string | null;
          title: string | null;
          address: any | null;
          timezone: string;
          lifecycle_stage: 'lead' | 'prospect' | 'qualified' | 'onboarding' | 'active_client' | 'inactive';
          lead_source: string | null;
          lead_score: number;
          accreditation_status: 'unknown' | 'pending_verification' | 'verified_accredited' | 'not_accredited';
          assigned_to: string | null;
          estimated_investment_amount: number | null;
          tags: string[] | null;
          custom_fields: any;
          notes: string | null;
          status: 'active' | 'archived' | 'do_not_contact';
          converted_to_client_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          phone?: string | null;
          company?: string | null;
          title?: string | null;
          address?: any | null;
          timezone?: string;
          lifecycle_stage?: 'lead' | 'prospect' | 'qualified' | 'onboarding' | 'active_client' | 'inactive';
          lead_source?: string | null;
          lead_score?: number;
          accreditation_status?: 'unknown' | 'pending_verification' | 'verified_accredited' | 'not_accredited';
          assigned_to?: string | null;
          estimated_investment_amount?: number | null;
          tags?: string[] | null;
          custom_fields?: any;
          notes?: string | null;
          status?: 'active' | 'archived' | 'do_not_contact';
          converted_to_client_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          company?: string | null;
          title?: string | null;
          address?: any | null;
          timezone?: string;
          lifecycle_stage?: 'lead' | 'prospect' | 'qualified' | 'onboarding' | 'active_client' | 'inactive';
          lead_source?: string | null;
          lead_score?: number;
          accreditation_status?: 'unknown' | 'pending_verification' | 'verified_accredited' | 'not_accredited';
          assigned_to?: string | null;
          estimated_investment_amount?: number | null;
          tags?: string[] | null;
          custom_fields?: any;
          notes?: string | null;
          status?: 'active' | 'archived' | 'do_not_contact';
          converted_to_client_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_interactions: {
        Row: {
          id: string;
          contact_id: string;
          staff_id: string | null;
          interaction_type: 'email' | 'sms' | 'call' | 'meeting' | 'note' | 'document_sent' | 'document_signed';
          subject: string | null;
          content: string | null;
          direction: 'inbound' | 'outbound' | null;
          metadata: any;
          interaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          staff_id?: string | null;
          interaction_type: 'email' | 'sms' | 'call' | 'meeting' | 'note' | 'document_sent' | 'document_signed';
          subject?: string | null;
          content?: string | null;
          direction?: 'inbound' | 'outbound' | null;
          metadata?: any;
          interaction_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          staff_id?: string | null;
          interaction_type?: 'email' | 'sms' | 'call' | 'meeting' | 'note' | 'document_sent' | 'document_signed';
          subject?: string | null;
          content?: string | null;
          direction?: 'inbound' | 'outbound' | null;
          metadata?: any;
          interaction_date?: string;
          created_at?: string;
        };
      };
      onboarding_workflows: {
        Row: {
          id: string;
          contact_id: string;
          status: 'started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
          current_step: string;
          steps_completed: string[];
          accreditation_verified: boolean;
          kyc_aml_completed: boolean;
          fatca_completed: boolean;
          subscription_agreement_signed: boolean;
          banking_info_collected: boolean;
          risk_tolerance_assessed: boolean;
          suitability_approved: boolean;
          compliance_approved_by: string | null;
          compliance_approved_at: string | null;
          rejection_reason: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          status?: 'started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
          current_step?: string;
          steps_completed?: string[];
          accreditation_verified?: boolean;
          kyc_aml_completed?: boolean;
          fatca_completed?: boolean;
          subscription_agreement_signed?: boolean;
          banking_info_collected?: boolean;
          risk_tolerance_assessed?: boolean;
          suitability_approved?: boolean;
          compliance_approved_by?: string | null;
          compliance_approved_at?: string | null;
          rejection_reason?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          status?: 'started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
          current_step?: string;
          steps_completed?: string[];
          accreditation_verified?: boolean;
          kyc_aml_completed?: boolean;
          fatca_completed?: boolean;
          subscription_agreement_signed?: boolean;
          banking_info_collected?: boolean;
          risk_tolerance_assessed?: boolean;
          suitability_approved?: boolean;
          compliance_approved_by?: string | null;
          compliance_approved_at?: string | null;
          rejection_reason?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      compliance_documents: {
        Row: {
          id: string;
          contact_id: string | null;
          client_id: string | null;
          document_type: 'drivers_license' | 'passport' | 'proof_of_address' | 'accreditation_letter' | 'tax_return' | 'bank_statement' | 'subscription_agreement' | 'fatca_form' | 'beneficial_ownership' | 'other';
          file_url: string;
          file_name: string;
          verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
          verified_by: string | null;
          verified_at: string | null;
          expiration_date: string | null;
          notes: string | null;
          uploaded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string | null;
          client_id?: string | null;
          document_type: 'drivers_license' | 'passport' | 'proof_of_address' | 'accreditation_letter' | 'tax_return' | 'bank_statement' | 'subscription_agreement' | 'fatca_form' | 'beneficial_ownership' | 'other';
          file_url: string;
          file_name: string;
          verification_status?: 'pending' | 'verified' | 'rejected' | 'expired';
          verified_by?: string | null;
          verified_at?: string | null;
          expiration_date?: string | null;
          notes?: string | null;
          uploaded_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string | null;
          client_id?: string | null;
          document_type?: 'drivers_license' | 'passport' | 'proof_of_address' | 'accreditation_letter' | 'tax_return' | 'bank_statement' | 'subscription_agreement' | 'fatca_form' | 'beneficial_ownership' | 'other';
          file_url?: string;
          file_name?: string;
          verification_status?: 'pending' | 'verified' | 'rejected' | 'expired';
          verified_by?: string | null;
          verified_at?: string | null;
          expiration_date?: string | null;
          notes?: string | null;
          uploaded_at?: string;
          created_at?: string;
        };
      };
      tasks_activities: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          task_type: 'call' | 'email' | 'meeting' | 'follow_up' | 'review_document' | 'compliance_check' | 'other';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          assigned_to: string | null;
          created_by: string | null;
          related_to_contact: string | null;
          related_to_client: string | null;
          due_date: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          task_type: 'call' | 'email' | 'meeting' | 'follow_up' | 'review_document' | 'compliance_check' | 'other';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          assigned_to?: string | null;
          created_by?: string | null;
          related_to_contact?: string | null;
          related_to_client?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          task_type?: 'call' | 'email' | 'meeting' | 'follow_up' | 'review_document' | 'compliance_check' | 'other';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          assigned_to?: string | null;
          created_by?: string | null;
          related_to_contact?: string | null;
          related_to_client?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolio_risk_metrics: {
        Row: {
          id: string;
          client_id: string;
          trust_account_id: string | null;
          calculation_date: string;
          var_95_1day: number | null;
          var_99_1day: number | null;
          var_95_10day: number | null;
          sharpe_ratio: number | null;
          sortino_ratio: number | null;
          risk_free_rate: number;
          volatility_annualized: number | null;
          downside_deviation: number | null;
          max_drawdown: number | null;
          current_drawdown: number | null;
          alpha: number | null;
          beta: number | null;
          correlation_sp500: number | null;
          correlation_bonds: number | null;
          calculation_method: string | null;
          lookback_period_days: number;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          trust_account_id?: string | null;
          calculation_date: string;
          var_95_1day?: number | null;
          var_99_1day?: number | null;
          var_95_10day?: number | null;
          sharpe_ratio?: number | null;
          sortino_ratio?: number | null;
          risk_free_rate?: number;
          volatility_annualized?: number | null;
          downside_deviation?: number | null;
          max_drawdown?: number | null;
          current_drawdown?: number | null;
          alpha?: number | null;
          beta?: number | null;
          correlation_sp500?: number | null;
          correlation_bonds?: number | null;
          calculation_method?: string | null;
          lookback_period_days?: number;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          trust_account_id?: string | null;
          calculation_date?: string;
          var_95_1day?: number | null;
          var_99_1day?: number | null;
          var_95_10day?: number | null;
          sharpe_ratio?: number | null;
          sortino_ratio?: number | null;
          risk_free_rate?: number;
          volatility_annualized?: number | null;
          downside_deviation?: number | null;
          max_drawdown?: number | null;
          current_drawdown?: number | null;
          alpha?: number | null;
          beta?: number | null;
          correlation_sp500?: number | null;
          correlation_bonds?: number | null;
          calculation_method?: string | null;
          lookback_period_days?: number;
          metadata?: any;
          created_at?: string;
        };
      };
      communication_log: {
        Row: {
          id: string;
          contact_id: string | null;
          client_id: string | null;
          staff_id: string | null;
          channel: 'email' | 'sms';
          direction: 'inbound' | 'outbound';
          subject: string | null;
          content: string;
          to_address: string;
          from_address: string;
          status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
          campaign_id: string | null;
          metadata: any;
          sent_at: string;
          delivered_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string | null;
          client_id?: string | null;
          staff_id?: string | null;
          channel: 'email' | 'sms';
          direction: 'inbound' | 'outbound';
          subject?: string | null;
          content: string;
          to_address: string;
          from_address: string;
          status?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
          campaign_id?: string | null;
          metadata?: any;
          sent_at?: string;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string | null;
          client_id?: string | null;
          staff_id?: string | null;
          channel?: 'email' | 'sms';
          direction?: 'inbound' | 'outbound';
          subject?: string | null;
          content?: string;
          to_address?: string;
          from_address?: string;
          status?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
          campaign_id?: string | null;
          metadata?: any;
          sent_at?: string;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          created_at?: string;
        };
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          content: string;
          category: string | null;
          merge_fields: string[] | null;
          is_active: boolean;
          usage_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          content: string;
          category?: string | null;
          merge_fields?: string[] | null;
          is_active?: boolean;
          usage_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          content?: string;
          category?: string | null;
          merge_fields?: string[] | null;
          is_active?: boolean;
          usage_count?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      platform_tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          status: 'trial' | 'active' | 'suspended' | 'cancelled';
          database_type: 'managed' | 'byod';
          database_connection: any | null;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          status?: 'trial' | 'active' | 'suspended' | 'cancelled';
          database_type?: 'managed' | 'byod';
          database_connection?: any | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          status?: 'trial' | 'active' | 'suspended' | 'cancelled';
          database_type?: 'managed' | 'byod';
          database_connection?: any | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price_monthly: number;
          database_type: 'managed' | 'byod';
          user_limit: number | null;
          overage_price_per_user: number;
          features: any;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price_monthly: number;
          database_type: 'managed' | 'byod';
          user_limit?: number | null;
          overage_price_per_user?: number;
          features?: any;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price_monthly?: number;
          database_type?: 'managed' | 'byod';
          user_limit?: number | null;
          overage_price_per_user?: number;
          features?: any;
          is_active?: boolean;
          created_at?: string;
        };
      };
      tenant_subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan_id: string;
          status: 'active' | 'past_due' | 'cancelled';
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan_id: string;
          status?: 'active' | 'past_due' | 'cancelled';
          current_period_start?: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          plan_id?: string;
          status?: 'active' | 'past_due' | 'cancelled';
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
        };
      };
      billing_records: {
        Row: {
          id: string;
          tenant_id: string;
          subscription_id: string;
          amount: number;
          status: 'pending' | 'paid' | 'failed';
          period_start: string;
          period_end: string;
          user_count: number;
          overage_users: number;
          invoice_data: any;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          subscription_id: string;
          amount: number;
          status?: 'pending' | 'paid' | 'failed';
          period_start: string;
          period_end: string;
          user_count?: number;
          overage_users?: number;
          invoice_data?: any;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          subscription_id?: string;
          amount?: number;
          status?: 'pending' | 'paid' | 'failed';
          period_start?: string;
          period_end?: string;
          user_count?: number;
          overage_users?: number;
          invoice_data?: any;
          paid_at?: string | null;
          created_at?: string;
        };
      };
      tenant_users: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: 'owner' | 'admin' | 'user';
          invited_via: string | null;
          onboarding_status: 'pending' | 'in_progress' | 'completed';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role: 'owner' | 'admin' | 'user';
          invited_via?: string | null;
          onboarding_status?: 'pending' | 'in_progress' | 'completed';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          role?: 'owner' | 'admin' | 'user';
          invited_via?: string | null;
          onboarding_status?: 'pending' | 'in_progress' | 'completed';
          created_at?: string;
        };
      };
      tenant_domains: {
        Row: {
          id: string;
          tenant_id: string;
          domain: string;
          is_verified: boolean;
          verification_token: string | null;
          ssl_status: string;
          created_at: string;
          verified_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          domain: string;
          is_verified?: boolean;
          verification_token?: string | null;
          ssl_status?: string;
          created_at?: string;
          verified_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          domain?: string;
          is_verified?: boolean;
          verification_token?: string | null;
          ssl_status?: string;
          created_at?: string;
          verified_at?: string | null;
        };
      };
      usage_metrics: {
        Row: {
          id: string;
          tenant_id: string;
          metric_type: string;
          value: number;
          recorded_at: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          metric_type: string;
          value: number;
          recorded_at?: string;
          metadata?: any;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          metric_type?: string;
          value?: number;
          recorded_at?: string;
          metadata?: any;
        };
      };
      tenant_settings: {
        Row: {
          tenant_id: string;
          branding: any;
          features: any;
          notifications: any;
          integrations: any;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          branding?: any;
          features?: any;
          notifications?: any;
          integrations?: any;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          branding?: any;
          features?: any;
          notifications?: any;
          integrations?: any;
          updated_at?: string;
        };
      };
      platform_admin_users: {
        Row: {
          id: string;
          user_id: string;
          role: 'super_admin' | 'support' | 'billing';
          permissions: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'super_admin' | 'support' | 'billing';
          permissions?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'super_admin' | 'support' | 'billing';
          permissions?: any;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          role_category: 'superadmin' | 'tenant_admin' | 'client' | 'staff_user';
          role_detail: string | null;
          tenant_id: string | null;
          status: string;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          role_category: 'superadmin' | 'tenant_admin' | 'client' | 'staff_user';
          role_detail?: string | null;
          tenant_id?: string | null;
          status?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          role_category?: 'superadmin' | 'tenant_admin' | 'client' | 'staff_user';
          role_detail?: string | null;
          tenant_id?: string | null;
          status?: string;
          metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_invitations: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          token: string;
          role: string;
          invited_by: string | null;
          status: 'pending' | 'accepted' | 'expired' | 'cancelled';
          expires_at: string;
          accepted_at: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          token: string;
          role: string;
          invited_by?: string | null;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          expires_at: string;
          accepted_at?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          token?: string;
          role?: string;
          invited_by?: string | null;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          expires_at?: string;
          accepted_at?: string | null;
          metadata?: any;
          created_at?: string;
        };
      };
      ibkr_connections: {
        Row: {
          id: string;
          tenant_id: string;
          client_id: string;
          account_id: string;
          gateway_url: string;
          credentials_encrypted: string | null;
          connection_status: 'connected' | 'pending' | 'disconnected' | 'error';
          last_sync_at: string | null;
          last_error: string | null;
          setup_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_id: string;
          account_id: string;
          gateway_url?: string;
          credentials_encrypted?: string | null;
          connection_status?: 'connected' | 'pending' | 'disconnected' | 'error';
          last_sync_at?: string | null;
          last_error?: string | null;
          setup_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_id?: string;
          account_id?: string;
          gateway_url?: string;
          credentials_encrypted?: string | null;
          connection_status?: 'connected' | 'pending' | 'disconnected' | 'error';
          last_sync_at?: string | null;
          last_error?: string | null;
          setup_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
