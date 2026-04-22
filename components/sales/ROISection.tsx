const traditionalCosts = [
  { label: 'Fund Administrator', value: '$100,000' },
  { label: 'CRM Software', value: '$10,000' },
  { label: 'Compliance Software', value: '$8,000' },
  { label: 'Document Management', value: '$5,000' },
  { label: 'Reporting Tools', value: '$7,000' },
  { label: 'Staff Time (Manual Work)', value: '$40,000' },
];

const clearnavCosts = [
  { label: 'ClearNav Professional', value: '$7,200' },
  { label: 'All Features Included', value: '$0' },
  { label: 'Setup & Onboarding', value: '$0' },
  { label: 'Additional Software', value: '$0' },
  { label: 'Integration Costs', value: '$0' },
  { label: 'Staff Time Saved', value: '-$32,000' },
];

export default function ROISection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">ROI Analysis</h2>
          <p className="text-lg text-slate-500">How ClearNav saves your fund six figures every year.</p>
        </div>
        <div className="border border-emerald-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 bg-red-50/50">
              <h3 className="text-lg font-bold text-red-800 text-center mb-4">Traditional Approach</h3>
              <div className="space-y-2">
                {traditionalCosts.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white rounded-lg px-4 py-2.5 text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center bg-red-100 rounded-lg px-4 py-3 font-bold text-red-900">
                  <span>Total Annual Cost</span>
                  <span>$170,000</span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-emerald-50/50 border-t md:border-t-0 md:border-l border-emerald-200">
              <h3 className="text-lg font-bold text-emerald-800 text-center mb-4">ClearNav Platform</h3>
              <div className="space-y-2">
                {clearnavCosts.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white rounded-lg px-4 py-2.5 text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center bg-emerald-100 rounded-lg px-4 py-3 font-bold text-emerald-900">
                  <span>Total Annual Cost</span>
                  <span>$7,200</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-600 text-white text-center py-5 px-4">
            <span className="text-xl md:text-2xl font-bold">Net Annual Savings: $162,800</span>
            <span className="mx-3 opacity-60">|</span>
            <span className="text-xl md:text-2xl font-bold">3-Year Savings: $488,400</span>
          </div>
        </div>
      </div>
    </section>
  );
}
