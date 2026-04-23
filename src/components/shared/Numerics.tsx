import React from 'react';
import { formatCurrency, formatPct, formatNumber } from '../../lib/format';

interface MoneyProps {
  value: number | null | undefined;
  currency?: string;
  decimals?: number;
  /** Applies text-right + tabular-nums (use in table cells) */
  column?: boolean;
  /** Extra Tailwind classes */
  className?: string;
  /** Show colored sign indicator (green pos / red neg) */
  signed?: boolean;
}

/**
 * Consistent currency display.
 * Always tabular-nums. Null-safe (renders "—").
 *
 * @example
 *   <Money value={1234567.89} />           → $1,234,567.89
 *   <Money value={nav} decimals={4} />     → $1.2345
 *   <Money value={null} />                 → —
 */
export function Money({ value, currency = 'USD', decimals = 2, column = false, className = '', signed = false }: MoneyProps) {
  const formatted = formatCurrency(value, currency, decimals);
  const colorClass = signed && value != null
    ? value >= 0 ? 'text-status-success' : 'text-status-danger'
    : '';

  return (
    <span className={`tabular-nums ${column ? 'num-right block' : ''} ${colorClass} ${className}`}>
      {signed && value != null && value > 0 ? '+' : ''}
      {formatted}
    </span>
  );
}

interface PctProps {
  value: number | null | undefined;
  decimals?: number;
  column?: boolean;
  className?: string;
  /** Color the value based on sign */
  signed?: boolean;
}

/**
 * Consistent percentage display.
 * Includes sign prefix when signed=true.
 *
 * @example
 *   <Pct value={2.34} signed />    → +2.34%  (green)
 *   <Pct value={-1.2} signed />   → -1.20%  (red)
 */
export function Pct({ value, decimals = 2, column = false, className = '', signed = false }: PctProps) {
  const formatted = formatPct(value, decimals);
  const colorClass = signed && value != null
    ? value >= 0 ? 'text-status-success' : 'text-status-danger'
    : '';

  return (
    <span className={`tabular-nums ${column ? 'num-right block' : ''} ${colorClass} ${className}`}>
      {formatted}
    </span>
  );
}

interface CountProps {
  value: number | null | undefined;
  decimals?: number;
  column?: boolean;
  className?: string;
}

/**
 * Localized integer / float display.
 *
 * @example
 *   <Count value={12345.67} decimals={2} />   → 12,345.67
 */
export function Count({ value, decimals = 0, column = false, className = '' }: CountProps) {
  return (
    <span className={`tabular-nums ${column ? 'num-right block' : ''} ${className}`}>
      {formatNumber(value, decimals)}
    </span>
  );
}
