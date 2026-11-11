import React, { useContext } from 'react';
import { ToastContext, Toast, ToastType } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastContainerProps {
  toasts?: Toast[];
  onDismiss?: (id: string) => void;
  className?: string;
}

const ICONS: Record<ToastType, React.ReactElement> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />,
  error: <AlertCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />,
  info: <Info className="w-4 h-4 text-zinc-600" aria-hidden="true" />,
};

const BADGE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200/80 text-emerald-800',
  error: 'bg-rose-50 border-rose-200/80 text-rose-800',
  warning: 'bg-amber-50 border-amber-200/80 text-amber-800',
  info: 'bg-zinc-100 border-zinc-200 text-zinc-800',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts: propsToasts,
  onDismiss: propsOnDismiss,
  className = '',
}) => {
  const context = useContext(ToastContext);

  const activeToasts = propsToasts ?? context?.toasts ?? [];
  const dismiss = propsOnDismiss ?? context?.dismissToast ?? (() => {});

  if (!activeToasts || activeToasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Notifications"
      className={`fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0 ${className}`}
    >
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          aria-live="polite"
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200/90 bg-white shadow-card text-zinc-900 transition-all duration-200"
        >
          <div
            className={`flex-shrink-0 p-1 rounded-lg border ${
              BADGE_STYLES[toast.type] ?? BADGE_STYLES.info
            }`}
          >
            {ICONS[toast.type] ?? ICONS.info}
          </div>
          <div className="flex-1 text-sm font-medium leading-snug text-zinc-800 break-words pt-0.5">
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="flex-shrink-0 -mr-1 -mt-1 p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
