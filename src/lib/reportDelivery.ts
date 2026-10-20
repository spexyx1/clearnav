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
    const { data: last, error: lastErr } = await supabase.from('investor_vault_documents').select('sort_order')
      .eq('tenant_id', tenantId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
    if (lastErr) throw new Error(lastErr.message);
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

async function reasonOf(error: unknown, data: unknown): Promise<string | null> {
  const body = data as { success?: boolean; error?: string; message?: string } | null;
  if (!error) {
    if (!body) return 'No reply from the email service';
    if (body.success === false || body.error) return body.error || body.message || 'The email service refused the message';
    return null;
  }
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const j = await ctx.clone().json() as { error?: string; message?: string };
      if (j.error || j.message) return j.error || j.message || null;
    } catch { /* body was not JSON */ }
  }
  return (error as Error).message || 'The email service could not be reached';
}

export async function emailReport(accountId: string, c: ReportContent, recipients: { to: string; investor: InvestorLine | null }[]) {
  const pdf = toBase64(await renderReportPdf(c));
  const failed: { to: string; reason: string }[] = [];
  const send = async (r: { to: string; investor: InvestorLine | null }) => {
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
    const reason = await reasonOf(error, data);
    if (reason) failed.push({ to: r.to, reason });
  };
  // Small batches keep mail-provider rate limits happy while avoiding one-by-one sends.
  for (let i = 0; i < recipients.length; i += 3) {
    await Promise.all(recipients.slice(i, i + 3).map(send));
  }
  return { sent: recipients.length - failed.length, failed };
}
