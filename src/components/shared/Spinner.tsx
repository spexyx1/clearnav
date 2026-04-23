import React from 'react';

interface SpinnerProps {
  /** Visual size — defaults to 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Tailwind color class for the border, e.g. 'border-cyan-500'. Defaults to brand cyan. */
  colorClass?: string;
  /** Extra wrapper class names */
  className?: string;
}

const SIZE = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-10 h-10 border-2',
} as const;

/**
 * Accessible loading spinner.
 * Replace all inline `animate-spin` divs with <Spinner />.
 */
export function Spinner({ size = 'md', colorClass = 'border-cyan-500', className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${SIZE[size]} ${colorClass} border-t-transparent rounded-full animate-spin ${className}`}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Full-page centred loading gate. */
export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: '#F5F2EE' }}
      aria-busy="true"
    >
      <Spinner size="lg" colorClass="border-amber-600" />
      {message && <p className="text-sm text-stone-500">{message}</p>}
    </div>
  );
}

/** Panel-level loading state (e.g. inside a card or tab). */
export function PanelLoader() {
  return (
    <div className="flex items-center justify-center py-20" aria-busy="true">
      <Spinner size="md" />
    </div>
  );
}
