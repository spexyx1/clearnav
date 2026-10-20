import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { card } from '../onboarding/ui';

export interface FundRef { id: string; fund_name: string }

export function useFunds(tenantId: string | null) {
  const [funds, setFunds] = useState<FundRef[]>([]);
  const [fundId, setFundId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    supabase.from('funds').select('id, fund_name').eq('tenant_id', tenantId).eq('status', 'active').order('fund_name')
      .then(({ data, error: e }) => {
        if (e) { setError('Could not load your funds. Please try again.'); return; }
        setFunds(data ?? []);
        if (data?.length) setFundId((cur) => cur || data[0].id);
      });
  }, [tenantId]);

  return { funds, fundId, setFundId, error };
}

export function FundSelect({ funds, value, onChange }: { funds: FundRef[]; value: string; onChange: (id: string) => void }) {
  if (funds.length < 2) return null;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
      {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
    </select>
  );
}

export function Stat({ icon: Icon, label, value, note, warn }: { icon: LucideIcon; label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500"><Icon className="w-4 h-4" />{label}</div>
      <p className="text-2xl text-white font-light tabular-nums mt-2">{value}</p>
      {note && <p className={`text-xs mt-1 ${warn ? 'text-amber-300' : 'text-slate-500'}`}>{note}</p>}
    </div>
  );
}

export function PageHeader({ title, strong, intro, children }: { title: string; strong: string; intro: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-light text-white">{title} <span className="font-semibold">{strong}</span></h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{intro}</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
