import { useState } from 'react';
import { Search, Phone, Loader2, AlertCircle, CheckCircle, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AvailableNumber, COUNTRY_OPTIONS } from './types';

interface Props {
  onPurchased: () => void;
}

export default function NumberSearch({ onPurchased }: Props) {
  const [country, setCountry] = useState('US');
  const [numberType, setNumberType] = useState<'local' | 'toll_free' | 'international'>('local');
  const [areaCode, setAreaCode] = useState('');
  const [results, setResults] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'search', country_code: country, number_type: numberType, area_code: areaCode || undefined, limit: 20 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setResults(json.numbers || []);
      if ((json.numbers || []).length === 0) setError('No numbers found for that search. Try a different area code or country.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function purchase(number: AvailableNumber) {
    setPurchasing(number.phone_number);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-number-provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: 'purchase', phone_number: number.phone_number }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Purchase failed');
      setPurchased(number.phone_number);
      setTimeout(() => { onPurchased(); }, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-base font-semibold text-white mb-5">Search Available Numbers</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Country</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Number Type</label>
            <select
              value={numberType}
              onChange={e => setNumberType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="local">Local</option>
              <option value="toll_free">Toll-Free (800/888/etc.)</option>
              <option value="international">International</option>
            </select>
          </div>

          {(country === 'US' || country === 'CA') && numberType === 'local' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Area Code (optional)</label>
              <input
                value={areaCode}
                onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="e.g. 212"
                maxLength={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={search}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search Numbers
            </button>
          </div>
        </div>

        {/* Pricing info */}
        <div className="flex flex-wrap gap-3 mt-4">
          {[
            { label: 'US/CA Local', price: '$1.00/mo' },
            { label: 'US Toll-Free', price: '$2.00/mo' },
            { label: 'Inbound calls', price: '$0.0055/min' },
            { label: 'Outbound calls', price: '$0.0070/min' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 rounded-lg">
              <span className="text-xs text-slate-400">{item.label}:</span>
              <span className="text-xs font-semibold text-cyan-400">{item.price}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <span className="text-sm font-medium text-white">{results.length} numbers available</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {results.map(num => (
              <div key={num.phone_number} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white font-mono tracking-wide">
                      {num.phone_number_display || num.phone_number}
                    </div>
                    <div className="text-xs text-slate-500 capitalize mt-0.5">
                      {num.number_type?.replace(/_/g, ' ')} · {num.country_code}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      ${num.cost?.monthly_cost || '1.00'}<span className="text-xs font-normal text-slate-400">/mo</span>
                    </div>
                  </div>
                  {purchased === num.phone_number ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 border border-emerald-600/40 rounded-lg text-emerald-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Purchased!
                    </div>
                  ) : (
                    <button
                      onClick={() => purchase(num)}
                      disabled={!!purchasing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {purchasing === num.phone_number ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                      Get Number
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="text-center py-16 text-slate-500">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search for available numbers above to get started.</p>
        </div>
      )}
    </div>
  );
}
