import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: EmptyStateAction;
  /** Compact variant for use inside cards */
  compact?: boolean;
  className?: string;
}

/**
 * Consistent empty state.
 * Replaces all "No X found" bare text throughout the portal.
 * Every empty state must answer: what is missing, why, and what to do next.
 *
 * @example
 *   <EmptyState
 *     icon={FileText}
 *     title="No documents yet"
 *     body="Documents shared by your manager will appear here."
 *   />
 */
export function EmptyState({ icon: Icon, title, body, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-6' : 'py-16 px-8'} ${className}`}
      role="status"
    >
      {Icon && (
        <div className={`${compact ? 'w-10 h-10 mb-3' : 'w-14 h-14 mb-4'} rounded-card bg-brand-surface-2 border border-brand-border flex items-center justify-center flex-shrink-0`}>
          <Icon className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} text-brand-text-muted`} strokeWidth={1.5} />
        </div>
      )}
      <p className={`font-semibold text-white ${compact ? 'text-body' : 'text-h2'} mb-1`}>{title}</p>
      {body && (
        <p className={`text-brand-text-secondary max-w-xs leading-relaxed ${compact ? 'text-meta' : 'text-body'}`}>{body}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 px-4 py-2 rounded-input text-meta font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface ${
            action.variant === 'secondary'
              ? 'border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
              : 'bg-brand-primary hover:bg-brand-primary-hover text-white'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
