import { Invoice, InvoiceLineItem, InvoiceSettings, formatCurrency } from './types';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function row(label: string, value: string, color = '#374151'): string {
  if (!value) return '';
  return `<tr>
    <td style="padding:2px 0;color:#9ca3af;font-size:11px;white-space:nowrap;padding-right:12px">${esc(label)}</td>
    <td style="padding:2px 0;color:${color};font-size:11px;font-weight:500">${esc(value)}</td>
  </tr>`;
}

export function buildInvoicePrintHTML(
  invoice: Invoice,
  items: InvoiceLineItem[],
  settings: InvoiceSettings | null,
  tenantName: string
): string {
  const accent = settings?.accent_color || '#1e3a5f';
  const currency = invoice.currency || 'USD';
  const senderName = settings?.business_name || tenantName;

  const senderLines = [
    settings?.business_address_line1,
    settings?.business_address_line2,
    [settings?.business_city, settings?.business_state, settings?.business_zip].filter(Boolean).join(' '),
    settings?.business_country,
  ].filter(Boolean);

  const hasBankDetails = !!(
    settings?.bank_account_name || settings?.bank_account_number ||
    settings?.bank_routing_number || settings?.bank_swift_bic || settings?.bank_iban
  );

  const isSigned = !!invoice.signed_at;

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 1 ? '#f9fafb' : '#ffffff'}">
      <td style="padding:8px 10px;font-size:11px;color:#1f2937;border-bottom:1px solid #f3f4f6">${esc(item.description) || '—'}</td>
      <td style="padding:8px 10px;font-size:11px;color:#4b5563;text-align:center;border-bottom:1px solid #f3f4f6">${item.quantity}</td>
      <td style="padding:8px 10px;font-size:11px;color:#4b5563;text-align:right;border-bottom:1px solid #f3f4f6">${formatCurrency(item.unit_price, currency)}</td>
      <td style="padding:8px 10px;font-size:11px;color:#6b7280;text-align:center;border-bottom:1px solid #f3f4f6">${item.tax_rate > 0 ? `${item.tax_rate}%` : '—'}</td>
      <td style="padding:8px 10px;font-size:11px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6">${formatCurrency(item.line_total, currency)}</td>
    </tr>`).join('');

  const totalsHtml = `
    <tr>
      <td style="padding:5px 10px;font-size:11px;color:#6b7280;text-align:right">Subtotal</td>
      <td style="padding:5px 10px;font-size:11px;color:#374151;font-weight:500;text-align:right;white-space:nowrap">${formatCurrency(invoice.subtotal, currency)}</td>
    </tr>
    ${invoice.discount_total > 0 ? `<tr>
      <td style="padding:5px 10px;font-size:11px;color:#059669;text-align:right">Discount</td>
      <td style="padding:5px 10px;font-size:11px;color:#059669;text-align:right">−${formatCurrency(invoice.discount_total, currency)}</td>
    </tr>` : ''}
    ${invoice.tax_total > 0 ? `<tr>
      <td style="padding:5px 10px;font-size:11px;color:#6b7280;text-align:right">Tax</td>
      <td style="padding:5px 10px;font-size:11px;color:#374151;font-weight:500;text-align:right">${formatCurrency(invoice.tax_total, currency)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:8px 10px;font-size:14px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #e5e7eb">Total</td>
      <td style="padding:8px 10px;font-size:16px;font-weight:800;color:${accent};text-align:right;border-top:2px solid #e5e7eb;white-space:nowrap">${formatCurrency(invoice.total, currency)}</td>
    </tr>
    ${invoice.amount_paid > 0 ? `
    <tr>
      <td style="padding:4px 10px;font-size:11px;color:#059669;text-align:right">Amount Paid</td>
      <td style="padding:4px 10px;font-size:11px;color:#059669;text-align:right">−${formatCurrency(invoice.amount_paid, currency)}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;font-size:12px;font-weight:700;color:#111827;text-align:right;border-top:1px solid #e5e7eb">Balance Due</td>
      <td style="padding:6px 10px;font-size:14px;font-weight:800;color:#dc2626;text-align:right;border-top:1px solid #e5e7eb">${formatCurrency(invoice.balance_due, currency)}</td>
    </tr>` : ''}
  `;

  const bankDetailsHtml = hasBankDetails ? `
    <div style="margin-top:16px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb">
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Bank Transfer Details</div>
      <table style="width:100%;border-collapse:collapse">
        ${settings?.bank_account_name ? row('Account Name', settings.bank_account_name) : ''}
        ${settings?.bank_name ? row('Bank', settings.bank_name) : ''}
        ${settings?.bank_account_number ? row('Account Number', settings.bank_account_number) : ''}
        ${settings?.bank_routing_number ? row('Routing / BSB', settings.bank_routing_number) : ''}
        ${settings?.bank_swift_bic ? row('SWIFT / BIC', settings.bank_swift_bic) : ''}
        ${settings?.bank_iban ? row('IBAN', settings.bank_iban) : ''}
      </table>
      ${settings?.bank_extra_instructions ? `<p style="margin-top:6px;font-size:11px;color:#6b7280;font-style:italic">${esc(settings.bank_extra_instructions)}</p>` : ''}
    </div>` : '';

  const notesTermsHtml = (invoice.notes || invoice.terms) ? `
    <div style="margin-top:16px;display:grid;grid-template-columns:${invoice.notes && invoice.terms ? '1fr 1fr' : '1fr'};gap:16px">
      ${invoice.notes ? `<div>
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Notes</div>
        <p style="font-size:11px;color:#4b5563;line-height:1.5;white-space:pre-line">${esc(invoice.notes)}</p>
      </div>` : ''}
      ${invoice.terms ? `<div>
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Terms &amp; Conditions</div>
        <p style="font-size:11px;color:#4b5563;line-height:1.5;white-space:pre-line">${esc(invoice.terms)}</p>
      </div>` : ''}
    </div>` : '';

  const signatureHtml = (isSigned || invoice.signature_required) ? `
    <div style="margin-top:16px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:6px">
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">
        ${isSigned ? 'Signed by Client' : 'Client Signature Required'}
      </div>
      ${isSigned ? `
        <div style="display:flex;align-items:flex-start;gap:24px">
          <div>
            ${invoice.signed_by_choice === 'draw' && invoice.signature_data
              ? `<img src="${invoice.signature_data}" style="height:48px;object-fit:contain;border-bottom:1px solid #d1d5db;padding-bottom:4px" alt="Signature">`
              : `<div style="font-size:24px;font-family:cursive;color:#1e293b;border-bottom:1px solid #d1d5db;padding-bottom:4px">${esc(invoice.signature_data || invoice.signed_by_name)}</div>`}
            <div style="font-size:11px;color:#6b7280;margin-top:4px">${esc(invoice.signed_by_name)}</div>
          </div>
          <div style="font-size:11px;color:#6b7280;text-align:right">
            <div>Signed electronically</div>
            ${invoice.signed_at ? `<div>${new Date(invoice.signed_at).toLocaleString()}</div>` : ''}
          </div>
        </div>` : `
        <div style="display:flex;gap:24px">
          <div style="flex:1"><div style="height:40px;border-bottom:1px solid #9ca3af"></div><div style="font-size:11px;color:#6b7280;margin-top:4px">Authorized Signature</div></div>
          <div style="flex:1"><div style="height:40px;border-bottom:1px solid #9ca3af"></div><div style="font-size:11px;color:#6b7280;margin-top:4px">Print Name</div></div>
          <div style="width:100px"><div style="height:40px;border-bottom:1px solid #9ca3af"></div><div style="font-size:11px;color:#6b7280;margin-top:4px">Date</div></div>
        </div>`}
    </div>` : '';

  const isPaid = invoice.status === 'paid';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${esc(invoice.invoice_number)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 12px; }
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  </style>
</head>
<body style="-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative">

  ${isPaid ? `<!-- ── PAID STAMP ── -->
  <div style="position:fixed;top:38%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);pointer-events:none;z-index:100;text-align:center;opacity:0.18">
    <div style="border:6px solid #dc2626;border-radius:8px;padding:8px 28px;display:inline-block">
      <div style="font-size:72px;font-weight:900;color:#dc2626;letter-spacing:6px;line-height:1;text-transform:uppercase">PAID</div>
      <div style="font-size:22px;color:#dc2626;font-family:'Brush Script MT',cursive;margin-top:2px;letter-spacing:2px">paid in full</div>
    </div>
  </div>` : ''}

  <!-- ── HEADER ── -->
  <table style="width:100%;border-collapse:collapse;border-bottom:3px solid ${accent};padding-bottom:14px;margin-bottom:14px">
    <tr>
      <td style="vertical-align:top;padding-bottom:14px">
        ${settings?.logo_url
          ? `<img src="${esc(settings.logo_url)}" alt="${esc(senderName)}" style="height:36px;max-width:160px;object-fit:contain;display:block;margin-bottom:6px">`
          : `<div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px">${esc(senderName)}</div>`}
        ${settings?.logo_url && settings?.business_name
          ? `<div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px">${esc(settings.business_name)}</div>`
          : ''}
        ${senderLines.length ? `<div style="font-size:11px;color:#6b7280;line-height:1.5">${senderLines.map(esc).join('<br>')}</div>` : ''}
        ${settings?.business_phone || settings?.business_email
          ? `<div style="font-size:11px;color:#6b7280;margin-top:3px">${[settings?.business_phone, settings?.business_email].filter(Boolean).map(esc).join('  ·  ')}</div>`
          : ''}
        ${settings?.business_website ? `<div style="font-size:11px;color:#6b7280">${esc(settings.business_website)}</div>` : ''}
        ${settings?.business_tax_id ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">Tax ID: ${esc(settings.business_tax_id)}</div>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;padding-bottom:14px;white-space:nowrap">
        <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;color:${accent};text-transform:uppercase">INVOICE</div>
        <div style="font-size:14px;font-weight:600;color:#374151;margin-top:2px">${esc(invoice.invoice_number)}</div>
        <table style="margin-top:10px;border-collapse:collapse;margin-left:auto">
          ${row('Issue Date:', invoice.issue_date, '#374151')}
          ${invoice.due_date ? row('Due Date:', invoice.due_date, '#374151') : ''}
        </table>
      </td>
    </tr>
  </table>

  <!-- ── BILL TO ── -->
  <div style="background:#f9fafb;border-radius:6px;padding:10px 14px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Bill To</div>
    <div style="font-size:14px;font-weight:700;color:#111827">${esc(invoice.to_name)}</div>
    ${invoice.to_company ? `<div style="font-size:12px;color:#4b5563;margin-top:1px">${esc(invoice.to_company)}</div>` : ''}
    ${invoice.to_address ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;white-space:pre-line">${esc(invoice.to_address)}</div>` : ''}
    ${invoice.to_email ? `<div style="font-size:11px;color:${accent};margin-top:2px">${esc(invoice.to_email)}</div>` : ''}
    ${invoice.to_phone ? `<div style="font-size:11px;color:#6b7280">${esc(invoice.to_phone)}</div>` : ''}
  </div>

  <!-- ── LINE ITEMS ── -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:0">
    <thead>
      <tr style="background:${accent}18">
        <th style="padding:8px 10px;font-size:11px;font-weight:600;color:#374151;text-align:left;border-radius:4px 0 0 0">Description</th>
        <th style="padding:8px 10px;font-size:11px;font-weight:600;color:#374151;text-align:center;width:50px">Qty</th>
        <th style="padding:8px 10px;font-size:11px;font-weight:600;color:#374151;text-align:right;width:90px">Unit Price</th>
        <th style="padding:8px 10px;font-size:11px;font-weight:600;color:#374151;text-align:center;width:60px">Tax %</th>
        <th style="padding:8px 10px;font-size:11px;font-weight:600;color:#374151;text-align:right;width:90px;border-radius:0 4px 0 0">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- ── TOTALS ── -->
  <div style="display:flex;justify-content:flex-end;margin-top:4px;margin-bottom:16px">
    <table style="border-collapse:collapse;min-width:220px">
      ${totalsHtml}
    </table>
  </div>

  ${settings?.payment_instructions ? `
  <div style="margin-bottom:16px;padding:10px 14px;background:#eff6ff;border-left:3px solid ${accent};border-radius:0 4px 4px 0">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Payment Instructions</div>
    <p style="font-size:11px;color:#374151;white-space:pre-line">${esc(settings.payment_instructions)}</p>
  </div>` : ''}

  ${bankDetailsHtml}
  ${notesTermsHtml}
  ${signatureHtml}

  <!-- ── FOOTER ── -->
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid ${accent}40;text-align:center;font-size:11px;color:#9ca3af">
    ${esc(invoice.footer || 'Thank you for your business.')}
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
</body>
</html>`;
}
