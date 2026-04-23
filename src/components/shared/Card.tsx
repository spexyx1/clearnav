import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Remove padding for full-bleed content like tables */
  noPadding?: boolean;
  as?: 'div' | 'section' | 'article';
}

/**
 * Standard card surface.
 * One radius (rounded-card), one shadow (shadow-card), one border color.
 * Use instead of ad-hoc `bg-slate-900/50 border border-slate-800/50 rounded-lg`.
 */
export function Card({ children, className = '', noPadding = false, as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={`bg-brand-surface border border-brand-border rounded-card shadow-card ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Consistent card header with optional trailing action (button/badge). */
export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div>
        <h3 className="text-h2 text-white">{title}</h3>
        {subtitle && <p className="text-meta text-brand-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/** Single KPI metric card — label / value / delta. */
export function MetricCard({ label, value, delta, icon, className = '' }: MetricCardProps) {
  return (
    <div className={`bg-brand-surface border border-brand-border rounded-card shadow-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-meta text-brand-text-muted uppercase tracking-wide">{label}</p>
        {icon && <span className="text-brand-accent">{icon}</span>}
      </div>
      <div className="text-h1 font-semibold text-white tabular-nums mb-1">{value}</div>
      {delta && <div className="text-meta tabular-nums">{delta}</div>}
    </div>
  );
}
