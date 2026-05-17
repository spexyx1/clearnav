import { STATUS_CONFIG, InvoiceStatus } from './types';

interface Props {
  status: InvoiceStatus;
  size?: 'sm' | 'md';
}

export default function InvoiceStatusBadge({ status, size = 'md' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';
  return (
    <span className={`inline-flex items-center rounded-full border ${px} ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}
