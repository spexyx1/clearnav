export interface SavedClient {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedProduct {
  id: string;
  user_id: string;
  description: string;
  default_price: number;
  default_tax_rate: number;
  default_quantity: number;
  unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TermsTemplate {
  id: string;
  user_id: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceAppProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_guest: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export type InvoiceAppRoute =
  | 'landing'
  | 'login'
  | 'signup'
  | 'onboarding'
  | 'dashboard'
  | 'invoice-new'
  | 'invoice-edit'
  | 'invoice-detail'
  | 'invoice-public'
  | 'clients'
  | 'products'
  | 'settings';
