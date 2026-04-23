import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand-primary hover:bg-brand-primary-hover text-white border border-transparent',
  secondary:
    'bg-transparent hover:bg-brand-surface-2 text-slate-200 border border-slate-700 hover:border-slate-500',
  ghost:
    'bg-transparent hover:bg-brand-surface-2 text-slate-400 hover:text-white border border-transparent',
  destructive:
    'bg-status-danger hover:brightness-90 text-white border border-transparent',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8  px-3 text-meta  gap-1.5',
  md: 'h-10 px-4 text-body  gap-2',
  lg: 'h-12 px-6 text-body  gap-2',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface';

/**
 * Design-system button.
 * Use this instead of one-off Tailwind button classes.
 *
 * @example
 *   <Button variant="primary" size="md" onClick={…}>Submit</Button>
 *   <Button variant="secondary" loading>Saving…</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center rounded-input font-medium
        transition-colors duration-150 cursor-pointer select-none whitespace-nowrap
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${FOCUS_RING}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {children}
        </>
      ) : (
        <>
          {leftIcon && <span aria-hidden className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span aria-hidden className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
