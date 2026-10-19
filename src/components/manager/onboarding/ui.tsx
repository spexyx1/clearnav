import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatDate } from '../../../lib/format';
import type { DealingSchedule } from '../../../lib/dealingTerms';
import type { ClassValuation } from '../../../lib/fundValuation';
import type { ClassRef, loadOnboarding } from '../../../lib/onboarding';

export type OnboardingData = Awaited<ReturnType<typeof loadOnboarding>>;

export interface OnboardingCtx {
  tenantId: string;
  fundId: string;
  userId: string;
  classes: ClassRef[];
  data: OnboardingData;
  valuations: ClassValuation[];
  schedule: DealingSchedule;
  busy: string | null;
  run: (key: string, action: () => Promise<string | void>) => Promise<boolean>;
}

export const usd = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const units = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
export const day = (d: string | null | undefined) => (d ? formatDate(`${d.slice(0, 10)}T12:00:00`) : '-');
export const today = () => new Date().toISOString().slice(0, 10);

export const card = 'rounded-xl border border-slate-700 bg-slate-800/30';
export const input = 'w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors';

const TONES = {
  cyan: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/5',
  green: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5',
  amber: 'border-amber-500/30 text-amber-300 bg-amber-500/5',
  red: 'border-red-500/30 text-red-300 bg-red-500/5',
  slate: 'border-slate-600 text-slate-400',
};

export function Pill({ tone, children, title }: { tone: keyof typeof TONES; children: ReactNode; title?: string }) {
  return <span title={title} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

export function Button({ onClick, disabled, loading, tone = 'primary', children, title }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; tone?: 'primary' | 'quiet' | 'danger'; children: ReactNode; title?: string;
}) {
  const style = tone === 'primary' ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
    : tone === 'danger' ? 'border border-red-500/40 text-red-300 hover:bg-red-500/10'
    : 'border border-slate-600 text-slate-300 hover:bg-slate-700/60 hover:text-white';
  return (
    <button onClick={onClick} disabled={disabled || loading} title={title}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${style}`}>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={card}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h4 className="text-white font-medium">{title}</h4>
          {hint && <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 pb-5 text-sm text-slate-500">{children}</p>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1.5">{hint}</span>}
    </label>
  );
}
