import { supabase } from './supabase';

export type TermValue = string | number | boolean | null;

export interface TermEntry {
  value: TermValue;
  clause?: string | null;
  page?: number | null;
  quote?: string | null;
}

export type TermKey =
  | 'dealing_frequency'
  | 'valuation_point'
  | 'application_cutoff_business_days'
  | 'redemption_notice_days'
  | 'redemption_gate_pct'
  | 'launch_unit_price'
  | 'minimum_initial_investment'
  | 'minimum_additional_investment'
  | 'management_fee_pct'
  | 'performance_fee_pct'
  | 'fee_frequency'
  | 'hurdle_rate_pct'
  | 'high_water_mark'
  | 'application_money_handling'
  | 'units_issued_when';

export type DealingTerms = Partial<Record<TermKey, TermEntry>>;

export interface TermField {
  key: TermKey;
  label: string;
  kind: 'number' | 'text' | 'boolean' | 'select';
  options?: string[];
  unit?: string;
  group: 'Dealing' | 'Fees' | 'Investing';
}

export const TERM_FIELDS: TermField[] = [
  { key: 'dealing_frequency', label: 'Dealing frequency', kind: 'select', options: ['daily', 'weekly', 'monthly', 'quarterly'], group: 'Dealing' },
  { key: 'valuation_point', label: 'Valuation point', kind: 'text', group: 'Dealing' },
  { key: 'application_cutoff_business_days', label: 'Application cut-off', kind: 'number', unit: 'business days before', group: 'Dealing' },
  { key: 'redemption_notice_days', label: 'Redemption notice', kind: 'number', unit: 'days', group: 'Dealing' },
  { key: 'redemption_gate_pct', label: 'Redemption gate', kind: 'number', unit: '% of class', group: 'Dealing' },
  { key: 'units_issued_when', label: 'Units issued when', kind: 'text', group: 'Dealing' },
  { key: 'application_money_handling', label: 'Application money held in', kind: 'text', group: 'Dealing' },
  { key: 'launch_unit_price', label: 'Launch unit price', kind: 'number', group: 'Investing' },
  { key: 'minimum_initial_investment', label: 'Minimum first investment', kind: 'number', group: 'Investing' },
  { key: 'minimum_additional_investment', label: 'Minimum top-up', kind: 'number', group: 'Investing' },
  { key: 'management_fee_pct', label: 'Management fee', kind: 'number', unit: '% a year', group: 'Fees' },
  { key: 'performance_fee_pct', label: 'Performance fee', kind: 'number', unit: '% of gains', group: 'Fees' },
  { key: 'fee_frequency', label: 'Fees charged', kind: 'select', options: ['monthly', 'quarterly', 'semi-annually', 'annually'], group: 'Fees' },
  { key: 'hurdle_rate_pct', label: 'Hurdle rate', kind: 'number', unit: '% a year', group: 'Fees' },
  { key: 'high_water_mark', label: 'High-water mark', kind: 'boolean', group: 'Fees' },
];

export interface DocumentClass {
  name: string;
  management_fee_pct?: TermEntry | null;
  performance_fee_pct?: TermEntry | null;
  hurdle_rate_pct?: TermEntry | null;
  minimum_investment?: TermEntry | null;
}

export const CLASS_TERM_FIELDS: { key: Exclude<keyof DocumentClass, 'name'>; label: string }[] = [
  { key: 'management_fee_pct', label: 'Mgmt fee %' },
  { key: 'performance_fee_pct', label: 'Perf fee %' },
  { key: 'hurdle_rate_pct', label: 'Hurdle %' },
  { key: 'minimum_investment', label: 'Minimum' },
];

export function hasValue(entry: TermEntry | null | undefined): entry is TermEntry {
  return !!entry && entry.value !== null && entry.value !== undefined && entry.value !== '';
}

export function numberOf(entry: TermEntry | null | undefined): number | null {
  if (!hasValue(entry)) return null;
  const n = typeof entry.value === 'number' ? entry.value : Number(entry.value);
  return Number.isFinite(n) ? n : null;
}

export function formatTermValue(field: TermField, entry: TermEntry | null | undefined): string {
  if (!hasValue(entry)) return 'Not set';
  if (field.kind === 'boolean') return entry.value === true || entry.value === 'true' ? 'Yes' : 'No';
  return field.unit ? `${entry.value} ${field.unit}` : String(entry.value);
}

export function sanitizeTerms(raw: unknown): DealingTerms {
  if (!raw || typeof raw !== 'object') return {};
  const out: DealingTerms = {};
  for (const f of TERM_FIELDS) {
    const t = (raw as Record<string, unknown>)[f.key];
    if (t && typeof t === 'object' && 'value' in t) out[f.key] = t as TermEntry;
  }
  return out;
}

export async function loadDealingTerms(fundId: string) {
  const { data, error } = await supabase
    .from('fund_dealing_terms')
    .select('id, terms, source_document_ids, approved_at')
    .eq('fund_id', fundId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data
    ? {
        terms: sanitizeTerms(data.terms),
        sourceDocumentIds: (data.source_document_ids as string[] | null) ?? [],
        approvedAt: data.approved_at as string | null,
      }
    : null;
}
