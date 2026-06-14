import { useState } from 'react';
import { Building2, CreditCard, Loader2, ArrowRight, Check, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  userId: string;
  onComplete: () => void;
}

const ACCENT_COLORS = [
  '#2563eb', '#0891b2', '#059669', '#7c3aed', '#dc2626', '#d97706', '#0f172a',
];

export default function InvoiceOnboarding({ userId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [biz, setBiz] = useState({
    business_name: '',
    business_tax_id: '',
    business_address_line1: '',
    business_address_line2: '',
    business_city: '',
    business_state: '',
    business_zip: '',
    business_country: 'US',
    business_phone: '',
    business_email: '',
    business_website: '',
    logo_url: '',
    accent_color: '#2563eb',
  });

  const [pay, setPay] = useState({
    bank_account_name: '',
    bank_name: '',
    bank_account_number: '',
    bank_routing_number: '',
    bank_swift_bic: '',
    bank_iban: '',
    bank_extra_instructions: '',
    default_currency: 'USD',
    default_tax_rate: '0',
    default_due_days: '30',
    payment_instructions: '',
  });

  function setBizField(k: keyof typeof biz, v: string) {
    setBiz(prev => ({ ...prev, [k]: v }));
  }

  function setPayField(k: keyof typeof pay, v: string) {
    setPay(prev => ({ ...prev, [k]: v }));
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      const { error: settingsErr } = await supabase
        .from('invoice_settings')
        .upsert({
          user_id: userId,
          tenant_id: null,
          ...biz,
          ...pay,
          default_tax_rate: parseFloat(pay.default_tax_rate) || 0,
          default_due_days: parseInt(pay.default_due_days) || 30,
        }, { onConflict: 'user_id' });
      if (settingsErr) throw settingsErr;

      await supabase
        .from('invoice_app_profiles')
        .upsert({ user_id: userId, onboarding_complete: true }, { onConflict: 'user_id' });

      onComplete();
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s ? 'bg-blue-600 text-white' :
                step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Business Identity' : 'Payment Details'}
              </span>
              {s < 2 && <div className="flex-1 h-px bg-gray-200 w-8 mx-1" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Business</h2>
                  <p className="text-gray-500 text-sm">This appears on all your invoices</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business / Trade Name *</label>
                    <input
                      value={biz.business_name}
                      onChange={e => setBizField('business_name', e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business ID / Tax Number</label>
                    <input
                      value={biz.business_tax_id}
                      onChange={e => setBizField('business_tax_id', e.target.value)}
                      placeholder="EIN, ABN, VAT, etc."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                    <input
                      type="email"
                      value={biz.business_email}
                      onChange={e => setBizField('business_email', e.target.value)}
                      placeholder="billing@acme.com"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      value={biz.business_phone}
                      onChange={e => setBizField('business_phone', e.target.value)}
                      placeholder="+1 555 000 0000"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      value={biz.business_website}
                      onChange={e => setBizField('business_website', e.target.value)}
                      placeholder="https://acme.com"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      value={biz.business_address_line1}
                      onChange={e => setBizField('business_address_line1', e.target.value)}
                      placeholder="123 Main Street"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      value={biz.business_city}
                      onChange={e => setBizField('business_city', e.target.value)}
                      placeholder="New York"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
                    <input
                      value={biz.business_state}
                      onChange={e => setBizField('business_state', e.target.value)}
                      placeholder="NY"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP / Postcode</label>
                    <input
                      value={biz.business_zip}
                      onChange={e => setBizField('business_zip', e.target.value)}
                      placeholder="10001"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      value={biz.business_country}
                      onChange={e => setBizField('business_country', e.target.value)}
                      placeholder="US"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <input
                      value={biz.logo_url}
                      onChange={e => setBizField('logo_url', e.target.value)}
                      placeholder="https://acme.com/logo.png"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="inline w-4 h-4 mr-1" />
                    Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    {ACCENT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBizField('accent_color', c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${biz.accent_color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={biz.accent_color}
                      onChange={e => setBizField('accent_color', e.target.value)}
                      className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
              >
                Next: Payment Details
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onComplete}
                className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                  <p className="text-gray-500 text-sm">Shown on invoices for bank transfer payments</p>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                    <select
                      value={pay.default_currency}
                      onChange={e => setPayField('default_currency', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                      <option value="AUD">AUD — Australian Dollar</option>
                      <option value="CAD">CAD — Canadian Dollar</option>
                      <option value="CHF">CHF — Swiss Franc</option>
                      <option value="JPY">JPY — Japanese Yen</option>
                      <option value="SGD">SGD — Singapore Dollar</option>
                      <option value="HKD">HKD — Hong Kong Dollar</option>
                      <option value="NZD">NZD — New Zealand Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Payment Terms</label>
                    <select
                      value={pay.default_due_days}
                      onChange={e => setPayField('default_due_days', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="0">Due on Receipt</option>
                      <option value="7">Net 7</option>
                      <option value="15">Net 15</option>
                      <option value="30">Net 30</option>
                      <option value="45">Net 45</option>
                      <option value="60">Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={pay.default_tax_rate}
                      onChange={e => setPayField('default_tax_rate', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2 border-t border-gray-100 pt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bank Transfer Details (optional)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      value={pay.bank_account_name}
                      onChange={e => setPayField('bank_account_name', e.target.value)}
                      placeholder="Acme Corp LLC"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      value={pay.bank_name}
                      onChange={e => setPayField('bank_name', e.target.value)}
                      placeholder="Chase Bank"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      value={pay.bank_account_number}
                      onChange={e => setPayField('bank_account_number', e.target.value)}
                      placeholder="••••••••1234"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Routing / BSB Number</label>
                    <input
                      value={pay.bank_routing_number}
                      onChange={e => setPayField('bank_routing_number', e.target.value)}
                      placeholder="021000021"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT / BIC</label>
                    <input
                      value={pay.bank_swift_bic}
                      onChange={e => setPayField('bank_swift_bic', e.target.value)}
                      placeholder="CHASUS33"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                    <input
                      value={pay.bank_iban}
                      onChange={e => setPayField('bank_iban', e.target.value)}
                      placeholder="GB00 BARC 0000 0000 0000 00"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Payment Instructions</label>
                    <textarea
                      value={pay.payment_instructions}
                      onChange={e => setPayField('payment_instructions', e.target.value)}
                      rows={2}
                      placeholder="Include invoice number as payment reference."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Finish Setup
                </button>
              </div>
              <button
                onClick={onComplete}
                className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
