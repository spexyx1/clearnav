import { supabase } from './supabase';
import { reportEmailHtml, type InvestorLine, type ReportContent } from './monthlyReport';

const renderReportPdf = async (c: ReportContent) => (await import('./reportPdf')).renderReportPdf(c);

export const reportFileName = (c: ReportContent) => `Arkline-Trust-Monthly-Update-${c.period.year}-${String(c.period.month).padStart(2, '0')}.pdf`;

function toBase64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function downloadReportPdf(c: ReportContent) {
  const bytes = await renderReportPdf(c);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = reportFileName(c);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function publishReport(tenantId: string, reportId: string, reportName: string, c: ReportContent) {
  const bytes = await renderReportPdf(c);
  const path = `${tenantId}/reports/${reportId}.pdf`;
  const { error: upErr } = await supabase.storage.from('investor-documents')
    .upload(path, new Blob([bytes], { type: 'application/pdf' }), { upsert: true, contentType: 'application/pdf' });
  if (upErr) throw new Error(`Could not store the PDF: ${upErr.message}`);

  const { data: existing, error: exErr } = await supabase.from('investor_vault_documents')
    .select('id').eq('tenant_id', tenantId).eq('storage_path', path).maybeSingle();
  if (exErr) throw new Error(exErr.message);
  const doc = {
    document_name: reportName,
    document_type: 'strategy_report',
    description: `Monthly investor update for ${c.period.label}`,
    is_active: true,
  };
  if (existing) {
    const { error } = await supabase.from('investor_vault_documents').update(doc).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: last } = await supabase.from('investor_vault_documents').select('sort_order')
      .eq('tenant_id', tenantId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from('investor_vault_documents')
      .insert({ ...doc, tenant_id: tenantId, storage_path: path, sort_order: (last?.sort_order ?? 0) + 1 });
    if (error) throw new Error(error.message);
  }
  const { error: rErr } = await supabase.from('reports')
    .update({ status: 'published', file_url: path, file_size: bytes.length }).eq('id', reportId);
  if (rErr) throw new Error(rErr.message);
}

export interface EmailAccount { id: string; email_address: string; display_name: string | null }

export async function loadSenderAccounts(tenantId: string): Promise<EmailAccount[]> {
  const { data, error } = await supabase.from('email_accounts').select('id, email_address, display_name')
    .eq('tenant_id', tenantId).eq('is_active', true).order('email_address');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function emailReport(accountId: string, c: ReportContent, recipients: { to: string; investor: InvestorLine | null }[]) {
  const pdf = toBase64(await renderReportPdf(c));
  const failed: string[] = [];
  for (const r of recipients) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        account_id: accountId,
        to: [r.to],
        subject: `Arkline Trust - Monthly Update - ${c.period.label}`,
        body_html: reportEmailHtml(c, r.investor),
        body_text: `Dear ${r.investor?.name ?? 'Investor'},\n\nPlease find attached the Arkline Trust monthly update for ${c.period.label}.\n\nKind regards,\nArkline Trust`,
        attachments: [{ filename: reportFileName(c), content: pdf, content_type: 'application/pdf' }],
      },
    });
    if (error || !data || data.success === false || data.error) failed.push(r.to);
  }
  return { sent: recipients.length - failed.length, failed };
}
