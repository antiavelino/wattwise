import React from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { ToastMessage } from '../../types/energy';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notificações" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast-icon" aria-hidden="true">
            {toast.type === 'success' && <CheckCircle2 size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
          </div>
          <div className="toast-content">
            <strong className="toast-title">{toast.title}</strong>
            {toast.description && <p className="toast-description">{toast.description}</p>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dispensar notificação"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
};
