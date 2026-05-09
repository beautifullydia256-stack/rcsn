'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/20 dark:bg-green-500/10',
          border: 'border-green-500/30 dark:border-green-500/20',
          text: 'text-green-700 dark:text-green-300',
          icon: 'text-green-600 dark:text-green-400',
        };
      case 'error':
        return {
          bg: 'bg-red-500/20 dark:bg-red-500/10',
          border: 'border-red-500/30 dark:border-red-500/20',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/20 dark:bg-yellow-500/10',
          border: 'border-yellow-500/30 dark:border-yellow-500/20',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-500/20 dark:bg-blue-500/10',
          border: 'border-blue-500/30 dark:border-blue-500/20',
          text: 'text-blue-700 dark:text-blue-300',
          icon: 'text-blue-600 dark:text-blue-400',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const colors = getColors(toast.type);
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 300, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.8 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="pointer-events-auto"
              >
                <div className="relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
                  <div
                    className={`relative ${colors.bg} ${colors.border} backdrop-blur-md rounded-xl border p-4 shadow-lg min-w-[300px] max-w-md`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                        {getIcon(toast.type)}
                      </div>
                      <p className={`flex-1 ${colors.text} text-sm font-medium`}>
                        {toast.message}
                      </p>
                      <button
                        onClick={() => removeToast(toast.id)}
                        className={`${colors.text} hover:opacity-70 transition-opacity flex-shrink-0`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

