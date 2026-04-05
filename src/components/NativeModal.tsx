'use client';

import { useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

/** Max height fits mobile (dynamic viewport) and desktop; inner body scrolls. */
const MODAL_MAX_H = 'max-h-[min(92dvh,900px)]';

export default function NativeModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
}: NativeModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: `max-w-md ${MODAL_MAX_H}`,
    md: `max-w-lg ${MODAL_MAX_H}`,
    lg: `max-w-2xl ${MODAL_MAX_H}`,
    xl: `max-w-4xl ${MODAL_MAX_H}`,
    full: `max-w-[calc(100vw-1.5rem)] sm:max-w-full sm:mx-4 max-h-[min(96dvh,900px)]`,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal: centered; max-h on panel + scrollable body works on mobile (dvh) and desktop */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className={`relative w-full ${sizeClasses[size]} pointer-events-auto flex flex-col min-h-0`}
            >
              <div className="relative flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-2xl group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl" />
                <div className="relative flex min-h-0 max-h-full flex-1 flex-col overflow-hidden bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 shadow-lg">
                  {(title || showCloseButton) && (
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/20 px-4 py-4 sm:px-6 sm:py-5 dark:border-white/10">
                      {title && (
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white pr-2">
                          {title}
                        </h2>
                      )}
                      {showCloseButton && (
                        <button
                          type="button"
                          onClick={onClose}
                          className="shrink-0 p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400"
                          aria-label="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
                    {children}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
