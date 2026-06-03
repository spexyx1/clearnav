import { Invoice, InvoiceLineItemDraft, calcLineTotal, formatCurrency } from './types';

interface PreviewProps {
  invoice: Partial<Invoice>;
  items: InvoiceLineItemDraft[];
  settings: {
    logo_url?: string | null;
    accent_color?: string;
    number_prefix?: string;
    payment_instructions?: string;
    business_name?: string | null;
    business_address_line1?: string | null;
    business_address_line2?: string | null;
    business_city?: string | null;
    business_state?: string | null;
    business_zip?: string | null;
    business_country?: string | null;
    business_phone?: string | null;
    business_email?: string | null;
    business_tax_id?: string | null;
  };
  tenantName?: string;
}

export default function InvoicePreview({ invoice, items, settings, tenantName }: PreviewProps) {
  const accent = settings.accent_color || '#0891b2';
  const currency = invoice.currency || 'USD';
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountTotal = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.discount_rate / 100), 0);
  const taxTotal = items.reduce((s, i) => {
    const base = i.quantity * i.unit_price * (1 - i.discount_rate / 100);
    return s + base * (i.tax_rate / 100);
  }, 0);
  const total = subtotal - discountTotal + taxTotal;

  const senderName = settings.business_name || tenantName || 'Your Company';
  const addressParts = [
    settings.business_address_line1,
    settings.business_address_line2,
    [settings.business_city, settings.business_state, settings.business_zip].filter(Boolean).join(' '),
    settings.business_country,
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden text-slate-800 text-sm font-sans min-h-[600px]">
      {/* Header band */}
      <div className="px-8 py-6 flex items-start justify-between" style={{ borderBottom: `3px solid ${accent}` }}>
        <div className="space-y-0.5">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="" className="h-10 mb-1 object-contain" />
          ) : (
            <div className="text-lg font-bold text-slate-900">{senderName}</div>
          )}
          {settings.logo_url && settings.business_name && (
            <div className="text-sm font-semibold text-slate-700">{settings.business_name}</div>
          )}
          {addressParts.length > 0 && (
            <div className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
              {addressParts.join('\n')}
            </div>
          )}
          {(settings.business_phone || settings.business_email) && (
            <div className="text-xs text-slate-500">
              {[settings.business_phone, settings.business_email].filter(Boolean).join('  ·  ')}
            </div>
          )}
          {settings.business_tax_id && (
            <div className="text-xs text-slate-400">Tax ID: {settings.business_tax_id}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight" style={{ color: accent }}>INVOICE</div>
          <div className="text-slate-500 text-xs mt-1">
            {invoice.invoice_number || `${settings.number_prefix || 'INV-'}XXXX`}
          </div>
        </div>
      </div>

      {/* Dates + To */}
      <div className="px-8 py-5 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Bill To</div>
          <div className="font-semibold text-slate-900">{invoice.to_name || '—'}</div>
          {invoice.to_company && <div className="text-slate-600">{invoice.to_company}</div>}
          {invoice.to_address && <div className="text-slate-500 text-xs whitespace-pre-line mt-0.5">{invoice.to_address}</div>}
          {invoice.to_email && <div className="text-slate-500 text-xs mt-0.5">{invoice.to_email}</div>}
          {invoice.to_phone && <div className="text-slate-500 text-xs">{invoice.to_phone}</div>}
        </div>
        <div className="text-right space-y-1">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wide">Issue Date </span>
            <span className="font-medium">{invoice.issue_date || '—'}</span>
          </div>
          {invoice.due_date && (
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Due Date </span>
              <span className="font-medium">{invoice.due_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="px-8">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: `${accent}18` }}>
              <th className="text-left py-2 px-3 font-semibold text-slate-700 rounded-tl">Description</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-700 w-16">Qty</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-700 w-20">Unit Price</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-700 w-16">Tax</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-700 w-20 rounded-tr">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 px-3 text-slate-400 text-center italic">No items yet</td>
              </tr>
            ) : items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                <td className="py-2 px-3 text-slate-800">{item.description || '—'}</td>
                <td className="py-2 px-3 text-right">{item.quantity}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price, currency)}</td>
                <td className="py-2 px-3 text-right">{item.tax_rate > 0 ? `${item.tax_rate}%` : '—'}</td>
                <td className="py-2 px-3 text-right font-medium">{formatCurrency(calcLineTotal(item), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-8 py-4 flex justify-end">
        <div className="w-52 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>−{formatCurrency(discountTotal, currency)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span className="font-medium">{formatCurrency(taxTotal, currency)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-bold" style={{ color: accent }}>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes / Terms / Payment */}
      <div className="px-8 pb-8 space-y-3">
        {invoice.notes && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</div>
            <p className="text-xs text-slate-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        {invoice.terms && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Terms</div>
            <p className="text-xs text-slate-600 whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}
        {settings.payment_instructions && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Payment Instructions</div>
            <p className="text-xs text-slate-600 whitespace-pre-line">{settings.payment_instructions}</p>
          </div>
        )}
        {invoice.footer && (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-3 text-center">{invoice.footer}</p>
        )}
      </div>
    </div>
  );
}
