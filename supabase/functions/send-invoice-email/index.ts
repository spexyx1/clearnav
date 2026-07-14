import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendInvoicePayload {
  invoice_id: string;
  resend?: boolean;
  to_emails?: string[];
  cc_emails?: string[];
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

/**
 * Generate a PDF invoice using pdf-lib and return it as a base64 string.
 * This produces a clean, text-based PDF that renders consistently across
 * email clients and does not require a headless browser.
 */
async function buildInvoicePdf(invoice: any, items: any[], settings: any, tenantName: string): Promise<string> {
  const currency = invoice.currency || 'USD';
  const senderName = settings?.business_name || tenantName;

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  }

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const marginX = 50;
  const marginTop = 780;

  // Accent color (parse hex to rgb 0-1)
  function hexToRgb(hex: string) {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  const accentHex = (settings?.accent_color || '#0891b2').replace('#', '').padEnd(6, '0');
  const accentColor = hexToRgb('#' + accentHex);
  const slate800 = rgb(0.118, 0.149, 0.208);
  const slate500 = rgb(0.376, 0.451, 0.561);
  const slate400 = rgb(0.576, 0.635, 0.718);

  let y = marginTop;

  // ── Header ───────────────────────────────────────────────────────────────────
  page.drawText(senderName, { x: marginX, y, font: helveticaBold, size: 16, color: slate800 });

  // INVOICE label top-right
  page.drawText('INVOICE', { x: width - marginX - 80, y, font: helveticaBold, size: 16, color: accentColor });

  y -= 18;
  page.drawText(invoice.invoice_number, { x: width - marginX - 80, y, font: helvetica, size: 10, color: slate500 });

  // Sender address
  const addrParts = [
    settings?.business_address_line1,
    settings?.business_address_line2,
    [settings?.business_city, settings?.business_state, settings?.business_zip].filter(Boolean).join(' '),
    settings?.business_country,
  ].filter(Boolean) as string[];

  for (const line of addrParts) {
    y -= 13;
    page.drawText(line, { x: marginX, y, font: helvetica, size: 9, color: slate500 });
  }

  if (settings?.business_phone || settings?.business_email) {
    y -= 13;
    const contact = [settings?.business_phone, settings?.business_email].filter(Boolean).join('  ·  ');
    page.drawText(contact, { x: marginX, y, font: helvetica, size: 9, color: slate500 });
  }
  if (settings?.business_website) {
    y -= 12;
    page.drawText(settings.business_website, { x: marginX, y, font: helvetica, size: 9, color: slate500 });
  }
  if (settings?.business_tax_id) {
    y -= 12;
    page.drawText(`Tax ID: ${settings.business_tax_id}`, { x: marginX, y, font: helvetica, size: 8, color: slate400 });
  }

  // Accent rule
  y -= 14;
  page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 2, color: accentColor });

  // ── Dates (right-aligned below INVOICE label) ─────────────────────────────
  const datesY = y + 2;
  page.drawText(`Issue Date: ${invoice.issue_date}`, { x: width - marginX - 120, y: datesY - 20, font: helvetica, size: 9, color: slate500 });
  if (invoice.due_date) {
    page.drawText(`Due Date:   ${invoice.due_date}`, { x: width - marginX - 120, y: datesY - 34, font: helvetica, size: 9, color: slate500 });
  }

  // ── Bill To ───────────────────────────────────────────────────────────────
  y -= 22;
  page.drawText('BILL TO', { x: marginX, y, font: helveticaBold, size: 8, color: slate400 });
  y -= 14;
  page.drawText(invoice.to_name || '', { x: marginX, y, font: helveticaBold, size: 11, color: slate800 });
  if (invoice.to_company) {
    y -= 13; page.drawText(invoice.to_company, { x: marginX, y, font: helvetica, size: 10, color: slate500 });
  }
  if (invoice.to_address) {
    for (const line of invoice.to_address.split('\n')) {
      if (line.trim()) { y -= 12; page.drawText(line.trim(), { x: marginX, y, font: helvetica, size: 9, color: slate500 }); }
    }
  }
  if (invoice.to_email) { y -= 12; page.drawText(invoice.to_email, { x: marginX, y, font: helvetica, size: 9, color: slate500 }); }
  if (invoice.to_phone) { y -= 12; page.drawText(invoice.to_phone, { x: marginX, y, font: helvetica, size: 9, color: slate500 }); }

  // ── Items table ────────────────────────────────────────────────────────────
  y -= 24;
  const colDesc = marginX;
  const colQty  = width - marginX - 220;
  const colUnit = width - marginX - 160;
  const colTax  = width - marginX - 90;
  const colTotal= width - marginX - 5;

  // Table header background
  page.drawRectangle({ x: marginX, y: y - 4, width: width - 2 * marginX, height: 18, color: rgb(0.95, 0.97, 0.99) });
  page.drawText('Description', { x: colDesc, y, font: helveticaBold, size: 8, color: slate500 });
  page.drawText('Qty',   { x: colQty,   y, font: helveticaBold, size: 8, color: slate500 });
  page.drawText('Price', { x: colUnit,  y, font: helveticaBold, size: 8, color: slate500 });
  page.drawText('Tax',   { x: colTax,   y, font: helveticaBold, size: 8, color: slate500 });
  page.drawText('Total', { x: colTotal - 25, y, font: helveticaBold, size: 8, color: slate500 });
  y -= 18;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i % 2 === 1) {
      page.drawRectangle({ x: marginX, y: y - 4, width: width - 2 * marginX, height: 16, color: rgb(0.98, 0.99, 1) });
    }
    const desc = (item.description || '').slice(0, 55);
    page.drawText(desc,                              { x: colDesc, y, font: helvetica, size: 9, color: slate800 });
    page.drawText(String(item.quantity),             { x: colQty,  y, font: helvetica, size: 9, color: slate500 });
    page.drawText(fmt(item.unit_price),              { x: colUnit, y, font: helvetica, size: 9, color: slate500 });
    page.drawText(item.tax_rate > 0 ? `${item.tax_rate}%` : '-', { x: colTax, y, font: helvetica, size: 9, color: slate500 });
    const totalStr = fmt(item.line_total);
    page.drawText(totalStr, { x: colTotal - helvetica.widthOfTextAtSize(totalStr, 9), y, font: helveticaBold, size: 9, color: slate800 });
    y -= 16;
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  y -= 10;
  page.drawLine({ start: { x: width - marginX - 130, y }, end: { x: width - marginX, y }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });
  y -= 14;

  function drawTotalRow(label: string, value: string, bold = false, color = slate500) {
    page.drawText(label, { x: width - marginX - 130, y, font: bold ? helveticaBold : helvetica, size: 10, color: bold ? slate800 : slate500 });
    const vw = (bold ? helveticaBold : helvetica).widthOfTextAtSize(value, bold ? 12 : 10);
    page.drawText(value, { x: width - marginX - vw, y, font: bold ? helveticaBold : helvetica, size: bold ? 12 : 10, color: bold ? accentColor : color });
    y -= 14;
  }

  drawTotalRow('Subtotal', fmt(invoice.subtotal));
  if (invoice.discount_total > 0) drawTotalRow('Discount', `−${fmt(invoice.discount_total)}`, false, rgb(0.063, 0.725, 0.506));
  if (invoice.tax_total > 0) drawTotalRow('Tax', fmt(invoice.tax_total));
  page.drawLine({ start: { x: width - marginX - 130, y: y + 10 }, end: { x: width - marginX, y: y + 10 }, thickness: 1.5, color: rgb(0.88, 0.9, 0.93) });
  y -= 4;
  drawTotalRow('Total', fmt(invoice.total), true);
  if (invoice.amount_paid > 0) {
    drawTotalRow('Amount Paid', `−${fmt(invoice.amount_paid)}`, false, rgb(0.063, 0.725, 0.506));
    drawTotalRow('Balance Due', fmt(invoice.balance_due), true);
  }

  // ── Notes / Terms ──────────────────────────────────────────────────────────
  y -= 10;
  if (invoice.notes) {
    page.drawText('NOTES', { x: marginX, y, font: helveticaBold, size: 8, color: slate400 });
    y -= 14;
    for (const line of invoice.notes.split('\n').slice(0, 5)) {
      page.drawText(line.slice(0, 90), { x: marginX, y, font: helvetica, size: 9, color: slate500 });
      y -= 12;
    }
    y -= 4;
  }
  if (invoice.terms) {
    page.drawText('TERMS & CONDITIONS', { x: marginX, y, font: helveticaBold, size: 8, color: slate400 });
    y -= 14;
    for (const line of invoice.terms.split('\n').slice(0, 5)) {
      page.drawText(line.slice(0, 90), { x: marginX, y, font: helvetica, size: 9, color: slate500 });
      y -= 12;
    }
    y -= 4;
  }

  // ── Bank details ───────────────────────────────────────────────────────────
  const bankRows = [
    settings?.bank_account_name   ? ['Account Name', settings.bank_account_name]   : null,
    settings?.bank_name           ? ['Bank',          settings.bank_name]           : null,
    settings?.bank_account_number ? ['Account No.',   settings.bank_account_number] : null,
    settings?.bank_routing_number ? ['Routing / BSB', settings.bank_routing_number] : null,
    settings?.bank_swift_bic      ? ['SWIFT / BIC',   settings.bank_swift_bic]      : null,
    settings?.bank_iban           ? ['IBAN',          settings.bank_iban]           : null,
  ].filter(Boolean) as [string, string][];

  if (bankRows.length > 0) {
    y -= 6;
    page.drawRectangle({ x: marginX, y: y - (bankRows.length * 14) - 8, width: width - 2 * marginX, height: (bankRows.length * 14) + 24, color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.88, 0.9, 0.93), borderWidth: 0.5 });
    y -= 2;
    page.drawText('BANK TRANSFER DETAILS', { x: marginX + 10, y, font: helveticaBold, size: 8, color: slate400 });
    y -= 14;
    for (const [label, value] of bankRows) {
      page.drawText(label + ':', { x: marginX + 10, y, font: helvetica, size: 9, color: slate500 });
      page.drawText(value,        { x: marginX + 110, y, font: helveticaBold, size: 9, color: slate800 });
      y -= 14;
    }
    if (settings?.bank_extra_instructions) {
      y -= 2;
      page.drawText(settings.bank_extra_instructions.slice(0, 90), { x: marginX + 10, y, font: helvetica, size: 8, color: slate500 });
      y -= 12;
    }
    y -= 6;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerText = invoice.footer || `Thank you for your business.`;
  page.drawLine({ start: { x: marginX, y: 40 }, end: { x: width - marginX, y: 40 }, thickness: 0.5, color: rgb(0.9, 0.92, 0.95) });
  page.drawText(footerText.slice(0, 90), { x: marginX, y: 26, font: helvetica, size: 8, color: slate400 });

  const pdfBytes = await pdfDoc.save();
  // Convert Uint8Array to base64
  let binary = '';
  for (let i = 0; i < pdfBytes.length; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  return btoa(binary);
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
    const { invoice_id, to_emails, cc_emails } = payload;
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

    const lineItems = invoice.line_items || [];
    const htmlBody = buildInvoiceHtml(invoice, lineItems, settings, tenantName, origin);
    const subject = `Invoice ${invoice.invoice_number} from ${settings?.business_name || tenantName}`;

    // Generate PDF attachment
    let pdfBase64: string | null = null;
    try {
      pdfBase64 = await buildInvoicePdf(invoice, lineItems, settings, tenantName);
    } catch (pdfErr) {
      console.error("PDF generation failed (email will send without attachment):", pdfErr);
    }

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

    const resolvedToEmails = (to_emails && to_emails.length > 0)
      ? to_emails.filter(Boolean)
      : [invoice.to_email].filter(Boolean);
    const resolvedCcEmails = (cc_emails && cc_emails.length > 0)
      ? cc_emails.filter(Boolean)
      : [];

    if (resendKey && resolvedToEmails.length > 0) {
      const fromName = settings?.business_name || tenantName;
      const fromEmail = isInvoiceApp
        ? 'info@clearnav.cv'
        : (settings?.business_email || 'invoices@resend.dev');
      const fromAddress = `${fromName} <${fromEmail}>`;

      const emailPayload: any = {
        from: fromAddress,
        to: resolvedToEmails,
        subject,
        html: htmlBody,
      };

      if (resolvedCcEmails.length > 0) {
        emailPayload.cc = resolvedCcEmails;
      }

      if (pdfBase64) {
        emailPayload.attachments = [
          {
            filename: `Invoice-${invoice.invoice_number}.pdf`,
            content: pdfBase64,
          },
        ];
      }

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
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
      metadata: { to_emails: resolvedToEmails, cc_emails: resolvedCcEmails, provider_success: providerSuccess, provider_error: providerError },
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
