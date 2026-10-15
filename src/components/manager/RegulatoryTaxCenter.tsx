import { lazy, Suspense, useEffect, useState } from 'react';
import { Landmark, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PanelLoader } from '../shared/Spinner';

const MultiFrameworkSelector = lazy(() => import('./MultiFrameworkSelector'));
const FrameworkComplianceAlerts = lazy(() => import('./FrameworkComplianceAlerts'));
const TaxJurisdictionManager = lazy(() => import('./TaxJurisdictionManager'));

interface FundOption {
  id: string;
  fund_name: string;
}

type Section = 'frameworks' | 'alerts' | 'tax';

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'frameworks', label: 'Regulatory Frameworks' },
  { id: 'alerts', label: 'Compliance Alerts' },
  { id: 'tax', label: 'Tax Jurisdictions' },
];

export default function RegulatoryTaxCenter() {
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id;
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [fundId, setFundId] = useState('');
  const [section, setSection] = useState<Section>('frameworks');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('funds')
        .select('id, fund_name')
        .eq('tenant_id', tenantId)
        .order('fund_name');
      if (!active) return;
      if (fetchError) {
        setError('Could not load your funds. Please refresh and try again.');
      } else {
        const list = (data ?? []) as FundOption[];
        setFunds(list);
        setFundId((current) => current || list[0]?.id || '');
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [tenantId]);

  if (!tenantId || loading) return <PanelLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Regulatory & Tax</h1>
            <p className="text-sm text-slate-400">Frameworks, compliance alerts and tax setup for each fund.</p>
          </div>
        </div>
        {funds.length > 0 && (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-400 md:w-72">
            Fund
            <select
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {funds.map((fund) => (
                <option key={fund.id} value={fund.id}>{fund.fund_name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : funds.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-16 text-center">
          <Landmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-medium">No funds yet</p>
          <p className="text-sm text-slate-400 mt-1">Create a fund under Funds to manage its regulatory and tax settings.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1 w-fit">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  section === s.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-xl">
            <Suspense fallback={<PanelLoader />}>
              {section === 'frameworks' && <MultiFrameworkSelector key={fundId} fundId={fundId} tenantId={tenantId} />}
              {section === 'alerts' && <FrameworkComplianceAlerts key={fundId} fundId={fundId} tenantId={tenantId} />}
              {section === 'tax' && <TaxJurisdictionManager key={fundId} fundId={fundId} tenantId={tenantId} />}
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}
