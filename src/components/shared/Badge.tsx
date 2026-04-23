import React from 'react';

export type BadgeTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  /** Render as a dot indicator rather than a text badge */
  dot?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-status-success-bg text-status-success border-status-success-border',
  warn:    'bg-status-warn-bg    text-status-warn    border-status-warn-border',
  danger:  'bg-status-danger-bg  text-status-danger  border-status-danger-border',
  info:    'bg-status-info-bg    text-status-info    border-status-info-border',
  neutral: 'bg-status-neutral-bg text-status-neutral border-status-neutral-border',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-status-success',
  warn:    'bg-status-warn',
  danger:  'bg-status-danger',
  info:    'bg-status-info',
  neutral: 'bg-status-neutral',
};

/**
 * Semantic status badge.
 * Use instead of one-off `bg-*-500/10 text-*-400 border-*-500/30` combos.
 *
 * @example
 *   <Badge tone="success">Verified</Badge>
 *   <Badge tone="warn">Under Review</Badge>
 */
export function Badge({ tone = 'neutral', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-meta font-medium leading-none select-none ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASSES[tone]}`} aria-hidden />
      )}
      {children}
    </span>
  );
}
