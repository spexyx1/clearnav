import { CheckCircle, XCircle } from 'lucide-react';

type CellType = 'check' | 'x' | 'text';

interface Row {
  feature: string;
  clearnav: string;
  clearnavType: CellType;
  traditional: string;
  traditionalType: CellType;
}

const rows: Row[] = [
  { feature: 'Annual Cost', clearnav: '$3,600 - $15,600', clearnavType: 'text', traditional: '$50,000 - $200,000+', traditionalType: 'text' },
  { feature: 'Setup Time', clearnav: '5 Minutes', clearnavType: 'text', traditional: '3-6 Months', traditionalType: 'text' },
  { feature: 'Implementation Cost', clearnav: '$0', clearnavType: 'text', traditional: '$10,000 - $50,000', traditionalType: 'text' },
  { feature: 'White-Label Portal', clearnav: 'Full Control', clearnavType: 'check', traditional: 'Limited or Co-Branded', traditionalType: 'x' },
  { feature: 'Real-Time Data', clearnav: 'Instant Updates', clearnavType: 'check', traditional: 'Batch Processing (24-48hr)', traditionalType: 'x' },
  { feature: 'Custom Branding', clearnav: 'Complete Customization', clearnavType: 'check', traditional: 'Generic Templates', traditionalType: 'x' },
  { feature: 'Secondary Market', clearnav: 'Built-In Exchange', clearnavType: 'check', traditional: 'Not Available', traditionalType: 'x' },
  { feature: 'AI Automation', clearnav: 'BDR Agent & Voice AI', clearnavType: 'check', traditional: 'Not Available', traditionalType: 'x' },
  { feature: 'Contract Length', clearnav: 'Monthly (Cancel Anytime)', clearnavType: 'text', traditional: '3-5 Years Lock-In', traditionalType: 'text' },
  { feature: 'Technology Stack', clearnav: 'Modern Cloud-Native', clearnavType: 'text', traditional: 'Legacy Systems', traditionalType: 'text' },
  { feature: 'API Access', clearnav: 'Full API & Webhooks', clearnavType: 'check', traditional: 'Limited or None', traditionalType: 'x' },
  { feature: 'Pricing Model', clearnav: 'Transparent Flat Fee', clearnavType: 'text', traditional: 'Opaque AUM-Based', traditionalType: 'text' },
];

function CellContent({ text, type }: { text: string; type: CellType }) {
  if (type === 'check') {
    return (
      <span className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>{text}</span>
      </span>
    );
  }
  if (type === 'x') {
    return (
      <span className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span>{text}</span>
      </span>
    );
  }
  return <span>{text}</span>;
}

export default function ComparisonTable() {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">ClearNAV vs. Traditional Fund Administrators</h2>
          <p className="text-lg text-slate-500">See how ClearNAV compares to SS&C, Citco, Northern Trust, and BNY Mellon.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl shadow-lg border border-slate-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-6 text-left font-semibold text-sm uppercase tracking-wider">Feature</th>
                <th className="py-4 px-6 text-left font-semibold text-sm uppercase tracking-wider">ClearNAV</th>
                <th className="py-4 px-6 text-left font-semibold text-sm uppercase tracking-wider">Traditional Administrators</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
                  <td className="py-3.5 px-6 font-semibold text-slate-800 text-sm">{row.feature}</td>
                  <td className="py-3.5 px-6 font-semibold text-emerald-800 text-sm bg-emerald-50/60">
                    <CellContent text={row.clearnav} type={row.clearnavType} />
                  </td>
                  <td className="py-3.5 px-6 text-red-800 text-sm">
                    <CellContent text={row.traditional} type={row.traditionalType} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
