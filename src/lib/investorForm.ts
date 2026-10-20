import { supabase } from './supabase';
import type { TermEntry, TermValue } from './dealingTerms';
import { findFirst, money, type ReadPage } from './documentReader';

export type InvestorKey =
  | 'investor_type' | 'title' | 'given_names' | 'surname' | 'email' | 'phone' | 'dob'
  | 'address' | 'suburb' | 'state' | 'postcode' | 'country'
  | 'company_name' | 'trust_name' | 'abn'
  | 'amount_hc' | 'amount_opp' | 'amount_qv'
  | 'aus_tax_resident' | 'tfn'
  | 'bank_institution' | 'bank_account_name' | 'bank_bsb' | 'bank_account_number';

export type InvestorDraft = Partial<Record<InvestorKey, TermEntry>>;

export interface InvestorField {
  key: InvestorKey;
  label: string;
  kind: 'text' | 'number' | 'boolean' | 'select';
  group: 'Investor' | 'Address' | 'Investment' | 'Tax' | 'Bank';
  options?: { value: string; label: string }[];
}

export const INVESTOR_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'joint', label: 'Joint holders' },
  { value: 'aus_proprietary_company', label: 'Australian private company' },
  { value: 'aus_public_company', label: 'Australian public company' },
  { value: 'regulated_trust_individual_trustee', label: 'Regulated trust, individual trustee' },
  { value: 'regulated_trust_corporate_trustee', label: 'Regulated trust, company trustee' },
  { value: 'unregulated_trust_individual_trustee', label: 'Other trust, individual trustee' },
  { value: 'unregulated_trust_corporate_trustee', label: 'Other trust, company trustee' },
  { value: 'other', label: 'Other' },
];

export const INVESTOR_FIELDS: InvestorField[] = [
  { key: 'investor_type', label: 'Investor type', kind: 'select', group: 'Investor', options: INVESTOR_TYPES },
  { key: 'title', label: 'Title', kind: 'text', group: 'Investor' },
  { key: 'given_names', label: 'Given names', kind: 'text', group: 'Investor' },
  { key: 'surname', label: 'Surname', kind: 'text', group: 'Investor' },
  { key: 'company_name', label: 'Company name', kind: 'text', group: 'Investor' },
  { key: 'trust_name', label: 'Trust name', kind: 'text', group: 'Investor' },
  { key: 'email', label: 'Email', kind: 'text', group: 'Investor' },
  { key: 'phone', label: 'Phone', kind: 'text', group: 'Investor' },
  { key: 'dob', label: 'Date of birth', kind: 'text', group: 'Investor' },
  { key: 'address', label: 'Street address', kind: 'text', group: 'Address' },
  { key: 'suburb', label: 'Suburb or city', kind: 'text', group: 'Address' },
  { key: 'state', label: 'State', kind: 'text', group: 'Address' },
  { key: 'postcode', label: 'Postcode', kind: 'text', group: 'Address' },
  { key: 'country', label: 'Country', kind: 'text', group: 'Address' },
  { key: 'amount_hc', label: 'High Conviction (HC)', kind: 'number', group: 'Investment' },
  { key: 'amount_opp', label: 'Opportunistic (OPP)', kind: 'number', group: 'Investment' },
  { key: 'amount_qv', label: 'Quant Value (QV)', kind: 'number', group: 'Investment' },
  { key: 'aus_tax_resident', label: 'Australian tax resident', kind: 'boolean', group: 'Tax' },
  { key: 'tfn', label: 'Tax file number', kind: 'text', group: 'Tax' },
  { key: 'abn', label: 'ABN', kind: 'text', group: 'Tax' },
  { key: 'bank_institution', label: 'Bank', kind: 'text', group: 'Bank' },
  { key: 'bank_account_name', label: 'Account name', kind: 'text', group: 'Bank' },
  { key: 'bank_bsb', label: 'BSB', kind: 'text', group: 'Bank' },
  { key: 'bank_account_number', label: 'Account number', kind: 'text', group: 'Bank' },
];

const anyCase = (s: string) => s.replace(/[a-z]/gi, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);

// Case-sensitive on purpose: the next label must start with a capital so multi-word values are not cut short.
const labelled = (label: string, value = '[^:\\n]{2,70}?') =>
  new RegExp(`(?:${anyCase(label)})\\s*[:\\-]?\\s+(${value})(?=[ \\t]+[A-Z][a-z]+(?: [a-z]+){0,3}:|\\s*\\n|\\s*$)`);

const AMOUNT = '\\$?\\s?([\\d,]{3,}(?:\\.\\d{2})?)';

type Rule = { key: InvestorKey; pattern: RegExp; value?: (s: string) => TermValue };

const RULES: Rule[] = [
  { key: 'title', pattern: /\btitle\b\s*[:-]?\s*(Mr|Mrs|Ms|Miss|Mx|Dr|Prof)\b/i },
  { key: 'given_names', pattern: labelled('given names?|first names?') },
  { key: 'surname', pattern: labelled('surname|family name|last name') },
  { key: 'company_name', pattern: labelled('company name|name of company|entity name') },
  { key: 'trust_name', pattern: labelled('trust name|name of (?:the )?trust') },
  { key: 'phone', pattern: /(?:phone|mobile|telephone|contact number)[^:\d+]{0,15}[:-]?\s*(\+?\d[\d ()-]{7,18}\d)/i },
  { key: 'dob', pattern: /date of birth[^:\d]{0,10}[:-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i },
  { key: 'address', pattern: labelled('residential address|street address|postal address|address') },
  { key: 'suburb', pattern: labelled('suburb|city|town') },
  { key: 'state', pattern: /\bstate\b\s*[:-]?\s*(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i, value: (s) => s.toUpperCase() },
  { key: 'postcode', pattern: /post\s?code[^:\d]{0,5}[:-]?\s*(\d{4})\b/i },
  { key: 'country', pattern: labelled('country(?: of residence)?') },
  { key: 'amount_hc', pattern: new RegExp(`(?:High Conviction|Class C)[^$\\d]{0,60}${AMOUNT}`, 'i'), value: (s) => money(s) },
  { key: 'amount_opp', pattern: new RegExp(`(?:Opportunistic|Class A)[^$\\d]{0,60}${AMOUNT}`, 'i'), value: (s) => money(s) },
  { key: 'amount_qv', pattern: new RegExp(`(?:Quant(?:itative)? Value|Class B)[^$\\d]{0,60}${AMOUNT}`, 'i'), value: (s) => money(s) },
  { key: 'aus_tax_resident', pattern: /australian (?:tax )?resident[^.]{0,30}\b(yes|no)\b/i, value: (s) => s.toLowerCase() === 'yes' },
  { key: 'tfn', pattern: /(?:tax file number|\bTFN\b)[^:\d]{0,15}[:-]?\s*(\d{3}\s?\d{3}\s?\d{2,3})\b/i },
  { key: 'abn', pattern: /\bABN\b[^:\d]{0,10}[:-]?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})\b/i },
  { key: 'bank_institution', pattern: labelled('(?:name of )?(?:bank|financial institution)(?: name)?') },
  { key: 'bank_account_name', pattern: labelled('account name') },
  { key: 'bank_bsb', pattern: /\bBSB\b[^:\d]{0,10}[:-]?\s*(\d{3}-?\s?\d{3})\b/i },
  { key: 'bank_account_number', pattern: /account (?:number|no\.?)[^:\d]{0,10}[:-]?\s*(\d[\d -]{4,14}\d)\b/i },
];

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function findEmail(pages: ReadPage[]): TermEntry | null {
  for (const p of pages) {
    for (const line of p.lines) {
      const found = [...line.matchAll(EMAIL)].map((m) => m[0]).find((e) => !/arkline/i.test(e));
      if (found) return { value: found.toLowerCase(), page: p.page, quote: line.slice(0, 220), clause: null };
    }
  }
  return null;
}

export function extractInvestor(pages: ReadPage[]): InvestorDraft {
  const draft: InvestorDraft = {};
  for (const rule of RULES) {
    if (draft[rule.key]) continue;
    const hit = findFirst(pages, rule.pattern);
    if (!hit) continue;
    const raw = hit.match[1].trim();
    const value = rule.value ? rule.value(raw) : raw;
    if (typeof value === 'number' && !(value > 0)) continue;
    draft[rule.key] = { value, ...hit.entry };
  }
  const email = findEmail(pages);
  if (email) draft.email = email;
  if (!draft.given_names && !draft.surname) {
    const full = findFirst(pages, labelled('full name|name of (?:applicant|investor)|investor name'));
    if (full) {
      const parts = full.match[1].trim().split(/\s+/);
      draft.surname = { value: parts.pop() ?? '', ...full.entry };
      if (parts.length) draft.given_names = { value: parts.join(' '), ...full.entry };
    }
  }
  const type = draft.company_name ? 'aus_proprietary_company' : draft.trust_name ? null : draft.given_names || draft.surname ? 'individual' : null;
  if (type) draft.investor_type = { value: type, clause: null, page: null, quote: 'Suggested from the names on the form. Check the box ticked on the form.' };
  return draft;
}

const str = (d: InvestorDraft, k: InvestorKey) => {
  const v = d[k]?.value;
  return v === null || v === undefined || v === '' ? null : String(v).trim();
};
const num = (d: InvestorDraft, k: InvestorKey) => {
  const v = Number(d[k]?.value);
  return Number.isFinite(v) && v > 0 ? v : null;
};
const bool = (d: InvestorDraft, k: InvestorKey) => {
  const v = d[k]?.value;
  return v === true || v === 'true' ? true : v === false || v === 'false' ? false : null;
};

export function investorName(d: InvestorDraft) {
  return str(d, 'company_name') || str(d, 'trust_name') || [str(d, 'given_names'), str(d, 'surname')].filter(Boolean).join(' ') || str(d, 'email') || 'Investor';
}

export function investorTotal(d: InvestorDraft) {
  return (num(d, 'amount_hc') ?? 0) + (num(d, 'amount_opp') ?? 0) + (num(d, 'amount_qv') ?? 0);
}

export function investorProblems(d: InvestorDraft): string[] {
  const problems: string[] = [];
  if (!str(d, 'investor_type')) problems.push('Choose the investor type.');
  if (!str(d, 'company_name') && !str(d, 'trust_name') && !str(d, 'surname')) problems.push('Enter the investor\'s name.');
  const email = str(d, 'email');
  if (!email) problems.push('Enter an email address.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) problems.push('The email address does not look right.');
  if (!(investorTotal(d) > 0)) problems.push('Enter an amount for at least one class.');
  return problems;
}

export interface ExistingApplication { id: string; status: string; submitted_at: string | null; name: string }

export async function findDuplicates(tenantId: string, email: string) {
  const [apps, clients] = await Promise.all([
    supabase.from('investor_applications')
      .select('id, status, submitted_at, contact_given_names, contact_surname, a_given_names, a_surname, c_company_name, d_trust_name')
      .eq('tenant_id', tenantId).ilike('contact_email', email.trim()).neq('status', 'rejected')
      .order('created_at', { ascending: false }),
    supabase.from('client_profiles').select('id, full_name').eq('tenant_id', tenantId).ilike('email', email.trim()).limit(1).maybeSingle(),
  ]);
  if (apps.error) throw new Error(`Could not check for existing applications: ${apps.error.message}`);
  if (clients.error) throw new Error(`Could not check for existing investors: ${clients.error.message}`);
  const applications: ExistingApplication[] = (apps.data ?? []).map((a) => ({
    id: a.id, status: a.status, submitted_at: a.submitted_at,
    name: a.c_company_name || a.d_trust_name || [a.a_given_names ?? a.contact_given_names, a.a_surname ?? a.contact_surname].filter(Boolean).join(' ') || email,
  }));
  return { applications, existingInvestor: (clients.data?.full_name as string | undefined) ?? null };
}

export async function createApplication(tenantId: string, d: InvestorDraft, fileName: string, reviewerEmail: string | null) {
  const type = str(d, 'investor_type');
  const person = type === 'individual' || type === 'joint';
  const company = type === 'aus_proprietary_company' || type === 'aus_public_company';
  const trust = !!type && type.includes('trust');
  const hc = num(d, 'amount_hc');
  const opp = num(d, 'amount_opp');
  const qv = num(d, 'amount_qv');
  const now = new Date().toISOString();
  const row = {
    tenant_id: tenantId,
    status: 'submitted',
    submitted_at: now,
    investor_type: type,
    contact_title: str(d, 'title'),
    contact_given_names: str(d, 'given_names'),
    contact_surname: str(d, 'surname'),
    contact_email: str(d, 'email')?.toLowerCase() ?? null,
    contact_phone: str(d, 'phone'),
    postal_address: str(d, 'address'),
    postal_suburb: str(d, 'suburb'),
    postal_state: str(d, 'state'),
    postal_postcode: str(d, 'postcode'),
    postal_country: str(d, 'country'),
    invest_class_a: !!opp, amount_class_a: opp,
    invest_class_b: !!qv, amount_class_b: qv,
    invest_class_c: !!hc, amount_class_c: hc,
    total_committed_capital: investorTotal(d),
    ...(person ? {
      a_title: str(d, 'title'), a_given_names: str(d, 'given_names'), a_surname: str(d, 'surname'), a_dob: str(d, 'dob'),
      a_email: str(d, 'email')?.toLowerCase() ?? null, a_residential_address: str(d, 'address'), a_suburb: str(d, 'suburb'),
      a_state: str(d, 'state'), a_postcode: str(d, 'postcode'), a_country: str(d, 'country'),
      a_aus_tax_resident: bool(d, 'aus_tax_resident'), a_tfn: str(d, 'tfn'),
    } : {}),
    ...(company ? { c_company_name: str(d, 'company_name'), c_abn_tfn: str(d, 'abn') ?? str(d, 'tfn'), c_aus_tax_resident: bool(d, 'aus_tax_resident') } : {}),
    ...(trust ? { d_trust_name: str(d, 'trust_name'), d_abn_tfn: str(d, 'abn') ?? str(d, 'tfn'), d_aus_tax_resident: bool(d, 'aus_tax_resident') } : {}),
    bank_institution_name: str(d, 'bank_institution'),
    bank_account_name: str(d, 'bank_account_name'),
    bank_bsb: str(d, 'bank_bsb'),
    bank_account_number: str(d, 'bank_account_number'),
    reviewer_notes: `Entered from the uploaded form "${fileName}"${reviewerEmail ? ` by ${reviewerEmail}` : ''} on ${now.slice(0, 10)}. Details checked against the form before saving.`,
  };
  const { data, error } = await supabase.from('investor_applications').insert(row).select('id').single();
  if (error) throw new Error(`Could not add the application to Onboarding: ${error.message}`);
  return data.id as string;
}
