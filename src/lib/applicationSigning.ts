import { supabase } from './supabase';
import type { PaymentDetails } from './onboarding';

const SIGNING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/application-signing`;

export const PREPARABLE_FIELDS = [
  'contact_title', 'contact_given_names', 'contact_surname', 'contact_email', 'contact_phone', 'investor_type',
  'invest_class_a', 'invest_class_b', 'invest_class_c', 'amount_class_a', 'amount_class_b', 'amount_class_c', 'bank_reinvest',
] as const;

export type PreparedFields = Partial<Record<(typeof PREPARABLE_FIELDS)[number], string | number | boolean | null>>;

export const MIN_PER_CLASS = 500_000;

export const aud = (n: number) => `A${n.toLocaleString('en-AU', { maximumFractionDigits: 2 })}`;

export const FIELD_LABELS: Record<string, string> = {
  contact_title: 'Title', contact_given_names: 'Given names', contact_surname: 'Surname', contact_email: 'Email', contact_phone: 'Phone',
  investor_type: 'Investor type', invest_class_a: 'Class A selected', invest_class_b: 'Class B selected', invest_class_c: 'Class C selected',
  amount_class_a: 'Class A amount', amount_class_b: 'Class B amount', amount_class_c: 'Class C amount', bank_reinvest: 'Reinvest distributions',
};

export interface SignerRow {
  id: string;
  role: 'signer_1' | 'signer_2' | 'witness_1' | 'witness_2';
  name: string;
  email: string;
  title_capacity: string | null;
  email_verified_at: string | null;
  signed_at: string | null;
  invited_at: string | null;
  token_expires_at: string | null;
  signature_type: string | null;
  place_of_signing: string | null;
}

export interface ChangeRequest {
  id: string;
  field: string;
  prepared_value: unknown;
  requested_value: unknown;
  status: 'pending' | 'approved' | 'declined' | 'withdrawn';
  decision_note: string | null;
  created_at: string;
}

async function signing(action: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  let res: Response;
  try {
    res = await fetch(SIGNING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action, ...body }),
    });
  } catch {
    throw new Error('Could not reach the signing service. Check your connection and try again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(err?.error || `The signing service returned an error (${res.status}).`);
  }
  return res;
}

export async function prepareApplication(tenantId: string, applicationId: string | null, fields: PreparedFields) {
  const { data, error } = await supabase.rpc('prepare_investor_application', { p_tenant_id: tenantId, p_application_id: applicationId, p_fields: fields });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('The application could not be saved.');
  return data;
}

export async function sendInvite(applicationId: string) {
  await signing('send_invite', { application_id: applicationId, origin: window.location.origin });
}

export async function previewApplicationPdf(applicationId: string) {
  const res = await signing('manager_preview_pdf', { application_id: applicationId });
  return URL.createObjectURL(await res.blob());
}

export async function openApplicationFile(applicationId: string, kind: 'signed' | 'paper') {
  const res = await signing('file_url', { application_id: applicationId, kind });
  const { url } = await res.json() as { url?: string };
  if (!url) throw new Error('No file is available yet.');
  window.open(url, '_blank', 'noopener');
}

export async function remindSigner(signerId: string) {
  await signing('remind_signer', { signer_id: signerId });
}

export async function retryFinalize(applicationId: string) {
  await signing('retry_finalize', { application_id: applicationId });
}

export async function sendAcceptance(applicationId: string, payment: PaymentDetails) {
  await signing('send_acceptance', { application_id: applicationId, payment });
}

export async function cancelApplication(applicationId: string) {
  const { error } = await supabase.rpc('cancel_investor_application', { p_application_id: applicationId });
  if (error) throw new Error(error.message);
}

export async function markPaperChecked(applicationId: string) {
  const { error } = await supabase.rpc('mark_paper_application_checked', { p_application_id: applicationId });
  if (error) throw new Error(error.message);
}

export async function decideChange(requestId: string, approve: boolean, note: string) {
  const { error } = await supabase.rpc('decide_application_change', { p_request_id: requestId, p_approve: approve, p_note: note || null });
  if (error) throw new Error(error.message);
}

export async function loadApplicationActivity(applicationId: string) {
  const [signers, changes] = await Promise.all([
    supabase.from('application_signers')
      .select('id, role, name, email, title_capacity, email_verified_at, signed_at, invited_at, token_expires_at, signature_type, place_of_signing')
      .eq('application_id', applicationId).is('cancelled_at', null).order('role'),
    supabase.from('application_change_requests')
      .select('id, field, prepared_value, requested_value, status, decision_note, created_at')
      .eq('application_id', applicationId).order('created_at', { ascending: false }),
  ]);
  if (signers.error) throw new Error(`Could not load the signers: ${signers.error.message}`);
  if (changes.error) throw new Error(`Could not load the change requests: ${changes.error.message}`);
  return { signers: (signers.data ?? []) as SignerRow[], changes: (changes.data ?? []) as ChangeRequest[] };
}

export async function pendingChangeCounts(tenantId: string) {
  const { data, error } = await supabase.from('application_change_requests').select('application_id').eq('tenant_id', tenantId).eq('status', 'pending');
  if (error) throw new Error(`Could not load change requests: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const r of data ?? []) counts[r.application_id] = (counts[r.application_id] ?? 0) + 1;
  return counts;
}
