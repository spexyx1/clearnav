import { useState } from 'react';
import { BookOpen, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import type { RegisterAccount, RegisterTx, UnitRegister } from '../../../lib/unitRegister';
import { Button, Empty, Modal, Pill, Section, day, units, usd, type OnboardingCtx } from './ui';

const TYPE_LABEL: Record<RegisterTx['type'], string> = {
  contribution: 'Units issued', transfer_in: 'Units issued (shares in)', redemption: 'Units redeemed', transfer_out: 'Units redeemed (shares out)',
  fee: 'Units cancelled (fee)', adjustment: 'Units issued (rebate)',
};

export default function RegisterPanel({ ctx, register }: { ctx: OnboardingCtx; register: UnitRegister }) {
  const [open, setOpen] = useState<RegisterAccount | null>(null);
  const [confirmation, setConfirmation] = useState<{ account: RegisterAccount; tx: RegisterTx } | null>(null);
  const className = (id: string) => ctx.classes.find((c) => c.id === id)?.class_name ?? 'Class';

  return (
    <div className="space-y-6">
      <Section title="Monthly check" hint="For every final, approved month, the class's total units must equal the units held by all investors on the register.">
        {!register.checks.length ? <Empty>No official month is final and approved yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="px-5 py-2 font-medium">Month end</th><th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium text-right">Class units</th><th className="px-3 py-2 font-medium text-right">Investor units</th>
                <th className="px-3 py-2 font-medium text-right">Difference</th><th className="px-5 py-2 font-medium">Result</th>
              </tr></thead>
              <tbody>
                {register.checks.map((c) => (
                  <tr key={`${c.month.classId}${c.month.date}`} className="border-b border-slate-800 last:border-0">
                    <td className="px-5 py-3 text-white">{day(c.month.date)}</td>
                    <td className="px-3 py-3 text-slate-300">{className(c.month.classId)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-200">{units(c.month.classUnits)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-200">{units(c.registerUnits)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-400">{units(c.difference)}</td>
                    <td className="px-5 py-3">
                      {c.status === 'matched' && <Pill tone="green"><CheckCircle className="w-3 h-3" /> Matches</Pill>}
                      {c.status === 'awaiting' && <Pill tone="amber" title={c.pending.map((p) => p.name).join(', ')}><Clock className="w-3 h-3" /> {c.pending.length} to {c.pending.length === 1 ? 'deal' : 'deal'} on the Dealing tab</Pill>}
                      {c.status === 'mismatch' && <Pill tone="red"><XCircle className="w-3 h-3" /> Does not match</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Investor register" hint="Every unit issued or redeemed, per investor and class. Units can only be added or removed at a final IBKR price and cannot be edited afterwards.">
        {!register.accounts.length ? <Empty>No units have been issued to investors yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="px-5 py-2 font-medium">Investor</th><th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium text-right">Issued</th><th className="px-3 py-2 font-medium text-right">Redeemed</th>
                <th className="px-3 py-2 font-medium text-right">Holding</th><th className="px-5 py-2" />
              </tr></thead>
              <tbody>
                {register.accounts.map((a) => (
                  <tr key={a.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3"><p className="text-white">{a.investorName}</p><p className="text-xs text-slate-500">{a.accountNumber}</p></td>
                    <td className="px-3 py-3 text-slate-300">{className(a.classId)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-200">{units(a.issued)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-200">{units(a.redeemed)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-white font-medium">
                      {units(a.units)}
                      {!a.balanceMatches && <span className="block text-xs text-red-300">Account shows {units(a.storedUnits)}</span>}
                    </td>
                    <td className="px-5 py-3 text-right"><Button tone="quiet" onClick={() => setOpen(a)}><BookOpen className="w-3.5 h-3.5" /> History</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {open && (
        <Modal title={`${open.investorName} - ${className(open.classId)}`} onClose={() => setOpen(null)}>
          {open.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-800">
              <div>
                <p className="text-sm text-white">{TYPE_LABEL[t.type]}</p>
                <p className="text-xs text-slate-500">{day(t.date)} - {t.reference}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm tabular-nums ${t.signedUnits > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{t.signedUnits > 0 ? '+' : '-'}{units(t.units)}</p>
                <button onClick={() => setConfirmation({ account: open, tx: t })} className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 transition-colors">
                  <FileText className="w-3 h-3" /> Confirmation
                </button>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {confirmation && (
        <Modal title="Deal confirmation" onClose={() => setConfirmation(null)}>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            {[
              ['Investor', confirmation.account.investorName],
              ['Account', confirmation.account.accountNumber],
              ['Class', className(confirmation.account.classId)],
              ['Deal', TYPE_LABEL[confirmation.tx.type]],
              ['Dealing day', day(confirmation.tx.date)],
              ['Unit price (final, IBKR)', confirmation.tx.price.toFixed(6)],
              ['Units', units(confirmation.tx.units)],
              ['Amount', usd(confirmation.tx.amount)],
              ['Reference', confirmation.tx.reference],
            ].map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-slate-400">{k}</dt><dd className="text-white text-right tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}
