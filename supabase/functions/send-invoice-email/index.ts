import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendInvoicePayload {
  invoice_id: string;
  resend?: boolean;
}

function buildInvoiceHtml(invoice: any, items: any[], settings: any, tenantName: string, origin: string): string {
  const accent = settings?.accent_color || '#0891b2';
  const currency = invoice.currency || 'USD';
  const senderName = settings?.business_name || tenantName;

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  }

  // Sender address block
  const addrLines = [
    settings?.business_address_line1,
    settings?.business_address_line2,
    [settings?.business_city, settings?.business_state, settings?.business_zip].filter(Boolean).join(' '),
    settings?.business_country,
  ].filter(Boolean);

  const senderAddressHtml = addrLines.length > 0
    ? `<div style="font-size:11px;color:#94a3b8;line-height:1.5;">${addrLines.join('<br>')}</div>`
    : '';

  const senderContactHtml = [
    settings?.business_phone ? `<span>${settings.business_phone}</span>` : '',
    settings?.business_email ? `<span>${settings.business_email}</span>` : '',
    settings?.business_website ? `<span>${settings.business_website}</span>` : '',
  ].filter(Boolean).join('<span style="margin:0 6px;color:#cbd5e1;">·</span>');

  const taxIdHtml = settings?.business_tax_id
    ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px;">Tax ID: ${settings.business_tax_id}</div>`
    : '';

  // Bank details block
  const bankRows = [
    settings?.bank_account_name ? ['Account Name', settings.bank_account_name] : null,
    settings?.bank_name ? ['Bank', settings.bank_name] : null,
    settings?.bank_account_number ? ['Account Number', settings.bank_account_number] : null,
    settings?.bank_routing_number ? ['Routing / BSB', settings.bank_routing_number] : null,
    settings?.bank_swift_bic ? ['SWIFT / BIC', settings.bank_swift_bic] : null,
    settings?.bank_iban ? ['IBAN', settings.bank_iban] : null,
  ].filter(Boolean) as [string, string][];

  const bankHtml = bankRows.length > 0 ? `
    <div style="padding:0 32px 16px;">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Bank Transfer Details</div>
      <table style="border-collapse:collapse;font-size:12px;width:100%;background:#f8fafc;border-radius:8px;overflow:hidden;">
        ${bankRows.map(([label, value]) => `
          <tr>
            <td style="padding:5px 12px;color:#64748b;width:35%;">${label}</td>
            <td style="padding:5px 12px;font-weight:600;font-family:monospace;color:#1e293b;">${value}</td>
          </tr>
        `).join('')}
      </table>
      ${settings?.bank_extra_instructions ? `<p style="font-size:11px;color:#64748b;font-style:italic;margin:6px 0 0;">${settings.bank_extra_instructions}</p>` : ''}
    </div>
  ` : '';

  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${item.description || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(item.unit_price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${item.tax_rate > 0 ? item.tax_rate + '%' : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(item.line_total)}</td>
    </tr>
  `).join('');

  const publicUrl = `${origin}/invoice/${invoice.public_view_token}`;
  const needsSignature = invoice.signature_required && !invoice.signed_at;

  const ctaButtonHtml = needsSignature
    ? `<a href="${publicUrl}" style="display:inline-block;padding:12px 28px;background:${accent};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Review &amp; Sign Invoice</a>
       <div style="margin-top:8px;font-size:11px;color:#94a3b8;">This invoice requires your signature to be completed.</div>`
    : `<a href="${publicUrl}" style="display:inline-block;padding:12px 28px;background:${accent};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Invoice Online</a>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#1e293b;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="padding:24px 32px;border-bottom:3px solid ${accent};">
      <table width="100%"><tr>
        <td style="vertical-align:top;">
          ${settings?.logo_url
            ? `<img src="${settings.logo_url}" style="height:36px;object-fit:contain;display:block;margin-bottom:4px;">`
            : `<span style="font-size:18px;font-weight:700;">${senderName}</span>`
          }
          ${settings?.logo_url && settings?.business_name
            ? `<div style="font-size:14px;font-weight:600;color:#334155;">${settings.business_name}</div>`
            : ''
          }
          ${senderAddressHtml}
          ${senderContactHtml ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${senderContactHtml}</div>` : ''}
          ${taxIdHtml}
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="font-size:22px;font-weight:700;color:${accent};">INVOICE</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${invoice.invoice_number}</div>
        </td>
      </tr></table>
    </div>

    <!-- Bill To + Dates -->
    <div style="padding:20px 32px;">
      <table width="100%"><tr>
        <td style="vertical-align:top;">
          <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Bill To</div>
          <div style="font-weight:600;">${invoice.to_name}</div>
          ${invoice.to_company ? `<div style="color:#64748b;">${invoice.to_company}</div>` : ''}
          ${invoice.to_address ? `<div style="font-size:12px;color:#94a3b8;white-space:pre-line;">${invoice.to_address}</div>` : ''}
          ${invoice.to_email ? `<div style="font-size:12px;color:#94a3b8;">${invoice.to_email}</div>` : ''}
          ${invoice.to_phone ? `<div style="font-size:12px;color:#94a3b8;">${invoice.to_phone}</div>` : ''}
        </td>
        <td style="text-align:right;vertical-align:top;">
          <div style="font-size:12px;color:#64748b;">Issue Date: <strong>${invoice.issue_date}</strong></div>
          ${invoice.due_date ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">Due Date: <strong>${invoice.due_date}</strong></div>` : ''}
        </td>
      </tr></table>
    </div>

    <!-- Items -->
    <div style="padding:0 32px;">
      <table width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:${accent}18;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Description</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;width:50px;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;width:80px;">Price</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;width:50px;">Tax</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;width:80px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:16px 32px;text-align:right;">
      <table style="margin-left:auto;font-size:13px;">
        <tr><td style="padding:2px 16px 2px 0;color:#64748b;">Subtotal</td><td style="padding:2px 0;font-weight:500;">${fmt(invoice.subtotal)}</td></tr>
        ${invoice.discount_total > 0 ? `<tr><td style="padding:2px 16px 2px 0;color:#10b981;">Discount</td><td style="padding:2px 0;color:#10b981;">−${fmt(invoice.discount_total)}</td></tr>` : ''}
        ${invoice.tax_total > 0 ? `<tr><td style="padding:2px 16px 2px 0;color:#64748b;">Tax</td><td style="padding:2px 0;font-weight:500;">${fmt(invoice.tax_total)}</td></tr>` : ''}
        <tr style="border-top:2px solid #e2e8f0;">
          <td style="padding:8px 16px 8px 0;font-weight:700;font-size:15px;">Total</td>
          <td style="padding:8px 0;font-weight:700;font-size:15px;color:${accent};">${fmt(invoice.total)}</td>
        </tr>
      </table>
    </div>

    <!-- Notes / Terms -->
    ${invoice.notes ? `<div style="padding:0 32px 16px;"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Notes</div><p style="font-size:12px;color:#64748b;margin:0;white-space:pre-wrap;">${invoice.notes}</p></div>` : ''}
    ${invoice.terms ? `<div style="padding:0 32px 16px;"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Terms &amp; Conditions</div><p style="font-size:12px;color:#64748b;margin:0;white-space:pre-wrap;">${invoice.terms}</p></div>` : ''}

    <!-- Bank details -->
    ${bankHtml}

    <!-- Additional payment instructions -->
    ${settings?.payment_instructions ? `<div style="padding:0 32px 16px;"><div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Payment Instructions</div><p style="font-size:12px;color:#64748b;margin:0;white-space:pre-wrap;">${settings.payment_instructions}</p></div>` : ''}

    <!-- CTA -->
    <div style="padding:20px 32px;text-align:center;background:#f8fafc;border-top:1px solid #e2e8f0;">
      ${ctaButtonHtml}
      <p style="font-size:11px;color:#94a3b8;margin:12px 0 0;">${invoice.footer || `Thank you for your business, ${invoice.to_name}.`}</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: SendInvoicePayload = await req.json();
    const { invoice_id } = payload;
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load invoice with line items
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*, line_items:invoice_line_items(*)")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load settings — user-scoped invoices use user_id, tenant invoices use tenant_id
    const settingsQuery = invoice.user_id
      ? supabase.from("invoice_settings").select("*").eq("user_id", invoice.user_id).maybeSingle()
      : supabase.from("invoice_settings").select("*").eq("tenant_id", invoice.tenant_id).maybeSingle();

    const tenantQuery = invoice.tenant_id
      ? supabase.from("platform_tenants").select("name").eq("id", invoice.tenant_id).maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [settingsRes, tenantRes] = await Promise.all([settingsQuery, tenantQuery]);

    const settings = settingsRes.data;
    const tenantName = tenantRes.data?.name || settings?.business_name || "Your Company";

    // For user-scoped invoices use the invoice app subdomain for public links
    const isInvoiceApp = !!invoice.user_id && !invoice.tenant_id;
    const reqOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, '') || '';
    const origin = isInvoiceApp
      ? 'https://invoice.clearnav.cv'
      : (reqOrigin || (Deno.env.get("SUPABASE_URL") || '').replace('/rest/v1', ''));

    const htmlBody = buildInvoiceHtml(invoice, invoice.line_items || [], settings, tenantName, origin);
    const subject = `Invoice ${invoice.invoice_number} from ${settings?.business_name || tenantName}`;

    // Get Resend API key
    let resendKey = Deno.env.get("RESEND_API_KEY") || null;
    if (!resendKey) {
      const { data: vaultSecret } = await supabase
        .from("vault.decrypted_secrets")
        .select("decrypted_secret")
        .eq("name", "RESEND_API_KEY")
        .maybeSingle();
      if (vaultSecret?.decrypted_secret) resendKey = vaultSecret.decrypted_secret;
    }

    let providerSuccess = false;
    let providerError: string | null = null;

    if (resendKey && invoice.to_email) {
      const fromName = settings?.business_name || tenantName;
      const fromEmail = isInvoiceApp
        ? 'info@clearnav.cv'
        : (settings?.business_email || 'invoices@resend.dev');
      const fromAddress = `${fromName} <${fromEmail}>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress,
          to: [invoice.to_email],
          subject,
          html: htmlBody,
        }),
      });

      if (resendRes.ok) {
        providerSuccess = true;
      } else {
        const resendData = await resendRes.json().catch(() => ({}));
        providerError = resendData.message || JSON.stringify(resendData);
      }
    }

    // Update invoice status to sent
    const now = new Date().toISOString();
    await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: now })
      .eq("id", invoice_id)
      .eq("status", "draft");

    // Log activity
    await supabase.from("invoice_activity").insert({
      invoice_id,
      actor_id: user.id,
      action: "sent",
      metadata: { to_email: invoice.to_email, provider_success: providerSuccess, provider_error: providerError },
    });

    return new Response(
      JSON.stringify({ success: true, sent: providerSuccess, provider_error: providerError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-invoice-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send invoice email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
