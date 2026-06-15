import { Invoice, InvoiceLineItem, InvoiceSettings, formatCurrency } from './types';

export interface PrintInvoiceData {
  invoice: Invoice;
  items: InvoiceLineItem[];
  settings: InvoiceSettings | null;
  tenantName: string;
}

interface Props {
  data: PrintInvoiceData;
  /** If true, renders inside a white page container (for screen preview).
   *  When printing via window.print() the @page CSS handles the layout. */
  forScreen?: boolean;
}

function contrastSafe(hex: string, fallback = '#0891b2'): string {
  const c = hex.replace('#', '');
  if (c.length < 3) return fallback;
  const r = parseInt(c.length === 3 ? c[0] + c[0] : c.slice(0, 2), 16);
  const g = parseInt(c.length === 3 ? c[1] + c[1] : c.slice(2, 4), 16);
  const b = parseInt(c.length === 3 ? c[2] + c[2] : c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.85 ? '#1e293b' : hex;
}

export default function InvoicePrintLayout({ data, forScreen = true }: Props) {
  const { invoice, items, settings, tenantName } = data;
  const accent = contrastSafe(settings?.accent_color || '#0891b2');
  const currency = invoice.currency || 'USD';

  const senderName = settings?.business_name || tenantName;
  const hasBankDetails = !!(
    settings?.bank_account_name ||
    settings?.bank_account_number ||
    settings?.bank_routing_number ||
    settings?.bank_swift_bic ||
    settings?.bank_iban
  );

  const isSigned = !!invoice.signed_at;

  const wrapper = forScreen
    ? 'bg-white text-slate-800 font-sans text-sm rounded-xl shadow-2xl overflow-hidden'
    : 'bg-white text-slate-800 font-sans text-sm';

  return (
    <div className={wrapper} id="invoice-print-root">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #invoice-print-root, #invoice-print-root * { visibility: visible; }
          #invoice-print-root {
            position: fixed !important;
            top: 0 !important; left: 0 !important; right: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="px-10 py-7 flex items-start justify-between" style={{ borderBottom: `3px solid ${accent}` }}>
        <div className="space-y-1">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={senderName} className="h-10 mb-1 object-contain" />
          ) : (
            <div className="text-xl font-bold text-slate-900">{senderName}</div>
          )}
          {settings?.logo_url && settings?.business_name && (
            <div className="text-sm font-semibold text-slate-700">{settings.business_name}</div>
          )}
          {(settings?.business_address_line1 || settings?.business_city) && (
            <div className="text-xs text-slate-500 leading-relaxed">
              {[
                settings?.business_address_line1,
                settings?.business_address_line2,
                [settings?.business_city, settings?.business_state, settings?.business_zip].filter(Boolean).join(' '),
                settings?.business_country,
              ].filter(Boolean).join('\n')}
            </div>
          )}
          {(settings?.business_phone || settings?.business_email) && (
            <div className="text-xs text-slate-500">
              {[settings?.business_phone, settings?.business_email].filter(Boolean).join('  ·  ')}
            </div>
          )}
          {settings?.business_website && (
            <div className="text-xs text-slate-500">{settings.business_website}</div>
          )}
          {settings?.business_tax_id && (
            <div className="text-xs text-slate-400">Tax ID: {settings.business_tax_id}</div>
          )}
        </div>

        <div className="text-right">
          <div className="text-3xl font-extrabold tracking-tight" style={{ color: accent }}>INVOICE</div>
          <div className="text-base font-semibold text-slate-700 mt-1">{invoice.invoice_number}</div>
          <div className="mt-3 space-y-0.5 text-xs text-slate-500">
            <div><span className="font-medium text-slate-600">Issue Date:</span> {invoice.issue_date}</div>
            {invoice.due_date && (
              <div><span className="font-medium text-slate-600">Due Date:</span> {invoice.due_date}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bill To ── */}
      <div className="px-10 py-6 bg-slate-50">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Bill To</div>
        <div className="text-base font-bold text-slate-900">{invoice.to_name}</div>
        {invoice.to_company && <div className="text-sm text-slate-600">{invoice.to_company}</div>}
        {invoice.to_address && (
          <div className="text-xs text-slate-500 whitespace-pre-line mt-0.5">{invoice.to_address}</div>
        )}
        {invoice.to_email && <div className="text-xs text-slate-500 mt-0.5">{invoice.to_email}</div>}
        {invoice.to_phone && <div className="text-xs text-slate-500">{invoice.to_phone}</div>}
      </div>

      {/* ── Line Items ── */}
      <div className="px-10 pt-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ backgroundColor: `${accent}20` }}>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600 rounded-tl">Description</th>
              <th className="text-right py-2.5 px-3 font-semibold text-slate-600 w-14">Qty</th>
              <th className="text-right py-2.5 px-3 font-semibold text-slate-600 w-24">Unit Price</th>
              <th className="text-right py-2.5 px-3 font-semibold text-slate-600 w-16">Tax %</th>
              <th className="text-right py-2.5 px-3 font-semibold text-slate-600 w-24 rounded-tr">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ backgroundColor: i % 2 === 1 ? '#f8fafc' : '#fff' }}>
                <td className="py-2.5 px-3 text-slate-800">{item.description || '—'}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.unit_price, currency)}</td>
                <td className="py-2.5 px-3 text-right text-slate-500">{item.tax_rate > 0 ? `${item.tax_rate}%` : '—'}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatCurrency(item.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Totals ── */}
      <div className="px-10 py-5 flex justify-end">
        <div className="w-60 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700">{formatCurrency(invoice.subtotal, currency)}</span>
          </div>
          {invoice.discount_total > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>−{formatCurrency(invoice.discount_total, currency)}</span>
            </div>
          )}
          {invoice.tax_total > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span className="font-medium text-slate-700">{formatCurrency(invoice.tax_total, currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t-2 border-slate-200">
            <span className="text-base font-bold text-slate-900">Total</span>
            <span className="text-xl font-extrabold" style={{ color: accent }}>{formatCurrency(invoice.total, currency)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <>
              <div className="flex justify-between text-emerald-600 text-xs">
                <span>Amount Paid</span>
                <span>−{formatCurrency(invoice.amount_paid, currency)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-900 text-sm">Balance Due</span>
                <span className="font-extrabold text-base text-red-600">{formatCurrency(invoice.balance_due, currency)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Notes / Terms ── */}
      {(invoice.notes || invoice.terms) && (
        <div className="px-10 pb-4 grid grid-cols-2 gap-6">
          {invoice.notes && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Notes</div>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Terms &amp; Conditions</div>
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{invoice.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Bank / Payment Details ── */}
      {hasBankDetails && (
        <div className="mx-10 mb-6 p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Bank Transfer Details</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            {settings?.bank_account_name && <Row label="Account Name" value={settings.bank_account_name} />}
            {settings?.bank_name && <Row label="Bank" value={settings.bank_name} />}
            {settings?.bank_account_number && <Row label="Account Number" value={settings.bank_account_number} />}
            {settings?.bank_routing_number && <Row label="Routing / BSB" value={settings.bank_routing_number} />}
            {settings?.bank_swift_bic && <Row label="SWIFT / BIC" value={settings.bank_swift_bic} />}
            {settings?.bank_iban && <Row label="IBAN" value={settings.bank_iban} />}
          </div>
          {settings?.bank_extra_instructions && (
            <p className="mt-2 text-xs text-slate-500 italic">{settings.bank_extra_instructions}</p>
          )}
          {settings?.payment_instructions && (
            <p className="mt-1 text-xs text-slate-500 whitespace-pre-line">{settings.payment_instructions}</p>
          )}
        </div>
      )}

      {/* ── Signature Block ── */}
      {(isSigned || invoice.signature_required) && (
        <div className="mx-10 mb-6 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            {isSigned ? 'Signed by Client' : 'Client Signature Required'}
          </div>
          {isSigned ? (
            <div className="flex items-start gap-8">
              <div className="flex-1">
                {invoice.signed_by_choice === 'draw' && invoice.signature_data ? (
                  <img
                    src={invoice.signature_data}
                    alt="Client signature"
                    className="h-16 object-contain border-b border-slate-300 pb-1"
                  />
                ) : (
                  <div
                    className="text-2xl pb-1 border-b border-slate-300"
                    style={{ fontFamily: 'cursive', color: '#1e293b' }}
                  >
                    {invoice.signature_data || invoice.signed_by_name}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">{invoice.signed_by_name}</div>
              </div>
              <div className="text-xs text-slate-500 text-right space-y-0.5">
                <div>Signed electronically</div>
                {invoice.signed_at && (
                  <div>{new Date(invoice.signed_at).toLocaleString()}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-8">
              <div className="flex-1">
                <div className="h-12 border-b border-slate-400" />
                <div className="text-xs text-slate-500 mt-1">Authorized Signature</div>
              </div>
              <div className="flex-1">
                <div className="h-12 border-b border-slate-400" />
                <div className="text-xs text-slate-500 mt-1">Print Name</div>
              </div>
              <div className="w-32">
                <div className="h-12 border-b border-slate-400" />
                <div className="text-xs text-slate-500 mt-1">Date</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div
        className="px-10 py-4 text-center text-xs border-t"
        style={{ borderColor: `${accent}40`, color: '#94a3b8' }}
      >
        {invoice.footer || `Thank you for your business.`}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 shrink-0 w-28">{label}</span>
      <span className="font-medium text-slate-700 font-mono">{value}</span>
    </div>
  );
}
