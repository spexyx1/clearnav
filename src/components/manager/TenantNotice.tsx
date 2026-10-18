import { AlertCircle } from 'lucide-react';
import type { TenantState } from '../../lib/useTenantId';

export default function TenantNotice({ state, retry }: { state: TenantState; retry: () => void }) {
  if (state !== 'error' && state !== 'missing') return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
      <span className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {state === 'missing' ? 'Your account is not linked to a company yet.' : 'We could not load your company details.'}
      </span>
      {state === 'error' && (
        <button onClick={retry} className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 transition">Try again</button>
      )}
    </div>
  );
}
