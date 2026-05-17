export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'void';
export type PaymentMethod = 'manual' | 'stripe' | 'ach' | 'wire' | 'cash' | 'check' | 'crypto' | 'other';

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
  line_total: number;
}

export interface InvoiceLineItemDraft {
  id: string; // client-side temp id
  sort_order: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_rate: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  to_name: string;
  to_email: string;
  to_phone: string | null;
  to_company: string | null;
  to_address: string | null;
  client_id: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  footer: string | null;
  status: InvoiceStatus;
  public_view_token: string;
  pdf_storage_path: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  line_items?: InvoiceLineItem[];
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  method: PaymentMethod;
  reference: string | null;
  stripe_payment_intent_id: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceActivity {
  id: string;
  invoice_id: string;
  actor_id: string | null;
  action: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface InvoiceSettings {
  id: string;
  tenant_id: string;
  number_prefix: string;
  next_sequence: number;
  default_currency: string;
  default_due_days: number;
  default_tax_rate: number;
  default_terms: string;
  default_footer: string;
  payment_instructions: string;
  logo_url: string | null;
  accent_color: string;
  stripe_connect_account_id: string | null;
  reminder_days_before: number;
  reminder_days_after: number;
}

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
];

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calcLineTotal(item: InvoiceLineItemDraft): number {
  const gross = item.quantity * item.unit_price;
  const discounted = gross * (1 - item.discount_rate / 100);
  const withTax = discounted * (1 + item.tax_rate / 100);
  return Math.round(withTax * 100) / 100;
}

export function calcTotals(items: InvoiceLineItemDraft[]): {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
} {
  let subtotal = 0;
  let discount_total = 0;
  let tax_total = 0;

  for (const item of items) {
    const gross = item.quantity * item.unit_price;
    const discount = gross * (item.discount_rate / 100);
    const discounted = gross - discount;
    const tax = discounted * (item.tax_rate / 100);
    subtotal += gross;
    discount_total += discount;
    tax_total += tax;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount_total: Math.round(discount_total * 100) / 100,
    tax_total: Math.round(tax_total * 100) / 100,
    total: Math.round((subtotal - discount_total + tax_total) * 100) / 100,
  };
}

export const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:    { label: 'Draft',    color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-600' },
  sent:     { label: 'Sent',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-600' },
  viewed:   { label: 'Viewed',   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-600' },
  partial:  { label: 'Partial',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-600' },
  paid:     { label: 'Paid',     color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-600' },
  overdue:  { label: 'Overdue',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-600' },
  void:     { label: 'Void',     color: 'text-slate-500',  bg: 'bg-slate-800/50',  border: 'border-slate-700' },
};
