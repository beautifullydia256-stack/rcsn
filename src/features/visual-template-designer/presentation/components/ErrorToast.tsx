/**
 * Visual Template Designer - ErrorToast
 *
 * Fixed-position toast notification rendered via React portal.
 * Color-coded by type: error (red), warning (yellow), success (green), info (blue).
 * Auto-hides after 5 seconds by default.
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ErrorToastProps {
  message: string;
  type: 'error' | 'warning' | 'success' | 'info';
  onDismiss: () => void;
  /** If true (default), auto-hide after 5 seconds */
  autoHide?: boolean;
}

const TYPE_STYLES: Record<
  ErrorToastProps['type'],
  { bg: string; border: string; text: string; icon: string }
> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-800',
    icon: '✕',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
    icon: '⚠',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-800',
    icon: '✓',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-800',
    icon: 'ℹ',
  },
};

export function ErrorToast({
  message,
  type,
  onDismiss,
  autoHide = true,
}: ErrorToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styles = TYPE_STYLES[type];

  useEffect(() => {
    if (!autoHide) return;
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoHide, onDismiss]);

  const toast = (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        maxWidth: 420,
        minWidth: 280,
      }}
      className={[
        'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
        styles.bg,
        styles.border,
        styles.text,
      ].join(' ')}
    >
      <span aria-hidden="true" className="mt-0.5 flex-shrink-0 text-base font-bold">
        {styles.icon}
      </span>
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <button
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="ml-2 flex-shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <span aria-hidden="true" className="text-base leading-none">×</span>
      </button>
    </div>
  );

  return createPortal(toast, document.body);
}

export default ErrorToast;
