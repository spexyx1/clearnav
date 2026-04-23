import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { BadgeTone } from './Badge';

interface ToastItem {
  id: string;
  message: string;
  tone: BadgeTone;
  duration?: number;
}

interface ToastContextValue {
  addToast: (message: string, tone?: BadgeTone, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TONE_STYLES: Record<BadgeTone, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-slate-900',
    border: 'border-status-success-border',
    icon: <CheckCircle className="w-4 h-4 text-status-success flex-shrink-0" />,
  },
  warn: {
    bg: 'bg-slate-900',
    border: 'border-status-warn-border',
    icon: <AlertTriangle className="w-4 h-4 text-status-warn flex-shrink-0" />,
  },
  danger: {
    bg: 'bg-slate-900',
    border: 'border-status-danger-border',
    icon: <XCircle className="w-4 h-4 text-status-danger flex-shrink-0" />,
  },
  info: {
    bg: 'bg-slate-900',
    border: 'border-status-info-border',
    icon: <Info className="w-4 h-4 text-status-info flex-shrink-0" />,
  },
  neutral: {
    bg: 'bg-slate-900',
    border: 'border-brand-border',
    icon: <Info className="w-4 h-4 text-brand-text-muted flex-shrink-0" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, tone: BadgeTone = 'neutral', duration = 4000) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, tone, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Portal — top-right, 16px from edge */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(toast => {
          const style = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === 'danger' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-card border shadow-popover animate-fadeIn min-w-[280px] max-w-sm ${style.bg} ${style.border}`}
            >
              {style.icon}
              <span className="flex-1 text-body text-white">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-brand-text-muted hover:text-white transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook to fire toasts from anywhere inside ToastProvider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.addToast;
}
