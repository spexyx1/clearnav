import { supabase } from './supabase';
import { contentTypeFor, extensionOf, extractTerms, MAX_UPLOAD_BYTES, readDocument } from './documentReader';
import { extractInvestor } from './investorForm';

export type ExtractionStatus = 'pending' | 'processing' | 'awaiting_review' | 'extracted' | 'approved' | 'failed';

export interface FundDocument {
  id: string;
  tenant_id: string;
  fund_id: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  created_at: string;
  review: { approval_status: 'pending' | 'approved' | 'rejected'; rejection_notes: string | null; found: number | null } | null;
}

export const DOC_TYPES = [
  { value: 'trust_deed', label: 'Trust deed' },
  { value: 'im', label: 'Information memorandum' },
  { value: 'subscription_agreement', label: 'Investor application form' },
  { value: 'ppm', label: 'Offering memorandum' },
  { value: 'other', label: 'Other document' },
];

export const docTypeLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label ?? 'Document';
export const isInvestorForm = (t: string) => t === 'subscription_agreement';

export async function checkFile(file: File): Promise<string | null> {
  if (!contentTypeFor(file.name)) return 'Only PDF, Word (.doc or .docx) and text (.txt) files can be uploaded.';
  if (file.size > MAX_UPLOAD_BYTES) return 'This file is larger than 50 MB. Upload a smaller copy.';
  if (file.size === 0) return 'This file is empty.';
  if (extensionOf(file.name) === 'pdf') {
    const magic = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (!magic.startsWith('%PDF-')) return 'This file is named .pdf but is not a real PDF.';
  }
  return null;
}

export async function loadDocuments(tenantId: string): Promise<FundDocument[]> {
  const [docs, results] = await Promise.all([
    supabase.from('fund_documents')
      .select('id, tenant_id, fund_id, document_type, file_name, file_url, file_size_bytes, extraction_status, extraction_error, created_at')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('document_extraction_results')
      .select('fund_document_id, approval_status, rejection_notes, raw_json').eq('tenant_id', tenantId),
  ]);
  if (docs.error) throw new Error(`Could not load documents: ${docs.error.message}`);
  if (results.error) throw new Error(`Could not load review results: ${results.error.message}`);
  const byDoc = new Map((results.data ?? []).map((r) => [r.fund_document_id as string, r]));
  return (docs.data ?? []).map((d) => {
    const r = byDoc.get(d.id);
    const found = (r?.raw_json as { found?: number } | null)?.found;
    return {
      ...d,
      review: r ? { approval_status: r.approval_status, rejection_notes: r.rejection_notes, found: typeof found === 'number' ? found : null } : null,
    } as FundDocument;
  });
}

async function setStatus(id: string, extraction_status: ExtractionStatus, extraction_error: string | null) {
  const { error } = await supabase.from('fund_documents')
    .update({ extraction_status, extraction_error, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Could not update the document status: ${error.message}`);
}

async function saveResult(doc: Pick<FundDocument, 'id' | 'tenant_id'>, payload: Record<string, unknown>) {
  const { data: existing, error } = await supabase.from('document_extraction_results')
    .select('id').eq('fund_document_id', doc.id).maybeSingle();
  if (error) throw new Error(`Could not save what was read: ${error.message}`);
  const row = { ...payload, approval_status: 'pending', rejection_notes: null, updated_at: new Date().toISOString() };
  const write = existing
    ? await supabase.from('document_extraction_results').update(row).eq('id', existing.id)
    : await supabase.from('document_extraction_results').insert({ ...row, fund_document_id: doc.id, tenant_id: doc.tenant_id });
  if (write.error) throw new Error(`Could not save what was read: ${write.error.message}`);
}

export async function readAndSave(doc: Pick<FundDocument, 'id' | 'tenant_id' | 'document_type' | 'file_name'>, file: Blob) {
  try {
    const outcome = await readDocument(file, doc.file_name);
    if (outcome.kind === 'manual') {
      await saveResult(doc, { extraction_source: 'reviewer', raw_json: { source: 'reviewer', found: 0, notes: outcome.reason } });
      await setStatus(doc.id, 'awaiting_review', outcome.reason);
      return;
    }
    const investorForm = isInvestorForm(doc.document_type);
    const { terms, classes } = investorForm ? { terms: {}, classes: [] } : extractTerms(outcome.pages);
    const investor = investorForm ? extractInvestor(outcome.pages) : null;
    const found = Object.keys(terms).length + classes.length + (investor ? Object.keys(investor).length : 0);
    await saveResult(doc, {
      extraction_source: 'in_app_reader',
      extracted_terms: terms,
      approved_terms: terms,
      extracted_share_classes: classes,
      approved_share_classes: classes,
      extracted_investor: investor,
      approved_investor: investor,
      raw_json: { source: 'in_app_reader', pages: outcome.pages.length, found, read_at: new Date().toISOString() },
    });
    if (found === 0) {
      await setStatus(doc.id, 'awaiting_review', 'The reader found no recognisable details. Fill them in by hand.');
    } else {
      await setStatus(doc.id, 'extracted', null);
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Unknown problem';
    await setStatus(doc.id, 'failed', `The document could not be read: ${reason}`).catch(() => undefined);
    throw e;
  }
}

export async function uploadDocument(tenantId: string, file: File, documentType: string, fundId: string | null, userId: string | null) {
  const path = `${tenantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error: upErr } = await supabase.storage.from('fund-documents')
    .upload(path, file, { upsert: false, contentType: contentTypeFor(file.name) ?? undefined });
  if (upErr) throw new Error(`The file could not be uploaded: ${upErr.message}`);
  const { data, error } = await supabase.from('fund_documents').insert({
    tenant_id: tenantId,
    fund_id: fundId,
    document_type: documentType,
    file_name: file.name,
    file_url: path,
    file_size_bytes: file.size,
    extraction_status: 'processing',
    uploaded_by: userId,
  }).select('id, tenant_id, document_type, file_name').single();
  if (error) {
    await supabase.storage.from('fund-documents').remove([path]);
    throw new Error(`The document could not be saved: ${error.message}`);
  }
  return data;
}

export async function retryDocument(doc: FundDocument) {
  await setStatus(doc.id, 'processing', null);
  const { data, error } = await supabase.storage.from('fund-documents').download(doc.file_url);
  if (error || !data) {
    const reason = 'The stored file could not be opened. Delete it and upload it again.';
    await setStatus(doc.id, 'failed', reason);
    throw new Error(reason);
  }
  await readAndSave(doc, data);
}

export async function deleteDocument(doc: FundDocument) {
  const { error: rErr } = await supabase.from('document_extraction_results').delete().eq('fund_document_id', doc.id);
  if (rErr) throw new Error(`Could not delete the review: ${rErr.message}`);
  const { data, error } = await supabase.from('fund_documents').delete().eq('id', doc.id).select('id');
  if (error) throw new Error(`Could not delete the document: ${error.message}`);
  if (!data?.length) throw new Error('Only a fund administrator can delete documents.');
  const { error: sErr } = await supabase.storage.from('fund-documents').remove([doc.file_url]);
  if (sErr) throw new Error(`The document was removed, but the stored file could not be deleted: ${sErr.message}`);
}

export async function openDocument(doc: FundDocument) {
  const { data, error } = await supabase.storage.from('fund-documents').createSignedUrl(doc.file_url, 300);
  if (error || !data?.signedUrl) throw new Error('The file could not be opened.');
  return data.signedUrl;
}
