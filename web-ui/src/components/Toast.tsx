import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ClientError, categorizeError } from '../services/errorHandler';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration (if not persistent)
    let dismissTimer: NodeJS.Timeout;
    if (!toast.persistent && toast.duration !== 0) {
      dismissTimer = setTimeout(() => {
        handleDismiss();
      }, toast.duration || 5000);
    }

    return () => {
      clearTimeout(timer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [toast.duration, toast.persistent]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match the exit animation duration
  };

  const getIcon = () => {
    const className = 'h-6 w-6';
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className={`${className} text-green-400`} />;
      case 'error':
        return <XCircleIcon className={`${className} text-red-400`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${className} text-yellow-400`} />;
      case 'info':
        return <InformationCircleIcon className={`${className} text-blue-400`} />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`p-4 border-l-4 ${getColorClasses()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">{toast.title}</h3>
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-sm font-medium underline hover:no-underline focus:outline-none"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// Toast manager hook
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const showSuccess = (title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, message, ...options });
  };

  const showError = (title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', title, message, persistent: true, ...options });
  };

  const showWarning = (title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', title, message, ...options });
  };

  const showInfo = (title: string, message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, message, ...options });
  };

  // Error-specific toast
  const showErrorFromException = (error: Error, context?: string) => {
    let title = 'An error occurred';
    let message = error.message;
    let persistent = false;

    if (error instanceof ClientError) {
      const errorInfo = categorizeError(error);
      title = `${errorInfo.category.charAt(0).toUpperCase() + errorInfo.category.slice(1)} Error`;
      message = errorInfo.userMessage;
      persistent = errorInfo.severity === 'high';
    }

    if (context) {
      title = `${context}: ${title}`;
    }

    return showError(title, message, { persistent });
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showErrorFromException,
  };
}
