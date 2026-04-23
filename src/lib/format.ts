/**
 * Shared formatting utilities.
 * Import from here instead of inlining toLocaleDateString / toLocaleString everywhere.
 */

const DATE_OPTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
const DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
const DATETIME_OPTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };

export function formatDate(value: string | Date | null | undefined, style: 'long' | 'short' = 'long'): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', style === 'short' ? DATE_SHORT_OPTS : DATE_OPTS);
  } catch {
    return '—';
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', DATETIME_OPTS);
  } catch {
    return '—';
  }
}

export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  minimumFractionDigits = 2
): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(value);
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
